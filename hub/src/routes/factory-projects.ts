/**
 * Factory projects — thin scope + metadata for research investigations.
 * A project references cracks and entities, it doesn't copy them.
 */

import { json, notFound } from '../lib/response.js';
import type { AuthContext } from '../auth/middleware.js';

interface ProjectRow {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  crack_ids: string;
  entity_scope: string;
  status: string;
  budget_usd: number | null;
  spent_usd: number;
  owner_id: string;
  created_at: string;
  updated_at: string;
  scope: string | null;
}

interface MemberRow {
  project_id: string;
  user_id: string;
  role: string;
  added_at: string;
}

function parseProject(row: ProjectRow, members: MemberRow[] = []) {
  return {
    id: row.id,
    name: row.title,
    title: row.title,
    description: row.description,
    kind: row.kind,
    crack_ids: JSON.parse(row.crack_ids || '[]'),
    entity_scope: JSON.parse(row.entity_scope || '[]'),
    status: row.status,
    budget_usd: row.budget_usd,
    spent_usd: row.spent_usd,
    owner_id: row.owner_id,
    members: members.map((m) => ({ user_id: m.user_id, role: m.role })),
    created_at: row.created_at,
    updated_at: row.updated_at,
    scope: row.scope ? JSON.parse(row.scope) : null,
  };
}

/** Check if user has access to a project (owner or member). */
async function hasAccess(db: D1Database, projectId: string, userId: string): Promise<boolean> {
  const row = await db.prepare(
    `SELECT 1 FROM pipeline_projects WHERE id = ? AND owner_id = ?
     UNION SELECT 1 FROM container_members WHERE container_id = ? AND user_id = ?`
  ).bind(projectId, userId, projectId, userId).first();
  return !!row;
}

// ── List projects (user's own + shared with them) ───────────────────────

export async function handleListProjects(db: D1Database, auth: AuthContext): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const { results } = await db.prepare(
    `SELECT DISTINCT p.* FROM pipeline_projects p
     LEFT JOIN container_members cm ON p.id = cm.container_id
     WHERE p.owner_id = ? OR cm.user_id = ?
     ORDER BY p.updated_at DESC`
  ).bind(auth.userId, auth.userId).all<ProjectRow>();

  return json({ projects: results.map((r) => parseProject(r)) });
}

// ── Get project with full context ───────────────────────────────────────

export async function handleGetProject(db: D1Database, auth: AuthContext, id: string): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const row = await db.prepare('SELECT * FROM pipeline_projects WHERE id = ?').bind(id).first<ProjectRow>();
  if (!row) return notFound(`project "${id}" not found`);
  if (!(await hasAccess(db, id, auth.userId))) return json({ error: 'Access denied' }, 403);

  const { results: members } = await db.prepare(
    'SELECT container_id as project_id, user_id, role, added_at FROM container_members WHERE container_id = ?'
  ).bind(id).all<MemberRow>();

  // Fetch scoped data
  const { results: hypotheses } = await db.prepare(
    'SELECT id, crack_id, proposer_id, target_entity, proposed_mechanism, elo_rating, status, created_at FROM hypotheses WHERE project_id = ? ORDER BY elo_rating DESC'
  ).bind(id).all();

  const { results: deltas } = await db.prepare(
    'SELECT id, crack_id, pipeline, cost_usd, created_at FROM deltas WHERE project_id = ? ORDER BY created_at DESC'
  ).bind(id).all();

  const hypothesisIds = hypotheses.map((h: any) => h.id);
  let experiments: any[] = [];
  if (hypothesisIds.length > 0) {
    const placeholders = hypothesisIds.map(() => '?').join(',');
    const { results: expResults } = await db.prepare(
      `SELECT id, hypothesis_id, node_type, status, cost_usd FROM experiment_nodes WHERE hypothesis_id IN (${placeholders})`
    ).bind(...hypothesisIds).all();
    experiments = expResults;
  }

  return json({
    ...parseProject(row, members),
    hypotheses,
    deltas,
    experiments,
  });
}

// ── Create project ──────────────────────────────────────────────────────

