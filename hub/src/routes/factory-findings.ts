/**
 * Findings — formulated claims backed by convergence evidence.
 * The interpretive bridge between raw deltas and human-facing outputs.
 */

import { json, notFound } from '../lib/response.js';
import type { AuthContext } from '../auth/middleware.js';

const JSON_FIELDS = ['delta_ids', 'hypothesis_ids', 'measurement_ids', 'domains', 'entities', 'expert_reviews'];

function parseFinding(row: any) {
  const parsed = { ...row };
  for (const f of JSON_FIELDS) {
    if (parsed[f]) parsed[f] = JSON.parse(parsed[f]);
  }
  return parsed;
}

// ── List findings ───────────────────────────────────────────────────────

export async function handleListFindings(db: D1Database, auth: AuthContext, url: URL): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');
  const projectId = url.searchParams.get('project_id');

  let query = 'SELECT * FROM findings WHERE 1=1';
  const binds: string[] = [];

  if (status) { query += ' AND status = ?'; binds.push(status); }
  if (type) { query += ' AND finding_type = ?'; binds.push(type); }
  if (projectId) { query += ' AND project_id = ?'; binds.push(projectId); }

  query += ' ORDER BY created_at DESC';

  const { results } = await db.prepare(query).bind(...binds).all();
  return json({ findings: results.map(parseFinding) });
}

// ── Get finding with publications ───────────────────────────────────────

export async function handleGetFinding(db: D1Database, auth: AuthContext, id: string): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const row = await db.prepare('SELECT * FROM findings WHERE id = ?').bind(id).first();
  if (!row) return notFound(`finding "${id}" not found`);

  // Get linked publications
  const { results: pubs } = await db.prepare(
    "SELECT id, track, title, status, created_at FROM publications WHERE finding_ids LIKE ?"
  ).bind(`%"${id}"%`).all();

  return json({ ...parseFinding(row), publications: pubs });
}

// ── Create finding ──────────────────────────────────────────────────────

export async function handleCreateFinding(request: Request, db: D1Database, auth: AuthContext): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const body = (await request.json()) as Record<string, unknown>;
  const id = (body.id as string) ?? `find-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (!body.title) return json({ error: 'title is required' }, 400);
  if (!body.summary) return json({ error: 'summary is required' }, 400);
  if (!body.finding_type) return json({ error: 'finding_type is required' }, 400);

  const validTypes = ['crack-resolution', 'opening-discovery', 'echo-chamber-break', 'measurement-artifact', 'methodology-improvement'];
  if (!validTypes.includes(body.finding_type as string)) {
    return json({ error: `finding_type must be one of: ${validTypes.join(', ')}` }, 400);
  }

  await db.prepare(
    `INSERT INTO findings (id, title, summary, finding_type, status, project_id, crack_id, delta_ids, hypothesis_ids, measurement_ids, sigma_resolved, sigma_after, independent_clusters, domains, entities, created_by)
     VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    body.title as string,
    body.summary as string,
    body.finding_type as string,
    (body.project_id as string) ?? null,
    (body.crack_id as string) ?? null,
    JSON.stringify(body.delta_ids ?? []),
    JSON.stringify(body.hypothesis_ids ?? []),
    JSON.stringify(body.measurement_ids ?? []),
    (body.sigma_resolved as number) ?? null,
    (body.sigma_after as number) ?? null,
    (body.independent_clusters as number) ?? 0,
    JSON.stringify(body.domains ?? []),
    JSON.stringify(body.entities ?? []),
    auth.userId,
  ).run();

  return json({ id, status: 'draft' }, 201);
}

// ── Update finding ──────────────────────────────────────────────────────

export async function handleUpdateFinding(request: Request, db: D1Database, auth: AuthContext, id: string): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const body = (await request.json()) as Record<string, unknown>;
  const updates: string[] = [];
  const binds: (string | number)[] = [];

  if (body.title !== undefined) { updates.push('title = ?'); binds.push(body.title as string); }
  if (body.summary !== undefined) { updates.push('summary = ?'); binds.push(body.summary as string); }
  if (body.status !== undefined) { updates.push('status = ?'); binds.push(body.status as string); }
  if (body.delta_ids !== undefined) { updates.push('delta_ids = ?'); binds.push(JSON.stringify(body.delta_ids)); }
  if (body.hypothesis_ids !== undefined) { updates.push('hypothesis_ids = ?'); binds.push(JSON.stringify(body.hypothesis_ids)); }
  if (body.sigma_after !== undefined) { updates.push('sigma_after = ?'); binds.push(body.sigma_after as number); }
  if (body.independent_clusters !== undefined) { updates.push('independent_clusters = ?'); binds.push(body.independent_clusters as number); }
  if (body.expert_reviews !== undefined) { updates.push('expert_reviews = ?'); binds.push(JSON.stringify(body.expert_reviews)); }

  if (updates.length === 0) return json({ error: 'No fields to update' }, 400);

  updates.push("updated_at = datetime('now')");
  binds.push(id);
  await db.prepare(`UPDATE findings SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run();

  return json({ id, updated: true });
}

// ── Review finding (attach expert review) ───────────────────────────────

export async function handleReviewFinding(request: Request, db: D1Database, auth: AuthContext, id: string): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const body = (await request.json()) as Record<string, unknown>;
  if (!body.expert_id) return json({ error: 'expert_id is required' }, 400);
  if (!body.opinion) return json({ error: 'opinion is required' }, 400);

  // Get current reviews
  const row = await db.prepare('SELECT expert_reviews, status FROM findings WHERE id = ?').bind(id).first() as any;
  if (!row) return notFound(`finding "${id}" not found`);

  const reviews = row.expert_reviews ? JSON.parse(row.expert_reviews) : [];
  reviews.push({
    expert_id: body.expert_id,
    opinion: body.opinion,
    confidence: body.confidence ?? null,
    rationale: body.rationale ?? null,
    reviewed_at: new Date().toISOString(),
  });

  // Auto-advance status if still draft
  const newStatus = row.status === 'draft' ? 'expert-reviewed' : row.status;

  await db.prepare(
    "UPDATE findings SET expert_reviews = ?, status = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(JSON.stringify(reviews), newStatus, id).run();

  return json({ id, reviews_count: reviews.length, status: newStatus });
}
