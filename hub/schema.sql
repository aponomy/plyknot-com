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

-- Projects — thin scope + metadata for research investigations
DROP TABLE IF EXISTS project_members;
DROP TABLE IF EXISTS projects;
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  crack_ids TEXT NOT NULL DEFAULT '[]',       -- JSON array of crack_id strings
  entity_scope TEXT NOT NULL DEFAULT '[]',    -- JSON array of entity names
  status TEXT DEFAULT 'active',               -- active | paused | completed
  budget_usd REAL,
  spent_usd REAL DEFAULT 0.0,
  owner_id TEXT NOT NULL,                     -- user id (GitHub ID)
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(status);

CREATE TABLE project_members (
  project_id TEXT NOT NULL REFERENCES projects(id),
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'member',                 -- owner | member
  added_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (project_id, user_id)
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
  project_id TEXT REFERENCES projects(id),
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
  project_id TEXT REFERENCES projects(id),
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
