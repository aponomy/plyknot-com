/**
 * Attention items — human-in-the-loop tickets for the research factory.
 * Wet-lab requests, judge divergence escalations, human input needs,
 * budget exceeded, review approvals.
 */

import { json, notFound } from '../lib/response.js';
import type { AuthContext } from '../auth/middleware.js';

// ── Create attention item ───────────────────────────────────────────────

export async function handleCreateAttention(request: Request, db: D1Database, auth: AuthContext): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const body = (await request.json()) as Record<string, unknown>;
  const id = (body.id as string) ?? `attn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const title = body.title as string;
  const type = body.type as string;

  if (!title) return json({ error: 'title is required' }, 400);
  if (!type) return json({ error: 'type is required' }, 400);

  const validTypes = ['wet-lab-request', 'human-input', 'review', 'budget-exceeded', 'judge-divergence', 'approval', 'expert-consultation'];
  if (!validTypes.includes(type)) {
    return json({ error: `type must be one of: ${validTypes.join(', ')}` }, 400);
  }

  await db.prepare(
    `INSERT INTO attention_items (id, type, priority, status, project_id, run_id, blocking_task_id, hypothesis_id, crack_id, title, description, requested_action, assay_spec, expert_id, consultation_type, material, expires_at)
     VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    type,
    (body.priority as string) ?? 'medium',
    (body.project_id as string) ?? null,
    (body.run_id as string) ?? null,
    (body.blocking_task_id as string) ?? null,
    (body.hypothesis_id as string) ?? null,
    (body.crack_id as string) ?? null,
    title,
    (body.description as string) ?? null,
    (body.requested_action as string) ?? null,
    body.assay_spec ? JSON.stringify(body.assay_spec) : null,
    (body.expert_id as string) ?? null,
    (body.consultation_type as string) ?? null,
    body.material ? JSON.stringify(body.material) : null,
    (body.expires_at as string) ?? null,
  ).run();

  // If blocking a supervisor task, pause it
  if (body.blocking_task_id) {
    await db.prepare(
      "UPDATE supervisor_tasks SET status = 'paused' WHERE id = ?"
    ).bind(body.blocking_task_id as string).run();
  }

  return json({ id, type, status: 'pending' }, 201);
}

// ── List attention items ────────────────────────────────────────────────

export async function handleListAttention(db: D1Database, auth: AuthContext, url: URL): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const status = url.searchParams.get('status');
  const projectId = url.searchParams.get('project_id');
  const type = url.searchParams.get('type');

  let query = 'SELECT * FROM attention_items WHERE 1=1';
  const binds: string[] = [];

  if (status) { query += ' AND status = ?'; binds.push(status); }
  if (projectId) { query += ' AND project_id = ?'; binds.push(projectId); }
  if (type) { query += ' AND type = ?'; binds.push(type); }

  query += ' ORDER BY CASE priority WHEN \'critical\' THEN 0 WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 WHEN \'low\' THEN 3 END, created_at DESC';

  const { results } = await db.prepare(query).bind(...binds).all();

  return json({
    items: results.map((r: any) => ({
      ...r,
      assay_spec: r.assay_spec ? JSON.parse(r.assay_spec) : null,
      material: r.material ? JSON.parse(r.material) : null,
      response: r.response ? JSON.parse(r.response) : null,
    })),
  });
}

// ── Get single item ─────────────────────────────────────────────────────

export async function handleGetAttention(db: D1Database, auth: AuthContext, id: string): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const row = await db.prepare('SELECT * FROM attention_items WHERE id = ?').bind(id).first();
  if (!row) return notFound(`attention item "${id}" not found`);

  return json({
    ...row,
    assay_spec: (row as any).assay_spec ? JSON.parse((row as any).assay_spec) : null,
    material: (row as any).material ? JSON.parse((row as any).material) : null,
    response: (row as any).response ? JSON.parse((row as any).response) : null,
  });
}

// ── Update (acknowledge, change priority) ───────────────────────────────

export async function handleUpdateAttention(request: Request, db: D1Database, auth: AuthContext, id: string): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const body = (await request.json()) as Record<string, unknown>;
  const updates: string[] = [];
  const binds: (string | number)[] = [];

  if (body.status !== undefined) { updates.push('status = ?'); binds.push(body.status as string); }
  if (body.priority !== undefined) { updates.push('priority = ?'); binds.push(body.priority as string); }

  if (updates.length === 0) return json({ error: 'No fields to update' }, 400);

  updates.push("updated_at = datetime('now')");
  binds.push(id);
  await db.prepare(`UPDATE attention_items SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run();

  return json({ id, updated: true });
}

// ── Resolve ─────────────────────────────────────────────────────────────

export async function handleResolveAttention(request: Request, db: D1Database, auth: AuthContext, id: string): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const body = (await request.json()) as Record<string, unknown>;

  await db.prepare(
    `UPDATE attention_items SET status = 'resolved', resolved_by = ?, resolved_at = datetime('now'), response = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(
    auth.userId,
    body.response ? JSON.stringify(body.response) : null,
    id,
  ).run();

  // Unpause the blocking task if one exists
  const item = await db.prepare('SELECT blocking_task_id FROM attention_items WHERE id = ?').bind(id).first() as { blocking_task_id?: string } | null;
  if (item?.blocking_task_id) {
    await db.prepare(
      "UPDATE supervisor_tasks SET status = 'queued' WHERE id = ? AND status = 'paused'"
    ).bind(item.blocking_task_id).run();
  }

  return json({ id, status: 'resolved' });
}

// ── Stats (for dashboard header) ────────────────────────────────────────

export async function handleAttentionStats(db: D1Database, auth: AuthContext): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const { results } = await db.prepare(
    "SELECT status, COUNT(*) as count FROM attention_items GROUP BY status"
  ).all();

  const stats: Record<string, number> = {};
  for (const r of results as Array<{ status: string; count: number }>) {
    stats[r.status] = r.count;
  }

  // Count resolved today
  const today = await db.prepare(
    "SELECT COUNT(*) as count FROM attention_items WHERE status = 'resolved' AND resolved_at >= date('now')"
  ).first() as { count: number };

  return json({
    pending: stats['pending'] ?? 0,
    acknowledged: stats['acknowledged'] ?? 0,
    in_progress: stats['in-progress'] ?? 0,
    resolved_today: today.count,
    total_open: (stats['pending'] ?? 0) + (stats['acknowledged'] ?? 0) + (stats['in-progress'] ?? 0),
  });
}
