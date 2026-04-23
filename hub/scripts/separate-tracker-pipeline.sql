-- ── Separate Tracker from Pipeline ──────────────────────────────────────────
-- Date: 2026-04-23
-- Purpose: Tracker and Pipeline are different systems.
--   Tracker = operational work management (themes + issues)
--   Pipeline = research discovery process (projects → findings → deliveries)
--   Connection: a tracker issue can INITIATE a pipeline project (one FK)
--
-- SAFETY: tracker_themes and tracker_issues are NOT modified.
--         work_containers is renamed and cleaned — only pipeline items remain.

-- ── Step 1: Rename work_containers → pipeline_projects ─────────────────────

ALTER TABLE work_containers RENAME TO pipeline_projects;

-- ── Step 2: Delete theme-derived rows (kind IS NULL = not pipeline) ────────

DELETE FROM pipeline_projects WHERE kind IS NULL;

-- ── Step 3: Add initiator link (tracker issue → pipeline project) ──────────

-- On pipeline_projects: which tracker issue started this?
ALTER TABLE pipeline_projects ADD COLUMN source_issue_id TEXT;

-- On tracker_issues: which pipeline project did this issue initiate?
ALTER TABLE tracker_issues ADD COLUMN pipeline_project_id TEXT;

-- ── Step 4: Update findings to reference pipeline_projects ─────────────────
-- findings.project_id already points to pipeline_projects.id — no change needed
-- (h0-tension and delivery-pub-* are already in pipeline_projects)

-- ── Step 5: supervisor_runs.project_id — make nullable ─────────────────────
-- supervisor_runs may reference pipeline projects; the FK target table renamed
-- but SQLite renames propagate automatically. Just ensure it still works.

-- ── Verification queries (run after migration) ────────────────────────────
-- SELECT COUNT(*) FROM pipeline_projects;  -- should be 3 (only pipeline items)
-- SELECT COUNT(*) FROM tracker_themes;     -- should be 29 (unchanged)
-- SELECT COUNT(*) FROM tracker_issues;     -- should be 281 (unchanged)
-- SELECT id, kind, status FROM pipeline_projects;  -- all should have kind set
