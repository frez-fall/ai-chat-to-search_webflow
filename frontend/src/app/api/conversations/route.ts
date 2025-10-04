/**
 * Conversations API Endpoints
 * POST /api/conversations                - Create new conversation
 * GET  /api/conversations?user_id=...   - (optional) list placeholder
 */

import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

import { db } from "@/services/database";
import { chatEngine } from "@/lib/chat-engine";
import { withCors, handlePreflight } from "@/lib/cors";

// ---------- Schemas & Types ----------

const CreateConversationRequestSchema = z.object({
  user_id: z.string().optional(),     // optional; generated when missing
  initial_query: z.string().optional(),
});
type CreateConversationBody = z.infer<typeof CreateConversationRequestSchema>;

type AIResponse = {
  content: string;
  extracted_params?: Record<string, unknown>;
  requires_clarification?: boolean;
  next_step?: "collecting" | "confirming" | "complete" | string;
};

// ---------- Handlers ----------

export async function POST(request: Request): Promise<Response> {
  try {
    const bodyUnknown = await request.json();
    const body: CreateConversationBody =
      CreateConversationRequestSchema.parse(bodyUnknown);

    // Stable ID even for anonymous users
    const userId = body.user_id ?? `anon_${uuidv4()}`;

    // Create conversation
    const conversation = await db.createConversation({ user_id: userId });

    // Seed default search parameters
    await db.createSearchParameters({
      conversation_id: conversation.id,
      trip_type: "return",
      adults: 1,
      children: 0,
      infants: 0,
      is_complete: false,
    });

    // System greeting (optionally influenced by initial_query)
    const initialMessage = chatEngine.generateInitialMessage(body.initial_query);

    // Persist assistant greeting
    await db.createMessage({
      conversation_id: conversation.id,
      role: "assistant",
      content: initialMessage,
    });

    // Optionally process an initial user query
    let aiResponse: AIResponse | undefined;

    if (body.initial_query) {
      // Save user's initial query
      await db.createMessage({
        conversation_id: conversation.id,
        role: "user",
        content: body.initial_query,
      });

      const messages = await db.getMessages(conversation.id);
      const searchParams = await db.getSearchParameters(conversation.id);

      aiResponse = (await chatEngine.generateResponse(
        body.initial_query,
        messages,
        searchParams ?? undefined
      )) as AIResponse;

      // Save AI response
      await db.createMessage({
        conversation_id: conversation.id,
        role: "assistant",
        content: aiResponse.content,
        metadata: {
          extracted_params: aiResponse.extracted_params,
          requires_clarification: aiResponse.requires_clarification,
        },
      });

      // Merge parameters if any were extracted
      if (aiResponse.extracted_params && searchParams) {
        const merged = chatEngine.mergeParameters(
          aiResponse.extracted_params,
          searchParams
        );
        await db.updateSearchParameters(conversation.id, merged);
      }

      // Update step if provided
      if (aiResponse.next_step) {
        await db.updateConversation(conversation.id, {
          current_step:
            aiResponse.next_step === "collecting"
              ? "collecting"
              : aiResponse.next_step === "confirming"
              ? "confirming"
              : "complete",
        });
      }
    }

    return withCors(
      {
        conversation_id: conversation.id,
        user_id: userId,
        initial_message: initialMessage,
        ai_response: aiResponse,
      },
      request,
      201
    );
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

// Optional: list conversations (not implemented)
export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("user_id");

    if (!userId) {
      return withCors({ error: "user_id parameter is required" }, request, 400);
    }

    // Placeholder response to match previous behavior
    return withCors(
      { error: "Listing conversations not yet implemented" },
      request,
      501
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
export async function OPTIONS(request: Request): Promise<Response> {
  return handlePreflight(request);
}