/**
 * SSE streaming endpoint — GET /v1/stream
 *
 * Authenticated. Streams typed events to connected dashboard clients.
 * Uses Cloudflare TransformStream for SSE response.
 *
 * Event format:
 *   data: {"type":"coupling-added","projectId":"...","timestamp":"...","summary":"..."}\n\n
 *
 * Heartbeat every 30s:
 *   : ping\n\n
 *
 * For now: polls D1 audit_log for new events.
 * Future: Durable Object fan-out for true push.
 */

import type { AuthContext } from '../auth/middleware.js';

export interface StreamEvent {
  type: string;
  projectId?: string;
  entityId?: number;
  timestamp: string;
  summary: string;
  data?: Record<string, unknown>;
}

const HEARTBEAT_INTERVAL_MS = 30_000;
const POLL_INTERVAL_MS = 2_000;

export function handleStream(db: D1Database, auth: AuthContext): Response {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  let lastEventId = '';
  let closed = false;

  function write(data: string) {
    if (closed) return;
    writer.write(encoder.encode(data)).catch(() => { closed = true; });
  }

  function sendEvent(event: StreamEvent) {
    write(`data: ${JSON.stringify(event)}\n\n`);
  }

  function sendHeartbeat() {
    write(`: ping\n\n`);
  }

  // Poll D1 audit_log for new events
  async function poll() {
    if (closed) return;
    try {
      const query = lastEventId
        ? `SELECT * FROM audit_log WHERE id > ? ORDER BY id ASC LIMIT 20`
        : `SELECT * FROM audit_log ORDER BY id DESC LIMIT 1`;

      const result = lastEventId
        ? await db.prepare(query).bind(lastEventId).all()
        : await db.prepare(query).all();

      if (result.results && result.results.length > 0) {
        for (const row of result.results as Record<string, unknown>[]) {
          const event: StreamEvent = {
            type: (row.action as string) ?? 'unknown',
            projectId: row.project_id as string | undefined,
            timestamp: (row.created_at as string) ?? new Date().toISOString(),
            summary: (row.detail as string) ?? '',
            data: row.payload ? JSON.parse(row.payload as string) : undefined,
          };
          sendEvent(event);
          lastEventId = String(row.id);
        }
      }
    } catch {
      // D1 query failed — skip this poll cycle
    }
  }

  // Start polling + heartbeat loops
  (async () => {
    // Initial poll to get latest event ID
    await poll();

    const heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    const pollTimer = setInterval(poll, POLL_INTERVAL_MS);

    // Keep the stream open until client disconnects
    // Cloudflare Workers will abort when the client closes the connection
    try {
      // Wait indefinitely — the writable side will error when client disconnects
      await new Promise<void>((resolve) => {
        const checkClosed = setInterval(() => {
          if (closed) {
            clearInterval(checkClosed);
            resolve();
          }
        }, 5000);
      });
    } finally {
      clearInterval(heartbeatTimer);
      clearInterval(pollTimer);
      writer.close().catch(() => {});
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  });
}

/**
 * Helper to emit an event to the audit_log table.
 * Call this from any factory route after a D1 write.
 */
export async function emitEvent(
  db: D1Database,
  action: string,
  detail: string,
  opts?: { projectId?: string; userId?: string; payload?: Record<string, unknown> },
): Promise<void> {
  try {
    await db.prepare(
      `INSERT INTO audit_log (action, detail, project_id, user_id, payload, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    ).bind(
      action,
      detail,
      opts?.projectId ?? null,
      opts?.userId ?? null,
      opts?.payload ? JSON.stringify(opts.payload) : null,
    ).run();
  } catch {
    // Best-effort — don't fail the main request
  }
}
