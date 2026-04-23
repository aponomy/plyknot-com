/**
 * Core types for the plyknot.com orchestration engine.
 */

// ── Task types ──────────────────────────────────────────────────────────

export type TaskType =
  | 'propose'      // Generate hypotheses for a crack
  | 'judge'        // Pairwise tournament match
  | 'plan'         // Create experiment tree nodes
  | 'execute'      // Run an experiment (computational or wet-lab)
  | 'critique'     // Structural checks against reference state
  | 'delta'        // Compute convergence delta from results
  | 'render'       // Automated Rendering pass
  | 'archive';     // Write results to persistent storage

export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'paused';

export interface Task {
  id: string;
  type: TaskType;
  status: TaskStatus;
  /** Which agent role should handle this */
  agent_role: AgentRole;
  /** Input payload — shape depends on type */
  input: Record<string, unknown>;
  /** Output payload — set on completion */
  output?: Record<string, unknown>;
  /** Estimated cost in USD */
  cost_estimate_usd: number;
  /** Actual cost after completion */
  cost_actual_usd?: number;
  /** Parent task that spawned this one */
  parent_task_id?: string;
  /** Project scope */
  project_id: string;
  /** Crack being worked on */
  crack_id: string;
  /** Round number in the loop */
  round: number;
  created_at: string;
  completed_at?: string;
  error?: string;
}

// ── Agent types ─────────────────────────────────────────────────────────

export type AgentRole = 'proposer' | 'critic' | 'planner' | 'executor' | 'archivist';
// Note: 'judge' role eliminated per Test M (2026-04-21). Disputes resolved via
// structural query against coupling map (Operation 1) or critic ensemble (Operation 2).

export type ModelVendor = 'claude' | 'openai' | 'google';

export interface AgentConfig {
  role: AgentRole;
  vendor: ModelVendor;
  model: string;
  /** System prompt — fetched from hub or loaded from file */
  system_prompt?: string;
  /** Max tokens for response */
  max_tokens: number;
  /** Temperature */
  temperature: number;
  /** Which MCP tools this agent can call */
  allowed_tools: string[];
}

export const DEFAULT_AGENTS: Record<AgentRole, AgentConfig> = {
  proposer: {
    role: 'proposer',
    vendor: 'claude',
    model: 'claude-opus-4-6', // cognitive variance (Axis 2) + capability tier (Axis 4); alt: gemini-2.5-pro
    max_tokens: 4096,
    temperature: 0.7,
    allowed_tools: [
      'find_cracks', 'get_chain', 'list_chains', 'query_couplings',
      'get_echo_chambers', 'get_marker_passing', 'list_hypotheses',
      'propose_factory_hypothesis',
    ],
  },
  critic: {
    role: 'critic',
    vendor: 'claude',
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    temperature: 0.3,
    allowed_tools: [
      'find_cracks', 'get_chain', 'query_couplings',
      'get_echo_chambers', 'get_measurement_prediction_ratio',
      'list_hypotheses',
    ],
  },
  // judge role eliminated — disputes resolved via structural query or critic ensemble
  planner: {
    role: 'planner',
    vendor: 'claude',
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    temperature: 0.4,
    allowed_tools: [
      'find_cracks', 'get_chain', 'list_hypotheses',
      'list_experiments', 'plan_experiment',
    ],
  },
  executor: {
    role: 'executor',
    vendor: 'claude',
    model: 'claude-haiku-4-5',
    max_tokens: 2048,
    temperature: 0.1,
    allowed_tools: [
      'list_experiments', 'compute_delta',
    ],
  },
  archivist: {
    role: 'archivist',
    vendor: 'claude',
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    temperature: 0.0,
    allowed_tools: [
      'list_hypotheses', 'list_deltas', 'list_experiments',
      'open_project', 'update_project',
    ],
  },
};

// ── Supervisor types ────────────────────────────────────────────────────

export type SupervisorMode = 'cowork' | 'autonomous';

export interface SupervisorConfig {
  mode: SupervisorMode;
  project_id: string;
  crack_id: string;
  /** Maximum USD to spend on this run */
  budget_usd: number;
  /** Maximum rounds before stopping */
  max_rounds: number;
  /** How many hypotheses to propose per round */
  hypotheses_per_round: number;
  /** How many tournament matches per round */
  matches_per_round: number;
  /** Which vendors to use for judge ensemble */
  judge_vendors: ModelVendor[];
  /** Hub URLs */
  org_hub_url: string;
  com_hub_url: string;
  /** API keys */
  com_api_key: string;
  openai_api_key?: string;
  google_api_key?: string;
  anthropic_api_key?: string;
}

export interface RoundResult {
  round: number;
  tasks_completed: number;
  tasks_failed: number;
  cost_usd: number;
  hypotheses_proposed: number;
  disagreements_resolved: number;
  research_gaps_logged: number;
  ambiguity_markers_created: number;
  experiments_planned: number;
  experiments_executed: number;
  critiques_run: number;
  deltas_computed: number;
  couplings_archived: number;
  convergence_delta?: number;
  /** Meta-review summary for next round */
  meta_review: string;
}

export interface SupervisorState {
  config: SupervisorConfig;
  current_round: number;
  total_cost_usd: number;
  rounds: RoundResult[];
  task_queue: Task[];
  status: 'running' | 'paused' | 'completed' | 'budget_exhausted' | 'error';
  started_at: string;
  updated_at: string;
}
