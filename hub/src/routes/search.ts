import * as d1 from '../lib/d1.js';
import { embedText, searchEmbeddings } from '../lib/embeddings.js';
import { json } from '../lib/response.js';

interface Ai {
  run(model: string, input: { text: string[] }): Promise<{ data: number[][] }>;
}

export async function handleSearch(db: D1Database, ai: Ai | null, url: URL): Promise<Response> {
  const q = url.searchParams.get('q');
  if (!q) return json({ error: 'query parameter ?q= required' }, 400);

  // If AI binding available, do embedding search
  if (ai) {
    const embeddings = await d1.getEmbeddings(db);
    if (embeddings.length > 0) {
      const queryVec = await embedText(ai, q);
      const matches = searchEmbeddings(queryVec, embeddings, 20);
      return json({ query: q, matches });
    }
  }

  // Fallback: text search across chains and entities
  const chains = await d1.listChains(db);
  const entities = await d1.listEntities(db);
  const lq = q.toLowerCase();

  const results: Array<{ type: string; name: string; entity?: string; similarity?: number }> = [];

  for (const c of chains) {
    if (c.entity.toLowerCase().includes(lq) || c.name.includes(lq)) {
      results.push({ type: 'chain', name: c.name, entity: c.entity });
    }
  }
  for (const e of entities) {
    if (e.name.toLowerCase().includes(lq)) {
      results.push({ type: 'entity', name: e.name });
    }
  }

  return json({ query: q, results: results.slice(0, 50) });
}
