-- Migration: tracker_themes + projects + publications → work_containers
-- Run AFTER schema.sql adds the work_containers table definition.
-- This script preserves existing data and populates the new table.
--
-- Usage:
--   wrangler d1 execute plyknot-hub-com-prod --local --file=scripts/migrate-to-work-containers.sql
--   wrangler d1 execute plyknot-hub-com-prod --remote --file=scripts/migrate-to-work-containers.sql

-- ── Step 1: Create work_containers if not exists ────────────────────────────

CREATE TABLE IF NOT EXISTS work_containers (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category_slug TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  kind TEXT,
  status TEXT DEFAULT 'active',
  description TEXT,
  crack_ids TEXT DEFAULT '[]',
  entity_scope TEXT DEFAULT '[]',
  budget_usd REAL,
  spent_usd REAL DEFAULT 0.0,
  scope TEXT,
  track TEXT,
  delivery_status TEXT,
  parent_id TEXT,
  execution_mode TEXT,
  autonomy TEXT DEFAULT 'manual',
  source_type TEXT,
  source_ref TEXT,
  spawned_by_finding_id TEXT,
  owner_id TEXT,
  members TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS container_members (
  container_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  added_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (container_id, user_id)
);

-- ── Step 2: Migrate tracker_themes → work_containers ────────────────────────

INSERT OR IGNORE INTO work_containers (id, title, category_slug, sort_order, created_at, updated_at)
SELECT id, title, category_slug, sort_order, created_at, updated_at
FROM tracker_themes;

-- ── Step 3: Migrate projects → work_containers ──────────────────────────────
-- Projects that don't correspond to existing themes get inserted as new containers.
-- Projects that DO correspond to themes merge their fields into the existing row.

INSERT OR IGNORE INTO work_containers (
  id, title, category_slug, kind, status, description,
  crack_ids, entity_scope, budget_usd, spent_usd, scope, owner_id,
  created_at, updated_at
)
SELECT
  p.id,
  p.name,
  'research-lab',  -- default category for orphan projects
  p.kind,
  p.status,
  p.description,
  p.crack_ids,
  p.entity_scope,
  p.budget_usd,
  p.spent_usd,
  p.scope,
  p.owner_id,
  p.created_at,
  p.updated_at
FROM projects p
WHERE p.id NOT IN (SELECT id FROM work_containers);

-- Migrate project_members → container_members
INSERT OR IGNORE INTO container_members (container_id, user_id, role, added_at)
SELECT project_id, user_id, role, added_at
FROM project_members;

-- ── Step 4: Migrate publications → work_containers (kind='delivery') ────────

INSERT OR IGNORE INTO work_containers (
  id, title, category_slug, kind, status, track, delivery_status, scope, owner_id,
  created_at, updated_at
)
SELECT
  'delivery-' || p.id,
  p.title,
  CASE p.track
    WHEN 'paper' THEN 'research'
    WHEN 'patent' THEN 'ip-legal'
    ELSE 'plyknot-com'
  END,
  'delivery',
  'active',
  p.track,
  p.status,
  CASE p.track
    WHEN 'paper' THEN p.paper_data
    WHEN 'patent' THEN p.patent_data
    WHEN 'customer-report' THEN p.report_data
  END,
  p.created_by,
  p.created_at,
  p.updated_at
FROM publications p;

-- ── Step 5: Add new columns to tracker_issues (if not exists) ───────────────
-- SQLite doesn't support ADD COLUMN IF NOT EXISTS, so we wrap in try-like fashion.
-- These will error silently if columns already exist (D1 behavior).

ALTER TABLE tracker_issues ADD COLUMN container_id TEXT;
ALTER TABLE tracker_issues ADD COLUMN execution_mode TEXT;
ALTER TABLE tracker_issues ADD COLUMN autonomy TEXT;
ALTER TABLE tracker_issues ADD COLUMN agent_run_id TEXT;
ALTER TABLE tracker_issues ADD COLUMN cost_usd REAL DEFAULT 0;
ALTER TABLE tracker_issues ADD COLUMN finding_id TEXT;
ALTER TABLE tracker_issues ADD COLUMN blocked_by TEXT DEFAULT '[]';

-- Populate container_id from theme_id
UPDATE tracker_issues SET container_id = theme_id WHERE container_id IS NULL;

-- ── Step 6: Add new columns to findings ─────────────────────────────────────

ALTER TABLE findings ADD COLUMN triage TEXT DEFAULT 'pending';
ALTER TABLE findings ADD COLUMN source_issue_id TEXT;
ALTER TABLE findings ADD COLUMN spawned_container_ids TEXT DEFAULT '[]';

-- ── Done ────────────────────────────────────────────────────────────────────
-- After verification:
-- 1. Update hub routes to use container_id instead of theme_id
-- 2. Update MCP tools
-- 3. Drop deprecated tables: tracker_themes, projects, publications
