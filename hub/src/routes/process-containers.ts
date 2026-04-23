/**
 * Process — pipeline view and container CRUD for the unified work model.
 * See research/project/strategy/13-process-unification.md
 */

import { json, notFound } from '../lib/response.js';
import type { AuthContext } from '../auth/middleware.js';

// ── Pipeline overview ───────────────────────────────────────────────────

export async function handleProcessPipeline(db: D1Database, auth: AuthContext): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  // Count containers by pipeline stage
  const backlog = await db.prepare(
    `SELECT COUNT(*) AS count FROM work_containers WHERE status = 'backlog' AND kind IS NOT NULL`
  ).first() as { count: number };

  const active = await db.prepare(
    `SELECT COUNT(*) AS count FROM work_containers WHERE status = 'active' AND kind IS NOT NULL AND (kind != 'delivery' OR kind IS NULL)`
  ).first() as { count: number };

  const findings = await db.prepare(
    `SELECT COUNT(*) AS count FROM findings WHERE triage = 'pending'`
  ).first() as { count: number };

  const deliveries = await db.prepare(
    `SELECT COUNT(*) AS count FROM work_containers WHERE kind = 'delivery' AND status = 'active'`
  ).first() as { count: number };

  const done = await db.prepare(
    `SELECT COUNT(*) AS count FROM work_containers WHERE status = 'completed' AND kind IS NOT NULL`
  ).first() as { count: number };

  return json({
    pipeline: {
      backlog: backlog.count,
      active: active.count,
      findings: findings.count,
      deliveries: deliveries.count,
      done: done.count,
    },
  });
}

// ── List containers ─────────────────────────────────────────────────────

export async function handleListContainers(db: D1Database, auth: AuthContext, url: URL): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const kind = url.searchParams.get('kind');
  const status = url.searchParams.get('status');
  const category = url.searchParams.get('category');
  const pipelineOnly = url.searchParams.get('pipeline') === 'true';
  const parentId = url.searchParams.get('parent_id');

  let query = `SELECT wc.*, c.label AS category_label,
                      (SELECT COUNT(*) FROM tracker_issues WHERE container_id = wc.id) AS issue_count,
                      (SELECT COUNT(*) FROM tracker_issues WHERE container_id = wc.id AND status = 'done') AS done_count
               FROM work_containers wc
               JOIN tracker_categories c ON c.slug = wc.category_slug
               WHERE 1=1`;
  const binds: (string | number)[] = [];

  if (kind) { query += ' AND wc.kind = ?'; binds.push(kind); }
  if (status) { query += ' AND wc.status = ?'; binds.push(status); }
  if (category) { query += ' AND wc.category_slug = ?'; binds.push(category); }
  if (pipelineOnly) { query += ' AND wc.kind IS NOT NULL'; }
  if (parentId) { query += ' AND wc.parent_id = ?'; binds.push(parentId); }

  query += ' ORDER BY c.sort_order, wc.sort_order';

  const { results } = await db.prepare(query).bind(...binds).all();
  return json({ containers: results });
}

// ── Get single container ────────────────────────────────────────────────

export async function handleGetContainer(db: D1Database, auth: AuthContext, id: string): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const container = await db.prepare(
    `SELECT wc.*, c.label AS category_label
     FROM work_containers wc
     JOIN tracker_categories c ON c.slug = wc.category_slug
     WHERE wc.id = ?`
  ).bind(id).first();
  if (!container) return notFound(`container "${id}" not found`);

  // Get issues
  const { results: issues } = await db.prepare(
    `SELECT * FROM tracker_issues WHERE container_id = ?
     ORDER BY CASE status WHEN 'doing' THEN 0 WHEN 'todo' THEN 1 ELSE 2 END,
              CASE priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 ELSE 3 END,
              sort_order`
  ).bind(id).all();

  // Get sub-containers
  const { results: children } = await db.prepare(
    `SELECT id, title, kind, status, track, delivery_status, execution_mode
     FROM work_containers WHERE parent_id = ?
     ORDER BY sort_order`
  ).bind(id).all();

  // Get findings linked to this container
  const { results: findings } = await db.prepare(
    'SELECT id, title, finding_type, status, triage, sigma_resolved, sigma_after FROM findings WHERE project_id = ?'
  ).bind(id).all();

  return json({ ...container, issues, children, findings });
}

