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
import { withCors, handlePreflight } from "@/lib/cors";

/** Shape we accept for incoming multi-city segments in PUT */
type IncomingSegment = {
  origin_code: string;
  origin_name: string;
  destination_code: string;
  destination_name: string;
  departure_date: string;
};

/** Recompute completeness based on current params */
function computeIsComplete(p: SearchParameters | null | undefined): boolean {
  if (!p) return false;

  const hasBasic =
    Boolean(p.origin_code) &&
    Boolean(p.destination_code) &&
    Boolean(p.departure_date);

  switch (p.trip_type) {
    case "oneway":
      return hasBasic;
    case "return":
      return hasBasic && Boolean(p.return_date);
    case "multicity": {
      const count = Array.isArray(p.multi_city_segments)
        ? p.multi_city_segments.length
        : 0;
      return hasBasic && count >= 2;
    }
    default:
      return hasBasic;
  }
}

// ---------- GET ----------

export async function GET(
  request: Request,
  ctx: { params: { conversationId: string } }
): Promise<Response> {
  try {
    const { conversationId } = ctx.params;

    // Must have a conversation
    const conversation = await db.getConversation(conversationId);
    if (!conversation) {
      return withCors({ error: "Conversation not found" }, request, 404);
    }

    const searchParams = (await db.getSearchParameters(
      conversationId
    )) as SearchParameters | null;

    if (!searchParams) {
      return withCors({ error: "Search parameters not found" }, request, 404);
    }

    const isComplete = Boolean(searchParams.is_complete);

    const booking_url = isComplete
      ? urlGenerator.generateBookingURL(searchParams, {
          utm_source: "chat",
          utm_medium: "ai",
          utm_campaign: "natural_language_search",
        })
      : undefined;

    const shareable_url = isComplete
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

    // Validate payload
    const raw = (await request.json()) as unknown;
    const body: UpdateSearchParametersInput =
      UpdateSearchParametersSchema.parse(raw);

    // Conversation must exist & be active
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

    // Ensure there are parameters to update
    const existingParams = (await db.getSearchParameters(
      conversationId
    )) as SearchParameters | null;
    if (!existingParams) {
      return withCors({ error: "Search parameters not found" }, request, 404);
    }

    // Update base params
    const updatedParams = (await db.updateSearchParameters(
      conversationId,
      body
    )) as SearchParameters;

    // Replace multi-city segments if trip_type is multicity AND segments provided
    if (
      body.trip_type === "multicity" &&
      Array.isArray(body.multi_city_segments)
    ) {
      if (!updatedParams.id) {
        return withCors(
          { error: "Updated search parameters are missing an id" },
          request,
          500
        );
      }

      const incoming: IncomingSegment[] = body.multi_city_segments.map((s) => ({
        origin_code: s.origin_code,
        origin_name: s.origin_name,
        destination_code: s.destination_code,
        destination_name: s.destination_name,
        departure_date: s.departure_date,
      }));

      // Replace existing segments
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

    // Re-fetch to compute final completeness & URLs consistently
    const finalParams = (await db.getSearchParameters(
      conversationId
    )) as SearchParameters | null;

    const isComplete = computeIsComplete(finalParams);

    if (finalParams && isComplete !== Boolean(finalParams.is_complete)) {
      await db.updateSearchParameters(conversationId, {
        is_complete: isComplete,
      });
    }

    let booking_url: string | undefined;
    if (isComplete && finalParams) {
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

    const shareable_url =
      isComplete && finalParams
        ? urlGenerator.generateShareableURL(finalParams)
        : undefined;

    return withCors(
      {
        conversation_id: conversationId,
        parameters: finalParams,
        booking_url,
        shareable_url,
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