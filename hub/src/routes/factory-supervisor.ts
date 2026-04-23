/**
 * Factory supervisor state — persists run state, rounds, and tasks to D1
 * so the dashboard can show live factory activity.
 */

import { json, notFound } from '../lib/response.js';
import type { AuthContext } from '../auth/middleware.js';

// ── Create or update a run ──────────────────────────────────────────────

export async function handleUpsertRun(request: Request, db: D1Database, auth: AuthContext): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const body = (await request.json()) as Record<string, unknown>;
  const id = body.id as string;
  if (!id) return json({ error: 'id is required' }, 400);

  const existing = await db.prepare('SELECT id FROM supervisor_runs WHERE id = ?').bind(id).first();

  if (existing) {
    // Update
    const updates: string[] = [];
    const binds: (string | number)[] = [];

    if (body.status !== undefined) { updates.push('status = ?'); binds.push(body.status as string); }
    if (body.current_round !== undefined) { updates.push('current_round = ?'); binds.push(body.current_round as number); }
    if (body.total_cost_usd !== undefined) { updates.push('total_cost_usd = ?'); binds.push(body.total_cost_usd as number); }
    if (body.completed_at !== undefined) { updates.push('completed_at = ?'); binds.push(body.completed_at as string); }

    updates.push("updated_at = datetime('now')");
    binds.push(id);
    await db.prepare(`UPDATE supervisor_runs SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run();
  } else {
    // Create
    await db.prepare(
      `INSERT INTO supervisor_runs (id, project_id, crack_id, status, mode, config, current_round, total_cost_usd, budget_usd)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      body.project_id as string,
      body.crack_id as string,
      (body.status as string) ?? 'running',
      (body.mode as string) ?? 'cowork',
      JSON.stringify(body.config ?? {}),
      (body.current_round as number) ?? 0,
      (body.total_cost_usd as number) ?? 0,
      (body.budget_usd as number) ?? 0,
    ).run();
  }

  return json({ id, updated: true });
}

// ── Record a round ──────────────────────────────────────────────────────

export async function handleRecordRound(request: Request, db: D1Database, auth: AuthContext): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const body = (await request.json()) as Record<string, unknown>;

  await db.prepare(
    `INSERT INTO supervisor_rounds (run_id, round, tasks_completed, tasks_failed, cost_usd, hypotheses_proposed, matches_judged, experiments_planned, meta_review)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    body.run_id as string,
    body.round as number,
    (body.tasks_completed as number) ?? 0,
    (body.tasks_failed as number) ?? 0,
    (body.cost_usd as number) ?? 0,
    (body.hypotheses_proposed as number) ?? 0,
    (body.matches_judged as number) ?? 0,
    (body.experiments_planned as number) ?? 0,
    (body.meta_review as string) ?? null,
  ).run();

  return json({ run_id: body.run_id, round: body.round, recorded: true });
}

// ── Record tasks ────────────────────────────────────────────────────────

export async function handleRecordTasks(request: Request, db: D1Database, auth: AuthContext): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const body = (await request.json()) as { tasks: Array<Record<string, unknown>> };
  if (!body.tasks?.length) return json({ error: 'tasks array required' }, 400);

  const stmts = body.tasks.map((t) =>
    db.prepare(
      `INSERT OR REPLACE INTO supervisor_tasks (id, run_id, round, type, agent_role, status, input, output, cost_estimate_usd, cost_actual_usd, error, created_at, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      t.id as string,
      t.run_id as string,
      t.round as number,
      t.type as string,
      t.agent_role as string,
      t.status as string,
      t.input ? JSON.stringify(t.input) : null,
      t.output ? JSON.stringify(t.output) : null,
      (t.cost_estimate_usd as number) ?? 0,
      (t.cost_actual_usd as number) ?? null,
      (t.error as string) ?? null,
      (t.created_at as string) ?? null,
      (t.completed_at as string) ?? null,
    )
  );

  await db.batch(stmts);
  return json({ recorded: body.tasks.length });
}

// ── Get run state (for dashboard) ───────────────────────────────────────

export async function handleGetRun(db: D1Database, auth: AuthContext, id: string): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const run = await db.prepare('SELECT * FROM supervisor_runs WHERE id = ?').bind(id).first();
  if (!run) return notFound(`run "${id}" not found`);

  const { results: rounds } = await db.prepare(
    'SELECT * FROM supervisor_rounds WHERE run_id = ? ORDER BY round'
  ).bind(id).all();

  const { results: tasks } = await db.prepare(
    'SELECT id, round, type, agent_role, status, cost_actual_usd, error, created_at, completed_at FROM supervisor_tasks WHERE run_id = ? ORDER BY created_at'
  ).bind(id).all();

  return json({
    ...run,
    config: run.config ? JSON.parse(run.config as string) : null,
    rounds,
    tasks,
  });
}

// ── List runs (for dashboard) ───────────────────────────────────────────

export async function handleListRuns(db: D1Database, auth: AuthContext): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const { results } = await db.prepare(
    'SELECT id, project_id, crack_id, status, mode, current_round, total_cost_usd, budget_usd, started_at, updated_at FROM supervisor_runs ORDER BY updated_at DESC LIMIT 50'
  ).all();

  return json({ runs: results });
}

// ── Live queue stats (for dashboard factory view) ───────────────────────

export async function handleQueueStats(db: D1Database, auth: AuthContext): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  // Get active runs
  const { results: activeRuns } = await db.prepare(
    "SELECT id FROM supervisor_runs WHERE status = 'running'"
  ).all();

  if (activeRuns.length === 0) {
    return json({ active_runs: 0, queue: {} });
  }

  const runIds = activeRuns.map((r: any) => r.id);
  const placeholders = runIds.map(() => '?').join(',');

  // Count tasks by type and status for active runs
  const { results: counts } = await db.prepare(
    `SELECT type, status, COUNT(*) as count FROM supervisor_tasks WHERE run_id IN (${placeholders}) GROUP BY type, status`
  ).bind(...runIds).all();

  // Aggregate into queue shape
  const queue: Record<string, Record<string, number>> = {};
  for (const row of counts as Array<{ type: string; status: string; count: number }>) {
    if (!queue[row.type]) queue[row.type] = {};
    queue[row.type][row.status] = row.count;
  }

  return json({ active_runs: activeRuns.length, queue });
}
