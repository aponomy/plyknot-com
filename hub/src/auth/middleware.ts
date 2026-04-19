/**
 * Auth middleware — extracts user identity from request.
 * Read endpoints: auth optional. Write endpoints: auth required.
 */

import { verifyApiKey } from './api-keys.js';

export interface AuthContext {
  userId: string | null;
  githubLogin: string | null;
}

export async function extractAuth(request: Request, db: D1Database): Promise<AuthContext> {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return { userId: null, githubLogin: null };

  const key = auth.slice(7).trim();
  if (!key) return { userId: null, githubLogin: null };

  const userId = await verifyApiKey(db, key);
  if (!userId) return { userId: null, githubLogin: null };

  const user = await db
    .prepare('SELECT github_login FROM users WHERE id = ?')
    .bind(userId)
    .first<{ github_login: string }>();

  return { userId, githubLogin: user?.github_login ?? null };
}
