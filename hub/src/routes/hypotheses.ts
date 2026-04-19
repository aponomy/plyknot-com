/**
 * POST /v1/chains/:name/hypotheses — propose a Level ⑤ hypothesis step.
 *
 * Creates a PR against plyknot/universe appending a hypothesis step
 * to data/chains/<name>.json.
 *
 * ?dryRun=true — validate only, no PR.
 */

import { json } from '../lib/response.js';
import { validateHypothesis, validateDependsExist } from '../lib/validate.js';
import { createPullRequest, readFile, buildPrBody, type GitHubEnv } from '../lib/github-pr.js';
import * as d1 from '../lib/d1.js';
import type { AuthContext } from '../auth/middleware.js';

export async function handleAddHypothesis(
  request: Request,
  db: D1Database,
  auth: AuthContext,
  env: GitHubEnv,
  chainName: string,
  dryRun: boolean,
): Promise<Response> {
  const body = await request.json();
  const v = validateHypothesis(body);
  if (!v.ok) return json({ error: 'Validation failed', details: v.errors }, 400);

  const b = body as {
    claim: string;
    convergence: string;
    depends: number[];
    challengeCost: string;
    complexityLevel: number;
  };

  // Validate dependency IDs exist
  const deps = await d1.listDependencies(db);
  const knownIds = new Set(deps.map((d) => d.id));
  const depErrors = validateDependsExist(b.depends, knownIds);
  if (depErrors.length) return json({ error: 'Validation failed', details: depErrors }, 400);

  // Read the chain
  const filePath = `data/chains/${chainName}.json`;
  const raw = await readFile(env, filePath);
  if (!raw) return json({ error: `Chain "${chainName}" not found in universe repo` }, 404);

  const chain = JSON.parse(raw);

  const step = {
    claim: b.claim,
    level: 'hypothesis' as const,
    convergence: b.convergence,
    measurements: [],
    depends: b.depends,
    challengeCost: b.challengeCost,
    complexityLevel: b.complexityLevel,
  };

  const validation = [
    'Schema valid',
    `Chain: ${chain.entity} (will have ${chain.steps.length + 1} steps)`,
    `Depends: [${b.depends.join(', ')}]`,
    `Convergence: ${b.convergence}`,
    'All dependency IDs valid',
  ];

  if (dryRun) {
    return json({
      dryRun: true,
      valid: true,
      chain: chainName,
      step,
      validation,
      files: [filePath, `data/events/${new Date().toISOString().slice(0, 7)}.jsonl`],
    });
  }

  chain.steps.push(step);

  const branch = `hub/add-hyp-${chainName}-${Date.now()}`.slice(0, 60);

  const event = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    type: 'hypothesis-proposed',
    actor: `user:${auth.githubLogin}`,
    details: { chain: chainName, claim: b.claim },
  };
  const eventMonth = new Date().toISOString().slice(0, 7);
  const eventPath = `data/events/${eventMonth}.jsonl`;
  const existingEvents = (await readFile(env, eventPath)) ?? '';
  const eventContent = existingEvents + JSON.stringify(event) + '\n';

  const pr = await createPullRequest(env, {
    branch,
    title: `Propose hypothesis for ${chain.entity}`,
    body: buildPrBody({ type: 'New hypothesis', actor: auth.githubLogin!, payload: { chain: chainName, step }, validation }),
    files: [
      { path: filePath, content: JSON.stringify(chain, null, 2) + '\n', message: `Propose hypothesis for ${chainName}: ${b.claim.slice(0, 50)}` },
      { path: eventPath, content: eventContent, message: `Log event: hypothesis-proposed for ${chainName}` },
    ],
  });

  return json(pr);
}
