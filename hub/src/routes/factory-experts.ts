/**
 * Expert panel — human domain experts as measurers.
 * Experts are registry-phone-book entities with trust weights and cluster IDs.
 */

import { json, notFound } from '../lib/response.js';
import type { AuthContext } from '../auth/middleware.js';

function parseExpert(row: any) {
  return {
    ...row,
    domains: row.domains ? JSON.parse(row.domains) : [],
    instruments: row.instruments ? JSON.parse(row.instruments) : [],
    depends: row.depends ? JSON.parse(row.depends) : [],
    contact: row.contact ? JSON.parse(row.contact) : {},
  };
}

// ── List experts ────────────────────────────────────────────────────────

export async function handleListExperts(db: D1Database, auth: AuthContext, url: URL): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const domain = url.searchParams.get('domain');
  const cluster = url.searchParams.get('cluster');

  let query = 'SELECT * FROM experts WHERE 1=1';
  const binds: string[] = [];

  if (domain) { query += ' AND domains LIKE ?'; binds.push(`%"${domain}"%`); }
  if (cluster) { query += ' AND cluster_id = ?'; binds.push(cluster); }

  query += ' ORDER BY trust_weight DESC, name';

  const { results } = await db.prepare(query).bind(...binds).all();
  return json({ experts: results.map(parseExpert) });
}

// ── Get single expert with consultation history ─────────────────────────

export async function handleGetExpert(db: D1Database, auth: AuthContext, id: string): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const row = await db.prepare('SELECT * FROM experts WHERE id = ?').bind(id).first();
  if (!row) return notFound(`expert "${id}" not found`);

  const { results: consultations } = await db.prepare(
    "SELECT id, title, status, consultation_type, project_id, created_at, resolved_at FROM attention_items WHERE expert_id = ? ORDER BY created_at DESC LIMIT 20"
  ).bind(id).all();

  return json({
    ...parseExpert(row),
    consultations,
  });
}

// ── Add expert ──────────────────────────────────────────────────────────

export async function handleAddExpert(request: Request, db: D1Database, auth: AuthContext): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const body = (await request.json()) as Record<string, unknown>;
  const id = (body.id as string) ?? `expert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const name = body.name as string;

  if (!name) return json({ error: 'name is required' }, 400);

  await db.prepare(
    `INSERT INTO experts (id, name, domains, affiliation, instruments, depends, availability, response_time_days, cost_per_consultation_usd, contact, trust_weight, cluster_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    name,
    JSON.stringify(body.domains ?? []),
    (body.affiliation as string) ?? null,
    JSON.stringify(body.instruments ?? []),
    JSON.stringify(body.depends ?? []),
    (body.availability as string) ?? 'async',
    (body.response_time_days as number) ?? 7,
    (body.cost_per_consultation_usd as number) ?? 0,
    body.contact ? JSON.stringify(body.contact) : '{}',
    (body.trust_weight as number) ?? 1.0,
    (body.cluster_id as string) ?? null,
  ).run();

  return json({ id, name }, 201);
}

// ── Update expert ───────────────────────────────────────────────────────

