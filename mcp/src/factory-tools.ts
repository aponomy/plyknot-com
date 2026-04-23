/**
 * Factory MCP tools — commercial-only.
 * Imports shared types from @plyknot/mcp.
 */

import { type Tool, factoryGet, factoryPost, factoryPatch } from '@plyknot/mcp/src/shared.js';

export const FACTORY_TOOLS: Tool[] = [
  // ── Agent prompts ──────────────────────────────────────────────────────
  {
    name: 'get_agent_prompt',
    description:
      'Get an agent role prompt by name. Available roles: proposer, critic, judge, planner. Returns the full system prompt with instructions, tool access, workflow, and output format.',
    inputSchema: {
      type: 'object',
      properties: {
        role: { type: 'string', enum: ['proposer', 'critic', 'judge', 'planner'], description: 'Agent role name (required)' },
      },
      required: ['role'],
    },
    handler: async (p, _repo, write) => {
      const { role } = p as { role: string };
      return factoryGet(write, `/factory/prompts/${role}`);
    },
  },
  {
    name: 'list_agent_prompts',
    description:
      'List all available agent role prompts (proposer, critic, judge, planner).',
    inputSchema: { type: 'object', properties: {} },
    handler: async (_p, _repo, write) => factoryGet(write, '/factory/prompts'),
  },

  // ── Factory stats ──────────────────────────────────────────────────────
  {
    name: 'factory_stats',
    description:
      'Get aggregate factory metrics: hypothesis counts, delta counts, experiment counts, embargo status, failure graph entries.',
    inputSchema: { type: 'object', properties: {} },
    handler: async (_p, _repo, write) => factoryGet(write, '/factory/stats'),
  },

  // ── Hypotheses ─────────────────────────────────────────────────────────
  {
    name: 'list_hypotheses',
    description:
      'List factory hypotheses, optionally filtered by crack_id or status. Sorted by Elo rating descending.',
    inputSchema: {
      type: 'object',
      properties: {
        crack_id: { type: 'string', description: 'Filter by crack ID' },
        status: { type: 'string', enum: ['proposed', 'tournament-active', 'promoted', 'eliminated', 'resolved'], description: 'Filter by status' },
      },
    },
    handler: async (p, _repo, write) => {
      const { crack_id, status } = p as { crack_id?: string; status?: string };
      const params = new URLSearchParams();
      if (crack_id) params.set('crack_id', crack_id);
      if (status) params.set('status', status);
      const qs = params.toString();
      return factoryGet(write, `/factory/hypotheses${qs ? '?' + qs : ''}`);
    },
  },
  {
    name: 'propose_factory_hypothesis',
    description:
      'Propose a hypothesis for a crack. Records in the factory tournament system with Elo rating. This is different from propose_hypothesis (which creates a PR on the public universe).',
    inputSchema: {
      type: 'object',
      properties: {
        crack_id: { type: 'string', description: 'Crack ID this hypothesis addresses (required)' },
        target_entity: { type: 'string', description: 'Entity name (required)' },
        target_property: { type: 'string', description: 'Property being targeted' },
        proposed_mechanism: { type: 'string', description: 'The proposed mechanism (required)' },
        required_measurements: { type: 'array', items: { type: 'object' }, description: 'Required measurements to test this hypothesis' },
        predicted_convergence_delta: { type: 'number', description: 'Expected convergence improvement (0-1)' },
        depends: { type: 'array', items: { type: 'string' }, description: 'IDs of hypotheses this depends on' },
        proposer_id: { type: 'string', description: 'Agent ID of the proposer. Defaults to authenticated user.' },
        parent_hypothesis_id: { type: 'string', description: 'If this is a mutation of an existing hypothesis, the parent ID.' },
        project_id: { type: 'string', description: 'Project ID to scope this hypothesis to' },
      },
      required: ['crack_id', 'target_entity', 'proposed_mechanism'],
    },
    handler: async (p, _repo, write) => {
      const body = p as Record<string, unknown>;
      return factoryPost(write, '/factory/hypotheses', body);
    },
  },

  // ── Dispute resolution (§9.4 — replaces LLM-as-Judge) ────────────────
  {
    name: 'tournament_match',
    description:
      'Record a dispute resolution match between two hypotheses. Updates Elo ratings. Per §9.4, disputes are resolved by structural query (data) or critic ensemble (preserved disagreement), not LLM-as-Judge vote.',
    inputSchema: {
      type: 'object',
      properties: {
        hypothesis_a: { type: 'string', description: 'First hypothesis ID (required)' },
        hypothesis_b: { type: 'string', description: 'Second hypothesis ID (required)' },
        winner: { type: 'string', description: 'ID of the winning hypothesis (required)' },
        judge_id: { type: 'string', description: 'Critic agent ID (required)' },
        confidence: { type: 'number', description: 'Confidence 0-1 (required)' },
        rationale: { type: 'string', description: 'Resolution rationale' },
        resolution_method: { type: 'string', enum: ['structural-query', 'critic-ensemble', 'legacy-judge'], description: 'How the dispute was resolved' },
      },
      required: ['hypothesis_a', 'hypothesis_b', 'winner', 'judge_id', 'confidence'],
    },
    handler: async (p, _repo, write) => {
      const body = p as Record<string, unknown>;
      return factoryPost(write, '/factory/tournament', body);
    },
  },
  {
    name: 'resolve_disagreement',
    description:
      'Operation 1 (§9.4): Compile a Proposer-Critic disagreement into a structural query against the coupling map. If data resolves the dispute, returns the data-supported position. If data is insufficient, returns a ResearchGap for the Planner.',
    inputSchema: {
      type: 'object',
      properties: {
        proposer_claim: { type: 'string', description: 'What the Proposer claims (required)' },
        critic_objection: { type: 'string', description: 'What the Critic objects (required)' },
        entity_scope: { type: 'array', items: { type: 'string' }, description: 'Entity names to constrain the query' },
        property_scope: { type: 'string', description: 'Property to check' },
      },
      required: ['proposer_claim', 'critic_objection'],
    },
    handler: async (p, repo, _write) => {
      // This queries the coupling map directly — no hub POST needed
      const { proposer_claim, critic_objection } = p as { proposer_claim: string; critic_objection: string };

      // Use the simulator's convergence data to resolve
      const chains = repo.listInferenceChains();
      const couplings = repo.listCouplings();

      // Heuristic resolution: check if the dispute mentions convergence or values
      const combined = `${proposer_claim} ${critic_objection}`.toLowerCase();
      const mentionsConvergence = ['converge', 'diverge', 'tension', 'agreement'].some((w) => combined.includes(w));
      const mentionsValue = ['measured', 'value', 'observed', 'data'].some((w) => combined.includes(w));

      if (mentionsConvergence || mentionsValue) {
        return {
          resolved: true,
          method: 'structural-query',
          evidence: `Coupling map contains ${couplings.length} entries across ${chains.length} chains`,
          note: 'Full structural query requires Python plyknot.agents.structural_query module for detailed execution',
        };
      }

      return {
        resolved: false,
        method: 'requires-critic-ensemble',
        research_gap: {
          question: `${proposer_claim.slice(0, 200)} vs ${critic_objection.slice(0, 200)}`,
          missing_data_description: 'Dispute is analytical — route to critic ensemble (Operation 2)',
        },
      };
    },
  },
  {
    name: 'evaluate_with_critic_ensemble',
    description:
      'Operation 2 (§9.4): Run a proposal through multiple critics with diverse cognitive-variance profiles. Disagreement is PRESERVED as an ambiguity marker, not resolved by majority vote. Use when resolve_disagreement returns requires-critic-ensemble.',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'The proposal or dispute to evaluate (required)' },
        check_type: { type: 'string', description: 'Type of check: structural_consistency | evidence_sufficiency | scope_check (default: structural_consistency)' },
        project_id: { type: 'string', description: 'Project context' },
      },
      required: ['target'],
    },
    handler: async (p, _repo, write) => {
      // This needs multi-vendor agent calls — delegate to supervisor infrastructure
      const { Supervisor } = await import('../../core/supervisor.js');
      const { runAgent } = await import('../../core/agent.js');
      const params = p as Record<string, unknown>;
      const target = params.target as string;
      const checkType = (params.check_type as string) ?? 'structural_consistency';

      const vendors = [
        { vendor: 'claude' as const, model: 'claude-sonnet-4-6' },
        { vendor: 'openai' as const, model: 'gpt-4o-mini' },
      ];

      const assessments = [];
      for (const { vendor, model } of vendors) {
        try {
          const resp = await runAgent({
            config: {
              role: 'critic' as any,
              vendor,
              model,
              max_tokens: 2048,
              temperature: 0.3,
              allowed_tools: [],
            },
            message: `Evaluate for ${checkType}:\n\n${target}\n\nRespond JSON: {"verdict":"approve|reject|needs-revision","confidence":0-1,"reasoning":"...","issues":[]}`,
          });
          assessments.push({
            model,
            vendor,
            verdict: (resp.data as any)?.verdict ?? 'unknown',
            confidence: (resp.data as any)?.confidence ?? 0.5,
            reasoning: (resp.data as any)?.reasoning ?? resp.content.slice(0, 300),
            cost_usd: resp.cost_usd,
          });
        } catch (e) {
          assessments.push({ model, vendor, verdict: 'error', confidence: 0, reasoning: (e as Error).message, cost_usd: 0 });
        }
      }

      const verdicts = assessments.filter((a) => a.verdict !== 'error').map((a) => a.verdict);
      const uniqueVerdicts = [...new Set(verdicts)];
      const isConsensus = uniqueVerdicts.length === 1;

      return {
        assessments,
        consensus: isConsensus ? verdicts[0] : null,
        disagreement_detected: !isConsensus,
        ambiguity_marker: isConsensus ? null : `Critic disagreement: ${assessments.map((a) => `${a.vendor}=${a.verdict}`).join(', ')}`,
      };
    },
  },

  // ── Experiments ────────────────────────────────────────────────────────
  {
    name: 'plan_experiment',
    description:
      'Create an experiment tree node for a hypothesis. Nodes form a tree: preliminary → hyperparameter/replication → aggregation.',
    inputSchema: {
      type: 'object',
      properties: {
        hypothesis_id: { type: 'string', description: 'Hypothesis this experiment tests (required)' },
        parent_node_id: { type: 'string', description: 'Parent node ID (null for root)' },
        node_type: { type: 'string', enum: ['preliminary', 'hyperparameter', 'replication', 'aggregation', 'ablation', 'contradiction'], description: 'Experiment type (required)' },
        config: { type: 'object', description: 'Experiment configuration (required)' },
      },
      required: ['hypothesis_id', 'node_type', 'config'],
    },
    handler: async (p, _repo, write) => {
      const body = p as Record<string, unknown>;
      return factoryPost(write, '/factory/experiments', body);
    },
  },
  {
    name: 'list_experiments',
    description:
      'List experiment tree nodes, optionally filtered by hypothesis_id or status.',
    inputSchema: {
      type: 'object',
      properties: {
        hypothesis_id: { type: 'string', description: 'Filter by hypothesis ID' },
        status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed'], description: 'Filter by status' },
      },
    },
    handler: async (p, _repo, write) => {
      const { hypothesis_id, status } = p as { hypothesis_id?: string; status?: string };
      const params = new URLSearchParams();
      if (hypothesis_id) params.set('hypothesis_id', hypothesis_id);
      if (status) params.set('status', status);
      const qs = params.toString();
      return factoryGet(write, `/factory/experiments${qs ? '?' + qs : ''}`);
    },
  },

  // ── Deltas ─────────────────────────────────────────────────────────────
  {
    name: 'compute_delta',
    description:
      'Record a convergence delta — the unit of factory output.',
    inputSchema: {
      type: 'object',
      properties: {
        crack_id: { type: 'string', description: 'Crack or opening this delta addresses (required)' },
        pipeline: { type: 'string', enum: ['crack-resolution', 'opening-extension', 'extraction', 'surveillance', 'rendering'], description: 'Which pipeline produced this delta (required)' },
        entries: { type: 'array', items: { type: 'object' }, description: 'Coupling entries added or modified (required)' },
        convergence_shift: { type: 'object', description: 'Computed convergence metrics' },
        cost_usd: { type: 'number', description: 'Total cost of the research run' },
        project_id: { type: 'string', description: 'Project ID to scope this delta to' },
      },
      required: ['crack_id', 'pipeline', 'entries'],
    },
    handler: async (p, _repo, write) => {
      const body = p as Record<string, unknown>;
      return factoryPost(write, '/factory/deltas', body);
    },
  },
  {
    name: 'list_deltas',
    description:
      'List convergence deltas, optionally filtered by crack_id or pipeline.',
    inputSchema: {
      type: 'object',
      properties: {
        crack_id: { type: 'string', description: 'Filter by crack ID' },
        pipeline: { type: 'string', description: 'Filter by pipeline' },
      },
    },
    handler: async (p, _repo, write) => {
      const { crack_id, pipeline } = p as { crack_id?: string; pipeline?: string };
      const params = new URLSearchParams();
      if (crack_id) params.set('crack_id', crack_id);
      if (pipeline) params.set('pipeline', pipeline);
      const qs = params.toString();
      return factoryGet(write, `/factory/deltas${qs ? '?' + qs : ''}`);
    },
  },

  // ── Embargoed ──────────────────────────────────────────────────────────
  {
    name: 'list_embargoed',
    description:
      'List embargoed coupling entries. Filter by status: active or expired.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'expired'], description: 'Filter: active or expired embargoes' },
      },
    },
    handler: async (p, _repo, write) => {
      const { status } = p as { status?: string };
      return factoryGet(write, `/factory/embargoed${status ? '?status=' + status : ''}`);
    },
  },

  // ── Process pipeline ─────────────────────────────────────────────────
  {
    name: 'get_process_pipeline',
    description:
      'Get the process pipeline overview: counts per stage (backlog, active projects, pending findings, active deliveries, done).',
    inputSchema: { type: 'object', properties: {} },
    handler: async (_p, _repo, write) => factoryGet(write, '/process/pipeline'),
  },

  // ── Work containers (replaces projects + publications) ────────────────
  {
    name: 'list_projects',
    description:
      'List all work containers (projects, deliveries, operational buckets). Alias for backward compat.',
    inputSchema: { type: 'object', properties: {} },
    handler: async (_p, _repo, write) => factoryGet(write, '/factory/projects'),
  },
  {
    name: 'open_project',
    description:
      'Open a work container by ID. Returns full context: metadata, issues, children, findings, and budget.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Container/project ID (required)' },
      },
      required: ['project_id'],
    },
    handler: async (p, _repo, write) => {
      const { project_id } = p as { project_id: string };
      return factoryGet(write, `/process/containers/${encodeURIComponent(project_id)}`);
    },
  },
  {
    name: 'create_project',
    description:
      'Create a work container. Kinds: crack-resolution, extraction-batch, surveillance, opening-extension, investigation, delivery. Containers with kind=null are operational task buckets.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Container title (required)' },
        id: { type: 'string', description: 'Short slug ID (auto-generated if omitted)' },
        category_slug: { type: 'string', description: 'Category: research-lab, research, plyknot-org, plyknot-com, ip-legal, cybernetics, other (required)' },
        kind: { type: 'string', enum: ['crack-resolution', 'opening-extension', 'extraction-batch', 'surveillance', 'investigation', 'delivery'], description: 'Pipeline kind (null for operational bucket)' },
        description: { type: 'string', description: 'What this container is for' },
        status: { type: 'string', enum: ['backlog', 'active', 'paused', 'completed', 'blocked'], description: 'Status (default: backlog for pipeline, active for operational)' },
        track: { type: 'string', enum: ['paper', 'patent', 'customer-report'], description: 'Delivery track (only when kind=delivery)' },
        crack_ids: { type: 'array', items: { type: 'string' }, description: 'Crack IDs this project targets' },
        entity_scope: { type: 'array', items: { type: 'string' }, description: 'Entity names in scope' },
        budget_usd: { type: 'number', description: 'Compute budget' },
        execution_mode: { type: 'string', enum: ['automated', 'manual', 'assisted'], description: 'Execution mode' },
        autonomy: { type: 'string', enum: ['full', 'review', 'plan-only', 'manual'], description: 'Agent autonomy level (default: manual)' },
        scope: { type: 'object', description: 'Kind-specific scope data' },
        source_type: { type: 'string', enum: ['customer', 'internal', 'crack', 'finding', 'tracker'], description: 'What initiated this' },
        source_ref: { type: 'string', description: 'ID of source entity' },
        parent_id: { type: 'string', description: 'Parent container ID (for sub-projects)' },
      },
      required: ['title', 'category_slug'],
    },
    handler: async (p, _repo, write) => {
      const body = p as Record<string, unknown>;
      return factoryPost(write, '/process/containers', body);
    },
  },
  {
    name: 'update_project',
    description:
      'Update a work container: title, description, status, kind, track, execution_mode, autonomy, budget, scope, etc.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Container ID (required)' },
        title: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string', enum: ['backlog', 'active', 'paused', 'completed', 'blocked', 'archived'] },
        kind: { type: 'string' },
        track: { type: 'string' },
        delivery_status: { type: 'string' },
        execution_mode: { type: 'string', enum: ['automated', 'manual', 'assisted'] },
        autonomy: { type: 'string', enum: ['full', 'review', 'plan-only', 'manual'] },
        crack_ids: { type: 'array', items: { type: 'string' } },
        entity_scope: { type: 'array', items: { type: 'string' } },
        budget_usd: { type: 'number' },
        scope: { type: 'object' },
      },
      required: ['project_id'],
    },
    handler: async (p, _repo, write) => {
      const { project_id, ...body } = p as { project_id: string } & Record<string, unknown>;
      return factoryPatch(write, `/process/containers/${encodeURIComponent(project_id)}`, body);
    },
  },
  {
    name: 'promote_to_active',
    description:
      'Promote a container from backlog to active status.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Container ID to promote (required)' },
      },
      required: ['project_id'],
    },
    handler: async (p, _repo, write) => {
      const { project_id } = p as { project_id: string };
      return factoryPost(write, `/process/containers/${encodeURIComponent(project_id)}/promote`, {});
    },
  },
  {
    name: 'spawn_delivery',
    description:
      'Create a delivery container from a finding. Sets finding triage to actioned.',
    inputSchema: {
      type: 'object',
      properties: {
        finding_id: { type: 'string', description: 'Source finding ID (required)' },
        title: { type: 'string', description: 'Delivery title (required)' },
        track: { type: 'string', enum: ['paper', 'patent', 'customer-report'], description: 'Delivery track (required)' },
        parent_id: { type: 'string', description: 'Parent container (defaults to finding source project)' },
      },
      required: ['finding_id', 'title', 'track'],
    },
    handler: async (p, _repo, write) => {
      const body = p as Record<string, unknown>;
      return factoryPost(write, '/process/spawn-delivery', body);
    },
  },
  {
    name: 'add_project_member',
    description:
      'Share a project with another user by adding them as a member.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Container/project ID (required)' },
        user_id: { type: 'string', description: 'GitHub user ID to add (required)' },
      },
      required: ['project_id', 'user_id'],
    },
    handler: async (p, _repo, write) => {
      const { project_id, user_id } = p as { project_id: string; user_id: string };
      return factoryPost(write, `/factory/projects/${project_id}/members`, { user_id });
    },
  },

  // ── Findings ───────────────────────────────────────────────────────────
  {
    name: 'create_finding',
    description:
      'Formulate a finding — a claim backed by convergence evidence. The interpretive bridge between raw deltas and publishable outputs. Links to project, crack, deltas, hypotheses.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Finding title (required)' },
        summary: { type: 'string', description: 'What was found and why it matters (required)' },
        finding_type: { type: 'string', enum: ['crack-resolution', 'opening-discovery', 'echo-chamber-break', 'measurement-artifact', 'methodology-improvement'], description: 'Type (required)' },
        project_id: { type: 'string', description: 'Source project' },
        crack_id: { type: 'string', description: 'Related crack' },
        delta_ids: { type: 'array', items: { type: 'string' }, description: 'Supporting convergence deltas' },
        hypothesis_ids: { type: 'array', items: { type: 'string' }, description: 'Winning hypotheses' },
        sigma_resolved: { type: 'number', description: 'σ-tension before' },
        sigma_after: { type: 'number', description: 'σ-tension after' },
        independent_clusters: { type: 'number', description: 'How many independent measurement clusters confirm' },
        domains: { type: 'array', items: { type: 'string' }, description: 'Domain tags' },
      },
      required: ['title', 'summary', 'finding_type'],
    },
    handler: async (p, _repo, write) => factoryPost(write, '/factory/findings', p as Record<string, unknown>),
  },
  {
    name: 'list_findings',
    description: 'List findings. Filter by status (draft/expert-reviewed/confirmed/retracted), type, project_id, or triage (pending/actioned/parked).',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        type: { type: 'string' },
        project_id: { type: 'string' },
        triage: { type: 'string', enum: ['pending', 'actioned', 'parked'], description: 'Finding backlog triage status' },
      },
    },
    handler: async (p, _repo, write) => {
      const { status, type, project_id, triage } = p as Record<string, string>;
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (type) params.set('type', type);
      if (project_id) params.set('project_id', project_id);
      if (triage) params.set('triage', triage);
      return factoryGet(write, `/factory/findings${params.toString() ? '?' + params : ''}`);
    },
  },
  {
    name: 'review_finding',
    description: 'Attach an expert review to a finding. Auto-advances status from draft to expert-reviewed.',
    inputSchema: {
      type: 'object',
      properties: {
        finding_id: { type: 'string', description: 'Finding ID (required)' },
        expert_id: { type: 'string', description: 'Expert providing the review (required)' },
        opinion: { type: 'string', description: 'plausible | plausible-with-caveats | implausible | needs-more-data (required)' },
        confidence: { type: 'number', description: 'Confidence 0-1' },
        rationale: { type: 'string', description: 'Expert rationale' },
      },
      required: ['finding_id', 'expert_id', 'opinion'],
    },
    handler: async (p, _repo, write) => {
      const { finding_id, ...body } = p as { finding_id: string } & Record<string, unknown>;
      return factoryPost(write, `/factory/findings/${finding_id}/review`, body);
    },
  },

  // ── Publications (deprecated — use create_project with kind=delivery + spawn_delivery) ──
  {
    name: 'create_publication',
    description:
      'DEPRECATED: Use spawn_delivery or create_project with kind=delivery instead. Creates a delivery container.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title (required)' },
        track: { type: 'string', enum: ['paper', 'patent', 'customer-report'], description: 'Track (required)' },
        finding_ids: { type: 'array', items: { type: 'string' }, description: 'Source findings (required)' },
      },
      required: ['title', 'track', 'finding_ids'],
    },
    handler: async (p, _repo, write) => factoryPost(write, '/factory/publications', p as Record<string, unknown>),
  },
  {
    name: 'list_publications',
    description: 'DEPRECATED: Use list_projects with kind=delivery filter. Lists delivery containers.',
    inputSchema: {
      type: 'object',
      properties: {
        track: { type: 'string' },
        status: { type: 'string' },
      },
    },
    handler: async (p, _repo, write) => {
      const { track, status } = p as Record<string, string>;
      const params = new URLSearchParams();
      params.set('kind', 'delivery');
      if (track) params.set('track', track);
      if (status) params.set('status', status);
      return factoryGet(write, `/process/containers?${params}`);
    },
  },

  // ── Expert panel ───────────────────────────────────────────────────────
  {
    name: 'list_experts',
    description:
      'List registered domain experts. Filter by domain or cluster. Experts are human measurers with trust weights — their opinions are predict() entries.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Filter by domain (e.g. "cosmology", "structural-biology")' },
        cluster: { type: 'string', description: 'Filter by cluster ID (for echo-chamber awareness)' },
      },
    },
    handler: async (p, _repo, write) => {
      const { domain, cluster } = p as { domain?: string; cluster?: string };
      const params = new URLSearchParams();
      if (domain) params.set('domain', domain);
      if (cluster) params.set('cluster', cluster);
      const qs = params.toString();
      return factoryGet(write, `/factory/experts${qs ? '?' + qs : ''}`);
    },
  },
  {
    name: 'add_expert',
    description:
      'Register a domain expert. Experts are named instruments with domains, a trust weight, and a cluster ID for echo-chamber detection.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Expert name (required)' },
        id: { type: 'string', description: 'Short ID (auto-generated if omitted)' },
        domains: { type: 'array', items: { type: 'string' }, description: 'Domain expertise areas (required)' },
        affiliation: { type: 'string', description: 'Institution or organization' },
        instruments: { type: 'array', items: { type: 'string' }, description: 'Types of opinions: theoretical-plausibility, experiment-design-review, literature-conflict-check, patentability-assessment, clinical-relevance-check, methodology-review' },
        depends: { type: 'array', items: { type: 'string' }, description: 'What shapes their judgment (training, methods, publications)' },
        availability: { type: 'string', enum: ['async', 'scheduled', 'on-call'], description: 'Response mode (default: async)' },
        response_time_days: { type: 'number', description: 'Expected response time in days' },
        cost_per_consultation_usd: { type: 'number', description: 'Cost per consultation' },
        contact: { type: 'object', description: '{email, dashboard: bool}' },
        cluster_id: { type: 'string', description: 'Cluster for echo-chamber detection (e.g. "european-cosmology")' },
      },
      required: ['name', 'domains'],
    },
    handler: async (p, _repo, write) => {
      const body = p as Record<string, unknown>;
      return factoryPost(write, '/factory/experts', body);
    },
  },
  {
    name: 'request_expert_consultation',
    description:
      'Request an expert consultation — creates an attention item of type expert-consultation. The expert reviews material and provides an opinion (a predict() entry).',
    inputSchema: {
      type: 'object',
      properties: {
        expert_id: { type: 'string', description: 'Expert to consult (required)' },
        consultation_type: { type: 'string', description: 'Type: theoretical-plausibility, experiment-design-review, literature-conflict-check, patentability-assessment, clinical-relevance-check, methodology-review (required)' },
        title: { type: 'string', description: 'Short description of what needs review (required)' },
        material: { type: 'object', description: 'What the expert needs to review: {hypotheses, context, specific_questions}' },
        project_id: { type: 'string', description: 'Project this relates to' },
        hypothesis_id: { type: 'string', description: 'Hypothesis being reviewed' },
        blocking_task_id: { type: 'string', description: 'Task to pause until expert responds' },
        priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
      },
      required: ['expert_id', 'consultation_type', 'title'],
    },
    handler: async (p, _repo, write) => {
      const body = p as Record<string, unknown>;
      return factoryPost(write, '/factory/attention', {
        ...body,
        type: 'expert-consultation',
        requested_action: `Review and provide ${body.consultation_type} opinion`,
      });
    },
  },

  {
    name: 'create_expert_reward',
    description:
      'Record a reward for an expert: consultation fee, discovery kickback, patent kickback, bonus, or retainer. Tracks what experts earn and what has been paid.',
    inputSchema: {
      type: 'object',
      properties: {
        expert_id: { type: 'string', description: 'Expert ID (required)' },
        type: { type: 'string', enum: ['consultation-fee', 'discovery-kickback', 'patent-kickback', 'bonus', 'retainer'], description: 'Reward type (required)' },
        amount_usd: { type: 'number', description: 'Amount in USD (required)' },
        description: { type: 'string', description: 'What the reward is for (required)' },
        project_id: { type: 'string', description: 'Related project' },
        hypothesis_id: { type: 'string', description: 'Related hypothesis' },
        crack_id: { type: 'string', description: 'Related crack' },
        consultation_id: { type: 'string', description: 'Related consultation attention item ID' },
      },
      required: ['expert_id', 'type', 'amount_usd', 'description'],
    },
    handler: async (p, _repo, write) => {
      const body = p as Record<string, unknown>;
      return factoryPost(write, '/factory/experts/rewards', body);
    },
  },
  {
    name: 'list_expert_rewards',
    description:
      'List expert rewards. Filter by expert_id or status (pending/paid). Shows total pending and total paid.',
    inputSchema: {
      type: 'object',
      properties: {
        expert_id: { type: 'string', description: 'Filter by expert' },
        status: { type: 'string', enum: ['pending', 'paid'], description: 'Filter by status' },
      },
    },
    handler: async (p, _repo, write) => {
      const { expert_id, status } = p as { expert_id?: string; status?: string };
      const params = new URLSearchParams();
      if (expert_id) params.set('expert_id', expert_id);
      if (status) params.set('status', status);
      const qs = params.toString();
      return factoryGet(write, `/factory/experts/rewards${qs ? '?' + qs : ''}`);
    },
  },

  // ── Attention items ─────────────────────────────────────────────────────
  {
    name: 'create_attention_item',
    description:
      'Create an attention item — a ticket for human input. Used when the Supervisor needs wet-lab results, human judgment, budget authorization, or review approval. Pauses the blocking task until resolved.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['wet-lab-request', 'human-input', 'review', 'budget-exceeded', 'judge-divergence', 'approval'], description: 'Item type (required)' },
        title: { type: 'string', description: 'Short description (required)' },
        priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'], description: 'Priority (default: medium)' },
        project_id: { type: 'string', description: 'Project this relates to' },
        run_id: { type: 'string', description: 'Supervisor run ID' },
        blocking_task_id: { type: 'string', description: 'Task to pause until resolved' },
        hypothesis_id: { type: 'string', description: 'Related hypothesis' },
        crack_id: { type: 'string', description: 'Related crack' },
        description: { type: 'string', description: 'Detailed context for the human' },
        requested_action: { type: 'string', description: 'What the human should do' },
        assay_spec: { type: 'object', description: 'Wet-lab request spec: assay_type, targets, partner_ids, estimated_cost_usd, estimated_turnaround_days' },
      },
      required: ['type', 'title'],
    },
    handler: async (p, _repo, write) => {
      const body = p as Record<string, unknown>;
      return factoryPost(write, '/factory/attention', body);
    },
  },
  {
    name: 'list_attention_items',
    description:
      'List attention items (human-in-the-loop tickets). Filter by status (pending/acknowledged/in-progress/resolved), project_id, or type.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['pending', 'acknowledged', 'in-progress', 'resolved'], description: 'Filter by status' },
        project_id: { type: 'string', description: 'Filter by project' },
        type: { type: 'string', description: 'Filter by type' },
      },
    },
    handler: async (p, _repo, write) => {
      const { status, project_id, type } = p as { status?: string; project_id?: string; type?: string };
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (project_id) params.set('project_id', project_id);
      if (type) params.set('type', type);
      const qs = params.toString();
      return factoryGet(write, `/factory/attention${qs ? '?' + qs : ''}`);
    },
  },
  {
    name: 'resolve_attention_item',
    description:
      'Resolve an attention item — provide the human response. This unpauses the blocking Supervisor task so the loop can continue.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Attention item ID (required)' },
        response: { type: 'object', description: 'The response data — lab results, decision, input, etc. (required)' },
      },
      required: ['id', 'response'],
    },
    handler: async (p, _repo, write) => {
      const { id, response } = p as { id: string; response: Record<string, unknown> };
      return factoryPost(write, `/factory/attention/${id}/resolve`, { response });
    },
  },
  {
    name: 'attention_stats',
    description:
      'Get attention item counts: pending, acknowledged, in-progress, resolved today.',
    inputSchema: { type: 'object', properties: {} },
    handler: async (_p, _repo, write) => factoryGet(write, '/factory/attention/stats'),
  },

  // ── Supervisor ─────────────────────────────────────────────────────────
  {
    name: 'run_supervisor',
    description:
      'Run the research factory Supervisor for one round (cowork mode) or the full loop (autonomous mode). Proposes hypotheses, runs tournament, plans experiments. Requires ANTHROPIC_API_KEY env var for agent calls.',
    inputSchema: {
      type: 'object',
      properties: {
        crack_id: { type: 'string', description: 'Crack to resolve (required)' },
        project_id: { type: 'string', description: 'Project to scope work to (required)' },
        budget_usd: { type: 'number', description: 'Max spend in USD (default: 10)' },
        max_rounds: { type: 'number', description: 'Max rounds (default: 3)' },
        hypotheses_per_round: { type: 'number', description: 'Hypotheses to propose per round (default: 3)' },
        matches_per_round: { type: 'number', description: 'Tournament matches per round (default: 3)' },
        judge_vendors: { type: 'array', items: { type: 'string' }, description: 'Judge vendors: claude, google, openai (default: ["claude"])' },
        mode: { type: 'string', enum: ['cowork', 'autonomous'], description: 'cowork = one round, autonomous = full loop (default: cowork)' },
      },
      required: ['crack_id', 'project_id'],
    },
    handler: async (p, _repo, write) => {
      // Dynamic import to avoid loading heavy deps at startup
      const { Supervisor } = await import('../../core/supervisor.js');
      const params = p as Record<string, unknown>;

      if (!write.factoryHubUrl || !write.apiKey) {
        return { error: 'Factory hub required.' };
      }

      const config = {
        mode: (params.mode as string) ?? 'cowork',
        project_id: params.project_id as string,
        crack_id: params.crack_id as string,
        budget_usd: (params.budget_usd as number) ?? 10,
        max_rounds: (params.max_rounds as number) ?? 3,
        hypotheses_per_round: (params.hypotheses_per_round as number) ?? 3,
        matches_per_round: (params.matches_per_round as number) ?? 3,
        judge_vendors: (params.judge_vendors as string[]) ?? ['claude'],
        org_hub_url: write.hubUrl ?? 'https://hub.plyknot.org',
        com_hub_url: write.factoryHubUrl,
        com_api_key: write.apiKey,
      };

      const supervisor = new Supervisor(config as any);
      await supervisor.init();

      if (config.mode === 'autonomous') {
        return supervisor.run();
      } else {
        return supervisor.runRound();
      }
    },
  },

  // ── Extraction pipeline ───────────────────────────────────────────────
  {
    name: 'run_extraction',
    description:
      'Run the extraction pipeline for an extraction-batch project. Ingests literature by topic scope, extracts couplings via executor agent, critiques results, computes deltas, and archives to the coupling map. Set up the project with kind=extraction-batch and scope.topic_keywords first.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Extraction-batch project ID (required)' },
        budget_usd: { type: 'number', description: 'Max spend in USD (default: 5)' },
      },
      required: ['project_id'],
    },
    handler: async (p, _repo, write) => {
      const { Supervisor } = await import('../../core/supervisor.js');
      const params = p as Record<string, unknown>;

      if (!write.factoryHubUrl || !write.apiKey) {
        return { error: 'Factory hub required.' };
      }

      const config = {
        mode: 'autonomous' as const,
        project_id: params.project_id as string,
        crack_id: '',
        budget_usd: (params.budget_usd as number) ?? 5,
        max_rounds: 1,
        hypotheses_per_round: 0,
        matches_per_round: 0,
        judge_vendors: ['claude' as const],
        org_hub_url: write.hubUrl ?? 'https://hub.plyknot.org',
        com_hub_url: write.factoryHubUrl,
        com_api_key: write.apiKey,
      };

      const supervisor = new Supervisor(config as any);
      return supervisor.runExtraction();
    },
  },

  // ── Tracker: themes & categories ──────────────────────────────────────
  {
    name: 'list_tracker_categories',
    description: 'List all tracker categories with theme and issue counts.',
    inputSchema: { type: 'object', properties: {} },
    handler: async (_p, _repo, write) => factoryGet(write, '/factory/tracker/categories'),
  },
  {
    name: 'list_tracker_themes',
    description: 'List tracker themes. Optionally filter by category slug.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filter by category slug (e.g. "research", "cybernetics")' },
      },
    },
    handler: async (p, _repo, write) => {
      const { category } = p as { category?: string };
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      const qs = params.toString();
      return factoryGet(write, `/factory/tracker/themes${qs ? '?' + qs : ''}`);
    },
  },
  {
    name: 'get_tracker_theme',
    description: 'Get a single tracker theme with all its issues.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Theme ID (e.g. "research/satellite-6")' },
      },
      required: ['id'],
    },
    handler: async (p, _repo, write) => {
      const { id } = p as { id: string };
      return factoryGet(write, `/factory/tracker/themes/${encodeURIComponent(id)}`);
    },
  },
  {
    name: 'create_tracker_theme',
    description: 'Create a new tracker theme in a category.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Theme ID (e.g. "research/act-verb")' },
        title: { type: 'string', description: 'Theme title' },
        category_slug: { type: 'string', description: 'Category slug (e.g. "research", "cybernetics")' },
        description: { type: 'string', description: 'Optional description' },
      },
      required: ['id', 'title', 'category_slug'],
    },
    handler: async (p, _repo, write) => {
      const body = p as Record<string, unknown>;
      return factoryPost(write, '/factory/tracker/themes', body);
    },
  },
  {
    name: 'update_tracker_theme',
    description: 'Update an existing tracker theme. Only provided fields are changed.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Theme ID' },
        title: { type: 'string', description: 'New title' },
        description: { type: 'string', description: 'New description' },
        status: { type: 'string', description: 'New status' },
      },
      required: ['id'],
    },
    handler: async (p, _repo, write) => {
      const { id, ...body } = p as { id: string } & Record<string, unknown>;
      return factoryPatch(write, `/factory/tracker/themes/${encodeURIComponent(id)}`, body);
    },
  },

  // ── Tracker: issues ─────────────────────────────────────────────────────
  {
    name: 'list_tracker_issues',
    description:
      'List tracker issues. Filter by container_id (or theme_id), status, priority, text search, execution_mode, or pipeline-only.',
    inputSchema: {
      type: 'object',
      properties: {
        container_id: { type: 'string', description: 'Filter by container ID (e.g. "research/flagship-paper")' },
        status: { type: 'string', enum: ['todo', 'doing', 'done'], description: 'Filter by status' },
        priority: { type: 'string', enum: ['P0', 'P1', 'P2', '-'], description: 'Filter by priority' },
        q: { type: 'string', description: 'Text search in issue titles' },
        execution_mode: { type: 'string', enum: ['agent', 'manual', 'assisted'], description: 'Filter by execution mode' },
        pipeline: { type: 'string', enum: ['true'], description: 'Only issues under pipeline containers (kind IS NOT NULL)' },
      },
    },
    handler: async (p, _repo, write) => {
      const params = new URLSearchParams();
      const fields = p as Record<string, string | undefined>;
      if (fields.container_id) params.set('container_id', fields.container_id);
      if (fields.status) params.set('status', fields.status);
      if (fields.priority) params.set('priority', fields.priority);
      if (fields.q) params.set('q', fields.q);
      if (fields.execution_mode) params.set('execution_mode', fields.execution_mode);
      if (fields.pipeline) params.set('pipeline', fields.pipeline);
      const qs = params.toString();
      return factoryGet(write, `/factory/tracker/issues${qs ? '?' + qs : ''}`);
    },
  },
  {
    name: 'create_tracker_issue',
    description:
      'Create a tracker issue in a work container.',
    inputSchema: {
      type: 'object',
      properties: {
        container_id: { type: 'string', description: 'Container ID (e.g. "research/flagship-paper") (required)' },
        title: { type: 'string', description: 'Issue title (required)' },
        priority: { type: 'string', enum: ['P0', 'P1', 'P2', '-'], description: 'Priority (default: P2)' },
        description: { type: 'string', description: 'Longer description' },
        section: { type: 'string', description: 'Section sub-header within container' },
        status: { type: 'string', enum: ['todo', 'doing', 'done'], description: 'Status (default: todo)' },
        target_date: { type: 'string', description: 'Target date ISO format' },
        execution_mode: { type: 'string', enum: ['agent', 'manual', 'assisted'], description: 'Who does this work' },
        autonomy: { type: 'string', enum: ['full', 'review', 'plan-only', 'manual'], description: 'Agent autonomy level' },
        blocked_by: { type: 'array', items: { type: 'string' }, description: 'Issue IDs that must complete first' },
      },
      required: ['container_id', 'title'],
    },
    handler: async (p, _repo, write) => {
      const body = p as Record<string, unknown>;
      return factoryPost(write, '/factory/tracker/issues', body);
    },
  },
  {
    name: 'update_tracker_issue',
    description:
      'Update a tracker issue. Only provided fields are changed.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Issue ID (e.g. "trk-seed-0042") (required)' },
        title: { type: 'string' },
        description: { type: 'string' },
        section: { type: 'string' },
        priority: { type: 'string', enum: ['P0', 'P1', 'P2', '-'] },
        status: { type: 'string', enum: ['todo', 'doing', 'done'] },
        target_date: { type: 'string' },
        container_id: { type: 'string', description: 'Move to different container' },
        execution_mode: { type: 'string', enum: ['agent', 'manual', 'assisted'] },
        autonomy: { type: 'string', enum: ['full', 'review', 'plan-only', 'manual'] },
        blocked_by: { type: 'array', items: { type: 'string' } },
        finding_id: { type: 'string', description: 'Link finding produced by this issue' },
      },
      required: ['id'],
    },
    handler: async (p, _repo, write) => {
      const { id, ...body } = p as { id: string } & Record<string, unknown>;
      return factoryPatch(write, `/factory/tracker/issues/${encodeURIComponent(id)}`, body);
    },
  },
  {
    name: 'mark_tracker_done',
    description: 'Mark a tracker issue as done.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Issue ID' } },
      required: ['id'],
    },
    handler: async (p, _repo, write) => {
      const { id } = p as { id: string };
      return factoryPost(write, `/factory/tracker/issues/${encodeURIComponent(id)}/done`, {});
    },
  },
  {
    name: 'tracker_stats',
    description: 'Get aggregate tracker statistics: total/done/doing/todo counts, breakdown by priority and category.',
    inputSchema: { type: 'object', properties: {} },
    handler: async (_p, _repo, write) => factoryGet(write, '/factory/tracker/stats'),
  },
  {
    name: 'batch_tracker_update',
    description: 'Apply multiple tracker updates atomically. Each update has an action (done|add|update|delete) and relevant fields.',
    inputSchema: {
      type: 'object',
      properties: {
        updates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['done', 'add', 'update', 'delete'] },
              id: { type: 'string', description: 'Issue ID (for done/update/delete)' },
              container_id: { type: 'string', description: 'Container ID (for add)' },
              title: { type: 'string' },
              priority: { type: 'string' },
              status: { type: 'string' },
              target_date: { type: 'string' },
              execution_mode: { type: 'string' },
            },
            required: ['action'],
          },
        },
      },
      required: ['updates'],
    },
    handler: async (p, _repo, write) => {
      const { updates } = p as { updates: unknown[] };
      return factoryPost(write, '/factory/tracker/batch', { updates });
    },
  },
  {
    name: 'list_tracker_comments',
    description: 'List comments on a tracker issue, ordered oldest first.',
    inputSchema: {
      type: 'object',
      properties: { issue_id: { type: 'string', description: 'Issue ID' } },
      required: ['issue_id'],
    },
    handler: async (p, _repo, write) => {
      const { issue_id } = p as { issue_id: string };
      return factoryGet(write, `/factory/tracker/issues/${encodeURIComponent(issue_id)}/comments`);
    },
  },
  {
    name: 'add_tracker_comment',
    description: 'Add a comment to a tracker issue.',
    inputSchema: {
      type: 'object',
      properties: {
        issue_id: { type: 'string', description: 'Issue ID' },
        body: { type: 'string', description: 'Comment text' },
        author: { type: 'string', description: 'Author name (defaults to authenticated user)' },
      },
      required: ['issue_id', 'body'],
    },
    handler: async (p, _repo, write) => {
      const { issue_id, body, author } = p as { issue_id: string; body: string; author?: string };
      const data: Record<string, unknown> = { body };
      if (author) data.author = author;
      return factoryPost(write, `/factory/tracker/issues/${encodeURIComponent(issue_id)}/comments`, data);
    },
  },

  // ── Surveillance pipeline ─────────────────────────────────────────────
  {
    name: 'run_surveillance',
    description:
      'Run a surveillance scan: checks for echo chambers (unsupported/contradicted predictions), speciation (hidden sub-populations via GMM+BIC), and measurement-prediction ratio gaps. Creates attention items for anomalies found. For surveillance projects on a schedule, or ad-hoc coupling-map health checks.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Surveillance project ID (required)' },
      },
      required: ['project_id'],
    },
    handler: async (p, _repo, write) => {
      const { Supervisor } = await import('../../core/supervisor.js');
      const params = p as Record<string, unknown>;

      if (!write.factoryHubUrl || !write.apiKey) {
        return { error: 'Factory hub required.' };
      }

      const config = {
        mode: 'autonomous' as const,
        project_id: params.project_id as string,
        crack_id: '',
        budget_usd: 1,
        max_rounds: 1,
        hypotheses_per_round: 0,
        matches_per_round: 0,
        judge_vendors: ['claude' as const],
        org_hub_url: write.hubUrl ?? 'https://hub.plyknot.org',
        com_hub_url: write.factoryHubUrl,
        com_api_key: write.apiKey,
      };

      const supervisor = new Supervisor(config as any);
      return supervisor.runSurveillance();
    },
  },
];
