import * as d1 from '../lib/d1.js';
import { json } from '../lib/response.js';

export async function handleStats(db: D1Database): Promise<Response> {
  return json(await d1.getStats(db));
}
