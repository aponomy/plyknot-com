import * as d1 from '../lib/d1.js';
import { json } from '../lib/response.js';
import { emitEvent } from './stream.js';
import { validateCoupling } from '../lib/validate.js';
import { createPullRequest, readFile, buildPrBody, type GitHubEnv } from '../lib/github-pr.js';
import type { AuthContext } from '../auth/middleware.js';

export async function handleListCouplings(db: D1Database, url: URL): Promise<Response> {
  const property = url.searchParams.get('property') ?? undefined;
  const entityParam = url.searchParams.get('entity');
  const entity = entityParam !== null ? Number(entityParam) : undefined;

  const rows = await d1.listCouplings(db, { property, entity });
  return json({
    couplings: rows.map((r) => ({
      entityA: r.entity_a,
      entityB: r.entity_b,
      property: r.property,
      value: r.value,
      method: r.method,
      sigma: r.sigma,
      source: r.source,
      provenance: r.provenance ? JSON.parse(r.provenance) : undefined,
    })),
    total: rows.length,
  });
}

/**
 * POST /v1/couplings — add a coupling entry.
 *
 * Creates a PR appending a line to data/couplings/physics.jsonl.
 * ?dryRun=true — validate only, no PR.
 */
export async function handleAddCoupling(
  request: Request,
  db: D1Database,
  auth: AuthContext,
  env: GitHubEnv,
  dryRun: boolean,
): Promise<Response> {
  const body = await request.json();
  const v = validateCoupling(body);
  if (!v.ok) return json({ error: 'Validation failed', details: v.errors }, 400);

  const b = body as {
    entityA: number; entityB: number; property: string;
    value: number; method: string; sigma?: number;
  };

  // Verify entities exist
  const entities = await d1.listEntities(db);
  const entityIds = new Set(entities.map((e) => e.id));
  const missing: string[] = [];
  if (!entityIds.has(b.entityA)) missing.push(`entityA=${b.entityA} not found`);
  if (!entityIds.has(b.entityB)) missing.push(`entityB=${b.entityB} not found`);
  if (missing.length) return json({ error: 'Unknown entities', details: missing }, 400);

  // Build JSONL entry
  const entry: Record<string, unknown> = {
    entityA: b.entityA,
    entityB: b.entityB,
    property: b.property,
    value: b.value,
    method: b.method,
  };
  if (b.sigma !== undefined) entry.sigma = b.sigma;

  const validation = [
    'Schema valid',
    `Entity A: ${b.entityA} (${entities.find((e) => e.id === b.entityA)?.name})`,
    `Entity B: ${b.entityB} (${entities.find((e) => e.id === b.entityB)?.name})`,
    `Property: ${b.property}`,
  ];

  if (dryRun) {
    return json({
      dryRun: true,
      valid: true,
      entry,
      validation,
      files: ['data/couplings/physics.jsonl', `data/events/${new Date().toISOString().slice(0, 7)}.jsonl`],
    });
  }

  // Append to physics.jsonl
  const filePath = 'data/couplings/physics.jsonl';
  const existing = (await readFile(env, filePath)) ?? '';
  const newContent = existing.trimEnd() + '\n' + JSON.stringify(entry) + '\n';

  const branch = `hub/add-coupling-${b.property}-${Date.now()}`.slice(0, 60);

  const event = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    type: 'coupling-added',
    actor: `user:${auth.githubLogin}`,
    details: { entityA: b.entityA, entityB: b.entityB, property: b.property, method: b.method },
  };
  const eventMonth = new Date().toISOString().slice(0, 7);
  const eventPath = `data/events/${eventMonth}.jsonl`;
  const existingEvents = (await readFile(env, eventPath)) ?? '';
  const eventContent = existingEvents + JSON.stringify(event) + '\n';

  const pr = await createPullRequest(env, {
    branch,
    title: `Add coupling: ${b.property} (${b.method})`,
    body: buildPrBody({ type: 'New coupling', actor: auth.githubLogin!, payload: entry, validation }),
    files: [
      { path: filePath, content: newContent, message: `Add coupling: ${b.property} via ${b.method}` },
      { path: eventPath, content: eventContent, message: `Log event: coupling-added` },
    ],
  });

  await emitEvent(db, 'coupling-added', `Coupling added: ${b.property} via ${b.method} (${entities.find((e) => e.id === b.entityA)?.name} → ${entities.find((e) => e.id === b.entityB)?.name})`, {
    userId: auth.userId ?? undefined,
    payload: { entityA: b.entityA, entityB: b.entityB, property: b.property, method: b.method },
  });

  return json(pr);
}
