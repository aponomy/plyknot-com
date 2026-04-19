/**
 * API key management — SHA-256 hashed, stored in D1.
 */

export async function createApiKey(db: D1Database, userId: string, name: string): Promise<string> {
  const key = `plyknot_${randomHex(32)}`;
  const hash = await sha256(key);
  await db.prepare(
    'INSERT INTO api_keys (key_hash, user_id, name) VALUES (?, ?, ?)',
  ).bind(hash, userId, name).run();
  return key;
}

export async function verifyApiKey(db: D1Database, key: string): Promise<string | null> {
  const hash = await sha256(key);
  const row = await db
    .prepare('SELECT user_id FROM api_keys WHERE key_hash = ?')
    .bind(hash)
    .first<{ user_id: string }>();
  if (row) {
    db.prepare("UPDATE api_keys SET last_used = datetime('now') WHERE key_hash = ?")
      .bind(hash).run().catch(() => {});
  }
  return row?.user_id ?? null;
}

export async function listUserKeys(db: D1Database, userId: string) {
  const { results } = await db
    .prepare('SELECT key_hash, name, created_at, last_used FROM api_keys WHERE user_id = ? ORDER BY created_at DESC')
    .bind(userId)
    .all<{ key_hash: string; name: string; created_at: string; last_used: string | null }>();
  return results.map((r) => ({ name: r.name, created: r.created_at, lastUsed: r.last_used }));
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');
}
