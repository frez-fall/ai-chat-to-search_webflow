// /backend/src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Read allowed origins from env (comma-separated), e.g. "https://your-site.webflow.io,https://www.yourdomain.com"
const allowed = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

function cors(req: NextRequest) {
  const origin = req.headers.get('origin') || '';
  const res = NextResponse.next();

  // Allow only configured origins (fall back to no CORS if none set)
  if (allowed.length && allowed.includes(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Vary', 'Origin');
  }
  res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.headers.set('Access-Control-Max-Age', '86400');
  return res;
}

export function middleware(req: NextRequest) {
  // Handle preflight
  if (req.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: 200 });
    const origin = req.headers.get('origin') || '';
    if (allowed.length && allowed.includes(origin)) {
      res.headers.set('Access-Control-Allow-Origin', origin);
      res.headers.set('Vary', 'Origin');
    }
    res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.headers.set('Access-Control-Max-Age', '86400');
    return res;
  }

  return cors(req);
}

// Limit to API routes only
export const config = {
  matcher: ['/api/:path*'],
};