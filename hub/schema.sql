-- Plyknot Hub Commercial — D1 Schema
-- Core data mirrors GitHub plyknot/universe (public) + plyknot-com/universe-private (embargoed).
-- Factory tables store hypothesis, delta, experiment, and failure-graph state.
-- Rebuilt on every merge to main via GitHub Action.

DROP TABLE IF EXISTS submissions;
DROP TABLE IF EXISTS api_keys;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS embeddings;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS dependencies;
DROP TABLE IF EXISTS entities;
DROP TABLE IF EXISTS couplings;
DROP TABLE IF EXISTS chains;

-- Core data
CREATE TABLE chains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  entity TEXT NOT NULL,
  data TEXT NOT NULL,
  step_count INTEGER NOT NULL,
  crack_count INTEGER NOT NULL
);

CREATE TABLE couplings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_a INTEGER NOT NULL,
  entity_b INTEGER NOT NULL,
  property TEXT NOT NULL,
  value REAL NOT NULL,
  method TEXT NOT NULL,
  sigma REAL,
  source TEXT DEFAULT 'measurement',
  provenance TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_couplings_property ON couplings(property);
CREATE INDEX idx_couplings_entity ON couplings(entity_a, entity_b);

CREATE TABLE entities (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  tags TEXT NOT NULL
);

CREATE TABLE dependencies (
  id INTEGER PRIMARY KEY,
  labels TEXT NOT NULL,
  description TEXT NOT NULL,
  created_by TEXT NOT NULL,
  complexity_levels TEXT NOT NULL
);

-- Events (append-only log, monthly partitions in universe/data/events/)
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  type TEXT NOT NULL,
  actor TEXT NOT NULL,
  details TEXT NOT NULL
);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_actor ON events(actor);

-- Embeddings for grounding/search
CREATE TABLE embeddings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_label TEXT NOT NULL,
  entity_id INTEGER,
  vector BLOB NOT NULL
);

-- Auth
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  github_login TEXT NOT NULL,
  display_name TEXT,
  email TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE api_keys (
  key_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  last_used TEXT,
  rate_limit INTEGER DEFAULT 1000,
  UNIQUE(user_id, name)
);

-- Write submissions
CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  data TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  reviewed_at TEXT
);

-- ── Factory tables (commercial-only) ────────────────────────────────────

-- Work containers — unified table replacing tracker_themes, projects, and publications.
-- Some containers are pipeline items (kind set, flow through backlog → active → completed).
-- Some are operational task buckets (kind null, just hold issues).
-- See research/project/strategy/13-process-unification.md for design rationale.
DROP TABLE IF EXISTS container_members;
DROP TABLE IF EXISTS work_containers;
CREATE TABLE work_containers (
  id TEXT PRIMARY KEY,                         -- e.g. 'research/flagship-paper' or 'proj-abc123'
  title TEXT NOT NULL,
  category_slug TEXT NOT NULL REFERENCES tracker_categories(slug),
  sort_order INTEGER DEFAULT 0,

  -- Pipeline fields (null for operational buckets)
  kind TEXT,                                   -- crack-resolution | extraction-batch | surveillance
                                               -- | opening-extension | investigation | delivery | null
  status TEXT DEFAULT 'active',                -- backlog | active | paused | completed | blocked | archived
  description TEXT,

  -- Scope (null for operational)
  crack_ids TEXT DEFAULT '[]',                 -- JSON array of crack_id strings
  entity_scope TEXT DEFAULT '[]',              -- JSON array of entity names
  budget_usd REAL,
  spent_usd REAL DEFAULT 0.0,
  scope TEXT,                                  -- JSON: kind-specific data (extraction keywords, surveillance schedule,
                                               -- delivery paper_data/patent_data/report_data, etc.)

  -- Delivery fields (only when kind='delivery')
  track TEXT,                                  -- paper | patent | customer-report | null
  delivery_status TEXT,                        -- paper: draft | pass-1 | pass-2 | validated | submitted | published
                                               -- patent: assessment | drafting | filed | granted | abandoned
                                               -- report: draft | delivered

  -- Hierarchy
  parent_id TEXT REFERENCES work_containers(id),

  -- Execution
  execution_mode TEXT,                         -- automated | manual | assisted | null
  autonomy TEXT DEFAULT 'manual',              -- full | review | plan-only | manual

  -- Provenance
  source_type TEXT,                            -- customer | internal | crack | finding | tracker | null
  source_ref TEXT,                             -- ID of source entity (crack_id, finding_id, etc.)
  spawned_by_finding_id TEXT,                  -- if this container was spawned by a finding

  -- Access control
  owner_id TEXT,                               -- user id (GitHub ID)
  members TEXT DEFAULT '[]',                   -- JSON array of {user_id, role}

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_wc_category ON work_containers(category_slug);
CREATE INDEX idx_wc_status ON work_containers(status);
CREATE INDEX idx_wc_kind ON work_containers(kind);
CREATE INDEX idx_wc_parent ON work_containers(parent_id);
CREATE INDEX idx_wc_owner ON work_containers(owner_id);

CREATE TABLE container_members (
  container_id TEXT NOT NULL REFERENCES work_containers(id),
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'member',                  -- owner | member
  added_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (container_id, user_id)
);

-- Embargoed couplings (same shape as couplings + embargo fields)
DROP TABLE IF EXISTS embargoed_couplings;
CREATE TABLE embargoed_couplings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_a INTEGER NOT NULL,
  entity_b INTEGER NOT NULL,
  property TEXT NOT NULL,
  value REAL NOT NULL,
  method TEXT NOT NULL,
  sigma REAL,
  source TEXT DEFAULT 'measurement',
  provenance TEXT,
  embargo_until TEXT NOT NULL,
  embargo_reason TEXT NOT NULL,
  embargo_owner TEXT NOT NULL DEFAULT 'Solarplexor AB',
  embargo_rationale TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_embargo_until ON embargoed_couplings(embargo_until);

-- Hypotheses from Proposer agents
DROP TABLE IF EXISTS hypotheses;
CREATE TABLE hypotheses (
  id TEXT PRIMARY KEY,
  crack_id TEXT NOT NULL,
  project_id TEXT REFERENCES work_containers(id),
  proposer_id TEXT NOT NULL,
  parent_hypothesis_id TEXT,
  target_entity TEXT NOT NULL,
  target_property TEXT NOT NULL,
  proposed_mechanism TEXT NOT NULL,
  required_measurements TEXT NOT NULL,  -- JSON array
  predicted_convergence_delta REAL,
  depends TEXT,                         -- JSON array
  elo_rating REAL DEFAULT 1500.0,
  tournament_matches INTEGER DEFAULT 0,
  status TEXT DEFAULT 'proposed',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_hypotheses_crack ON hypotheses(crack_id);
CREATE INDEX idx_hypotheses_status ON hypotheses(status);
CREATE INDEX idx_hypotheses_project ON hypotheses(project_id);

-- Tournament matches (Judge ensemble results)
DROP TABLE IF EXISTS tournament_matches;
CREATE TABLE tournament_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hypothesis_a TEXT NOT NULL REFERENCES hypotheses(id),
  hypothesis_b TEXT NOT NULL REFERENCES hypotheses(id),
  winner TEXT NOT NULL,
  judge_id TEXT NOT NULL,
  confidence REAL NOT NULL,
  rationale TEXT,
  inter_judge_convergence REAL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Convergence deltas — the unit of factory output
DROP TABLE IF EXISTS deltas;
CREATE TABLE deltas (
  id TEXT PRIMARY KEY,
  crack_id TEXT NOT NULL,
  project_id TEXT REFERENCES work_containers(id),
  pipeline TEXT NOT NULL,  -- crack-resolution | opening-extension | extraction | surveillance | rendering
  entries TEXT NOT NULL,   -- JSON array of coupling entries
  convergence_shift TEXT,  -- JSON object with scores
  cost_usd REAL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_deltas_crack ON deltas(crack_id);
CREATE INDEX idx_deltas_pipeline ON deltas(pipeline);
CREATE INDEX idx_deltas_project ON deltas(project_id);

-- Experiment tree nodes (Planner output)
DROP TABLE IF EXISTS experiment_nodes;
CREATE TABLE experiment_nodes (
  id TEXT PRIMARY KEY,
  hypothesis_id TEXT NOT NULL REFERENCES hypotheses(id),
  parent_node_id TEXT,
  node_type TEXT NOT NULL,  -- preliminary | hyperparameter | replication | aggregation | ablation | contradiction
  config TEXT NOT NULL,     -- JSON
  status TEXT DEFAULT 'pending',  -- pending | running | completed | failed
  result TEXT,              -- JSON
  cost_usd REAL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_experiment_hypothesis ON experiment_nodes(hypothesis_id);

-- Failure graph (persistent, cross-plan)
DROP TABLE IF EXISTS failure_graph;
CREATE TABLE failure_graph (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hypothesis_summary TEXT NOT NULL,
  experiment_config TEXT NOT NULL,  -- JSON
  outcome TEXT NOT NULL,
  instrument_stack TEXT NOT NULL,   -- JSON array
  crack_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Agent trust weights (behavioral history)
DROP TABLE IF EXISTS agent_trust;
CREATE TABLE agent_trust (
  agent_id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  model TEXT NOT NULL,
  trust_weight REAL DEFAULT 1.0,
  total_invocations INTEGER DEFAULT 0,
  successful_invocations INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ── Phase 4-5 tables: Experts, Findings, Publications, Attention, Supervisor ──

-- Expert panel — human domain experts as measurers
DROP TABLE IF EXISTS expert_rewards;
DROP TABLE IF EXISTS experts;
CREATE TABLE experts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domains TEXT NOT NULL DEFAULT '[]',           -- JSON array of domain strings
  affiliation TEXT,
  instruments TEXT DEFAULT '[]',                -- JSON array: theoretical-plausibility, experiment-design-review, etc.
  depends TEXT DEFAULT '[]',                    -- JSON array: what shapes their judgment
  availability TEXT DEFAULT 'async',            -- async | scheduled | on-call
  response_time_days REAL DEFAULT 7,
  cost_per_consultation_usd REAL DEFAULT 0,
  contact TEXT DEFAULT '{}',                    -- JSON: {email, dashboard}
  trust_weight REAL DEFAULT 1.0,
  cluster_id TEXT,                              -- for echo-chamber detection
  total_earned_usd REAL DEFAULT 0,
  total_paid_usd REAL DEFAULT 0,
  reward_config TEXT,                           -- JSON: kickback percentages, retainer terms
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_experts_cluster ON experts(cluster_id);

-- Expert rewards — tracks what experts earn and what has been paid
CREATE TABLE expert_rewards (
  id TEXT PRIMARY KEY,
  expert_id TEXT NOT NULL REFERENCES experts(id),
  type TEXT NOT NULL,                           -- consultation-fee | discovery-kickback | patent-kickback | bonus | retainer
  status TEXT DEFAULT 'pending',                -- pending | paid
  amount_usd REAL NOT NULL,
  project_id TEXT,
  hypothesis_id TEXT,
  crack_id TEXT,
  description TEXT NOT NULL,
  consultation_id TEXT,                         -- attention item ID if from consultation
  paid_at TEXT,
  paid_reference TEXT,                          -- payment reference (invoice, wire, etc.)
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_rewards_expert ON expert_rewards(expert_id);
CREATE INDEX idx_rewards_status ON expert_rewards(status);

-- Findings — formulated claims backed by convergence evidence
DROP TABLE IF EXISTS findings;
CREATE TABLE findings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  finding_type TEXT NOT NULL,                   -- crack-resolution | opening-discovery | echo-chamber-break | measurement-artifact | methodology-improvement
  status TEXT DEFAULT 'draft',                  -- draft | expert-reviewed | confirmed | retracted
  project_id TEXT REFERENCES work_containers(id),
  crack_id TEXT,
  delta_ids TEXT DEFAULT '[]',                  -- JSON array of delta IDs
  hypothesis_ids TEXT DEFAULT '[]',             -- JSON array of hypothesis IDs
  measurement_ids TEXT DEFAULT '[]',            -- JSON array of measurement coupling keys
  sigma_resolved REAL,                          -- σ-tension before resolution
  sigma_after REAL,                             -- σ-tension after resolution
  independent_clusters INTEGER DEFAULT 0,       -- how many independent measurement clusters confirm
  domains TEXT DEFAULT '[]',                    -- JSON array of domain tags
  entities TEXT DEFAULT '[]',                   -- JSON array of entity names involved
  expert_reviews TEXT DEFAULT '[]',             -- JSON array of {expert_id, opinion, confidence, rationale, reviewed_at}
  triage TEXT DEFAULT 'pending',                -- pending | actioned | parked (finding backlog triage status)
  source_issue_id TEXT,                         -- tracker issue that produced this finding
  spawned_container_ids TEXT DEFAULT '[]',       -- JSON array: containers spawned by this finding
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_findings_status ON findings(status);
CREATE INDEX idx_findings_type ON findings(finding_type);
CREATE INDEX idx_findings_project ON findings(project_id);
CREATE INDEX idx_findings_triage ON findings(triage);

-- Publications — DEPRECATED: use work_containers with kind='delivery' instead.
-- Kept during transition period. New publications should be created as work_containers.
DROP TABLE IF EXISTS publications;
CREATE TABLE publications (
  id TEXT PRIMARY KEY,
  track TEXT NOT NULL,                          -- paper | patent | customer-report
  title TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  finding_ids TEXT NOT NULL DEFAULT '[]',
  project_ids TEXT DEFAULT '[]',
  paper_data TEXT,
  patent_data TEXT,
  report_data TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Attention items — human-in-the-loop tickets
DROP TABLE IF EXISTS attention_items;
CREATE TABLE attention_items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,                           -- wet-lab-request | human-input | review | budget-exceeded | judge-divergence | approval | expert-consultation
  priority TEXT DEFAULT 'medium',               -- critical | high | medium | low
  status TEXT DEFAULT 'pending',                -- pending | acknowledged | in-progress | resolved
  project_id TEXT,
  run_id TEXT,                                  -- supervisor run that created this
  blocking_task_id TEXT,                        -- supervisor task to pause until resolved
  hypothesis_id TEXT,
  crack_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  requested_action TEXT,                        -- what the human should do
  assay_spec TEXT,                              -- JSON: wet-lab request details
  expert_id TEXT,                               -- for expert-consultation type
  consultation_type TEXT,                       -- theoretical-plausibility | experiment-design-review | etc.
  material TEXT,                                -- JSON: what the expert needs to review
  expires_at TEXT,
  response TEXT,                                -- JSON: the human's response data
  resolved_by TEXT,
  resolved_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_attention_status ON attention_items(status);
CREATE INDEX idx_attention_project ON attention_items(project_id);
CREATE INDEX idx_attention_type ON attention_items(type);
CREATE INDEX idx_attention_expert ON attention_items(expert_id);

-- Supervisor runs — persists orchestration state for dashboard
DROP TABLE IF EXISTS supervisor_tasks;
DROP TABLE IF EXISTS supervisor_rounds;
DROP TABLE IF EXISTS supervisor_runs;
CREATE TABLE supervisor_runs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES work_containers(id),
  crack_id TEXT NOT NULL,
  status TEXT DEFAULT 'running',                -- running | paused | completed | budget_exhausted | error
  mode TEXT DEFAULT 'cowork',                   -- cowork | autonomous
  config TEXT DEFAULT '{}',                     -- JSON: full SupervisorConfig
  current_round INTEGER DEFAULT 0,
  total_cost_usd REAL DEFAULT 0,
  budget_usd REAL DEFAULT 0,
  started_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);
CREATE INDEX idx_runs_status ON supervisor_runs(status);
CREATE INDEX idx_runs_project ON supervisor_runs(project_id);

-- Supervisor rounds — one row per completed round
CREATE TABLE supervisor_rounds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL REFERENCES supervisor_runs(id),
  round INTEGER NOT NULL,
  tasks_completed INTEGER DEFAULT 0,
  tasks_failed INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0,
  hypotheses_proposed INTEGER DEFAULT 0,
  matches_judged INTEGER DEFAULT 0,
  experiments_planned INTEGER DEFAULT 0,
  meta_review TEXT,                             -- textual-gradient cross-round summary
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_rounds_run ON supervisor_rounds(run_id);

-- Supervisor tasks — individual task execution records
CREATE TABLE supervisor_tasks (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES supervisor_runs(id),
  round INTEGER NOT NULL,
  type TEXT NOT NULL,                           -- propose | judge | plan | execute | critique | delta | render | archive
  agent_role TEXT NOT NULL,                     -- proposer | critic | judge | planner | executor | archivist
  status TEXT DEFAULT 'queued',                 -- queued | running | completed | failed | paused
  input TEXT,                                   -- JSON
  output TEXT,                                  -- JSON
  cost_estimate_usd REAL DEFAULT 0,
  cost_actual_usd REAL,
  error TEXT,
  created_at TEXT,
  completed_at TEXT
);
CREATE INDEX idx_tasks_run ON supervisor_tasks(run_id);
CREATE INDEX idx_tasks_status ON supervisor_tasks(status);
CREATE INDEX idx_tasks_type ON supervisor_tasks(type);

-- ── Tracker tables (project issue tracker) ───────────────────────────────
-- tracker_themes is DEPRECATED — replaced by work_containers (above).
-- tracker_categories stays as organizational grouping for work_containers.

DROP TABLE IF EXISTS tracker_issues;
DROP TABLE IF EXISTS tracker_themes;
DROP TABLE IF EXISTS tracker_categories;

CREATE TABLE tracker_categories (
  slug TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- DEPRECATED: kept for migration tooling. New code should use work_containers.
CREATE TABLE tracker_themes (
  id TEXT PRIMARY KEY,
  category_slug TEXT NOT NULL REFERENCES tracker_categories(slug),
  title TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE tracker_issues (
  id TEXT PRIMARY KEY,                          -- generated: 'trk-{timestamp}-{random}'
  container_id TEXT NOT NULL REFERENCES work_containers(id),  -- replaces theme_id
  title TEXT NOT NULL,
  description TEXT,
  section TEXT,                                 -- optional sub-header grouping within container
  priority TEXT DEFAULT 'P2',                   -- P0 | P1 | P2 | -
  status TEXT DEFAULT 'todo',                   -- todo | doing | done
  target_date TEXT,                             -- ISO date or null
  sort_order INTEGER DEFAULT 0,

  -- Execution (can override container-level settings)
  execution_mode TEXT,                          -- agent | manual | assisted | null (inherits from container)
  autonomy TEXT,                                -- full | review | plan-only | manual | null (inherits)
  agent_run_id TEXT,                            -- supervisor run working on this issue
  cost_usd REAL DEFAULT 0,                      -- accumulated agent cost

  -- Cross-links
  finding_id TEXT,                              -- if this issue produced a finding
  blocked_by TEXT DEFAULT '[]',                 -- JSON array of issue IDs that must complete first

  -- Audit
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE tracker_comments (
  id TEXT PRIMARY KEY,                          -- generated: 'trkc-{timestamp}-{random}'
  issue_id TEXT NOT NULL REFERENCES tracker_issues(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  author TEXT,                                  -- user id or agent name
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_tracker_comments_issue ON tracker_comments(issue_id);

CREATE INDEX idx_tracker_issues_container ON tracker_issues(container_id);
CREATE INDEX idx_tracker_issues_status ON tracker_issues(status);
CREATE INDEX idx_tracker_issues_priority ON tracker_issues(priority);
CREATE INDEX idx_tracker_issues_execution ON tracker_issues(execution_mode);

-- Agent messages — stores conversations for interactive agent chats and supervisor run transcripts
CREATE TABLE agent_messages (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES supervisor_runs(id),
  role TEXT NOT NULL,                  -- 'user' | 'assistant' | 'tool'
  content TEXT,
  tool_name TEXT,
  tool_input TEXT,                     -- JSON
  tool_result TEXT,                    -- JSON
  tool_duration_ms INTEGER,
  turn INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_agent_messages_run ON agent_messages(run_id);
CREATE INDEX idx_agent_messages_created ON agent_messages(run_id, created_at);

-- Audit log for SSE streaming
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  detail TEXT,
  project_id TEXT,
  user_id TEXT,
  payload TEXT,                        -- JSON
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
