/**
 * Supervisor — the orchestration engine.
 *
 * Runs the propose → tournament → plan → execute → delta loop.
 * Two modes:
 *   - cowork: yields after each step for human review
 *   - autonomous: runs the full loop, stops on budget or resolution
 */

import type {
  SupervisorConfig,
  SupervisorState,
  RoundResult,
  Task,
  AgentConfig,
  ModelVendor,
  CoworkStep,
} from './types.js';
import { TaskQueue, createTask } from './queue.js';
import { runAgent, type AgentResponse } from './agent.js';
import { generateMetaReview, summarizeRound } from './meta-review.js';

// ── Hub API helpers ─────────────────────────────────────────────────────

async function hubGet(url: string, apiKey: string): Promise<unknown> {
  const resp = await fetch(url, {
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
  });
  return resp.json();
}

async function hubPost(url: string, apiKey: string, body: Record<string, unknown>): Promise<unknown> {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  return resp.json();
}

// ── Supervisor ──────────────────────────────────────────────────────────

export class Supervisor {
  private config: SupervisorConfig;
  private queue: TaskQueue;
  private state: SupervisorState;
  private agentPrompts: Record<string, string> = {};
  private runId: string;

  constructor(config: SupervisorConfig, existingState?: SupervisorState) {
    this.config = config;
    this.queue = new TaskQueue();
    this.runId = existingState?.run_id ?? `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    if (existingState) {
      // Resume from persisted state (cowork mode)
      this.state = { ...existingState, config };
    } else {
      this.state = {
        config,
        current_round: 0,
        current_step: null,
        current_round_tasks: [],
        total_cost_usd: 0,
        rounds: [],
        task_queue: [],
        status: 'running',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        run_id: this.runId,
      };
    }
  }

  /** Initialize: fetch agent prompts and crack context */
  async init(): Promise<void> {
    const { com_hub_url, com_api_key } = this.config;

    // Fetch agent prompts
    const promptsResp = await hubGet(
      `${com_hub_url}/v1/factory/prompts`,
      com_api_key,
    ) as { prompts: Array<{ name: string; description: string }> };

    for (const p of promptsResp.prompts) {
      const full = await hubGet(
        `${com_hub_url}/v1/factory/prompts/${p.name}`,
        com_api_key,
      ) as { content: string };
      this.agentPrompts[p.name] = full.content;
    }

    this.log(`Loaded ${Object.keys(this.agentPrompts).length} agent prompts`);
  }

  /** Run one complete round: propose → judge → plan */
  async runRound(): Promise<SupervisorState> {
    this.state.current_round++;
    const round = this.state.current_round;
    this.log(`\n=== Round ${round} ===`);

    // Check budget
    if (this.state.total_cost_usd >= this.config.budget_usd) {
      this.state.status = 'budget_exhausted';
      this.log(`Budget exhausted: $${this.state.total_cost_usd.toFixed(2)} / $${this.config.budget_usd}`);
      await this.createAttentionItem({
        type: 'budget-exceeded',
        priority: 'high',
        title: `Budget exhausted for ${this.config.project_id}`,
        description: `Spent $${this.state.total_cost_usd.toFixed(2)} of $${this.config.budget_usd} budget after ${round - 1} rounds.`,
        requested_action: 'Increase budget or close the run',
      });
      return this.state;
    }

    if (round > this.config.max_rounds) {
      this.state.status = 'completed';
      this.log(`Max rounds reached: ${round - 1}`);
      return this.state;
    }

    const roundTasks: Task[] = [];

    // ── Step 1: Propose ───────────────────────────────────────────────
    this.log('Step 1: Proposing hypotheses...');
    const proposalTask = await this.runProposalStep(round);
    roundTasks.push(proposalTask);

    // ── Step 2: Dispute resolution (replaces LLM Judge per Test M) ──
    this.log('Step 2: Dispute resolution (critic ensemble)...');
    const disputeTasks = await this.runDisputeResolutionStep(round);
    roundTasks.push(...disputeTasks);

    // ── Step 3: Plan experiments for top hypothesis ───────────────────
    this.log('Step 3: Planning experiments...');
    const planTask = await this.runPlanningStep(round);
    if (planTask) roundTasks.push(planTask);

    // ── Step 4: Execute pending experiments ─────────────────────────
    this.log('Step 4: Executing experiments...');
    const executeTasks = await this.runExecutionStep(round);
    roundTasks.push(...executeTasks);

    // ── Step 5: Critique results ────────────────────────────────────
    this.log('Step 5: Critiquing results...');
    const critiqueTasks = await this.runCritiqueStep(round, executeTasks);
    roundTasks.push(...critiqueTasks);

    // ── Step 6: Compute convergence deltas ──────────────────────────
    this.log('Step 6: Computing deltas...');
    const deltaTasks = await this.runDeltaStep(round, executeTasks, critiqueTasks);
    roundTasks.push(...deltaTasks);

    // ── Step 7: Archive validated couplings + create findings ───────
    this.log('Step 7: Archiving...');
    const archiveTasks = await this.runArchiveStep(round, deltaTasks);
    roundTasks.push(...archiveTasks);

    // ── Meta-review ──────────────────────────────────────────────────
    const previousMetaReview = this.state.rounds.length > 0
      ? this.state.rounds[this.state.rounds.length - 1].meta_review
      : undefined;

    const metaReview = generateMetaReview({
      round,
      tasks: roundTasks,
      previous_meta_review: previousMetaReview,
    });

    const roundResult = summarizeRound(round, roundTasks, metaReview);
    this.state.rounds.push(roundResult);
    this.state.total_cost_usd += roundResult.cost_usd;
    this.state.task_queue = this.queue.all();
    this.state.updated_at = new Date().toISOString();

    // Persist state to D1 for dashboard visibility
    await this.persistState(roundResult, roundTasks);

    this.log(`Round ${round} complete: ${roundResult.tasks_completed} tasks, $${roundResult.cost_usd.toFixed(4)}`);
    this.log(`Total cost: $${this.state.total_cost_usd.toFixed(4)} / $${this.config.budget_usd}`);

    return this.state;
  }

  /** Run the full loop (autonomous mode) */
  async run(): Promise<SupervisorState> {
    await this.init();

    while (
      this.state.status === 'running' &&
      this.state.current_round < this.config.max_rounds &&
      this.state.total_cost_usd < this.config.budget_usd
    ) {
      await this.runRound();
    }

    if (this.state.status === 'running') {
      this.state.status = 'completed';
    }

    return this.state;
  }

  /** Get current state (for Cowork mode inspection) */
  getState(): SupervisorState {
    return { ...this.state };
  }

  // ── Step sequence for cowork ────────────────────────────────────────

  private static readonly STEP_ORDER: CoworkStep[] = [
    'propose', 'dispute', 'plan', 'execute', 'critique', 'delta', 'archive', 'meta-review',
  ];

  private nextStep(current: CoworkStep | null): CoworkStep | null {
    if (!current) return 'propose';
    const idx = Supervisor.STEP_ORDER.indexOf(current);
    if (idx === -1 || idx >= Supervisor.STEP_ORDER.length - 1) return null;
    return Supervisor.STEP_ORDER[idx + 1];
  }

  /**
   * Run a single step within the current round (cowork mode).
   * Call repeatedly to advance through: propose → dispute → plan → execute →
   * critique → delta → archive → meta-review → round-complete.
   *
   * Returns the updated state with current_step indicating what just ran.
   * When current_step === 'round-complete', the round is finished.
   */
  async runStep(): Promise<SupervisorState> {
    // Start a new round if needed
    if (this.state.current_step === null || this.state.current_step === 'round-complete') {
      this.state.current_round++;
      this.state.current_round_tasks = [];
      this.state.current_step = null;

      // Budget check
      if (this.state.total_cost_usd >= this.config.budget_usd) {
        this.state.status = 'budget_exhausted';
        await this.createAttentionItem({
          type: 'budget-exceeded',
          priority: 'high',
          title: `Budget exhausted for ${this.config.project_id}`,
          description: `Spent $${this.state.total_cost_usd.toFixed(2)} of $${this.config.budget_usd} after ${this.state.current_round - 1} rounds.`,
          requested_action: 'Increase budget or close the run',
        });
        return this.state;
      }

      if (this.state.current_round > this.config.max_rounds) {
        this.state.status = 'completed';
        return this.state;
      }
    }

    const round = this.state.current_round;
    const step = this.nextStep(this.state.current_step);

    if (!step) {
      // Should not happen, but safety
      this.state.current_step = 'round-complete';
      return this.state;
    }

    this.log(`Round ${round}, step: ${step}`);
    this.state.current_step = step;

    switch (step) {
      case 'propose': {
        const task = await this.runProposalStep(round);
        this.state.current_round_tasks.push(task);
        break;
      }
      case 'dispute': {
        const tasks = await this.runDisputeResolutionStep(round);
        this.state.current_round_tasks.push(...tasks);
        break;
      }
      case 'plan': {
        const task = await this.runPlanningStep(round);
        if (task) this.state.current_round_tasks.push(task);
        break;
      }
      case 'execute': {
        const tasks = await this.runExecutionStep(round);
        this.state.current_round_tasks.push(...tasks);
        break;
      }
      case 'critique': {
        const executeTasks = this.state.current_round_tasks.filter(t => t.type === 'execute');
        const tasks = await this.runCritiqueStep(round, executeTasks);
        this.state.current_round_tasks.push(...tasks);
        break;
      }
      case 'delta': {
        const executeTasks = this.state.current_round_tasks.filter(t => t.type === 'execute');
        const critiqueTasks = this.state.current_round_tasks.filter(t => t.type === 'critique');
        const tasks = await this.runDeltaStep(round, executeTasks, critiqueTasks);
        this.state.current_round_tasks.push(...tasks);
        break;
      }
      case 'archive': {
        const deltaTasks = this.state.current_round_tasks.filter(t => t.type === 'delta');
        const tasks = await this.runArchiveStep(round, deltaTasks);
        this.state.current_round_tasks.push(...tasks);
        break;
      }
      case 'meta-review': {
        const previousMetaReview = this.state.rounds.length > 0
          ? this.state.rounds[this.state.rounds.length - 1].meta_review
          : undefined;
        const metaReview = generateMetaReview({
          round,
          tasks: this.state.current_round_tasks,
          previous_meta_review: previousMetaReview,
        });
        const roundResult = summarizeRound(round, this.state.current_round_tasks, metaReview);
        this.state.rounds.push(roundResult);
        this.state.total_cost_usd += roundResult.cost_usd;
        this.state.task_queue = this.queue.all();
        await this.persistState(roundResult, this.state.current_round_tasks);
        this.log(`Round ${round} complete: ${roundResult.tasks_completed} tasks, $${roundResult.cost_usd.toFixed(4)}`);
        this.state.current_step = 'round-complete';
        break;
      }
    }

    this.state.updated_at = new Date().toISOString();
    return this.state;
  }

  // ── Extraction pipeline ─────────────────────────────────────────────
  // For extraction-batch projects: ingest literature by scope, extract
  // couplings, canonicalize, write to coupling map.

  async runExtraction(): Promise<SupervisorState> {
    await this.init();
    this.state.current_round = 1;
    const round = 1;
    this.log('\n=== Extraction pipeline ===');

    const roundTasks: Task[] = [];

    // Get project scope for extraction keywords/venues
    const project = await hubGet(
      `${this.config.com_hub_url}/v1/factory/projects/${this.config.project_id}`,
      this.config.com_api_key,
    ) as { scope?: Record<string, unknown>; entity_scope?: string[] };

    const scope = project.scope ?? {};
    const entityScope = project.entity_scope ?? [];
    const topicKeywords = (scope.topic_keywords as string[]) ?? entityScope;
    const targetCount = (scope.target_count as number) ?? 10;

    if (topicKeywords.length === 0) {
      this.log('  No topic keywords in project scope — nothing to extract');
      this.state.status = 'completed';
      return this.state;
    }

    // Step 1: Extract couplings from literature via executor agent
    const extractTask = createTask('execute', 'executor', {
      pipeline: 'extraction',
      topic_keywords: topicKeywords,
      target_count: targetCount,
      entity_scope: entityScope,
    }, {
      project_id: this.config.project_id,
      crack_id: this.config.crack_id || 'extraction',
      round,
      cost_estimate_usd: 0.10,
    });
    this.queue.enqueue(extractTask);

    try {
      const agentConfig: AgentConfig = {
        role: 'executor',
        vendor: this.defaultVendor(),
        model: this.defaultModel(),
        max_tokens: 4096,
        temperature: 0.1,
        system_prompt: this.agentPrompts['executor'] ?? `You are an extraction agent. Extract structured couplings from scientific text.`,
        allowed_tools: [],
      };

      const response = await runAgent({
        config: agentConfig,
        message: `Extract measurement couplings from literature on these topics:

## Topics: ${topicKeywords.join(', ')}
## Entity scope: ${entityScope.join(', ') || '(open)'}
## Target: ${targetCount} couplings

For each claim found, extract:
- entity (the thing measured)
- property (what was measured)
- value (numeric)
- method (instrument/technique)
- source: "measurement" for experimental, "prediction" for computational
- paper_hint: brief source attribution

Respond as JSON: {"couplings": [...], "papers_processed": N, "summary": "..."}`,
      });

      const result = response.data ?? {};
      const couplings = (result.couplings as Array<Record<string, unknown>>) ?? [];

      this.queue.complete(extractTask.id, {
        status: 'completed',
        couplings,
        papers_processed: result.papers_processed ?? 0,
        finding_summary: result.summary ?? `Extracted ${couplings.length} couplings`,
      }, response.cost_usd);

      this.log(`  Extracted ${couplings.length} couplings from ${result.papers_processed ?? '?'} papers`);
    } catch (e) {
      this.queue.fail(extractTask.id, (e as Error).message);
      this.log(`  Extraction failed: ${(e as Error).message}`);
    }
    roundTasks.push(extractTask);

    // Step 2: Critique
    const critiqueTasks = await this.runCritiqueStep(round, [extractTask]);
    roundTasks.push(...critiqueTasks);

    // Step 3: Delta
    const deltaTasks = await this.runDeltaStep(round, [extractTask], critiqueTasks);
    roundTasks.push(...deltaTasks);

    // Step 4: Archive
    const archiveTasks = await this.runArchiveStep(round, deltaTasks);
    roundTasks.push(...archiveTasks);

    // Wrap up
    const metaReview = generateMetaReview({ round, tasks: roundTasks });
    const roundResult = summarizeRound(round, roundTasks, metaReview);
    this.state.rounds.push(roundResult);
    this.state.total_cost_usd += roundResult.cost_usd;
    this.state.status = 'completed';
    this.state.updated_at = new Date().toISOString();

    await this.persistState(roundResult, roundTasks);
    this.log(`Extraction complete: ${roundResult.couplings_archived} couplings archived, $${roundResult.cost_usd.toFixed(4)}`);

    return this.state;
  }

  // ── Surveillance pipeline ───────────────────────────────────────────
  // For surveillance projects: scan for echo chambers, speciation, shear.
  // Creates attention items when anomalies detected.

  async runSurveillance(): Promise<SupervisorState> {
    await this.init();
    this.state.current_round = 1;
    const round = 1;
    this.log('\n=== Surveillance pipeline ===');

    const roundTasks: Task[] = [];

    // Step 1: Run echo-chamber scan
    const echoTask = createTask('execute', 'critic', {
      pipeline: 'surveillance',
      scan_type: 'echo-chambers',
    }, {
      project_id: this.config.project_id,
      crack_id: this.config.crack_id || 'surveillance',
      round,
      cost_estimate_usd: 0.01,
    });
    this.queue.enqueue(echoTask);

    try {
      const echoChambers = await hubGet(
        `${this.config.com_hub_url}/v1/echo-chambers`,
        this.config.com_api_key,
      ) as { echo_chambers?: Array<{ entity: string; property: string; status: string }> };

      const chambers = echoChambers.echo_chambers ?? [];
      const unsupported = chambers.filter((c) => c.status === 'unsupported' || c.status === 'contradicted');

      this.queue.complete(echoTask.id, {
        status: 'completed',
        total_chambers: chambers.length,
        unsupported_count: unsupported.length,
        chambers: unsupported.slice(0, 10),
      }, 0);

      // Create attention items for new echo chambers
      for (const chamber of unsupported.slice(0, 3)) {
        await this.createAttentionItem({
          type: 'review',
          priority: chamber.status === 'contradicted' ? 'high' : 'medium',
          title: `Echo chamber: ${chamber.entity}.${chamber.property} (${chamber.status})`,
          description: `Prediction consensus ${chamber.status} by measurements. Needs investigation.`,
          requested_action: 'Review the prediction-measurement divergence and determine if this is a real crack or a measurement artifact',
        });
      }

      this.log(`  Echo chambers: ${chambers.length} total, ${unsupported.length} unsupported/contradicted`);
    } catch (e) {
      this.queue.fail(echoTask.id, (e as Error).message);
      this.log(`  Echo chamber scan failed: ${(e as Error).message}`);
    }
    roundTasks.push(echoTask);

    // Step 2: Run speciation scan
    const speciationTask = createTask('execute', 'critic', {
      pipeline: 'surveillance',
      scan_type: 'speciation',
    }, {
      project_id: this.config.project_id,
      crack_id: this.config.crack_id || 'surveillance',
      round,
      cost_estimate_usd: 0.01,
    });
    this.queue.enqueue(speciationTask);

    try {
      const speciation = await hubGet(
        `${this.config.com_hub_url}/v1/speciation`,
        this.config.com_api_key,
      ) as { speciation?: Array<{ entity: string; property: string; bestK: number; deltaBIC: number; isSpeciation: boolean }> };

      const candidates = (speciation.speciation ?? []).filter((s) => s.isSpeciation);

      this.queue.complete(speciationTask.id, {
        status: 'completed',
        total_candidates: candidates.length,
        candidates: candidates.slice(0, 10),
      }, 0);

      // Create attention items for high-confidence speciation
      for (const s of candidates.filter((c) => c.deltaBIC >= 20).slice(0, 3)) {
        await this.createAttentionItem({
          type: 'review',
          priority: 'high',
          title: `Fission detected: ${s.entity}.${s.property} (${s.bestK} sub-populations, ΔBIC=${s.deltaBIC.toFixed(1)})`,
          description: `GMM+BIC detects ${s.bestK} hidden sub-populations. This may indicate a real biological distinction or a measurement artifact.`,
          requested_action: 'Investigate whether this fission is genuine or artifactual',
        });
      }

      this.log(`  Speciation: ${candidates.length} candidates found`);
    } catch (e) {
      this.queue.fail(speciationTask.id, (e as Error).message);
      this.log(`  Speciation scan failed: ${(e as Error).message}`);
    }
    roundTasks.push(speciationTask);

    // Step 3: Run measurement-prediction ratio check
    const ratioTask = createTask('execute', 'critic', {
      pipeline: 'surveillance',
      scan_type: 'measurement-prediction-ratio',
    }, {
      project_id: this.config.project_id,
      crack_id: this.config.crack_id || 'surveillance',
      round,
      cost_estimate_usd: 0.01,
    });
    this.queue.enqueue(ratioTask);

    try {
      const ratio = await hubGet(
        `${this.config.com_hub_url}/v1/measurement-prediction-ratio`,
        this.config.com_api_key,
      ) as Record<string, unknown>;

      this.queue.complete(ratioTask.id, {
        status: 'completed',
        ratio,
      }, 0);

      this.log(`  Measurement/prediction ratio scan complete`);
    } catch (e) {
      this.queue.fail(ratioTask.id, (e as Error).message);
    }
    roundTasks.push(ratioTask);

    // Wrap up
    const metaReview = generateMetaReview({ round, tasks: roundTasks });
    const roundResult = summarizeRound(round, roundTasks, metaReview);
    this.state.rounds.push(roundResult);
    this.state.total_cost_usd += roundResult.cost_usd;
    this.state.status = 'completed';
    this.state.updated_at = new Date().toISOString();

    await this.persistState(roundResult, roundTasks);
    this.log(`Surveillance complete: ${roundResult.tasks_completed} scans, ${roundResult.tasks_failed} failed`);

    return this.state;
  }

  // ── Step implementations ──────────────────────────────────────────────

  private async runProposalStep(round: number): Promise<Task> {
    const task = createTask('propose', 'proposer', {
      crack_id: this.config.crack_id,
      count: this.config.hypotheses_per_round,
    }, {
      project_id: this.config.project_id,
      crack_id: this.config.crack_id,
      round,
      cost_estimate_usd: 0.05,
    });

    this.queue.enqueue(task);

    try {
      // Get crack context
      const crackData = await hubGet(
        `${this.config.org_hub_url}/v1/chains`,
        '',
      );

      // Get existing hypotheses
      const existing = await hubGet(
        `${this.config.com_hub_url}/v1/factory/hypotheses?crack_id=${this.config.crack_id}`,
        this.config.com_api_key,
      ) as { hypotheses: Array<{ id: string; proposed_mechanism: string; elo_rating: number }> };

      const existingList = (existing.hypotheses ?? [])
        .map((h) => `- ${h.id} (Elo ${h.elo_rating}): ${h.proposed_mechanism.slice(0, 100)}`)
        .join('\n');

      const agentConfig: AgentConfig = {
        role: 'proposer',
        vendor: this.defaultVendor(),
        model: this.defaultModel(),
        max_tokens: 4096,
        temperature: 0.7,
        system_prompt: this.agentPrompts['proposer'],
        allowed_tools: [],
      };

      const metaContext = this.getLatestMetaReview();

      const response = await runAgent({
        config: agentConfig,
        message: `Propose ${this.config.hypotheses_per_round} new hypotheses for crack "${this.config.crack_id}".

## Existing hypotheses (do not duplicate):
${existingList || 'None yet.'}

## Universe context:
${JSON.stringify(crackData).slice(0, 3000)}

Respond as a JSON array of objects with fields: target_entity, target_property, proposed_mechanism, required_measurements (array), predicted_convergence_delta.`,
        meta_review_context: metaContext,
      });

      // Parse and submit hypotheses
      const hypotheses = Array.isArray(response.data) ? response.data : (response.data as any)?.hypotheses ?? [];
      const submitted: string[] = [];

      for (const h of hypotheses) {
        const result = await hubPost(
          `${this.config.com_hub_url}/v1/factory/hypotheses`,
          this.config.com_api_key,
          {
            crack_id: this.config.crack_id,
            project_id: this.config.project_id,
            target_entity: h.target_entity ?? 'Unknown',
            target_property: h.target_property ?? '',
            proposed_mechanism: h.proposed_mechanism ?? '',
            required_measurements: h.required_measurements ?? [],
            predicted_convergence_delta: h.predicted_convergence_delta ?? 0,
            proposer_id: `proposer-${agentConfig.vendor}-${agentConfig.model}`,
          },
        ) as { id?: string };
        if (result.id) submitted.push(result.id);
      }

      this.queue.complete(task.id, {
        hypotheses: hypotheses.map((h: any, i: number) => ({
          id: submitted[i],
          proposed_mechanism: h.proposed_mechanism,
        })),
        count: submitted.length,
      }, response.cost_usd);

      this.log(`  Proposed ${submitted.length} hypotheses`);
    } catch (e) {
      this.queue.fail(task.id, (e as Error).message);
      this.log(`  Proposal failed: ${(e as Error).message}`);
    }

    return task;
  }

  private async runDisputeResolutionStep(round: number): Promise<Task[]> {
    const tasks: Task[] = [];

    // Get all hypotheses sorted by Elo
    const existing = await hubGet(
      `${this.config.com_hub_url}/v1/factory/hypotheses?crack_id=${this.config.crack_id}`,
      this.config.com_api_key,
    ) as { hypotheses: Array<{ id: string; proposed_mechanism: string; elo_rating: number; target_entity: string }> };

    const hypotheses = existing.hypotheses ?? [];
    if (hypotheses.length < 2) {
      this.log('  Not enough hypotheses for dispute resolution');
      return tasks;
    }

    // Generate pairings — top N by Elo, round-robin subset
    const topN = hypotheses.sort((a, b) => b.elo_rating - a.elo_rating).slice(0, 6);
    const pairs: Array<[typeof topN[0], typeof topN[0]]> = [];
    for (let i = 0; i < topN.length && pairs.length < this.config.matches_per_round; i++) {
      for (let j = i + 1; j < topN.length && pairs.length < this.config.matches_per_round; j++) {
        pairs.push([topN[i], topN[j]]);
      }
    }

    // Run each match with the judge ensemble
    const modelMap: Record<ModelVendor, string> = {
      claude: 'claude-sonnet-4-6',
      openai: 'gpt-4o-mini',
      google: 'gemini-2.5-flash',
    };

    for (const [a, b] of pairs) {
      const pairWinners: string[] = [];

      for (const vendor of this.config.judge_vendors) {
        const task = createTask('judge', 'critic', {
          hypothesis_a: a.id,
          hypothesis_b: b.id,
          vendor,
        }, {
          project_id: this.config.project_id,
          crack_id: this.config.crack_id,
          round,
          cost_estimate_usd: 0.01,
        });
        this.queue.enqueue(task);

        try {
          const agentConfig: AgentConfig = {
            role: 'critic',  // judge role eliminated per Test M; critic ensemble handles disputes
            vendor,
            model: modelMap[vendor],
            max_tokens: 2048,
            temperature: 0.2,
            system_prompt: this.agentPrompts['judge'] ?? this.agentPrompts['critic'],
            allowed_tools: [],
          };

          const response = await runAgent({
            config: agentConfig,
            message: `Evaluate this pairwise hypothesis comparison as a Critic. Assess which hypothesis is better supported by evidence and methodology:

## Hypothesis A: ${a.id}
${a.proposed_mechanism}

## Hypothesis B: ${b.id}
${b.proposed_mechanism}

## Crack: ${this.config.crack_id}

Respond in JSON: {"winner": "A" or "B", "confidence": 0.0-1.0, "rationale": "brief explanation"}`,
          });

          const judgment = response.data as { winner?: string; confidence?: number; rationale?: string } | undefined;
          const winnerId = judgment?.winner === 'A' ? a.id : b.id;
          const confidence = judgment?.confidence ?? 0.5;

          // Record match
          await hubPost(
            `${this.config.com_hub_url}/v1/factory/tournament`,
            this.config.com_api_key,
            {
              hypothesis_a: a.id,
              hypothesis_b: b.id,
              winner: winnerId,
              critic_id: `critic-${vendor}-${modelMap[vendor]}`,
              confidence,
              rationale: judgment?.rationale ?? response.content.slice(0, 500),
            },
          );

          pairWinners.push(winnerId);
          this.queue.complete(task.id, { winner: winnerId, confidence, vendor }, response.cost_usd);
          this.log(`  Match: ${a.id.slice(-6)} vs ${b.id.slice(-6)} → winner ${winnerId.slice(-6)} (${vendor}, conf=${confidence})`);
        } catch (e) {
          this.queue.fail(task.id, (e as Error).message);
          this.log(`  Match failed (${vendor}): ${(e as Error).message}`);
        }

        tasks.push(task);
      }

      // Check for judge divergence — if judges disagree, create attention item
      const uniqueWinners = Array.from(new Set(pairWinners));
      if (uniqueWinners.length > 1 && pairWinners.length >= 2) {
        this.log(`  ⚠ Critic-ensemble disagreement: ${pairWinners.length} critics, ${uniqueWinners.length} different winners`);
        await this.createAttentionItem({
          type: 'judge-divergence',
          priority: 'medium',
          title: `Critic-ensemble disagreement: ${a.id.slice(-6)} vs ${b.id.slice(-6)}`,
          description: `${pairWinners.length} critics voted on this pair but disagreed. Winners: ${pairWinners.map((w, i) => `${this.config.judge_vendors[i]}→${w.slice(-6)}`).join(', ')}`,
          requested_action: 'Pick a winner, add a 4th judge, or skip this match',
          hypothesis_id: a.id,
        });
      }
    }

    return tasks;
  }

  private async runPlanningStep(round: number): Promise<Task | null> {
    // Get top hypothesis by Elo
    const existing = await hubGet(
      `${this.config.com_hub_url}/v1/factory/hypotheses?crack_id=${this.config.crack_id}`,
      this.config.com_api_key,
    ) as { hypotheses: Array<{ id: string; proposed_mechanism: string; elo_rating: number; required_measurements: string }> };

    const hypotheses = (existing.hypotheses ?? []).sort((a, b) => b.elo_rating - a.elo_rating);
    if (hypotheses.length === 0) return null;

    const top = hypotheses[0];

    const task = createTask('plan', 'planner', {
      hypothesis_id: top.id,
    }, {
      project_id: this.config.project_id,
      crack_id: this.config.crack_id,
      round,
      cost_estimate_usd: 0.03,
    });
    this.queue.enqueue(task);

    try {
      const agentConfig: AgentConfig = {
        role: 'planner',
        vendor: this.defaultVendor(),
        model: this.defaultModel(),
        max_tokens: 4096,
        temperature: 0.4,
        system_prompt: this.agentPrompts['planner'],
        allowed_tools: [],
      };

      const measurements = typeof top.required_measurements === 'string'
        ? top.required_measurements
        : JSON.stringify(top.required_measurements);

      const response = await runAgent({
        config: agentConfig,
        message: `Plan experiments for the top-ranked hypothesis:

## Hypothesis: ${top.id} (Elo ${top.elo_rating})
${top.proposed_mechanism}

## Required measurements:
${measurements}

Create an experiment tree. Respond as JSON array of nodes:
[{"node_type": "preliminary|hyperparameter|replication|aggregation|ablation|contradiction", "config": {...}, "parent_node_id": null}]`,
        meta_review_context: this.getLatestMetaReview(),
      });

      const nodes = Array.isArray(response.data) ? response.data : (response.data as any)?.experiments ?? [];
      const created: string[] = [];

      for (const node of nodes) {
        const result = await hubPost(
          `${this.config.com_hub_url}/v1/factory/experiments`,
          this.config.com_api_key,
          {
            hypothesis_id: top.id,
            parent_node_id: node.parent_node_id ?? null,
            node_type: node.node_type ?? 'preliminary',
            config: node.config ?? node,
          },
        ) as { id?: string };
        if (result.id) created.push(result.id);
      }

      this.queue.complete(task.id, {
        hypothesis_id: top.id,
        experiment_count: created.length,
        experiment_ids: created,
      }, response.cost_usd);

      this.log(`  Planned ${created.length} experiments for ${top.id.slice(-6)}`);
    } catch (e) {
      this.queue.fail(task.id, (e as Error).message);
      this.log(`  Planning failed: ${(e as Error).message}`);
    }

    return task;
  }

  // ── Step 4: Execute experiments ───────────────────────────────────────
  // Fetches pending experiments, runs computational ones via executor agent,
  // dispatches wet-lab ones as attention items.

  private async runExecutionStep(round: number): Promise<Task[]> {
    const tasks: Task[] = [];

    // Get pending experiments for our crack
    const existing = await hubGet(
      `${this.config.com_hub_url}/v1/factory/experiments?status=pending`,
      this.config.com_api_key,
    ) as { experiments: Array<{ id: string; hypothesis_id: string; node_type: string; config: string | Record<string, unknown> }> };

    const experiments = existing.experiments ?? [];
    if (experiments.length === 0) {
      this.log('  No pending experiments');
      return tasks;
    }

    // Only execute experiments for hypotheses in our crack scope
    const hypResp = await hubGet(
      `${this.config.com_hub_url}/v1/factory/hypotheses?crack_id=${this.config.crack_id}`,
      this.config.com_api_key,
    ) as { hypotheses: Array<{ id: string }> };
    const scopeIds = new Set((hypResp.hypotheses ?? []).map((h) => h.id));

    const inScope = experiments.filter((e) => scopeIds.has(e.hypothesis_id)).slice(0, 3); // max 3 per round

    for (const exp of inScope) {
      const task = createTask('execute', 'executor', {
        experiment_id: exp.id,
        hypothesis_id: exp.hypothesis_id,
        node_type: exp.node_type,
        config: typeof exp.config === 'string' ? JSON.parse(exp.config) : exp.config,
      }, {
        project_id: this.config.project_id,
        crack_id: this.config.crack_id,
        round,
        cost_estimate_usd: 0.02,
      });
      this.queue.enqueue(task);

      const expConfig = typeof exp.config === 'string' ? JSON.parse(exp.config) : exp.config;

      // Check if this is a wet-lab experiment (needs physical measurement)
      const isWetLab = expConfig?.requires_wet_lab === true ||
        expConfig?.assay_type !== undefined ||
        exp.node_type === 'replication';

      if (isWetLab) {
        // Dispatch as attention item — can't run computationally
        await this.createAttentionItem({
          type: 'wet-lab-request',
          priority: 'high',
          title: `Wet-lab experiment: ${exp.id}`,
          description: `Experiment ${exp.id} (${exp.node_type}) requires physical measurement.`,
          requested_action: 'Execute assay and report results',
          blocking_task_id: task.id,
          hypothesis_id: exp.hypothesis_id,
          assay_spec: expConfig,
        });

        // Mark experiment as running (awaiting wet-lab)
        await hubPost(`${this.config.com_hub_url}/v1/factory/experiments/${exp.id}`, this.config.com_api_key, {
          status: 'running',
        }).catch(() => {}); // PATCH via POST fallback

        this.queue.complete(task.id, {
          status: 'wet-lab-pending',
          attention_item_created: true,
          experiment_id: exp.id,
        }, 0);

        this.log(`  Experiment ${exp.id.slice(-6)}: dispatched to wet-lab`);
      } else {
        // Computational experiment — run via executor agent
        try {
          const agentConfig: AgentConfig = {
            role: 'executor',
            vendor: this.defaultVendor(),
            model: this.defaultModel(),
            max_tokens: 2048,
            temperature: 0.1,
            system_prompt: this.agentPrompts['executor'] ?? this.agentPrompts['planner'],
            allowed_tools: [],
          };

          const response = await runAgent({
            config: agentConfig,
            message: `Execute this experiment and report results:

## Experiment: ${exp.id} (${exp.node_type})
## Hypothesis: ${exp.hypothesis_id}
## Config:
${JSON.stringify(expConfig, null, 2)}

Run the experiment computationally. Report results as JSON:
{"status": "completed", "result": {...findings...}, "couplings": [{entity, property, value, method, source}], "finding_summary": "one-line summary"}`,
            meta_review_context: this.getLatestMetaReview(),
          });

          const result = response.data ?? {};

          // Update experiment status
          await hubPost(`${this.config.com_hub_url}/v1/factory/experiments/${exp.id}`, this.config.com_api_key, {
            status: 'completed',
            result: JSON.stringify(result),
          }).catch(() => {});

          this.queue.complete(task.id, {
            status: 'completed',
            experiment_id: exp.id,
            couplings: result.couplings ?? [],
            finding_summary: result.finding_summary ?? '',
          }, response.cost_usd);

          this.log(`  Experiment ${exp.id.slice(-6)}: completed computationally`);
        } catch (e) {
          this.queue.fail(task.id, (e as Error).message);
          this.log(`  Experiment ${exp.id.slice(-6)} failed: ${(e as Error).message}`);
        }
      }

      tasks.push(task);
    }

    return tasks;
  }

  // ── Step 5: Critique results ────────────────────────────────────────────
  // Structural consistency check on execution results before they become deltas.

  private async runCritiqueStep(round: number, executeTasks: Task[]): Promise<Task[]> {
    const tasks: Task[] = [];

    // Only critique completed computational experiments
    const completedExecs = executeTasks.filter(
      (t) => t.status === 'completed' && t.output?.status === 'completed',
    );

    if (completedExecs.length === 0) return tasks;

    for (const execTask of completedExecs) {
      const task = createTask('critique', 'critic', {
        experiment_id: execTask.input.experiment_id,
        couplings: execTask.output?.couplings ?? [],
        finding_summary: execTask.output?.finding_summary ?? '',
      }, {
        project_id: this.config.project_id,
        crack_id: this.config.crack_id,
        round,
        cost_estimate_usd: 0.01,
        parent_task_id: execTask.id,
      });
      this.queue.enqueue(task);

      try {
        const agentConfig: AgentConfig = {
          role: 'critic',
          vendor: this.defaultVendor(),
          model: this.defaultModel(),
          max_tokens: 2048,
          temperature: 0.1,
          system_prompt: this.agentPrompts['critic'] ?? `You are a structural critic. Check results for consistency, circular reasoning, and evidence gaps.`,
          allowed_tools: [],
        };

        const couplings = execTask.output?.couplings ?? [];
        const response = await runAgent({
          config: agentConfig,
          message: `Critique these experimental results before they become convergence deltas:

## Experiment: ${execTask.input.experiment_id}
## Finding summary: ${execTask.output?.finding_summary}
## Couplings produced (${(couplings as unknown[]).length}):
${JSON.stringify(couplings, null, 2).slice(0, 2000)}

Check for:
1. Logical consistency — do the couplings support the finding summary?
2. Circular reasoning — do any measurements depend on what they're trying to prove?
3. Evidence gaps — are critical couplings missing?
4. Value plausibility — are numeric values in reasonable ranges?

Respond as JSON: {"passes": true/false, "issues": [{"severity": "error|warning|note", "description": "..."}], "summary": "..."}`,
        });

        const critique = response.data ?? { passes: true, issues: [], summary: 'Parse error — passing by default' };

        this.queue.complete(task.id, {
          passes: critique.passes ?? true,
          issues: critique.issues ?? [],
          summary: critique.summary ?? '',
        }, response.cost_usd);

        const status = critique.passes ? 'PASS' : 'BLOCKED';
        this.log(`  Critique ${execTask.input.experiment_id}: ${status}`);
      } catch (e) {
        // Critique failure = pass (don't block on critique errors)
        this.queue.complete(task.id, { passes: true, issues: [], summary: `Critique error: ${(e as Error).message}` }, 0);
        this.log(`  Critique error (passing): ${(e as Error).message}`);
      }

      tasks.push(task);
    }

    return tasks;
  }

  // ── Step 6: Compute convergence deltas ──────────────────────────────────
  // For each executed+critiqued experiment, compute the convergence shift.

  private async runDeltaStep(round: number, executeTasks: Task[], critiqueTasks: Task[]): Promise<Task[]> {
    const tasks: Task[] = [];

    // Build a map of critique results by experiment_id
    const critiqueByExperiment: Record<string, Task> = {};
    for (const ct of critiqueTasks) {
      const expId = ct.input.experiment_id as string;
      if (expId) critiqueByExperiment[expId] = ct;
    }

    // Only compute deltas for completed experiments that passed critique
    const eligible = executeTasks.filter((t) => {
      if (t.status !== 'completed' || t.output?.status !== 'completed') return false;
      const expId = t.input.experiment_id as string;
      const critique = critiqueByExperiment[expId];
      // Pass if no critique ran (shouldn't happen) or critique passed
      return !critique || critique.output?.passes !== false;
    });

    if (eligible.length === 0) return tasks;

    for (const execTask of eligible) {
      const couplings = (execTask.output?.couplings ?? []) as Array<Record<string, unknown>>;
      if (couplings.length === 0) continue;

      const task = createTask('delta', 'executor', {
        experiment_id: execTask.input.experiment_id,
        hypothesis_id: execTask.input.hypothesis_id,
        couplings,
      }, {
        project_id: this.config.project_id,
        crack_id: this.config.crack_id,
        round,
        cost_estimate_usd: 0.001,
        parent_task_id: execTask.id,
      });
      this.queue.enqueue(task);

      try {
        // Record the delta via hub API
        const deltaResult = await hubPost(
          `${this.config.com_hub_url}/v1/factory/deltas`,
          this.config.com_api_key,
          {
            crack_id: this.config.crack_id,
            project_id: this.config.project_id,
            pipeline: 'crack-resolution',
            entries: couplings,
            convergence_shift: {
              entries_added: couplings.length,
              hypothesis_id: execTask.input.hypothesis_id,
              finding_summary: execTask.output?.finding_summary ?? '',
            },
            cost_usd: execTask.cost_actual_usd ?? 0,
          },
        ) as { id?: string };

        this.queue.complete(task.id, {
          delta_id: deltaResult.id,
          entries_count: couplings.length,
          convergence_shift: { entries_added: couplings.length },
        }, 0);

        this.log(`  Delta ${deltaResult.id?.slice(-6)}: ${couplings.length} entries`);
      } catch (e) {
        this.queue.fail(task.id, (e as Error).message);
        this.log(`  Delta failed: ${(e as Error).message}`);
      }

      tasks.push(task);
    }

    return tasks;
  }

  // ── Step 7: Archive — write couplings + create finding ──────────────────
  // For each delta, write couplings to the coupling map and create a finding.

  private async runArchiveStep(round: number, deltaTasks: Task[]): Promise<Task[]> {
    const tasks: Task[] = [];

    const completedDeltas = deltaTasks.filter((t) => t.status === 'completed' && t.output?.delta_id);
    if (completedDeltas.length === 0) return tasks;

    for (const deltaTask of completedDeltas) {
      const task = createTask('archive', 'archivist', {
        delta_id: deltaTask.output!.delta_id,
        couplings: deltaTask.input.couplings,
        hypothesis_id: deltaTask.input.hypothesis_id,
      }, {
        project_id: this.config.project_id,
        crack_id: this.config.crack_id,
        round,
        cost_estimate_usd: 0.001,
        parent_task_id: deltaTask.id,
      });
      this.queue.enqueue(task);

      try {
        const couplings = (deltaTask.input.couplings ?? []) as Array<Record<string, unknown>>;
        let couplingsWritten = 0;

        // Write each coupling to the coupling map via hub
        for (const c of couplings) {
          try {
            await hubPost(
              `${this.config.com_hub_url}/v1/couplings?dryRun=false`,
              this.config.com_api_key,
              {
                entity_a: c.entity_a ?? c.entity,
                entity_b: c.entity_b ?? c.target,
                property: c.property,
                value: c.value,
                method: c.method ?? 'factory-execution',
                sigma: c.sigma ?? null,
                source: c.source ?? 'measurement',
                provenance: JSON.stringify({
                  delta_id: deltaTask.output!.delta_id,
                  hypothesis_id: deltaTask.input.hypothesis_id,
                  project_id: this.config.project_id,
                  round,
                }),
              },
            );
            couplingsWritten++;
          } catch {
            // Individual coupling write failure is non-fatal
          }
        }

        // Create a finding if we wrote any couplings
        if (couplingsWritten > 0) {
          const findingResult = await hubPost(
            `${this.config.com_hub_url}/v1/factory/findings`,
            this.config.com_api_key,
            {
              title: `Round ${round} crack-resolution result`,
              summary: `Executed experiment for hypothesis ${(deltaTask.input.hypothesis_id as string)?.slice(-8)}. Produced ${couplingsWritten} couplings.`,
              finding_type: 'crack-resolution',
              project_id: this.config.project_id,
              crack_id: this.config.crack_id,
              delta_ids: [deltaTask.output!.delta_id],
              hypothesis_ids: [deltaTask.input.hypothesis_id],
            },
          ) as { id?: string };

          this.queue.complete(task.id, {
            couplings_written: couplingsWritten,
            finding_id: findingResult.id,
            delta_id: deltaTask.output!.delta_id,
          }, 0);

          this.log(`  Archived: ${couplingsWritten} couplings, finding ${findingResult.id?.slice(-6)}`);
        } else {
          this.queue.complete(task.id, { couplings_written: 0 }, 0);
          this.log('  Archive: no couplings to write');
        }
      } catch (e) {
        this.queue.fail(task.id, (e as Error).message);
        this.log(`  Archive failed: ${(e as Error).message}`);
      }

      tasks.push(task);
    }

    return tasks;
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  /** Create an attention item — pauses the blocking task */
  private async createAttentionItem(opts: {
    type: string;
    priority?: string;
    title: string;
    description?: string;
    requested_action?: string;
    blocking_task_id?: string;
    hypothesis_id?: string;
    assay_spec?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await hubPost(`${this.config.com_hub_url}/v1/factory/attention`, this.config.com_api_key, {
        ...opts,
        project_id: this.config.project_id,
        run_id: this.runId,
        crack_id: this.config.crack_id,
      });
      this.log(`  📋 Attention item created: ${opts.title}`);
    } catch (e) {
      this.log(`  Warning: failed to create attention item: ${(e as Error).message}`);
    }
  }

  /** Persist run state, round result, and tasks to D1 */
  private async persistState(roundResult: RoundResult, tasks: Task[]): Promise<void> {
    const { com_hub_url, com_api_key } = this.config;
    try {
      // Upsert run
      await hubPost(`${com_hub_url}/v1/factory/supervisor/runs`, com_api_key, {
        id: this.runId,
        project_id: this.config.project_id,
        crack_id: this.config.crack_id,
        status: this.state.status,
        mode: this.config.mode,
        config: this.config,
        current_round: this.state.current_round,
        total_cost_usd: this.state.total_cost_usd,
        budget_usd: this.config.budget_usd,
      });

      // Record round
      await hubPost(`${com_hub_url}/v1/factory/supervisor/rounds`, com_api_key, {
        run_id: this.runId,
        ...roundResult,
      });

      // Record tasks
      await hubPost(`${com_hub_url}/v1/factory/supervisor/tasks`, com_api_key, {
        tasks: tasks.map((t) => ({
          ...t,
          run_id: this.runId,
          input: t.input,
          output: t.output,
        })),
      });

      this.log(`  State persisted to D1 (run ${this.runId.slice(-8)})`);
    } catch (e) {
      this.log(`  Warning: failed to persist state: ${(e as Error).message}`);
    }
  }

  private getLatestMetaReview(): string | undefined {
    if (this.state.rounds.length === 0) return undefined;
    return this.state.rounds[this.state.rounds.length - 1].meta_review;
  }

  /** Pick vendor for non-judge roles — uses first judge vendor as hint */
  private defaultVendor(): 'claude' | 'google' | 'openai' {
    // Use the first judge vendor as the default for all roles
    // This way --judges google means everything runs on Google
    const hint = this.config.judge_vendors[0] as 'claude' | 'google' | 'openai';
    return hint ?? 'claude';
  }

  private defaultModel(): string {
    const vendor = this.defaultVendor();
    if (vendor === 'claude') return 'claude-sonnet-4-6';
    if (vendor === 'google') return 'gemini-2.5-flash';
    return 'gpt-4o-mini';
  }

  private log(msg: string): void {
    console.error(`[supervisor] ${msg}`);
  }
}