export async function handleCreateProject(request: Request, db: D1Database, auth: AuthContext): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const body = (await request.json()) as Record<string, unknown>;
  const id = (body.id as string) ?? `proj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const name = body.name as string;

  if (!name) return json({ error: 'name is required' }, 400);

  const kind = (body.kind as string) ?? 'crack-resolution';
  const validKinds = ['crack-resolution', 'opening-extension', 'extraction-batch', 'surveillance', 'investigation', 'delivery'];
  if (!validKinds.includes(kind)) {
    return json({ error: `kind must be one of: ${validKinds.join(', ')}` }, 400);
  }

  const categorySlug = (body.category_slug as string) ?? 'research-lab';

  await db.prepare(
    `INSERT INTO pipeline_projects (id, title, description, kind, category_slug, crack_ids, entity_scope, budget_usd, owner_id, scope, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`
  ).bind(
    id,
    name,
    (body.description as string) ?? null,
    kind,
    categorySlug,
    JSON.stringify(body.crack_ids ?? []),
    JSON.stringify(body.entity_scope ?? []),
    (body.budget_usd as number) ?? null,
    auth.userId,
    body.scope ? JSON.stringify(body.scope) : null,
  ).run();

  // Owner is also a member
  await db.prepare(
    'INSERT OR IGNORE INTO container_members (container_id, user_id, role) VALUES (?, ?, ?)'
  ).bind(id, auth.userId, 'owner').run();

  return json({ id, name, kind, status: 'active' }, 201);
}

// ── Update project ──────────────────────────────────────────────────────

export async function handleUpdateProject(request: Request, db: D1Database, auth: AuthContext, id: string): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);
  if (!(await hasAccess(db, id, auth.userId))) return json({ error: 'Access denied' }, 403);

  const body = (await request.json()) as Record<string, unknown>;
  const updates: string[] = [];
  const binds: (string | number)[] = [];

  if (body.name !== undefined) { updates.push('title = ?'); binds.push(body.name as string); }
  if (body.description !== undefined) { updates.push('description = ?'); binds.push(body.description as string); }
  if (body.kind !== undefined) { updates.push('kind = ?'); binds.push(body.kind as string); }
  if (body.crack_ids !== undefined) { updates.push('crack_ids = ?'); binds.push(JSON.stringify(body.crack_ids)); }
  if (body.entity_scope !== undefined) { updates.push('entity_scope = ?'); binds.push(JSON.stringify(body.entity_scope)); }
  if (body.status !== undefined) { updates.push('status = ?'); binds.push(body.status as string); }
  if (body.budget_usd !== undefined) { updates.push('budget_usd = ?'); binds.push(body.budget_usd as number); }
  if (body.scope !== undefined) { updates.push('scope = ?'); binds.push(JSON.stringify(body.scope)); }
  if (body.schedule !== undefined) { updates.push('schedule = ?'); binds.push(body.schedule as string); }

  if (updates.length === 0) return json({ error: 'No fields to update' }, 400);

  updates.push("updated_at = datetime('now')");
  binds.push(id);
  await db.prepare(`UPDATE pipeline_projects SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run();

  return json({ id, updated: true });
}

// ── Delete project ──────────────────────────────────────────────────────

export async function handleDeleteProject(db: D1Database, auth: AuthContext, id: string): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const row = await db.prepare('SELECT owner_id FROM pipeline_projects WHERE id = ?').bind(id).first<{ owner_id: string }>();
  if (!row) return notFound(`project "${id}" not found`);
  if (row.owner_id !== auth.userId) return json({ error: 'Only the owner can delete a project' }, 403);

  // Unlink hypotheses and deltas (don't delete them — they're still in the universe)
  await db.batch([
    db.prepare('UPDATE hypotheses SET project_id = NULL WHERE project_id = ?').bind(id),
    db.prepare('UPDATE deltas SET project_id = NULL WHERE project_id = ?').bind(id),
    db.prepare('DELETE FROM container_members WHERE container_id = ?').bind(id),
    db.prepare('DELETE FROM pipeline_projects WHERE id = ?').bind(id),
  ]);

  return json({ id, deleted: true });
}

// ── Add member ──────────────────────────────────────────────────────────

export async function handleAddMember(request: Request, db: D1Database, auth: AuthContext, projectId: string): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);
  if (!(await hasAccess(db, projectId, auth.userId))) return json({ error: 'Access denied' }, 403);

  const body = (await request.json()) as Record<string, unknown>;
  const userId = body.user_id as string;
  if (!userId) return json({ error: 'user_id is required' }, 400);

  await db.prepare(
    'INSERT OR IGNORE INTO container_members (container_id, user_id, role) VALUES (?, ?, ?)'
  ).bind(projectId, userId, 'member').run();

  return json({ project_id: projectId, user_id: userId, role: 'member' }, 201);
}
