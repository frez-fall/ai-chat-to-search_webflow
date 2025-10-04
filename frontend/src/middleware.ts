import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
function parseOrigins(envValue?: string): string[] {
  return (envValue ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}
function isAllowed(origin: string, allowlist: string[], allowPreview: boolean) {
  if (!origin) return false;
  try {
    const host = new URL(origin).hostname;
    if (allowlist.includes(origin)) return true;
    if (allowPreview && /\.vercel\.app$/.test(host)) return true;
  } catch {}
  return false;
}
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Only apply to API routes
  if (!pathname.startsWith('/api/')) return NextResponse.next();
  // Dev: allow everything for convenience
  if (process.env.NODE_ENV !== 'production') {
    const res = NextResponse.next();
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.headers.set('Access-Control-Max-Age', '86400');
    res.headers.set('Vary', 'Origin');
    if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: res.headers });
    return res;
  }
  // Prod: use env allowlist
  const allowlist = parseOrigins(process.env.WEBFLOW_ORIGINS ?? process.env.WEBFLOW_ORIGIN);
  const allowPreview = (process.env.ALLOW_VERCEL_PREVIEW ?? '').toLowerCase() === 'true';
  const origin = req.headers.get('origin') ?? '';
  if (!isAllowed(origin, allowlist, allowPreview)) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 403 });
    return new Response(JSON.stringify({ error: 'CORS: origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const res = NextResponse.next();
  res.headers.set('Access-Control-Allow-Origin', origin); // echo exact origin
  res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.headers.set('Access-Control-Max-Age', '86400');
  res.headers.set('Vary', 'Origin');
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: res.headers });
  return res;
}
export const config = { matcher: '/api/:path*' };