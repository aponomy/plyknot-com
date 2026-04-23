/**
 * Tracker — D1-backed project issue tracker.
 * Categories → tracker_themes → issues, with batch updates for masterplan patches.
 *
 * Tracker and Pipeline are separate systems. Tracker queries tracker_themes,
 * Pipeline queries pipeline_projects.
 */

import { json, notFound } from '../lib/response.js';
import type { AuthContext } from '../auth/middleware.js';

// ── List categories ──────────────────────────────────────────────────────

export async function handleListCategories(db: D1Database, auth: AuthContext): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const { results } = await db.prepare(
    `SELECT c.slug, c.label, c.sort_order,
            COUNT(DISTINCT t.id) AS theme_count,
            SUM(CASE WHEN i.status = 'done' THEN 1 ELSE 0 END) AS done_count,
            COUNT(i.id) AS issue_count
     FROM tracker_categories c
     LEFT JOIN tracker_themes t ON t.category_slug = c.slug
     LEFT JOIN tracker_issues i ON i.theme_id = t.id
     GROUP BY c.slug
     ORDER BY c.sort_order`
  ).all();

  return json({ categories: results });
}

// ── List themes ─────────────────────────────────────────────────────────

export async function handleListThemes(db: D1Database, auth: AuthContext, url: URL): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const category = url.searchParams.get('category');
  let query = `SELECT t.*, c.label AS category_label,
                      SUM(CASE WHEN i.status = 'done' THEN 1 ELSE 0 END) AS done_count,
                      COUNT(i.id) AS issue_count
               FROM tracker_themes t
               JOIN tracker_categories c ON c.slug = t.category_slug
               LEFT JOIN tracker_issues i ON i.theme_id = t.id`;
  const binds: string[] = [];

  if (category) {
    query += ' WHERE t.category_slug = ?';
    binds.push(category);
  }
  query += ' GROUP BY t.id ORDER BY c.sort_order, t.sort_order';

  const { results } = await db.prepare(query).bind(...binds).all();
  return json({ themes: results });
}

// ── Get single theme with issues ─────────────────────────────────────────

export async function handleGetTheme(db: D1Database, auth: AuthContext, id: string): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const theme = await db.prepare('SELECT * FROM tracker_themes WHERE id = ?').bind(id).first();
  if (!theme) return notFound(`theme "${id}" not found`);

  const { results: issues } = await db.prepare(
    `SELECT * FROM tracker_issues WHERE theme_id = ?
     ORDER BY CASE priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 ELSE 3 END, sort_order`
  ).bind(id).all();

  // Attach comment counts per issue
  const { results: commentCounts } = await db.prepare(
    `SELECT issue_id, COUNT(*) as count FROM tracker_comments
     WHERE issue_id IN (SELECT id FROM tracker_issues WHERE theme_id = ?)
     GROUP BY issue_id`
  ).bind(id).all() as { results: Array<{ issue_id: string; count: number }> };
  const countMap = new Map(commentCounts.map(c => [c.issue_id, c.count]));
  const issuesWithCounts = (issues as Array<Record<string, unknown>>).map(i => ({
    ...i,
    comment_count: countMap.get(i.id as string) ?? 0,
  }));

  return json({ ...theme, issues: issuesWithCounts });
}

// ── List issues ──────────────────────────────────────────────────────────

export async function handleListIssues(db: D1Database, auth: AuthContext, url: URL): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  // Accept both container_id and theme_id for backward compat
  const themeId = url.searchParams.get('container_id') ?? url.searchParams.get('theme_id');
  const status = url.searchParams.get('status');
  const priority = url.searchParams.get('priority');
  const q = url.searchParams.get('q');
  const executionMode = url.searchParams.get('execution_mode');

  let query = `SELECT i.*, t.title AS theme_title
               FROM tracker_issues i
               JOIN tracker_themes t ON t.id = i.theme_id WHERE 1=1`;
  const binds: (string | number)[] = [];

  if (themeId) { query += ' AND i.theme_id = ?'; binds.push(themeId); }
  if (status) { query += ' AND i.status = ?'; binds.push(status); }
  if (priority) { query += ' AND i.priority = ?'; binds.push(priority); }
  if (q) { query += ' AND i.title LIKE ?'; binds.push(`%${q}%`); }
  if (executionMode) { query += ' AND i.execution_mode = ?'; binds.push(executionMode); }

  query += ` ORDER BY CASE i.priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 ELSE 3 END, i.sort_order`;

  const { results } = await db.prepare(query).bind(...binds).all();
  return json({ issues: results, total: results.length });
}

