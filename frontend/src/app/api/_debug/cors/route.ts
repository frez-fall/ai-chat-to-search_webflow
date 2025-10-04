import { getAllowedOrigins, isOriginAllowed } from "@/lib/cors";

export async function GET(request: Request) {
  const origin = request.headers.get("Origin");
  const allowed = getAllowedOrigins();
  const ok = isOriginAllowed(origin, allowed);
  return new Response(
    JSON.stringify({
      nodeEnv: process.env.NODE_ENV,
      origin,
      allowed,
      allowedMatch: ok
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}