export async function handleUpdateExpert(request: Request, db: D1Database, auth: AuthContext, id: string): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const body = (await request.json()) as Record<string, unknown>;
  const updates: string[] = [];
  const binds: (string | number)[] = [];

  if (body.name !== undefined) { updates.push('name = ?'); binds.push(body.name as string); }
  if (body.domains !== undefined) { updates.push('domains = ?'); binds.push(JSON.stringify(body.domains)); }
  if (body.affiliation !== undefined) { updates.push('affiliation = ?'); binds.push(body.affiliation as string); }
  if (body.instruments !== undefined) { updates.push('instruments = ?'); binds.push(JSON.stringify(body.instruments)); }
  if (body.depends !== undefined) { updates.push('depends = ?'); binds.push(JSON.stringify(body.depends)); }
  if (body.availability !== undefined) { updates.push('availability = ?'); binds.push(body.availability as string); }
  if (body.response_time_days !== undefined) { updates.push('response_time_days = ?'); binds.push(body.response_time_days as number); }
  if (body.cost_per_consultation_usd !== undefined) { updates.push('cost_per_consultation_usd = ?'); binds.push(body.cost_per_consultation_usd as number); }
  if (body.contact !== undefined) { updates.push('contact = ?'); binds.push(JSON.stringify(body.contact)); }
  if (body.trust_weight !== undefined) { updates.push('trust_weight = ?'); binds.push(body.trust_weight as number); }
  if (body.cluster_id !== undefined) { updates.push('cluster_id = ?'); binds.push(body.cluster_id as string); }
  if (body.reward_config !== undefined) { updates.push('reward_config = ?'); binds.push(JSON.stringify(body.reward_config)); }

  if (updates.length === 0) return json({ error: 'No fields to update' }, 400);

  updates.push("updated_at = datetime('now')");
  binds.push(id);
  await db.prepare(`UPDATE experts SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run();

  return json({ id, updated: true });
}

// ── Record a reward ─────────────────────────────────────────────────────

export async function handleCreateReward(request: Request, db: D1Database, auth: AuthContext): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const body = (await request.json()) as Record<string, unknown>;
  const id = `reward-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const expertId = body.expert_id as string;
  const type = body.type as string;
  const amount = body.amount_usd as number;

  if (!expertId) return json({ error: 'expert_id is required' }, 400);
  if (!type) return json({ error: 'type is required' }, 400);
  if (amount === undefined || amount === null || amount < 0) return json({ error: 'amount_usd is required and must be >= 0' }, 400);

  const validTypes = ['consultation-fee', 'discovery-kickback', 'patent-kickback', 'bonus', 'retainer'];
  if (!validTypes.includes(type)) {
    return json({ error: `type must be one of: ${validTypes.join(', ')}` }, 400);
  }

  await db.prepare(
    `INSERT INTO expert_rewards (id, expert_id, type, status, amount_usd, project_id, hypothesis_id, crack_id, description, consultation_id)
     VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    expertId,
    type,
    amount,
    (body.project_id as string) ?? null,
    (body.hypothesis_id as string) ?? null,
    (body.crack_id as string) ?? null,
    body.description as string,
    (body.consultation_id as string) ?? null,
  ).run();

  // Update total earned
  await db.prepare(
    'UPDATE experts SET total_earned_usd = total_earned_usd + ? WHERE id = ?'
  ).bind(amount, expertId).run();

  return json({ id, expert_id: expertId, type, amount_usd: amount, status: 'pending' }, 201);
}

// ── Mark reward as paid ─────────────────────────────────────────────────

export async function handlePayReward(request: Request, db: D1Database, auth: AuthContext, rewardId: string): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const body = (await request.json()) as Record<string, unknown>;

  const reward = await db.prepare('SELECT * FROM expert_rewards WHERE id = ?').bind(rewardId).first() as any;
  if (!reward) return notFound(`reward "${rewardId}" not found`);

  await db.batch([
    db.prepare(
      "UPDATE expert_rewards SET status = 'paid', paid_at = datetime('now'), paid_reference = ? WHERE id = ?"
    ).bind((body.reference as string) ?? null, rewardId),
    db.prepare(
      'UPDATE experts SET total_paid_usd = total_paid_usd + ? WHERE id = ?'
    ).bind(reward.amount_usd, reward.expert_id),
  ]);

  return json({ id: rewardId, status: 'paid' });
}

// ── List rewards for an expert ──────────────────────────────────────────

export async function handleListRewards(db: D1Database, auth: AuthContext, url: URL): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const expertId = url.searchParams.get('expert_id');
  const status = url.searchParams.get('status');

  let query = 'SELECT * FROM expert_rewards WHERE 1=1';
  const binds: string[] = [];

  if (expertId) { query += ' AND expert_id = ?'; binds.push(expertId); }
  if (status) { query += ' AND status = ?'; binds.push(status); }

  query += ' ORDER BY created_at DESC';

  const { results } = await db.prepare(query).bind(...binds).all();
  const totalPending = results.filter((r: any) => r.status === 'pending').reduce((sum: number, r: any) => sum + r.amount_usd, 0);
  const totalPaid = results.filter((r: any) => r.status === 'paid').reduce((sum: number, r: any) => sum + r.amount_usd, 0);

  return json({ rewards: results, total_pending_usd: totalPending, total_paid_usd: totalPaid });
}