// ── Create container ────────────────────────────────────────────────────

export async function handleCreateContainer(request: Request, db: D1Database, auth: AuthContext): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const body = (await request.json()) as Record<string, unknown>;
  const title = body.title as string;
  const categorySlug = body.category_slug as string;

  if (!title) return json({ error: 'title is required' }, 400);
  if (!categorySlug) return json({ error: 'category_slug is required' }, 400);

  const cat = await db.prepare('SELECT slug FROM tracker_categories WHERE slug = ?').bind(categorySlug).first();
  if (!cat) return json({ error: `category "${categorySlug}" not found` }, 400);

  const id = (body.id as string) ?? `wc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const last = await db.prepare(
    'SELECT MAX(sort_order) as max_sort FROM work_containers WHERE category_slug = ?'
  ).bind(categorySlug).first() as { max_sort: number | null };
  const sortOrder = (body.sort_order as number) ?? ((last?.max_sort ?? -1) + 1);

  const kind = (body.kind as string) ?? null;
  const status = (body.status as string) ?? (kind ? 'backlog' : 'active');
  const description = (body.description as string) ?? null;
  const track = (body.track as string) ?? null;
  const deliveryStatus = (body.delivery_status as string) ?? null;
  const executionMode = (body.execution_mode as string) ?? null;
  const autonomy = (body.autonomy as string) ?? 'manual';
  const budgetUsd = (body.budget_usd as number) ?? null;
  const crackIds = body.crack_ids ? JSON.stringify(body.crack_ids) : '[]';
  const entityScope = body.entity_scope ? JSON.stringify(body.entity_scope) : '[]';
  const scope = body.scope ? JSON.stringify(body.scope) : null;
  const sourceType = (body.source_type as string) ?? null;
  const sourceRef = (body.source_ref as string) ?? null;
  const parentId = (body.parent_id as string) ?? null;
  const spawnedByFindingId = (body.spawned_by_finding_id as string) ?? null;

  await db.prepare(
    `INSERT INTO work_containers (id, category_slug, title, sort_order, kind, status, description,
       track, delivery_status, execution_mode, autonomy, budget_usd, crack_ids, entity_scope, scope,
       source_type, source_ref, parent_id, spawned_by_finding_id, owner_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, categorySlug, title, sortOrder, kind, status, description,
    track, deliveryStatus, executionMode, autonomy, budgetUsd, crackIds, entityScope, scope,
    sourceType, sourceRef, parentId, spawnedByFindingId, auth.userId).run();

  return json({ id, title, category_slug: categorySlug, kind, status }, 201);
}

// ── Update container ────────────────────────────────────────────────────

