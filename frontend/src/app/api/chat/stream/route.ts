/**
 * Streaming Chat API Endpoint
 * POST /api/chat/stream - Stream AI responses (text/plain)
 *
 * Notes:
 * - Uses Web Streams API
 * - Sends CORS headers so Webflow can call it directly
 */

import { z } from "zod";
import { db } from "@/services/database";
import { chatEngine } from "@/lib/chat-engine";

// CORS: allow your Webflow site in prod, '*' in dev
const ALLOWED_ORIGIN =
  process.env.NODE_ENV === "production"
    ? process.env.WEBFLOW_ORIGIN ?? "https://<your-site>.webflow.io"
    : "*";

// Request body schema
const StreamChatRequestSchema = z.object({
  conversation_id: z.string().uuid(),
  message: z.string().min(1, "Message cannot be empty"),
  user_location: z.string().optional()
});

type StreamBody = z.infer<typeof StreamChatRequestSchema>;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const validatedBody: StreamBody = StreamChatRequestSchema.parse(body);

    // Check conversation exists and is active
    const conversation = await db.getConversation(validatedBody.conversation_id);
    if (!conversation) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": ALLOWED_ORIGIN
          }
        }
      );
    }
    if (conversation.status !== "active") {
      return new Response(
        JSON.stringify({ error: "Conversation is no longer active" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": ALLOWED_ORIGIN
          }
        }
      );
    }

    // Save the user message
    await db.createMessage({
      conversation_id: validatedBody.conversation_id,
      role: "user",
      content: validatedBody.message,
      metadata: validatedBody.user_location
        ? { user_location: validatedBody.user_location }
        : undefined
    });

    // Gather history + parameters
    const messages = await db.getMessages(validatedBody.conversation_id);
    const searchParams = await db.getSearchParameters(
      validatedBody.conversation_id
    );

    // Ask the chat engine for a streaming result
    const result = await chatEngine.generateStreamingResponse(
      validatedBody.message,
      messages,
      searchParams ?? undefined
    );

    // Create streaming response
    const encoder = new TextEncoder();
    let fullResponse = "";

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          // Expect result.textStream to be an async iterable of string chunks
          for await (const textPart of (result as any).textStream) {
            fullResponse += textPart;
            controller.enqueue(encoder.encode(textPart));
          }

          // Persist final assistant message once stream completes
          await db.createMessage({
            conversation_id: validatedBody.conversation_id,
            role: "assistant",
            content: fullResponse,
            metadata: { streamed: true }
          });
        } catch (e) {
          // Surface streaming errors to the client
          const err =
            e instanceof Error ? e.message : "Error during streaming response";
          controller.enqueue(
            encoder.encode(`\n\n[Stream error]: ${String(err)}\n`)
          );
        } finally {
          controller.close();
        }
      }
    });

    // Return streamed text/plain response with CORS headers
    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Conversation-Id": validatedBody.conversation_id,
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: "Validation error", details: error.errors }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": ALLOWED_ORIGIN
          }
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": ALLOWED_ORIGIN
        }
      }
    );
  }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS(_request: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400"
    }
  });
}