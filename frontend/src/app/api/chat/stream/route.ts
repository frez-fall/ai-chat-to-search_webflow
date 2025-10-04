/**
 * Streaming Chat API Endpoint
 * POST /api/chat/stream - Stream AI responses (text/plain)
 *
 * Uses:
 *  - zod for validation
 *  - db/chatEngine for business logic
 *  - withCors / handlePreflight for CORS
 */

import { z } from "zod";
import { db } from "@/services/database";
import { chatEngine } from "@/lib/chat-engine";
import { withCors, handlePreflight } from "@/lib/cors";

// ---------- Schema ----------

const StreamChatRequestSchema = z.object({
  conversation_id: z.string().uuid(),
  message: z.string().min(1, "Message cannot be empty"),
  user_location: z.string().optional(),
});
type StreamBody = z.infer<typeof StreamChatRequestSchema>;

// ---------- Internal: resolve allowed origin for streaming ----------

function resolveAllowedOriginForStream(request: Request): string | null {
  // Match the logic used in withCors/handlePreflight:
  // - In dev: allow "*"
  // - In prod: allow only values listed in WEBFLOW_ORIGINS (comma-separated)
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) return "*";

  const origin = request.headers.get("origin");
  if (!origin) return null;

  const allowList =
    process.env.WEBFLOW_ORIGINS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  return allowList.includes(origin) ? origin : null;
}

// ---------- POST (streaming) ----------

export async function POST(request: Request): Promise<Response> {
  try {
    const bodyUnknown = (await request.json()) as unknown;
    const body: StreamBody = StreamChatRequestSchema.parse(bodyUnknown);

    // CORS check for streaming (pre-flight is handled in OPTIONS)
    const allowedOrigin = resolveAllowedOriginForStream(request);
    if (!allowedOrigin) {
      return withCors({ error: "CORS: origin not allowed" }, request, 403);
    }

    // Validate conversation
    const conversation = await db.getConversation(body.conversation_id);
    if (!conversation) {
      return withCors({ error: "Conversation not found" }, request, 404);
    }
    if (conversation.status !== "active") {
      return withCors(
        { error: "Conversation is no longer active" },
        request,
        400
      );
    }

    // Persist user message
    await db.createMessage({
      conversation_id: body.conversation_id,
      role: "user",
      content: body.message,
      metadata: body.user_location
        ? { user_location: body.user_location }
        : undefined,
    });

    // Gather history + parameters
    const messages = await db.getMessages(body.conversation_id);
    const searchParams = await db.getSearchParameters(body.conversation_id);

    // Ask the chat engine for a streaming result
    const result = await chatEngine.generateStreamingResponse(
      body.message,
      messages,
      searchParams ?? undefined
    );

    // Expect an async iterable of string chunks at result.textStream
    const textStream:
      | AsyncIterable<string>
      | undefined = (result as { textStream?: AsyncIterable<string> })
      .textStream;

    if (!textStream) {
      return withCors(
        { error: "Streaming is not supported by the chat engine." },
        request,
        500
      );
    }

    const encoder = new TextEncoder();
    let fullResponse = "";

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of textStream) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(chunk));
          }

          // Save the final assistant message after stream completes
          await db.createMessage({
            conversation_id: body.conversation_id,
            role: "assistant",
            content: fullResponse,
            metadata: { streamed: true },
          });
        } catch (e) {
          const err =
            e instanceof Error ? e.message : "Error during streaming response";
          controller.enqueue(
            encoder.encode(`\n\n[Stream error]: ${String(err)}\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    // Streamed text/plain response with CORS headers
    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Conversation-Id": body.conversation_id,
        "Access-Control-Allow-Origin": allowedOrigin,
        // Let proxies/CDNs vary on Origin for proper CORS behaviour
        Vary: "Origin",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withCors(
        { error: "Validation error", details: error.issues },
        request,
        400
      );
    }

    return withCors(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      request,
      500
    );
  }
}

// ---------- OPTIONS (CORS preflight) ----------

export async function OPTIONS(request: Request): Promise<Response> {
  return handlePreflight(request);
}