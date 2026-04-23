#!/usr/bin/env node
/**
 * Seed tracker tables from markdown theme files.
 *
 * Reads all .md theme files from the tracker directory, parses issues
 * using the same logic as build-dashboard.py, and generates SQL.
 *
 * Usage:
 *   npx tsx scripts/seed-tracker.ts --data ../../research/project/tracker/
 *   npx tsx scripts/seed-tracker.ts --data ../../research/project/tracker/ --out seed-tracker.sql
 *   npx tsx scripts/seed-tracker.ts --data ../../research/project/tracker/ --remote
 *
 * Apply locally:
 *   wrangler d1 execute plyknot-hub-com-prod --local --file=./seed-tracker.sql
 *
 * Apply remotely:
 *   wrangler d1 execute plyknot-hub-com-prod --remote --file=./seed-tracker.sql
 */

import { readFileSync, readdirSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

// ── Parse args ──────────────────────────────────────────────────────────────

let dataDir = resolve(process.cwd(), '../../research/project/tracker');
let outFile = resolve(process.cwd(), 'seed-tracker.sql');
let remote = false;

for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--data' && process.argv[i + 1]) dataDir = resolve(process.argv[++i]);
  if (process.argv[i] === '--out' && process.argv[i + 1]) outFile = resolve(process.argv[++i]);
  if (process.argv[i] === '--remote') remote = true;
}

// ── Category definitions (sort order matches build-dashboard.py) ────────────

const CATEGORIES: Array<{ slug: string; label: string }> = [
  { slug: 'plyknot-com', label: 'Plyknot.com' },
  { slug: 'research-lab', label: 'Research Lab' },
  { slug: 'cybernetics', label: 'Cybernetics' },
  { slug: 'plyknot-org', label: 'Plyknot.org' },
  { slug: 'research', label: 'Research' },
  { slug: 'ip-legal', label: 'IP & Legal' },
  { slug: 'other', label: 'Other' },
];

// ── SQL helpers ─────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/'/g, "''");
}

// ── Parser (mirrors build-dashboard.py lines 23-64) ─────────────────────────

interface ParsedIssue {
  title: string;
  priority: string;
  status: string;
  target: string;
}

interface ParsedTheme {
  title: string;
  path: string;
  category: string;
  issues: ParsedIssue[];
}

function parseThemeFile(filePath: string, category: string): ParsedTheme {
  const text = readFileSync(filePath, 'utf-8');
  const lines = text.split('\n');
  let title = '';
  const issues: ParsedIssue[] = [];
  let currentStatus = 'todo';

  for (const line of lines) {
    if (line.startsWith('# ')) {
      title = line.slice(2).trim();
    } else if (line.startsWith('## Doing')) {
      currentStatus = 'doing';
    } else if (line.startsWith('## Todo')) {
      currentStatus = 'todo';
    } else if (line.startsWith('## Done')) {
      currentStatus = 'done';
    } else if (line.startsWith('- [')) {
      const checked = line.startsWith('- [x]');
      const active = line.startsWith('- [~]');
      let rest = line.replace(/^- \[.\]\s*/, '');

      // Extract priority: **P0** or **P1** etc
      const priMatch = rest.match(/^\*\*(\w+)\*\*\s*(.*)/);
      const priority = priMatch ? priMatch[1] : '-';
      rest = priMatch ? priMatch[2] : rest;

      // Extract target date: *(target: 2026-05-15)*
      let target = '';
      const targetMatch = rest.match(/\*\(target:\s*([^)]+)\)\*/);
      if (targetMatch) {
        target = targetMatch[1].trim();
        rest = rest.slice(0, targetMatch.index).trim();
      }

      const issueTitle = rest.trim();
      const status = checked ? 'done' : (active ? 'doing' : currentStatus);

      issues.push({ title: issueTitle, priority, status, target });
    }
  }

  return { title, path: filePath, category, issues };
}

// ── Scan tracker directory ──────────────────────────────────────────────────

const themes: ParsedTheme[] = [];

for (const cat of CATEGORIES) {
  const catDir = join(dataDir, cat.slug);
  if (!existsSync(catDir) || !statSync(catDir).isDirectory()) continue;

  const files = readdirSync(catDir)
    .filter(f => f.endsWith('.md'))
    .sort();

  for (const file of files) {
    const theme = parseThemeFile(join(catDir, file), cat.slug);
    // Theme ID: category/basename-without-extension
    const basename = file.replace(/\.md$/, '');
    themes.push({ ...theme, path: `${cat.slug}/${basename}` });
  }
}

// ── Container kind inference ────────────────────────────────────────────────
// Map known theme IDs to work_container pipeline kinds.
// Themes not listed here become operational buckets (kind=NULL).

