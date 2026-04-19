/**
 * HTTP response helpers with CORS.
 */

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, authorization',
};

export function json(body: unknown, status = 200): Response {
  const headers = new Headers(CORS);
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(body), { status, headers });
}

export function notFound(message = 'Not Found'): Response {
  return json({ error: message }, 404);
}

export function cors(): Response {
  return new Response(null, { status: 204, headers: CORS });
}