// ── Create issue ─────────────────────────────────────────────────────────

export async function handleCreateIssue(request: Request, db: D1Database, auth: AuthContext): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const body = (await request.json()) as Record<string, unknown>;
  // Accept both container_id and theme_id for backward compat
  const themeId = (body.container_id ?? body.theme_id) as string;
  const title = body.title as string;

  if (!themeId) return json({ error: 'theme_id is required' }, 400);
  if (!title) return json({ error: 'title is required' }, 400);

  const theme = await db.prepare('SELECT id, category_slug, title, sort_order FROM tracker_themes WHERE id = ?').bind(themeId).first() as { id: string; category_slug: string; title: string; sort_order: number } | null;
  if (!theme) return json({ error: `theme "${themeId}" not found` }, 400);

  const id = `trk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const priority = (body.priority as string) ?? 'P2';
  const status = (body.status as string) ?? 'todo';
  const targetDate = (body.target_date as string) ?? null;
  const description = (body.description as string) ?? null;
  const section = (body.section as string) ?? null;
  const executionMode = (body.execution_mode as string) ?? null;
  const autonomy = (body.autonomy as string) ?? null;
  const blockedBy = body.blocked_by ? JSON.stringify(body.blocked_by) : '[]';

  // Get next sort_order
  const last = await db.prepare(
    'SELECT MAX(sort_order) as max_sort FROM tracker_issues WHERE theme_id = ?'
  ).bind(themeId).first() as { max_sort: number | null };
  const sortOrder = (last?.max_sort ?? -1) + 1;

  await db.prepare(
    `INSERT INTO tracker_issues (id, theme_id, title, description, section, priority, status, target_date,
       sort_order, execution_mode, autonomy, blocked_by, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, themeId, title, description, section, priority, status, targetDate,
    sortOrder, executionMode, autonomy, blockedBy, auth.userId, auth.userId).run();

  return json({ id, theme_id: themeId, title, priority, status }, 201);
}

// ── Update issue ─────────────────────────────────────────────────────────

export async function handleUpdateIssue(request: Request, db: D1Database, auth: AuthContext, id: string): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const existing = await db.prepare('SELECT id FROM tracker_issues WHERE id = ?').bind(id).first();
  if (!existing) return notFound(`issue "${id}" not found`);

  const body = (await request.json()) as Record<string, unknown>;
  const updates: string[] = [];
  const binds: (string | number | null)[] = [];

  if (body.title !== undefined) { updates.push('title = ?'); binds.push(body.title as string); }
  if (body.description !== undefined) { updates.push('description = ?'); binds.push(body.description as string | null); }
  if (body.section !== undefined) { updates.push('section = ?'); binds.push(body.section as string | null); }
  // Accept both container_id and theme_id for backward compat
  const newThemeId = body.container_id ?? body.theme_id;
  if (newThemeId !== undefined) { updates.push('theme_id = ?'); binds.push(newThemeId as string); }
  if (body.priority !== undefined) { updates.push('priority = ?'); binds.push(body.priority as string); }
  if (body.status !== undefined) { updates.push('status = ?'); binds.push(body.status as string); }
  if (body.target_date !== undefined) { updates.push('target_date = ?'); binds.push(body.target_date as string | null); }
  if (body.sort_order !== undefined) { updates.push('sort_order = ?'); binds.push(body.sort_order as number); }
  // New fields
  if (body.execution_mode !== undefined) { updates.push('execution_mode = ?'); binds.push(body.execution_mode as string | null); }
  if (body.autonomy !== undefined) { updates.push('autonomy = ?'); binds.push(body.autonomy as string | null); }
  if (body.finding_id !== undefined) { updates.push('finding_id = ?'); binds.push(body.finding_id as string | null); }
  if (body.blocked_by !== undefined) { updates.push('blocked_by = ?'); binds.push(JSON.stringify(body.blocked_by)); }

  if (updates.length === 0) return json({ error: 'No fields to update' }, 400);

  updates.push("updated_by = ?");
  binds.push(auth.userId);
  updates.push("updated_at = datetime('now')");
  binds.push(id);

  await db.prepare(`UPDATE tracker_issues SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run();
  return json({ id, updated: true });
}

// ── Delete issue ─────────────────────────────────────────────────────────

export async function handleDeleteIssue(db: D1Database, auth: AuthContext, id: string): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const existing = await db.prepare('SELECT id FROM tracker_issues WHERE id = ?').bind(id).first();
  if (!existing) return notFound(`issue "${id}" not found`);

  await db.prepare('DELETE FROM tracker_issues WHERE id = ?').bind(id).run();
  return json({ id, deleted: true });
}

// ── Mark issue done ──────────────────────────────────────────────────────

export async function handleMarkDone(request: Request, db: D1Database, auth: AuthContext, id: string): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const existing = await db.prepare('SELECT id FROM tracker_issues WHERE id = ?').bind(id).first();
  if (!existing) return notFound(`issue "${id}" not found`);

  await db.prepare(
    `UPDATE tracker_issues SET status = 'done', updated_by = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(auth.userId, id).run();

  return json({ id, status: 'done' });
}