const CONTAINER_KINDS: Record<string, { kind: string; track?: string; status?: string }> = {
  'research/flagship-paper':        { kind: 'delivery', track: 'paper' },
  'research/satellite-2-text':      { kind: 'delivery', track: 'paper' },
  'research/satellite-5-emergence': { kind: 'delivery', track: 'paper' },
  'research/satellite-6':           { kind: 'delivery', track: 'paper' },
  'research/canvas-architecture':   { kind: 'investigation' },
  'research/llm-benchmark':         { kind: 'investigation' },
  'research/experiments':           { kind: 'investigation' },
  'research-lab/factory':           { kind: 'investigation' },
  'research-lab/extraction':        { kind: 'extraction-batch' },
  'research-lab/agents':            { kind: 'investigation', status: 'completed' },
  'research-lab/commercial':        { kind: 'investigation', status: 'backlog' },
  'ip-legal/patent':                { kind: 'delivery', track: 'patent' },
};

// ── Generate SQL ────────────────────────────────────────────────────────────

const sql: string[] = [];
sql.push('-- Auto-generated by seed-tracker.ts');
sql.push(`-- Source: ${dataDir}`);
sql.push(`-- Generated: ${new Date().toISOString()}`);
sql.push('');

// Clear existing tracker data
sql.push('DELETE FROM tracker_issues;');
sql.push('DELETE FROM work_containers;');
sql.push('DELETE FROM tracker_categories;');
sql.push('-- Also clear deprecated tables if they exist');
sql.push('DELETE FROM tracker_themes;');
sql.push('');

// Insert categories
for (let i = 0; i < CATEGORIES.length; i++) {
  const cat = CATEGORIES[i];
  sql.push(
    `INSERT INTO tracker_categories (slug, label, sort_order) VALUES ('${esc(cat.slug)}', '${esc(cat.label)}', ${i});`
  );
}
sql.push('');

// Insert work containers (replacing tracker_themes)
let themeOrder = 0;
let lastCat = '';
for (const theme of themes) {
  if (theme.category !== lastCat) { themeOrder = 0; lastCat = theme.category; }
  const ck = CONTAINER_KINDS[theme.path];
  const kind = ck?.kind ? `'${esc(ck.kind)}'` : 'NULL';
  const track = ck?.track ? `'${esc(ck.track)}'` : 'NULL';
  const status = ck?.status ? `'${esc(ck.status)}'` : `'active'`;
  sql.push(
    `INSERT INTO work_containers (id, category_slug, title, sort_order, kind, track, status) ` +
    `VALUES ('${esc(theme.path)}', '${esc(theme.category)}', '${esc(theme.title)}', ${themeOrder}, ${kind}, ${track}, ${status});`
  );
  // Also insert into deprecated tracker_themes for backward compat during transition
  sql.push(
    `INSERT INTO tracker_themes (id, category_slug, title, sort_order) VALUES ('${esc(theme.path)}', '${esc(theme.category)}', '${esc(theme.title)}', ${themeOrder});`
  );
  themeOrder++;
}
sql.push('');

// Insert issues (using container_id instead of theme_id)
let totalIssues = 0;
for (const theme of themes) {
  for (let i = 0; i < theme.issues.length; i++) {
    const issue = theme.issues[i];
    const id = `trk-seed-${totalIssues.toString().padStart(4, '0')}`;
    const targetDate = issue.target || null;
    const targetSql = targetDate ? `'${esc(targetDate)}'` : 'NULL';
    sql.push(
      `INSERT INTO tracker_issues (id, container_id, title, priority, status, target_date, sort_order, created_by) ` +
      `VALUES ('${esc(id)}', '${esc(theme.path)}', '${esc(issue.title)}', '${esc(issue.priority)}', '${esc(issue.status)}', ${targetSql}, ${i}, 'seed');`
    );
    totalIssues++;
  }
}
sql.push('');

// ── Summary ─────────────────────────────────────────────────────────────────

const doneCount = themes.reduce((acc, t) => acc + t.issues.filter(i => i.status === 'done').length, 0);
console.log(`Parsed ${themes.length} themes, ${totalIssues} issues (${doneCount} done) from ${CATEGORIES.filter(c => existsSync(join(dataDir, c.slug))).length} categories`);

// ── Write output ────────────────────────────────────────────────────────────

writeFileSync(outFile, sql.join('\n'), 'utf-8');
console.log(`Wrote ${outFile}`);

if (remote) {
  console.log('Applying to remote D1...');
  try {
    execSync(`npx wrangler d1 execute plyknot-hub-com-prod --remote --file=${outFile}`, {
      stdio: 'inherit',
      cwd: resolve(process.cwd()),
    });
    console.log('Remote seed complete.');
  } catch (err) {
    console.error('Remote seed failed:', (err as Error).message);
    process.exit(1);
  }
}
