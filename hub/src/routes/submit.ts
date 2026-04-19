import { json } from '../lib/response.js';
import type { AuthContext } from '../auth/middleware.js';

export async function handleSubmit(
  request: Request,
  db: D1Database,
  auth: AuthContext,
): Promise<Response> {
  if (!auth.userId) {
    return json({ error: 'Authentication required. Set Authorization: Bearer <api_key>' }, 401);
  }

  const body = (await request.json()) as { type?: string; data?: unknown };
  if (!body.type || !body.data) {
    return json({ error: 'Body must contain { type, data }. Type: coupling | chain_update | entity' }, 400);
  }

  const validTypes = new Set(['coupling', 'chain_update', 'entity']);
  if (!validTypes.has(body.type)) {
    return json({ error: `Invalid type "${body.type}". Must be: coupling, chain_update, entity` }, 400);
  }

  const id = crypto.randomUUID();
  await db.prepare(
    'INSERT INTO submissions (id, user_id, type, data) VALUES (?, ?, ?, ?)',
  ).bind(id, auth.userId, body.type, JSON.stringify(body.data)).run();

  return json({
    id,
    status: 'pending',
    message: `Submission ${id} created. It will be reviewed before merging into the universe.`,
  });
}
