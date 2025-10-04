import { NextResponse } from "next/server";
import { getAllowedOrigins } from "@/lib/cors";
export async function GET() {
  return NextResponse.json({
    NODE_ENV: process.env.NODE_ENV,
    WEBFLOW_ALLOWLIST: process.env.WEBFLOW_ALLOWLIST,
    WEBFLOW_ORIGIN: process.env.WEBFLOW_ORIGIN,
    allowedParsed: getAllowedOrigins(),
  });
}