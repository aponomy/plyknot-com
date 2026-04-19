#!/usr/bin/env node
/**
 * Generate embeddings for all entity names and vocabulary aliases.
 *
 * Uses Cloudflare Workers AI REST API to embed text, then writes
 * the vectors to the embeddings table in D1.
 *
 * Usage:
 *   CF_ACCOUNT_ID=xxx CF_API_TOKEN=xxx npx tsx apps/hub/scripts/generate-embeddings.ts
 *
 * For local dev (no remote API), skip this — /v1/search falls back to text matching.
 */

import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execSync } from 'node:child_process';

const ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const API_TOKEN = process.env.CF_API_TOKEN;
const MODEL = '@cf/baai/bge-base-en-v1.5';

if (!ACCOUNT_ID || !API_TOKEN) {
  console.error('Set CF_ACCOUNT_ID and CF_API_TOKEN environment variables.');
  console.error('For local dev, skip this — /v1/search uses text matching without embeddings.');
  process.exit(1);
}

const dataDir = resolve(process.cwd(), 'universe/data');
const hubDir = resolve(process.cwd(), 'hub');

// ── Collect all text to embed ───────────────────────────────────────────────

interface EmbeddingInput {
  label: string;
  entityId: number | null;
}

const inputs: EmbeddingInput[] = [];

// Entity names
const entityLines = readFileSync(join(dataDir, 'entities', 'entities.jsonl'), 'utf-8')
  .split('\n')
  .filter((l) => l.trim());

for (const line of entityLines) {
  const e = JSON.parse(line);
  inputs.push({ label: e.name, entityId: e.id });
}

// Dependency labels (from dependencies.json)
const deps: any[] = JSON.parse(readFileSync(join(dataDir, 'vocabulary', 'dependencies.json'), 'utf-8'));
for (const d of deps) {
  for (const label of d.labels ?? []) {
    inputs.push({ label, entityId: null });
  }
}

console.log(`Embedding ${inputs.length} texts...`);

// ── Call Workers AI ─────────────────────────────────────────────────────────

async function embed(texts: string[]): Promise<number[][]> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${MODEL}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${API_TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ text: texts }),
  });
  if (!resp.ok) throw new Error(`Workers AI ${resp.status}: ${await resp.text()}`);
  const data = (await resp.json()) as { result: { data: number[][] } };
  return data.result.data;
}

// Batch in groups of 50
const BATCH = 50;
const allVectors: number[][] = [];

for (let i = 0; i < inputs.length; i += BATCH) {
  const batch = inputs.slice(i, i + BATCH);
  const texts = batch.map((b) => b.label);
  console.log(`  Batch ${Math.floor(i / BATCH) + 1}: ${texts.length} texts`);
  const vectors = await embed(texts);
  allVectors.push(...vectors);
}

console.log(`Got ${allVectors.length} vectors (${allVectors[0]?.length ?? 0} dimensions each)`);

// ── Write to D1 ─────────────────────────────────────────────────────────────

// Clear existing embeddings
const clearFile = join(hubDir, '.tmp-clear-embeddings.sql');
const { writeFileSync, unlinkSync } = await import('node:fs');
writeFileSync(clearFile, 'DELETE FROM embeddings;');
execSync(`cd "${hubDir}" && npx wrangler d1 execute plyknot-hub --local --file=.tmp-clear-embeddings.sql`, { stdio: 'pipe' });
unlinkSync(clearFile);

// Insert each embedding
let inserted = 0;
for (let i = 0; i < inputs.length; i++) {
  const input = inputs[i];
  const vector = allVectors[i];
  // Store vector as hex-encoded Float32Array bytes
  const f32 = new Float32Array(vector);
  const hex = Buffer.from(f32.buffer).toString('hex');

  const sql = `INSERT INTO embeddings (entity_label, entity_id, vector) VALUES ('${input.label.replace(/'/g, "''")}', ${input.entityId ?? 'NULL'}, X'${hex}');`;
  const tmpFile = join(hubDir, '.tmp-embed.sql');
  writeFileSync(tmpFile, sql);
  try {
    execSync(`cd "${hubDir}" && npx wrangler d1 execute plyknot-hub --local --file=.tmp-embed.sql`, { stdio: 'pipe' });
    inserted++;
  } catch {
    console.error(`  Failed to insert embedding for "${input.label}"`);
  }
}

try { unlinkSync(join(hubDir, '.tmp-embed.sql')); } catch {}

console.log(`\nInserted ${inserted}/${inputs.length} embeddings into D1`);
