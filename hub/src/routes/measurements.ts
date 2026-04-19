/**
 * POST /v1/chains/:name/measurements — add a measurement to an existing chain step.
 *
 * Creates a PR against plyknot/universe appending to the specified step's
 * measurements array in data/chains/<name>.json.
 *
 * ?dryRun=true — validate only, no PR.
 */

import { json } from '../lib/response.js';
import { validateMeasurement } from '../lib/validate.js';
import { createPullRequest, readFile, buildPrBody, type GitHubEnv } from '../lib/github-pr.js';
import type { AuthContext } from '../auth/middleware.js';

export async function handleAddMeasurement(
  request: Request,
  db: D1Database,
  auth: AuthContext,
  env: GitHubEnv,
  chainName: string,
  dryRun: boolean,
): Promise<Response> {
  const body = await request.json();
  const v = validateMeasurement(body);
  if (!v.ok) return json({ error: 'Validation failed', details: v.errors }, 400);

  const b = body as { stepIndex: number; measurement: { method: string; value: string; year: number; lab: string } };

  // Read the chain
  const filePath = `data/chains/${chainName}.json`;
  const raw = await readFile(env, filePath);
  if (!raw) return json({ error: `Chain "${chainName}" not found in universe repo` }, 404);

  const chain = JSON.parse(raw);
  if (b.stepIndex < 0 || b.stepIndex >= chain.steps.length) {
    return json({
      error: `stepIndex ${b.stepIndex} out of range. Chain "${chainName}" has ${chain.steps.length} steps (0-${chain.steps.length - 1}).`,
    }, 400);
  }

  const validation = [
    'Schema valid',
    `Chain: ${chain.entity}`,
    `Step ${b.stepIndex}: "${chain.steps[b.stepIndex].claim}"`,
    `Method: ${b.measurement.method} (${b.measurement.lab}, ${b.measurement.year})`,
  ];

  if (dryRun) {
    return json({
      dryRun: true,
      valid: true,
      chain: chainName,
      stepIndex: b.stepIndex,
      stepClaim: chain.steps[b.stepIndex].claim,
      measurement: b.measurement,
      validation,
      files: [filePath, `data/events/${new Date().toISOString().slice(0, 7)}.jsonl`],
    });
  }

  chain.steps[b.stepIndex].measurements.push(b.measurement);

  const branch = `hub/add-meas-${chainName}-step${b.stepIndex}-${Date.now()}`.slice(0, 60);

  const event = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    type: 'measurement-added',
    actor: `user:${auth.githubLogin}`,
    details: { chain: chainName, stepIndex: b.stepIndex, method: b.measurement.method },
  };
  const eventMonth = new Date().toISOString().slice(0, 7);
  const eventPath = `data/events/${eventMonth}.jsonl`;
  const existingEvents = (await readFile(env, eventPath)) ?? '';
  const eventContent = existingEvents + JSON.stringify(event) + '\n';

  const pr = await createPullRequest(env, {
    branch,
    title: `Add measurement to ${chain.entity} step ${b.stepIndex}`,
    body: buildPrBody({
      type: 'New measurement',
      actor: auth.githubLogin!,
      payload: { chain: chainName, stepIndex: b.stepIndex, measurement: b.measurement },
      validation,
    }),
    files: [
      { path: filePath, content: JSON.stringify(chain, null, 2) + '\n', message: `Add measurement: ${b.measurement.method} to ${chainName} step ${b.stepIndex}` },
      { path: eventPath, content: eventContent, message: `Log event: measurement-added to ${chainName}` },
    ],
  });

  return json(pr);
}
