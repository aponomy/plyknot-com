import * as d1 from '../lib/d1.js';
import { embedText, searchEmbeddings } from '../lib/embeddings.js';
import { json } from '../lib/response.js';

interface Ai {
  run(model: string, input: { text: string[] }): Promise<{ data: number[][] }>;
}

export async function handleGround(db: D1Database, ai: Ai, url: URL): Promise<Response> {
  const text = url.searchParams.get('text');
  if (!text) return json({ error: 'query parameter ?text= required' }, 400);

  const embeddings = await d1.getEmbeddings(db);
  if (embeddings.length === 0) {
    return json({ query: text, matches: [], note: 'No embeddings loaded. Run the rebuild pipeline.' });
  }

  const queryVec = await embedText(ai, text);
  const matches = searchEmbeddings(queryVec, embeddings, 10);

  return json({
    query: text,
    matches: matches.map((m) => ({
      entity_id: m.entity_id,
      label: m.entity_label,
      similarity: Math.round(m.similarity * 1000) / 1000,
    })),
  });
}
