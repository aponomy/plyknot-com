/**
 * Publications — downstream outputs from findings.
 * Three tracks: paper, patent, customer-report.
 */

import { json, notFound } from '../lib/response.js';
import type { AuthContext } from '../auth/middleware.js';

function parsePublication(row: any) {
  return {
    ...row,
    finding_ids: row.finding_ids ? JSON.parse(row.finding_ids) : [],
    project_ids: row.project_ids ? JSON.parse(row.project_ids) : [],
    paper_data: row.paper_data ? JSON.parse(row.paper_data) : null,
    patent_data: row.patent_data ? JSON.parse(row.patent_data) : null,
    report_data: row.report_data ? JSON.parse(row.report_data) : null,
  };
}

// ── List publications ───────────────────────────────────────────────────

export async function handleListPublications(db: D1Database, auth: AuthContext, url: URL): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const track = url.searchParams.get('track');
  const status = url.searchParams.get('status');
  const findingId = url.searchParams.get('finding_id');

  let query = 'SELECT * FROM publications WHERE 1=1';
  const binds: string[] = [];

  if (track) { query += ' AND track = ?'; binds.push(track); }
  if (status) { query += ' AND status = ?'; binds.push(status); }
  if (findingId) { query += ' AND finding_ids LIKE ?'; binds.push(`%"${findingId}"%`); }

  query += ' ORDER BY created_at DESC';

  const { results } = await db.prepare(query).bind(...binds).all();
  return json({ publications: results.map(parsePublication) });
}

// ── Get publication ─────────────────────────────────────────────────────

export async function handleGetPublication(db: D1Database, auth: AuthContext, id: string): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const row = await db.prepare('SELECT * FROM publications WHERE id = ?').bind(id).first();
  if (!row) return notFound(`publication "${id}" not found`);

  return json(parsePublication(row));
}

// ── Create publication ──────────────────────────────────────────────────

export async function handleCreatePublication(request: Request, db: D1Database, auth: AuthContext): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const body = (await request.json()) as Record<string, unknown>;
  const id = (body.id as string) ?? `pub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (!body.title) return json({ error: 'title is required' }, 400);
  if (!body.track) return json({ error: 'track is required' }, 400);
  if (!body.finding_ids) return json({ error: 'finding_ids is required' }, 400);

  const validTracks = ['paper', 'patent', 'customer-report'];
  if (!validTracks.includes(body.track as string)) {
    return json({ error: `track must be one of: ${validTracks.join(', ')}` }, 400);
  }

  // Default status per track
  const defaultStatus: Record<string, string> = {
    paper: 'draft',
    patent: 'assessment',
    'customer-report': 'draft',
  };

  await db.prepare(
    `INSERT INTO publications (id, track, title, status, finding_ids, project_ids, paper_data, patent_data, report_data, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    body.track as string,
    body.title as string,
    (body.status as string) ?? defaultStatus[body.track as string],
    JSON.stringify(body.finding_ids),
    JSON.stringify(body.project_ids ?? []),
    body.paper_data ? JSON.stringify(body.paper_data) : null,
    body.patent_data ? JSON.stringify(body.patent_data) : null,
    body.report_data ? JSON.stringify(body.report_data) : null,
    auth.userId,
  ).run();

  return json({ id, track: body.track, status: defaultStatus[body.track as string] }, 201);
}

// ── Update publication ──────────────────────────────────────────────────

export async function handleUpdatePublication(request: Request, db: D1Database, auth: AuthContext, id: string): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const body = (await request.json()) as Record<string, unknown>;
  const updates: string[] = [];
  const binds: (string | number)[] = [];

  if (body.title !== undefined) { updates.push('title = ?'); binds.push(body.title as string); }
  if (body.status !== undefined) { updates.push('status = ?'); binds.push(body.status as string); }
  if (body.paper_data !== undefined) { updates.push('paper_data = ?'); binds.push(JSON.stringify(body.paper_data)); }
  if (body.patent_data !== undefined) { updates.push('patent_data = ?'); binds.push(JSON.stringify(body.patent_data)); }
  if (body.report_data !== undefined) { updates.push('report_data = ?'); binds.push(JSON.stringify(body.report_data)); }
  if (body.finding_ids !== undefined) { updates.push('finding_ids = ?'); binds.push(JSON.stringify(body.finding_ids)); }

  if (updates.length === 0) return json({ error: 'No fields to update' }, 400);

  updates.push("updated_at = datetime('now')");
  binds.push(id);
  await db.prepare(`UPDATE publications SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run();

  return json({ id, updated: true });
}
