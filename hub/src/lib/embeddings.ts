/**
 * Embeddings — cosine similarity search using Cloudflare Workers AI.
 *
 * Pre-computed embeddings stored in D1 as Float32Array blobs.
 * At query time: embed query via Workers AI, brute-force cosine similarity.
 */

interface Ai {
  run(model: string, input: { text: string[] }): Promise<{ data: number[][] }>;
}

export interface EmbeddingMatch {
  entity_label: string;
  entity_id: number | null;
  similarity: number;
}

const MODEL = '@cf/baai/bge-base-en-v1.5';

export async function embedText(ai: Ai, text: string): Promise<Float32Array> {
  const result = await ai.run(MODEL, { text: [text] });
  return new Float32Array(result.data[0]);
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

export function blobToFloat32(blob: ArrayBuffer): Float32Array {
  return new Float32Array(blob);
}

export function searchEmbeddings(
  queryVec: Float32Array,
  stored: Array<{ entity_label: string; entity_id: number | null; vector: ArrayBuffer }>,
  topK = 10,
): EmbeddingMatch[] {
  const scored = stored.map((row) => ({
    entity_label: row.entity_label,
    entity_id: row.entity_id,
    similarity: cosineSimilarity(queryVec, blobToFloat32(row.vector)),
  }));
  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topK);
}
