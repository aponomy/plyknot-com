/**
 * Factory embargo endpoint — list embargoed coupling entries.
 */

import { json } from '../lib/response.js';

export async function handleListEmbargoed(db: D1Database, url: URL): Promise<Response> {
  const status = url.searchParams.get('status'); // 'active' | 'expired' | null (all)

  let sql = 'SELECT * FROM embargoed_couplings';
  const binds: string[] = [];

  if (status === 'active') {
    sql += " WHERE embargo_until > datetime('now')";
  } else if (status === 'expired') {
    sql += " WHERE embargo_until <= datetime('now')";
  }

  sql += ' ORDER BY embargo_until ASC LIMIT 200';

  const stmt = db.prepare(sql);
  const { results } = await (binds.length ? stmt.bind(...binds) : stmt).all();

  return json({
    embargoed: results,
    count: results.length,
  });
}
