/**
 * Factory hypothesis endpoints — CRUD for Proposer-generated hypotheses.
 */

import { json, notFound } from '../lib/response.js';
import type { AuthContext } from '../auth/middleware.js';

interface HypothesisRow {
  id: string;
  crack_id: string;
  proposer_id: string;
  parent_hypothesis_id: string | null;
  target_entity: string;
  target_property: string;
  proposed_mechanism: string;
  required_measurements: string;
  predicted_convergence_delta: number | null;
  depends: string | null;
  elo_rating: number;
  tournament_matches: number;
  status: string;
  created_at: string;
}

export async function handleListHypotheses(db: D1Database, url: URL): Promise<Response> {
  const crackId = url.searchParams.get('crack_id');
  const status = url.searchParams.get('status');

  let sql = 'SELECT * FROM hypotheses';
  const binds: string[] = [];
  const wheres: string[] = [];

  if (crackId) { wheres.push('crack_id = ?'); binds.push(crackId); }
  if (status) { wheres.push('status = ?'); binds.push(status); }
  if (wheres.length) sql += ' WHERE ' + wheres.join(' AND ');
  sql += ' ORDER BY elo_rating DESC LIMIT 100';

  const stmt = db.prepare(sql);
  const { results } = await (binds.length ? stmt.bind(...binds) : stmt).all<HypothesisRow>();

  return json({
    hypotheses: results.map((r) => ({
      ...r,
      required_measurements: JSON.parse(r.required_measurements),
      depends: r.depends ? JSON.parse(r.depends) : null,
    })),
  });
}

export async function handleGetHypothesis(db: D1Database, id: string): Promise<Response> {
  const row = await db.prepare('SELECT * FROM hypotheses WHERE id = ?').bind(id).first<HypothesisRow>();
  if (!row) return notFound(`hypothesis "${id}" not found`);
  return json({
    ...row,
    required_measurements: JSON.parse(row.required_measurements),
    depends: row.depends ? JSON.parse(row.depends) : null,
  });
}

export async function handleCreateHypothesis(request: Request, db: D1Database, auth: AuthContext): Promise<Response> {
  const body = (await request.json()) as Record<string, unknown>;

  const id = body.hypothesis_id as string ?? `hyp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const crackId = body.crack_id as string;
  const proposerId = body.proposer_id as string ?? auth.githubLogin ?? 'unknown';

  if (!crackId) return json({ error: 'crack_id is required' }, 400);
  if (!body.target_entity) return json({ error: 'target_entity is required' }, 400);
  if (!body.proposed_mechanism) return json({ error: 'proposed_mechanism is required' }, 400);

  await db.prepare(
    `INSERT INTO hypotheses (id, crack_id, project_id, proposer_id, parent_hypothesis_id, target_entity, target_property, proposed_mechanism, required_measurements, predicted_convergence_delta, depends, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    crackId,
    (body.project_id as string) ?? null,
    proposerId,
    (body.parent_hypothesis_id as string) ?? null,
    body.target_entity as string,
    (body.target_property as string) ?? '',
    body.proposed_mechanism as string,
    JSON.stringify(body.required_measurements ?? []),
    (body.predicted_convergence_delta as number) ?? null,
    body.depends ? JSON.stringify(body.depends) : null,
    'proposed',
  ).run();

  return json({ id, status: 'proposed', project_id: (body.project_id as string) ?? null }, 201);
}