// ── Create theme ─────────────────────────────────────────────────────────

export async function handleCreateTheme(request: Request, db: D1Database, auth: AuthContext): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const body = (await request.json()) as Record<string, unknown>;
  const id = body.id as string;
  const title = body.title as string;
  const categorySlug = body.category_slug as string;

  if (!id) return json({ error: 'id is required' }, 400);
  if (!title) return json({ error: 'title is required' }, 400);
  if (!categorySlug) return json({ error: 'category_slug is required' }, 400);

  const cat = await db.prepare('SELECT slug FROM tracker_categories WHERE slug = ?').bind(categorySlug).first();
  if (!cat) return json({ error: `category "${categorySlug}" not found` }, 400);

  const last = await db.prepare(
    'SELECT MAX(sort_order) as max_sort FROM tracker_themes WHERE category_slug = ?'
  ).bind(categorySlug).first() as { max_sort: number | null };
  const sortOrder = (body.sort_order as number) ?? ((last?.max_sort ?? -1) + 1);

  await db.prepare(
    `INSERT INTO tracker_themes (id, category_slug, title, sort_order) VALUES (?, ?, ?, ?)`
  ).bind(id, categorySlug, title, sortOrder).run();

  return json({ id, title, category_slug: categorySlug }, 201);
}

// ── Update theme ─────────────────────────────────────────────────────────

export async function handleUpdateTheme(request: Request, db: D1Database, auth: AuthContext, id: string): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const existing = await db.prepare('SELECT id FROM tracker_themes WHERE id = ?').bind(id).first();
  if (!existing) return notFound(`theme "${id}" not found`);

  const body = (await request.json()) as Record<string, unknown>;
  const updates: string[] = [];
  const binds: (string | number | null)[] = [];

  if (body.title !== undefined) { updates.push('title = ?'); binds.push(body.title as string); }
  if (body.sort_order !== undefined) { updates.push('sort_order = ?'); binds.push(body.sort_order as number); }

  if (updates.length === 0) return json({ error: 'No fields to update' }, 400);

  binds.push(id);

  await db.prepare(`UPDATE tracker_themes SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run();
  return json({ id, updated: true });
}

// ── Stats ────────────────────────────────────────────────────────────────

export async function handleTrackerStats(db: D1Database, auth: AuthContext): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const totals = await db.prepare(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done,
       SUM(CASE WHEN status = 'doing' THEN 1 ELSE 0 END) AS doing,
       SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) AS todo
     FROM tracker_issues`
  ).first() as { total: number; done: number; doing: number; todo: number };

  const { results: byPriority } = await db.prepare(
    `SELECT priority, COUNT(*) AS count FROM tracker_issues WHERE status != 'done' GROUP BY priority`
  ).all();

  const { results: byCategory } = await db.prepare(
    `SELECT c.slug, c.label,
            COUNT(i.id) AS total,
            SUM(CASE WHEN i.status = 'done' THEN 1 ELSE 0 END) AS done
     FROM tracker_categories c
     LEFT JOIN tracker_themes t ON t.category_slug = c.slug
     LEFT JOIN tracker_issues i ON i.theme_id = t.id
     GROUP BY c.slug
     ORDER BY c.sort_order`
  ).all();

  const themeCount = await db.prepare('SELECT COUNT(*) AS count FROM tracker_themes').first() as { count: number };

  return json({
    total: totals.total,
    done: totals.done,
    doing: totals.doing,
    todo: totals.todo,
    theme_count: themeCount.count,
    by_priority: byPriority,
    by_category: byCategory,
  });
}

// ── Export (masterplan.md format) ─────────────────────────────────────────

