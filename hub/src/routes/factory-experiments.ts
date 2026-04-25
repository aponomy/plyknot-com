/**
 * Factory experiment tree endpoints — typed nodes from the Planner.
 */

import { json, notFound } from '../lib/response.js';
import type { AuthContext } from '../auth/middleware.js';

interface ExperimentRow {
  id: string;
  hypothesis_id: string;
  parent_node_id: string | null;
  node_type: string;
  config: string;
  status: string;
  result: string | null;
  cost_usd: number | null;
  created_at: string;
}

export async function handleListExperiments(db: D1Database, url: URL): Promise<Response> {
  const hypothesisId = url.searchParams.get('hypothesis_id');
  const status = url.searchParams.get('status');
  const nodeType = url.searchParams.get('node_type');
  const sortOrder = url.searchParams.get('sort_order');

  let sql = 'SELECT * FROM experiment_nodes';
  const binds: string[] = [];
  const wheres: string[] = [];

  if (hypothesisId) { wheres.push('hypothesis_id = ?'); binds.push(hypothesisId); }
  if (status) { wheres.push('status = ?'); binds.push(status); }
  if (nodeType) { wheres.push('node_type = ?'); binds.push(nodeType); }
  if (wheres.length) sql += ' WHERE ' + wheres.join(' AND ');
  sql += sortOrder === 'creation_asc' ? ' ORDER BY created_at ASC' : ' ORDER BY created_at DESC';
  sql += ' LIMIT 200';

  const stmt = db.prepare(sql);
  const { results } = await (binds.length ? stmt.bind(...binds) : stmt).all<ExperimentRow>();

  return json({
    experiments: results.map((r) => ({
      ...r,
      config: JSON.parse(r.config),
      result: r.result ? JSON.parse(r.result) : null,
    })),
  });
}

export async function handleCreateExperiment(request: Request, db: D1Database, auth: AuthContext): Promise<Response> {
  const body = (await request.json()) as Record<string, unknown>;

  const id = body.id as string ?? `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const hypothesisId = body.hypothesis_id as string;
  const nodeType = body.node_type as string;

  if (!hypothesisId) return json({ error: 'hypothesis_id is required' }, 400);
  if (!nodeType) return json({ error: 'node_type is required' }, 400);

  const validTypes = ['preliminary', 'hyperparameter', 'replication', 'aggregation', 'ablation', 'contradiction'];
  if (!validTypes.includes(nodeType)) {
    return json({ error: `node_type must be one of: ${validTypes.join(', ')}` }, 400);
  }

  const parentNodeId = (body.parent_node_id as string) ?? null;

  // Validate parent_node_id belongs to the same hypothesis
  if (parentNodeId) {
    const parent = await db.prepare(
      'SELECT hypothesis_id FROM experiment_nodes WHERE id = ?'
    ).bind(parentNodeId).first<{ hypothesis_id: string }>();
    if (!parent) {
      return json({ error: `parent_node_id "${parentNodeId}" not found` }, 400);
    }
    if (parent.hypothesis_id !== hypothesisId) {
      return json({ error: `parent_node_id "${parentNodeId}" belongs to hypothesis "${parent.hypothesis_id}", not "${hypothesisId}"` }, 400);
    }
  }

  // Validate cost schema if provided
  if (body.config && typeof body.config === 'object') {
    const config = body.config as Record<string, unknown>;
    if (config.cost) {
      const cost = config.cost as Record<string, unknown>;
      if (cost.days !== undefined && typeof cost.days !== 'number') return json({ error: 'config.cost.days must be a number' }, 400);
      if (cost.usd !== undefined && typeof cost.usd !== 'number') return json({ error: 'config.cost.usd must be a number' }, 400);
      if (cost.compute_hours !== undefined && typeof cost.compute_hours !== 'number') return json({ error: 'config.cost.compute_hours must be a number' }, 400);
    }
  }

  await db.prepare(
    `INSERT INTO experiment_nodes (id, hypothesis_id, parent_node_id, node_type, config, status)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    hypothesisId,
    parentNodeId,
    nodeType,
    JSON.stringify(body.config ?? {}),
    'pending',
  ).run();

  return json({ id, status: 'pending' }, 201);
}

export async function handleUpdateExperiment(request: Request, db: D1Database, id: string): Promise<Response> {
  const body = (await request.json()) as Record<string, unknown>;

  const existing = await db.prepare('SELECT id FROM experiment_nodes WHERE id = ?').bind(id).first();
  if (!existing) return notFound(`experiment "${id}" not found`);

  const updates: string[] = [];
  const binds: (string | number)[] = [];

  if (body.status) {
    const valid = ['pending', 'running', 'completed', 'failed'];
    if (!valid.includes(body.status as string)) return json({ error: `status must be one of: ${valid.join(', ')}` }, 400);
    updates.push('status = ?'); binds.push(body.status as string);
  }
  if (body.result !== undefined) { updates.push('result = ?'); binds.push(JSON.stringify(body.result)); }
  if (body.cost_usd !== undefined) { updates.push('cost_usd = ?'); binds.push(body.cost_usd as number); }

  if (updates.length === 0) return json({ error: 'No fields to update' }, 400);

  binds.push(id);
  await db.prepare(`UPDATE experiment_nodes SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run();

  return json({ id, updated: true });
}
