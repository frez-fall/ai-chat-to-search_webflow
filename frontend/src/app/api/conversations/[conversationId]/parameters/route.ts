/**
 * Search Parameters API Endpoints
 * GET /api/conversations/:conversationId/parameters
 * PUT /api/conversations/:conversationId/parameters
 */

import { z } from "zod";
import { db } from "@/services/database";
import {
  UpdateSearchParametersSchema,
  type SearchParameters,
  type UpdateSearchParametersInput,
} from "@/models/search-parameters";
import { urlGenerator } from "@/lib/url-generator";
import { withCors, preflight } from "@/lib/cors";

// For strong typing of incoming multi-city segments in the PUT body
type IncomingSegment = {
  origin_code: string;
  origin_name: string;
  destination_code: string;
  destination_name: string;
  departure_date: string;
};

function computeIsComplete(p: SearchParameters | null | undefined): boolean {
  if (!p) return false;

  const hasBasic =
    Boolean(p.origin_code) && Boolean(p.destination_code) && Boolean(p.departure_date);

  if (p.trip_type === "oneway") return hasBasic;
  if (p.trip_type === "return") return hasBasic && Boolean(p.return_date);
  if (p.trip_type === "multicity") {
    const count =
      Array.isArray(p.multi_city_segments) ? p.multi_city_segments.length : 0;
    return hasBasic && count >= 2;
  }

  // Default fallback
  return hasBasic;
}

export async function GET(
  request: Request,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { conversationId } = params;

    // Check conversation
    const conversation = await db.getConversation(conversationId);
    if (!conversation) {
      return withCors({ error: "Conversation not found" }, request, 404);
    }

    // Get current parameters
    const searchParams = await db.getSearchParameters(conversationId);
    if (!searchParams) {
      return withCors({ error: "Search parameters not found" }, request, 404);
    }

    // Precompute URLs if complete
    const isComplete = Boolean(searchParams.is_complete);
    const booking_url = isComplete
      ? urlGenerator.generateBookingURL(searchParams, {
          utm_source: "chat",
          utm_medium: "ai",
          utm_campaign: "natural_language_search",
        })
      : undefined;

    const shareable_url =
      isComplete ? urlGenerator.generateShareableURL(searchParams) : undefined;

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

export async function PUT(
  request: Request,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { conversationId } = params;

    // Validate input body
    const raw = (await request.json()) as unknown;
    const validatedBody: UpdateSearchParametersInput =
      UpdateSearchParametersSchema.parse(raw);

    // Check conversation
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

    // Ensure existing params
    const existingParams = await db.getSearchParameters(conversationId);
    if (!existingParams) {
      return withCors({ error: "Search parameters not found" }, request, 404);
    }

    // Update base parameters
    const updatedParams = await db.updateSearchParameters(
      conversationId,
      validatedBody
    );

    // Handle multi-city segments if explicitly provided for multicity
    if (
      validatedBody.trip_type === "multicity" &&
      Array.isArray((validatedBody as any).multi_city_segments)
    ) {
      if (!updatedParams.id) {
        return withCors(
          { error: "Updated search parameters do not have an id" },
          request,
          500
        );
      }

      const incoming: IncomingSegment[] = (validatedBody as any)
        .multi_city_segments;

      // Replace segments
      await db.deleteMultiCitySegments(updatedParams.id);

      const segments = incoming.map((seg, index) => ({
        search_params_id: updatedParams.id as string,
        sequence_order: index + 1,
        origin_code: seg.origin_code,
        origin_name: seg.origin_name,
        destination_code: seg.destination_code,
        destination_name: seg.destination_name,
        departure_date: seg.departure_date,
      }));

      await db.createMultiCitySegments(segments);
    }

    // Re-fetch final params to compute completeness/URLs consistently
    const finalParams = (await db.getSearchParameters(
      conversationId
    )) as SearchParameters | null;

    const isComplete = computeIsComplete(finalParams);

    if (finalParams && isComplete !== Boolean(finalParams.is_complete)) {
      await db.updateSearchParameters(conversationId, { is_complete: isComplete });
    }

    let generatedUrl: string | undefined;
    if (isComplete && finalParams) {
      generatedUrl = urlGenerator.generateBookingURL(finalParams, {
        utm_source: "chat",
        utm_medium: "ai",
        utm_campaign: "natural_language_search",
      });

      await db.updateConversation(conversationId, {
        generated_url: generatedUrl,
        current_step: "complete",
      });
    }

    const shareable_url =
      isComplete && finalParams
        ? urlGenerator.generateShareableURL(finalParams)
        : undefined;

    return withCors(
      {
        conversation_id: conversationId,
        parameters: finalParams,
        booking_url: generatedUrl,
        shareable_url,
        is_complete: isComplete,
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

// OPTIONS (CORS preflight)
export async function OPTIONS(request: Request) {
  return preflight(request);
}