export async function handleTrackerExport(db: D1Database, auth: AuthContext): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const { results: categories } = await db.prepare(
    'SELECT * FROM tracker_categories ORDER BY sort_order'
  ).all() as { results: Array<{ slug: string; label: string }> };

  const { results: themes } = await db.prepare(
    'SELECT * FROM tracker_themes ORDER BY category_slug, sort_order'
  ).all() as { results: Array<{ id: string; category_slug: string; title: string }> };

  const { results: issues } = await db.prepare(
    `SELECT * FROM tracker_issues
     ORDER BY theme_id, CASE priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 ELSE 3 END, sort_order`
  ).all() as { results: Array<{ theme_id: string; title: string; priority: string; status: string; target_date: string | null; execution_mode: string | null }> };

  // Group issues by theme
  const issuesByTheme = new Map<string, typeof issues>();
  for (const issue of issues) {
    const arr = issuesByTheme.get(issue.theme_id) ?? [];
    arr.push(issue);
    issuesByTheme.set(issue.theme_id, arr);
  }

  // Group themes by category
  const themesByCat = new Map<string, typeof themes>();
  for (const t of themes) {
    const arr = themesByCat.get(t.category_slug) ?? [];
    arr.push(t);
    themesByCat.set(t.category_slug, arr);
  }

  // Count totals
  const totalDone = issues.filter(i => i.status === 'done').length;
  const totalAll = issues.length;

  const lines: string[] = [
    '# Project Tracker Index',
    '',
    `*Auto-generated ${new Date().toISOString().slice(0, 10)}. Source: hub.plyknot.com/v1/factory/tracker/export*`,
    '',
    '## Structure',
    `**Total: ${totalDone}/${totalAll} done**`,
    '',
  ];

  for (const cat of categories) {
    const catThemes = themesByCat.get(cat.slug) ?? [];
    let catDone = 0, catTotal = 0, catActive = 0;
    for (const t of catThemes) {
      const ti = issuesByTheme.get(t.id) ?? [];
      catDone += ti.filter(i => i.status === 'done').length;
      catTotal += ti.length;
      catActive += ti.filter(i => i.status === 'doing').length;
    }

    const activeStr = catActive > 0 ? `, ${catActive} active` : '';
    lines.push('', `### ${cat.slug}/ (${catDone}/${catTotal} done${activeStr})`, '');

    for (const theme of catThemes) {
      const ti = issuesByTheme.get(theme.id) ?? [];
      const tDone = ti.filter(i => i.status === 'done').length;
      lines.push(`- [${theme.id}](${theme.id}) — **${theme.title}** (${tDone}/${ti.length} done)`);

      for (const issue of ti) {
        const check = issue.status === 'done' ? '[x]' : (issue.status === 'doing' ? '[~]' : '[ ]');
        const priStr = issue.priority !== '-' ? `**${issue.priority}** ` : '';
        const targetStr = issue.target_date ? ` *(target: ${issue.target_date})*` : '';
        const execStr = issue.execution_mode ? ` {${issue.execution_mode}}` : '';
        const shortTitle = issue.title.length > 100 ? issue.title.slice(0, 100) + '...' : issue.title;
        lines.push(`    ${check} ${priStr}${shortTitle}${targetStr}${execStr}`);
      }
    }
  }

  lines.push('');

  const md = lines.join('\n');
  return new Response(md, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'access-control-allow-origin': '*',
    },
  });
}

// ── Batch update ─────────────────────────────────────────────────────────

interface BatchOp {
  action: 'done' | 'add' | 'update' | 'delete';
  id?: string;
  container_id?: string;
  theme_id?: string;  // backward compat alias
  title?: string;
  description?: string | null;
  section?: string | null;
  priority?: string;
  status?: string;
  target_date?: string | null;
  execution_mode?: string | null;
  autonomy?: string | null;
}

