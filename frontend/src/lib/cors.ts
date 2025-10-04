// Centralized CORS helpers for API routes
// Usage in routes:
//   import { withCors, handlePreflight } from "@/lib/cors";

const DEFAULT_METHODS = "GET,POST,PUT,OPTIONS";
const DEFAULT_HEADERS = "Content-Type, Authorization";

// Read allowed origins from environment
// - WEBFLOW_ALLOWLIST: comma-separated list of full origins (e.g., "https://foo.webflow.io,https://www.example.com")
// - WEBFLOW_ORIGIN: single origin (legacy)
// Dev fallback: allow all (*)
export function getAllowedOrigins(): string[] {
  const list = process.env.WEBFLOW_ALLOWLIST?.trim();
  const single = process.env.WEBFLOW_ORIGIN?.trim();

  if (list) {
    return list
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (single) {
    return [single];
  }

  // In development, be permissive by default
  if (process.env.NODE_ENV !== "production") {
    return ["*"];
  }

  // In production with no config, default to deny-all (no matches)
  return [];
}

function normalizeOrigin(origin: string): string {
  try {
    // Normalize by removing trailing slash
    return new URL(origin).origin;
  } catch {
    return origin.replace(/\/+$/, "");
  }
}

export function isOriginAllowed(origin: string | null, allowed: string[]): boolean {
  if (!origin) return true; // Non-browser or server-to-server calls
  if (allowed.includes("*")) return true;

  const norm = normalizeOrigin(origin);
  return allowed.some((a) => normalizeOrigin(a) === norm);
}

export function getCorsHeaders(origin: string | null, allowed: string[]) {
  const headers = new Headers();

  headers.set("Vary", "Origin");

  if (allowed.includes("*")) {
    headers.set("Access-Control-Allow-Origin", "*");
  } else if (origin && isOriginAllowed(origin, allowed)) {
    headers.set("Access-Control-Allow-Origin", normalizeOrigin(origin));
  }

  headers.set("Access-Control-Allow-Methods", DEFAULT_METHODS);
  headers.set("Access-Control-Allow-Headers", DEFAULT_HEADERS);
  headers.set("Access-Control-Max-Age", "86400"); // 24h

  return headers;
}

/**
 * JSON response with CORS headers.
 * Denies in production if origin not in allowlist.
 */
export function withCors(
  body: unknown,
  request: Request,
  status: number = 200
): Response {
  const origin = request.headers.get("Origin");
  const allowed = getAllowedOrigins();

  if (process.env.NODE_ENV === "production") {
    if (!isOriginAllowed(origin, allowed)) {
      return new Response(JSON.stringify({ error: "CORS: origin not allowed" }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          Vary: "Origin",
        },
      });
    }
  }

  const headers = getCorsHeaders(origin, allowed);
  headers.set("Content-Type", "application/json");

  return new Response(JSON.stringify(body), { status, headers });
}

/**
 * OPTIONS preflight handler with CORS.
 * Call this from your route's exported OPTIONS.
 */
export async function handlePreflight(request: Request): Promise<Response> {
  const origin = request.headers.get("Origin");
  const allowed = getAllowedOrigins();

  // Always return a 200 preflight so browsers can proceed,
  // but only echo specific origin if allowed
  const headers = getCorsHeaders(origin, allowed);
  return new Response(null, { status: 200, headers });
}