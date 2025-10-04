/**
 * Messages API Endpoints
 * POST /api/conversations/:conversationId/messages - Send message
 * GET  /api/conversations/:conversationId/messages - Get message history
 */

import { z } from "zod";
import { db } from "@/services/database";
import { chatEngine } from "@/lib/chat-engine";
import { FlightParser } from "@/lib/flight-parser";
import { urlGenerator } from "@/lib/url-generator";
import { withCors, preflight } from "@/lib/cors";

// Request body schema
const SendMessageRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  user_location: z.string().optional(),
});

// Minimal type used only to shape the GET output without `any`
type DBMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
};

export async function POST(
  request: Request,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { conversationId } = params;
    const body = await request.json();

    // 1) Validate request
    const validatedBody = SendMessageRequestSchema.parse(body);

    // 2) Check conversation exists & is active
    const conversation = await db.getConversation(conversationId);
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

    // 3) Save user message
    await db.createMessage({
      conversation_id: conversationId,
      role: "user",
      content: validatedBody.message,
      metadata: validatedBody.user_location
        ? { user_location: validatedBody.user_location }
        : undefined,
    });

    // 4) Load conversation history + current parameters
    const messages = await db.getMessages(conversationId);
    const searchParams = await db.getSearchParameters(conversationId);

    // 5) Parse flight info from the new message (static method on FlightParser)
    const previous_searches = (messages ?? [])
      .filter((m: DBMessage) => m.role === "user")
      .map((m: DBMessage) => m.content)
      .slice(-3);

    const parsedFlight = await FlightParser.parseFlightQuery(
      validatedBody.message,
      {
        user_location: validatedBody.user_location,
        previous_searches,
      }
    );

    // 6) Generate AI response via your chat engine
    const aiResponse = await chatEngine.generateResponse(
      validatedBody.message,
      messages,
      searchParams || undefined,
      { user_location: validatedBody.user_location }
    );

    // 7) Save AI response
    await db.createMessage({
      conversation_id: conversationId,
      role: "assistant",
      content: aiResponse.content,
      metadata: {
        extracted_params: aiResponse.extracted_params,
        parsed_flight: parsedFlight,
        requires_clarification: aiResponse.requires_clarification,
      },
    });

    // 8) If AI extracted params, merge + update conversation state
    if (aiResponse.extracted_params && searchParams) {
      const merged = chatEngine.mergeParameters(
        aiResponse.extracted_params,
        searchParams
      );

      // Default trip type if missing
      if (!merged.trip_type) {
        merged.trip_type = merged.return_date ? "return" : "oneway";
      }

      const hasBasicInfo =
        Boolean(merged.origin_code) &&
        Boolean(merged.destination_code) &&
        Boolean(merged.departure_date);

      const isComplete =
        (merged.trip_type === "oneway" && hasBasicInfo) ||
        (merged.trip_type === "return" &&
          hasBasicInfo &&
          Boolean(merged.return_date)) ||
        (merged.trip_type === "multicity" &&
          Array.isArray(merged.multi_city_segments) &&
          merged.multi_city_segments.length >= 2);

      merged.is_complete = isComplete;

      await db.updateSearchParameters(conversationId, merged);

      if (isComplete) {
        const updatedParams = await db.getSearchParameters(conversationId);
        if (updatedParams) {
          const generatedUrl = urlGenerator.generateBookingURL(updatedParams, {
            utm_source: "chat",
            utm_medium: "ai",
            utm_campaign: "natural_language_search",
          });

          await db.updateConversation(conversationId, {
            generated_url: generatedUrl,
            current_step: "complete",
            status: "completed",
          });
        }
      } else if (aiResponse.next_step) {
        await db.updateConversation(conversationId, {
          current_step:
            aiResponse.next_step === "collecting"
              ? "collecting"
              : aiResponse.next_step === "confirming"
              ? "confirming"
              : "complete",
        });
      }
    }

    // 9) Return the updated state
    const updatedConversation = await db.getConversation(conversationId);
    const updatedParams = await db.getSearchParameters(conversationId);

    return withCors(
      {
        message_id: (messages?.length ?? 0) + 2, // user + assistant in this request
        ai_response: aiResponse,
        parsed_flight: parsedFlight,
        search_parameters: updatedParams ?? null,
        generated_url: updatedConversation?.generated_url,
        conversation_status: updatedConversation?.status,
        conversation_step: updatedConversation?.current_step,
      },
      request
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withCors(
        { error: "Validation error", details: error.errors },
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

export async function GET(
  request: Request,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { conversationId } = params;

    const conversation = await db.getConversation(conversationId);
    if (!conversation) {
      return withCors({ error: "Conversation not found" }, request, 404);
    }

    const raw = (await db.getMessages(conversationId)) ?? [];
    const messages: DBMessage[] = raw.map((msg: any) => ({
      id: String(msg.id),
      role: msg.role,
      content: String(msg.content),
      timestamp: msg.timestamp,
      metadata: msg.metadata,
    }));

    return withCors(
      {
        conversation_id: conversationId,
        messages,
        total: messages.length,
      },
      request
    );
  } catch (error) {
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

// OPTIONS (CORS preflight)
export async function OPTIONS(request: Request) {
  return preflight(request);
}