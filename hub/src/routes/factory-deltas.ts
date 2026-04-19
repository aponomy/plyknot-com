/**
 * Factory delta endpoints — convergence deltas are the unit of factory output.
 */

import { json, notFound } from '../lib/response.js';
import type { AuthContext } from '../auth/middleware.js';

interface DeltaRow {
  id: string;
  crack_id: string;
  pipeline: string;
  entries: string;
  convergence_shift: string | null;
  cost_usd: number | null;
  created_at: string;
}

export async function handleListDeltas(db: D1Database, url: URL): Promise<Response> {
  const crackId = url.searchParams.get('crack_id');
  const pipeline = url.searchParams.get('pipeline');

  let sql = 'SELECT * FROM deltas';
  const binds: string[] = [];
  const wheres: string[] = [];

  if (crackId) { wheres.push('crack_id = ?'); binds.push(crackId); }
  if (pipeline) { wheres.push('pipeline = ?'); binds.push(pipeline); }
  if (wheres.length) sql += ' WHERE ' + wheres.join(' AND ');
  sql += ' ORDER BY created_at DESC LIMIT 100';

  const stmt = db.prepare(sql);
  const { results } = await (binds.length ? stmt.bind(...binds) : stmt).all<DeltaRow>();

  return json({
    deltas: results.map((r) => ({
      ...r,
      entries: JSON.parse(r.entries),
      convergence_shift: r.convergence_shift ? JSON.parse(r.convergence_shift) : null,
    })),
  });
}

export async function handleGetDelta(db: D1Database, id: string): Promise<Response> {
  const row = await db.prepare('SELECT * FROM deltas WHERE id = ?').bind(id).first<DeltaRow>();
  if (!row) return notFound(`delta "${id}" not found`);
  return json({
    ...row,
    entries: JSON.parse(row.entries),
    convergence_shift: row.convergence_shift ? JSON.parse(row.convergence_shift) : null,
  });
}

export async function handleCreateDelta(request: Request, db: D1Database, auth: AuthContext): Promise<Response> {
  const body = (await request.json()) as Record<string, unknown>;

  const id = body.delta_id as string ?? `delta-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const crackId = body.crack_id as string;
  const pipeline = body.pipeline as string;

  if (!crackId) return json({ error: 'crack_id is required' }, 400);
  if (!pipeline) return json({ error: 'pipeline is required' }, 400);
  if (!body.entries || !Array.isArray(body.entries)) return json({ error: 'entries array is required' }, 400);

  const validPipelines = ['crack-resolution', 'opening-extension', 'extraction', 'surveillance', 'rendering'];
  if (!validPipelines.includes(pipeline)) {
    return json({ error: `pipeline must be one of: ${validPipelines.join(', ')}` }, 400);
  }

  await db.prepare(
    `INSERT INTO deltas (id, crack_id, project_id, pipeline, entries, convergence_shift, cost_usd)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    crackId,
    (body.project_id as string) ?? null,
    pipeline,
    JSON.stringify(body.entries),
    body.convergence_shift ? JSON.stringify(body.convergence_shift) : null,
    (body.cost_usd as number) ?? null,
  ).run();

  return json({ id, pipeline, project_id: (body.project_id as string) ?? null, status: 'created' }, 201);
}
