import type { NextRequest } from 'next/server';

/**
 * Server-side gateway to the Express API. The browser only ever calls this app's own `/api/*`;
 * this handler forwards the request from the Next.js server, so the backend's address never
 * reaches the client bundle. The API only accepts calls from this server: by its address locally,
 * or by INTERNAL_API_SECRET when hosted (Vercel).
 */

export const dynamic = 'force-dynamic';

// Server-only (no NEXT_PUBLIC_ prefix): never inlined into browser code.
// Locally the API is on the same machine, so localhost is right even when HOST_IP is set.
const API_ORIGIN =
  process.env.API_INTERNAL_URL ?? `http://localhost:${process.env.API_PORT || 4000}`;
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

const REQUEST_HEADERS = [
  'accept',
  'authorization',
  'content-type',
  'cookie',
  'user-agent',
  'x-device-id',
];
const RESPONSE_HEADERS = [
  'cache-control',
  'content-type',
  'retry-after',
  'ratelimit',
  'ratelimit-policy',
  'ratelimit-limit',
  'ratelimit-remaining',
  'ratelimit-reset',
];

async function forward(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await params;
  const target = new URL(`/api/${path.map(encodeURIComponent).join('/')}`, API_ORIGIN);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  for (const name of REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  // Keep per-client rate limits working on the API (it trusts this hop via TRUST_PROXY).
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) headers.set('x-forwarded-for', forwardedFor);
  // Set here only, never copied from the browser's request (REQUEST_HEADERS doesn't include it).
  if (INTERNAL_SECRET) headers.set('x-internal-secret', INTERNAL_SECRET);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
      redirect: 'manual',
      cache: 'no-store',
    });
  } catch {
    return Response.json(
      {
        success: false,
        error: { code: 'BAD_GATEWAY', message: 'The service is unavailable — try again shortly' },
      },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  for (const name of RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  // Refresh-token cookie: the API scopes it to /api/auth, which is this app's path too.
  for (const cookie of upstream.headers.getSetCookie())
    responseHeaders.append('set-cookie', cookie);

  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };
