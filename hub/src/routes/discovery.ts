import { extractCracks, computeHeatmap } from '../compute/convergence.js';
import type { ChainRow } from '../lib/d1.js';
import { json } from '../lib/response.js';

export async function handleDiscovery(db: D1Database): Promise<Response> {
  const { results } = await db.prepare('SELECT * FROM chains').all<ChainRow>();
  return json({
    cracks: extractCracks(results),
    heatmap: computeHeatmap(results),
    chainCount: results.length,
    crackCount: results.reduce((n, r) => n + r.crack_count, 0),
  });
}