export async function handleUpdateContainer(request: Request, db: D1Database, auth: AuthContext, id: string): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const existing = await db.prepare('SELECT id FROM work_containers WHERE id = ?').bind(id).first();
  if (!existing) return notFound(`container "${id}" not found`);

  const body = (await request.json()) as Record<string, unknown>;
  const updates: string[] = [];
  const binds: (string | number | null)[] = [];

  if (body.title !== undefined) { updates.push('title = ?'); binds.push(body.title as string); }
  if (body.description !== undefined) { updates.push('description = ?'); binds.push(body.description as string | null); }
  if (body.kind !== undefined) { updates.push('kind = ?'); binds.push(body.kind as string | null); }
  if (body.status !== undefined) { updates.push('status = ?'); binds.push(body.status as string); }
  if (body.track !== undefined) { updates.push('track = ?'); binds.push(body.track as string | null); }
  if (body.delivery_status !== undefined) { updates.push('delivery_status = ?'); binds.push(body.delivery_status as string | null); }
  if (body.execution_mode !== undefined) { updates.push('execution_mode = ?'); binds.push(body.execution_mode as string | null); }
  if (body.autonomy !== undefined) { updates.push('autonomy = ?'); binds.push(body.autonomy as string | null); }
  if (body.budget_usd !== undefined) { updates.push('budget_usd = ?'); binds.push(body.budget_usd as number | null); }
  if (body.spent_usd !== undefined) { updates.push('spent_usd = ?'); binds.push(body.spent_usd as number); }
  if (body.crack_ids !== undefined) { updates.push('crack_ids = ?'); binds.push(JSON.stringify(body.crack_ids)); }
  if (body.entity_scope !== undefined) { updates.push('entity_scope = ?'); binds.push(JSON.stringify(body.entity_scope)); }
  if (body.scope !== undefined) { updates.push('scope = ?'); binds.push(body.scope ? JSON.stringify(body.scope) : null); }
  if (body.parent_id !== undefined) { updates.push('parent_id = ?'); binds.push(body.parent_id as string | null); }
  if (body.source_type !== undefined) { updates.push('source_type = ?'); binds.push(body.source_type as string | null); }
  if (body.source_ref !== undefined) { updates.push('source_ref = ?'); binds.push(body.source_ref as string | null); }

  if (updates.length === 0) return json({ error: 'No fields to update' }, 400);

  updates.push("updated_at = datetime('now')");
  binds.push(id);

  await db.prepare(`UPDATE work_containers SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run();
  return json({ id, updated: true });
}

// ── Promote container from backlog to active ────────────────────────────

export async function handlePromoteContainer(request: Request, db: D1Database, auth: AuthContext, id: string): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const container = await db.prepare('SELECT id, status FROM work_containers WHERE id = ?').bind(id).first() as { id: string; status: string } | null;
  if (!container) return notFound(`container "${id}" not found`);
  if (container.status !== 'backlog') return json({ error: `Container is "${container.status}", not "backlog"` }, 400);

  await db.prepare(
    `UPDATE work_containers SET status = 'active', updated_at = datetime('now') WHERE id = ?`
  ).bind(id).run();

  return json({ id, status: 'active', promoted: true });
}

// ── Spawn delivery from finding ─────────────────────────────────────────

export async function handleSpawnDelivery(request: Request, db: D1Database, auth: AuthContext): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const body = (await request.json()) as Record<string, unknown>;
  const findingId = body.finding_id as string;
  const title = body.title as string;
  const track = body.track as string;
  const parentId = body.parent_id as string | undefined;

  if (!findingId) return json({ error: 'finding_id is required' }, 400);
  if (!title) return json({ error: 'title is required' }, 400);
  if (!track) return json({ error: 'track is required (paper | patent | customer-report)' }, 400);

  const finding = await db.prepare('SELECT id, project_id FROM findings WHERE id = ?').bind(findingId).first() as { id: string; project_id: string | null } | null;
  if (!finding) return json({ error: `finding "${findingId}" not found` }, 400);

  // Determine category from track
  const categorySlug = track === 'paper' ? 'research' : track === 'patent' ? 'ip-legal' : 'plyknot-com';

  const id = `delivery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  await db.prepare(
    `INSERT INTO work_containers (id, category_slug, title, kind, status, track, delivery_status,
       source_type, source_ref, spawned_by_finding_id, parent_id, owner_id)
     VALUES (?, ?, ?, 'delivery', 'active', ?, 'draft', 'finding', ?, ?, ?, ?)`
  ).bind(id, categorySlug, title, track, findingId, findingId, parentId ?? finding.project_id ?? null, auth.userId).run();

  // Update finding triage
  await db.prepare(
    `UPDATE findings SET triage = 'actioned', updated_at = datetime('now') WHERE id = ?`
  ).bind(findingId).run();

  // Add delivery to finding's spawned_container_ids
  const currentFinding = await db.prepare('SELECT spawned_container_ids FROM findings WHERE id = ?').bind(findingId).first() as { spawned_container_ids: string };
  const spawned = JSON.parse(currentFinding.spawned_container_ids || '[]');
  spawned.push(id);
  await db.prepare(
    'UPDATE findings SET spawned_container_ids = ? WHERE id = ?'
  ).bind(JSON.stringify(spawned), findingId).run();

  return json({ id, title, kind: 'delivery', track, status: 'active', delivery_status: 'draft', finding_id: findingId }, 201);
}

// ── Stream view — value streams flowing through pipeline ──────────────

