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

  // ── Tournament ─────────────────────────────────────────────────────────
  {
    name: 'tournament_match',
    description:
      'Record a judge pairwise match between two hypotheses. Updates Elo ratings. Returns new ratings.',
    inputSchema: {
      type: 'object',
      properties: {
        hypothesis_a: { type: 'string', description: 'First hypothesis ID (required)' },
        hypothesis_b: { type: 'string', description: 'Second hypothesis ID (required)' },
        winner: { type: 'string', description: 'ID of the winning hypothesis (required)' },
        judge_id: { type: 'string', description: 'Agent ID of the judge (required)' },
        confidence: { type: 'number', description: 'Judge confidence 0-1 (required)' },
        rationale: { type: 'string', description: 'Judge rationale (archived, not used for scoring)' },
        inter_judge_convergence: { type: 'number', description: 'Inter-judge convergence score if multi-judge' },
      },
      required: ['hypothesis_a', 'hypothesis_b', 'winner', 'judge_id', 'confidence'],
    },
    handler: async (p, _repo, write) => {
      const body = p as Record<string, unknown>;
      return factoryPost(write, '/factory/tournament', body);
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
      'Create a new research project — a thin scope that references cracks and entities, groups hypotheses and deltas, and tracks budget.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Project name (required)' },
        id: { type: 'string', description: 'Short slug ID (auto-generated if omitted)' },
        description: { type: 'string', description: 'What this project investigates' },
        crack_ids: { type: 'array', items: { type: 'string' }, description: 'Crack IDs this project targets' },
        entity_scope: { type: 'array', items: { type: 'string' }, description: 'Entity names in scope' },
        budget_usd: { type: 'number', description: 'Compute budget for this project' },
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
];
