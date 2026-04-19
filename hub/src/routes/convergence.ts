import { computeEntityConvergence } from '../compute/convergence.js';
import type { ChainRow } from '../lib/d1.js';
import { json, notFound } from '../lib/response.js';

export async function handleConvergence(db: D1Database, entity: string): Promise<Response> {
  const { results } = await db.prepare('SELECT * FROM chains').all<ChainRow>();
  const conv = computeEntityConvergence(results, entity);
  if (!conv) return notFound(`entity "${entity}" not found`);
  return json(conv);
}
