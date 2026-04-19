/**
 * GET /v1/events — paginated event log.
 *
 * Filters: ?type=..., ?actor=..., ?since=...(ISO 8601), ?limit=..., ?cursor=...(last event ID)
 */

import * as d1 from '../lib/d1.js';
import { json } from '../lib/response.js';

export async function handleListEvents(db: D1Database, url: URL): Promise<Response> {
  const type = url.searchParams.get('type') ?? undefined;
  const actor = url.searchParams.get('actor') ?? undefined;
  const since = url.searchParams.get('since') ?? undefined;

  const events = await d1.listEvents(db, { type, actor, since });

  // Cursor-based pagination: cursor = last event ID from previous page
  const cursor = url.searchParams.get('cursor');
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 1000);

  let filtered = events;
  if (cursor) {
    const cursorId = Number(cursor);
    const idx = filtered.findIndex((e) => e.id === cursorId);
    if (idx >= 0) filtered = filtered.slice(idx + 1);
  }

  const page = filtered.slice(0, limit);
  const nextCursor = page.length === limit ? page[page.length - 1].id : undefined;

  return json({
    events: page,
    total: events.length,
    nextCursor,
  });
}
