// src/lib/cors.ts
/**
 * Small CORS helper used by route handlers.
 * Supports one or more origins via env:
 *   WEBFLOW_ORIGIN="https://your-site.webflow.io"
 *   or
 *   WEBFLOW_ORIGINS="https://your-site.webflow.io,https://www.your-domain.com"
 */

const RAW_ORIGINS =
  process.env.WEBFLOW_ORIGINS ??
  process.env.WEBFLOW_ORIGIN ??
  "*";

const ALLOWED_ORIGINS = RAW_ORIGINS.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function pickOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (origin) return origin;
  // Fallback to referer host if origin is missing
  try {
    const ref = request.headers.get("referer");
    if (!ref) return null;
    return new URL(ref).origin;
  } catch {
    return null;
  }
}

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes("*")) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

function corsHeaderValues(origin: string | null) {
  const allowOrigin = isAllowedOrigin(origin) ? origin! : "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/** Wrap JSON response with CORS headers */
export function withCors(
  body: unknown,
  request: Request,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  const origin = pickOrigin(request);
  const headers = {
    "Content-Type": "application/json",
    ...corsHeaderValues(origin),
    ...extraHeaders,
  };
  return new Response(JSON.stringify(body), { status, headers });
}

/** Preflight response */
export function preflight(request: Request): Response {
  const origin = pickOrigin(request);
  return new Response(null, {
    status: 204,
    headers: corsHeaderValues(origin),
  });
}