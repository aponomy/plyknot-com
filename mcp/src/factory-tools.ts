/**
 * Factory MCP tools — commercial-only.
 * Imports shared types from @plyknot/mcp.
 */

import { type Tool, factoryGet, factoryPost } from '@plyknot/mcp/src/shared.js';

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

  // ── Projects ───────────────────────────────────────────────────────────
  {
    name: 'list_projects',
    description:
      'List all projects you own or are a member of.',
    inputSchema: { type: 'object', properties: {} },
    handler: async (_p, _repo, write) => factoryGet(write, '/factory/projects'),
  },
  {
    name: 'open_project',
    description:
      'Open a project by ID. Returns full context: metadata, crack scope, hypotheses, experiments, deltas, members, and budget.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID (required)' },
      },
      required: ['project_id'],
    },
    handler: async (p, _repo, write) => {
      const { project_id } = p as { project_id: string };
      return factoryGet(write, `/factory/projects/${project_id}`);
    },
  },
  {
    name: 'create_project',
    description:
      'Create a new research project. Four kinds: crack-resolution (hypothesis tournament + experiments), extraction-batch (ingest literature by scope), opening-extension (extend a measurer-correlation cluster), surveillance (scheduled echo-chamber scan).',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Project name (required)' },
        id: { type: 'string', description: 'Short slug ID (auto-generated if omitted)' },
        kind: { type: 'string', enum: ['crack-resolution', 'opening-extension', 'extraction-batch', 'surveillance'], description: 'Project kind (default: crack-resolution)' },
        description: { type: 'string', description: 'What this project investigates' },
        crack_ids: { type: 'array', items: { type: 'string' }, description: 'Crack IDs this project targets' },
        entity_scope: { type: 'array', items: { type: 'string' }, description: 'Entity names in scope' },
        budget_usd: { type: 'number', description: 'Compute budget for this project' },
        scope: { type: 'object', description: 'Kind-specific scope (extraction-batch: topic_keywords, venues, date_range, target_count)' },
        schedule: { type: 'string', enum: ['daily', 'weekly'], description: 'Surveillance schedule' },
      },
      required: ['name'],
    },
    handler: async (p, _repo, write) => {
      const body = p as Record<string, unknown>;
      return factoryPost(write, '/factory/projects', body);
    },
  },
  {
    name: 'update_project',
    description:
      'Update a project: change name, description, status, crack scope, entity scope, or budget.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID (required)' },
        name: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string', enum: ['active', 'paused', 'completed'] },
        crack_ids: { type: 'array', items: { type: 'string' } },
        entity_scope: { type: 'array', items: { type: 'string' } },
        budget_usd: { type: 'number' },
      },
      required: ['project_id'],
    },
    handler: async (p, _repo, write) => {
      const { project_id, ...body } = p as { project_id: string } & Record<string, unknown>;
      if (!write.factoryHubUrl || !write.apiKey) {
        return { error: 'Factory hub required.' };
      }
      const url = `${write.factoryHubUrl}/v1/factory/projects/${project_id}`;
      const resp = await fetch(url, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${write.apiKey}` },
        body: JSON.stringify(body),
      });
      return resp.json();
    },
  },
  {
    name: 'add_project_member',
    description:
      'Share a project with another user by adding them as a member.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID (required)' },
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
    description: 'List findings. Filter by status (draft/expert-reviewed/confirmed/retracted), type, or project_id.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        type: { type: 'string' },
        project_id: { type: 'string' },
      },
    },
    handler: async (p, _repo, write) => {
      const { status, type, project_id } = p as Record<string, string>;
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (type) params.set('type', type);
      if (project_id) params.set('project_id', project_id);
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

  // ── Publications ──────────────────────────────────────────────────────
  {
    name: 'create_publication',
    description:
      'Create a publication from a finding. Three tracks: paper (arXiv/journal), patent (filing), customer-report (tenant-scoped deliverable).',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Publication title (required)' },
        track: { type: 'string', enum: ['paper', 'patent', 'customer-report'], description: 'Output track (required)' },
        finding_ids: { type: 'array', items: { type: 'string' }, description: 'Source findings (required)' },
        project_ids: { type: 'array', items: { type: 'string' }, description: 'Related projects' },
        paper_data: { type: 'object', description: 'Paper-specific: {target_venue, word_count, draft_id}' },
        patent_data: { type: 'object', description: 'Patent-specific: {counsel_id, filing_jurisdiction, claims, embargo_until}' },
        report_data: { type: 'object', description: 'Customer-report-specific: {customer_id, scope}' },
      },
      required: ['title', 'track', 'finding_ids'],
    },
    handler: async (p, _repo, write) => factoryPost(write, '/factory/publications', p as Record<string, unknown>),
  },
  {
    name: 'list_publications',
    description: 'List publications. Filter by track (paper/patent/customer-report), status, or finding_id.',
    inputSchema: {
      type: 'object',
      properties: {
        track: { type: 'string' },
        status: { type: 'string' },
        finding_id: { type: 'string' },
      },
    },
    handler: async (p, _repo, write) => {
      const { track, status, finding_id } = p as Record<string, string>;
      const params = new URLSearchParams();
      if (track) params.set('track', track);
      if (status) params.set('status', status);
      if (finding_id) params.set('finding_id', finding_id);
      return factoryGet(write, `/factory/publications${params.toString() ? '?' + params : ''}`);
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