export async function handleProcessStreams(db: D1Database, auth: AuthContext): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  // Get all pipeline containers (kind IS NOT NULL) with issue counts
  const { results: containers } = await db.prepare(
    `SELECT wc.*, c.label AS category_label,
            (SELECT COUNT(*) FROM tracker_issues WHERE container_id = wc.id) AS issue_count,
            (SELECT COUNT(*) FROM tracker_issues WHERE container_id = wc.id AND status = 'done') AS done_count
     FROM work_containers wc
     JOIN tracker_categories c ON c.slug = wc.category_slug
     WHERE wc.kind IS NOT NULL
     ORDER BY c.sort_order, wc.sort_order`
  ).all();

  // Get all findings
  const { results: findings } = await db.prepare(
    `SELECT id, title, finding_type, status, triage, project_id,
            sigma_resolved, sigma_after, spawned_container_ids, created_at
     FROM findings ORDER BY created_at DESC`
  ).all();

  // Build streams: group by root container (no parent) and trace downstream
  const rootContainers = containers.filter((c: any) => !c.parent_id);
  const childMap = new Map<string, any[]>();
  for (const c of containers) {
    const pid = (c as any).parent_id;
    if (pid) {
      if (!childMap.has(pid)) childMap.set(pid, []);
      childMap.get(pid)!.push(c);
    }
  }

  const streams = rootContainers.map((root: any) => {
    // Findings produced by this container
    const containerFindings = findings.filter((f: any) => f.project_id === root.id);

    // Deliveries: children with kind=delivery, or spawned from findings
    const childDeliveries = (childMap.get(root.id) || []).filter((c: any) => c.kind === 'delivery');
    const findingSpawnedIds = new Set<string>();
    for (const f of containerFindings) {
      const spawned = JSON.parse((f as any).spawned_container_ids || '[]');
      for (const sid of spawned) findingSpawnedIds.add(sid);
    }
    const spawnedDeliveries = containers.filter((c: any) =>
      findingSpawnedIds.has(c.id) && !childDeliveries.some((d: any) => d.id === c.id)
    );
    const allDeliveries = [...childDeliveries, ...spawnedDeliveries];

    // Sub-projects (non-delivery children)
    const subProjects = (childMap.get(root.id) || []).filter((c: any) => c.kind !== 'delivery');

    return {
      id: root.id,
      title: root.title,
      kind: root.kind,
      status: root.status,
      category_slug: root.category_slug,
      category_label: root.category_label,
      execution_mode: root.execution_mode,
      autonomy: root.autonomy,
      issue_count: root.issue_count,
      done_count: root.done_count,
      source_type: root.source_type,
      source_ref: root.source_ref,
      findings: containerFindings.map((f: any) => ({
        id: f.id,
        title: f.title,
        finding_type: f.finding_type,
        status: f.status,
        triage: f.triage,
        sigma_resolved: f.sigma_resolved,
        sigma_after: f.sigma_after,
      })),
      deliveries: allDeliveries.map((d: any) => ({
        id: d.id,
        title: d.title,
        track: d.track,
        status: d.status,
        delivery_status: d.delivery_status,
        issue_count: d.issue_count,
        done_count: d.done_count,
      })),
      sub_projects: subProjects.map((s: any) => ({
        id: s.id,
        title: s.title,
        kind: s.kind,
        status: s.status,
        issue_count: s.issue_count,
        done_count: s.done_count,
      })),
    };
  });

  // Also include orphan findings (no project_id) and orphan deliveries (no parent)
  const linkedProjectIds = new Set(streams.map((s: any) => s.id));
  const orphanFindings = findings.filter((f: any) => !f.project_id || !linkedProjectIds.has(f.project_id));
  const orphanDeliveries = containers.filter((c: any) =>
    c.kind === 'delivery' && !c.parent_id && !streams.some((s: any) => s.deliveries.some((d: any) => d.id === c.id))
  );

  return json({
    streams,
    orphan_findings: orphanFindings.map((f: any) => ({
      id: f.id, title: f.title, finding_type: f.finding_type, status: f.status, triage: f.triage,
    })),
    orphan_deliveries: orphanDeliveries.map((d: any) => ({
      id: d.id, title: d.title, track: d.track, status: d.status, delivery_status: d.delivery_status,
    })),
  });
}
