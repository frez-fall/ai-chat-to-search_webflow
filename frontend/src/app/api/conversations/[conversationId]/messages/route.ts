/**
 * Search Parameters API Endpoints
 * GET /api/conversations/:conversationId/parameters  - Get search parameters
 * PUT /api/conversations/:conversationId/parameters  - Update search parameters
 */

import { z } from "zod";
import { db } from "@/services/database";
import {
  UpdateSearchParametersSchema,
  type UpdateSearchParametersInput,
  type SearchParameters,
} from "@/models/search-parameters";
import { urlGenerator } from "@/lib/url-generator";
import { withCors, handlePreflight } from "@/lib/cors";

// ---------- GET ----------

export async function GET(
  request: Request,
  ctx: { params: { conversationId: string } }
): Promise<Response> {
  try {
    const { conversationId } = ctx.params;

    // Conversation must exist
    const conversation = await db.getConversation(conversationId);
    if (!conversation) {
      return withCors({ error: "Conversation not found" }, request, 404);
    }

    // Load parameters
    const searchParams = (await db.getSearchParameters(
      conversationId
    )) as SearchParameters | null;

    if (!searchParams) {
      return withCors({ error: "Search parameters not found" }, request, 404);
    }

    // Generate URLs when complete
    const booking_url = searchParams.is_complete
      ? urlGenerator.generateBookingURL(searchParams, {
          utm_source: "chat",
          utm_medium: "ai",
          utm_campaign: "natural_language_search",
        })
      : undefined;

    const shareable_url = searchParams.is_complete
      ? urlGenerator.generateShareableURL(searchParams)
      : undefined;

    return withCors(
      {
        conversation_id: conversationId,
        parameters: searchParams,
        booking_url,
        shareable_url,
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

// ---------- PUT ----------

export async function PUT(
  request: Request,
  ctx: { params: { conversationId: string } }
): Promise<Response> {
  try {
    const { conversationId } = ctx.params;
    const bodyUnknown = (await request.json()) as unknown;

    // Validate payload
    const validatedBody: UpdateSearchParametersInput =
      UpdateSearchParametersSchema.parse(bodyUnknown);

    // Conversation must exist and be active
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

    // Ensure parameters exist before updating
    const existingParams = (await db.getSearchParameters(
      conversationId
    )) as SearchParameters | null;
    if (!existingParams) {
      return withCors({ error: "Search parameters not found" }, request, 404);
    }

    // Update base parameters
    const updatedParams = (await db.updateSearchParameters(
      conversationId,
      validatedBody
    )) as SearchParameters;

    // Handle multi-city segments when provided
    if (
      validatedBody.trip_type === "multicity" &&
      Array.isArray(validatedBody.multi_city_segments)
    ) {
      // We need the params row id to link segments
      if (!updatedParams.id) {
        return withCors(
          {
            error:
              "Cannot update multi-city segments: missing search parameters id",
          },
          request,
          500
        );
      }

      // Replace existing segments with the new set
      await db.deleteMultiCitySegments(updatedParams.id);

      const segments = validatedBody.multi_city_segments.map(
        (seg, index: number) => ({
          search_params_id: updatedParams.id as string,
          sequence_order: index + 1,
          origin_code: seg.origin_code,
          origin_name: seg.origin_name,
          destination_code: seg.destination_code,
          destination_name: seg.destination_name,
          departure_date: seg.departure_date,
        })
      );

      await db.createMultiCitySegments(segments);
    }

    // Re-evaluate completeness
    const multiLen =
      Array.isArray(validatedBody.multi_city_segments)
        ? validatedBody.multi_city_segments.length
        : Array.isArray(updatedParams.multi_city_segments)
        ? updatedParams.multi_city_segments.length
        : 0;

    const isComplete =
      Boolean(updatedParams.origin_code) &&
      Boolean(updatedParams.destination_code) &&
      Boolean(updatedParams.departure_date) &&
      (updatedParams.trip_type !== "return" || Boolean(updatedParams.return_date)) &&
      (updatedParams.trip_type !== "multicity" || multiLen >= 2);

    if (isComplete !== updatedParams.is_complete) {
      // Store completeness flip
      await db.updateSearchParameters(conversationId, {
        is_complete: isComplete,
      });
    }

    // If complete, generate booking URL and mark conversation step
    let booking_url: string | undefined;
    if (isComplete) {
      const finalParams = (await db.getSearchParameters(
        conversationId
      )) as SearchParameters | null;
      if (finalParams) {
        booking_url = urlGenerator.generateBookingURL(finalParams, {
          utm_source: "chat",
          utm_medium: "ai",
          utm_campaign: "natural_language_search",
        });

        await db.updateConversation(conversationId, {
          generated_url: booking_url,
          current_step: "complete",
        });
      }
    }

    // Final payload
    const finalParams = (await db.getSearchParameters(
      conversationId
    )) as SearchParameters | null;

    return withCors(
      {
        conversation_id: conversationId,
        parameters: finalParams,
        booking_url,
        shareable_url:
          isComplete && finalParams
            ? urlGenerator.generateShareableURL(finalParams)
            : undefined,
        is_complete: isComplete,
      },
      request
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

// ---------- OPTIONS (CORS preflight) ----------

export async function OPTIONS(request: Request): Promise<Response> {
  return handlePreflight(request);
}