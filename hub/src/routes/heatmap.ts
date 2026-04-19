import { computeHeatmap } from '../compute/convergence.js';
import type { ChainRow } from '../lib/d1.js';
import { json } from '../lib/response.js';

export async function handleHeatmap(db: D1Database): Promise<Response> {
  const { results } = await db.prepare('SELECT * FROM chains').all<ChainRow>();
  return json({ cells: computeHeatmap(results) });
}