export async function handleTrackerBatch(request: Request, db: D1Database, auth: AuthContext): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const body = (await request.json()) as { updates: BatchOp[] };
  if (!body.updates || !Array.isArray(body.updates)) {
    return json({ error: 'updates array is required' }, 400);
  }

  const results: Array<{ action: string; id: string; ok: boolean; error?: string }> = [];

  for (const op of body.updates) {
    try {
      switch (op.action) {
        case 'done': {
          if (!op.id) { results.push({ action: 'done', id: '', ok: false, error: 'id required' }); break; }
          await db.prepare(
            `UPDATE tracker_issues SET status = 'done', updated_by = ?, updated_at = datetime('now') WHERE id = ?`
          ).bind(auth.userId, op.id).run();
          results.push({ action: 'done', id: op.id, ok: true });
          break;
        }
        case 'add': {
          // Accept both container_id and theme_id for backward compat
          const themeId = op.container_id ?? op.theme_id;
          if (!themeId || !op.title) { results.push({ action: 'add', id: '', ok: false, error: 'theme_id and title required' }); break; }
          const id = `trk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const last = await db.prepare(
            'SELECT MAX(sort_order) as max_sort FROM tracker_issues WHERE theme_id = ?'
          ).bind(themeId).first() as { max_sort: number | null };
          const sortOrder = (last?.max_sort ?? -1) + 1;
          await db.prepare(
            `INSERT INTO tracker_issues (id, theme_id, title, priority, status, target_date, sort_order,
               execution_mode, autonomy, created_by, updated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(id, themeId, op.title, op.priority ?? 'P2', op.status ?? 'todo', op.target_date ?? null,
            sortOrder, op.execution_mode ?? null, op.autonomy ?? null, auth.userId, auth.userId).run();
          results.push({ action: 'add', id, ok: true });
          break;
        }
        case 'update': {
          if (!op.id) { results.push({ action: 'update', id: '', ok: false, error: 'id required' }); break; }
          const updates: string[] = [];
          const binds: (string | number | null)[] = [];
          if (op.title !== undefined) { updates.push('title = ?'); binds.push(op.title); }
          if (op.priority !== undefined) { updates.push('priority = ?'); binds.push(op.priority); }
          if (op.status !== undefined) { updates.push('status = ?'); binds.push(op.status); }
          if (op.target_date !== undefined) { updates.push('target_date = ?'); binds.push(op.target_date); }
          if (op.execution_mode !== undefined) { updates.push('execution_mode = ?'); binds.push(op.execution_mode); }
          if (op.autonomy !== undefined) { updates.push('autonomy = ?'); binds.push(op.autonomy); }
          if (updates.length > 0) {
            updates.push("updated_by = ?");
            binds.push(auth.userId);
            updates.push("updated_at = datetime('now')");
            binds.push(op.id);
            await db.prepare(`UPDATE tracker_issues SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run();
          }
          results.push({ action: 'update', id: op.id, ok: true });
          break;
        }
        case 'delete': {
          if (!op.id) { results.push({ action: 'delete', id: '', ok: false, error: 'id required' }); break; }
          await db.prepare('DELETE FROM tracker_issues WHERE id = ?').bind(op.id).run();
          results.push({ action: 'delete', id: op.id, ok: true });
          break;
        }
        default:
          results.push({ action: op.action, id: op.id ?? '', ok: false, error: `unknown action: ${op.action}` });
      }
    } catch (err) {
      results.push({ action: op.action, id: op.id ?? '', ok: false, error: (err as Error).message });
    }
  }

  return json({ applied: results.filter(r => r.ok).length, total: body.updates.length, results });
}

// ── List comments for an issue ───────────────────────────────────────────

export async function handleListComments(db: D1Database, auth: AuthContext, issueId: string): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const { results } = await db.prepare(
    'SELECT * FROM tracker_comments WHERE issue_id = ? ORDER BY created_at ASC'
  ).bind(issueId).all();

  return json({ comments: results });
}

// ── Create comment ───────────────────────────────────────────────────────

export async function handleCreateComment(request: Request, db: D1Database, auth: AuthContext, issueId: string): Promise<Response> {
  if (!auth.userId) return json({ error: 'Auth required' }, 401);

  const body = (await request.json()) as Record<string, unknown>;
  const text = body.body as string;
  if (!text?.trim()) return json({ error: 'body is required' }, 400);

  const existing = await db.prepare('SELECT id FROM tracker_issues WHERE id = ?').bind(issueId).first();
  if (!existing) return json({ error: `issue "${issueId}" not found` }, 400);

  const id = `trkc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const author = (body.author as string) ?? auth.userId;

  await db.prepare(
    'INSERT INTO tracker_comments (id, issue_id, body, author) VALUES (?, ?, ?, ?)'
  ).bind(id, issueId, text.trim(), author).run();

  // Touch the issue updated_at
  await db.prepare(
    "UPDATE tracker_issues SET updated_at = datetime('now') WHERE id = ?"
  ).bind(issueId).run();

  return json({ id, issue_id: issueId, body: text.trim(), author }, 201);
}
