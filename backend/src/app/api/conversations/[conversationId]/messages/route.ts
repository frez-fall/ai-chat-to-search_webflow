/**
 * Messages API Endpoints
 * POST /api/conversations/:conversationId/messages - Send message
 * GET /api/conversations/:conversationId/messages - Get message history
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/services/database';
import { chatEngine } from '@/lib/chat-engine';
import { FlightParser } from '@/lib/flight-parser';
import { urlGenerator } from '@/lib/url-generator';
import type { SearchParameters } from '@/models/search-parameters';

const SendMessageRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  user_location: z.string().optional(),
});

interface Params {
  params: {
    conversationId: string;
  };
}

// Single source of truth for "complete"
function isParamsComplete(p: SearchParameters): boolean {
  const hasOrigin = !!p.origin_code;
  const hasDestination = !!p.destination_code;
  const hasDeparture = !!p.departure_date;
  const hasReturn = p.trip_type !== 'return' || !!p.return_date;
  const hasMulti = p.trip_type !== 'multicity' || ((p.multi_city_segments?.length ?? 0) >= 2);
  return hasOrigin && hasDestination && hasDeparture && hasReturn && hasMulti;
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { conversationId } = params;
    const body = await request.json();
    const validatedBody = SendMessageRequestSchema.parse(body);

    // Conversation must exist & be active
    const conversation = await db.getConversation(conversationId);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    if (conversation.status !== 'active') {
      return NextResponse.json({ error: 'Conversation is no longer active' }, { status: 400 });
    }

    // Save user message
    await db.createMessage({
      conversation_id: conversationId,
      role: 'user',
      content: validatedBody.message,
    });

    // Get history + current params
    const messages = await db.getMessages(conversationId);
    const currentParams = await db.getSearchParameters(conversationId);

    // Parse flight info (optional helper)
    const parsedFlight = await FlightParser.parseFlightQuery(
      validatedBody.message,
      {
        user_location: validatedBody.user_location,
        previous_searches: messages
          .filter(m => m.role === 'user')
          .map(m => m.content)
          .slice(-3),
      }
    );

    // Generate AI response (with extraction via tools)
    const aiResponse = await chatEngine.generateResponse(
      validatedBody.message,
      messages,
      currentParams || undefined,
      { user_location: validatedBody.user_location }
    );

    // Save assistant message
    await db.createMessage({
      conversation_id: conversationId,
      role: 'assistant',
      content: aiResponse.content,
      metadata: {
        extracted_params: aiResponse.extracted_params,
        parsed_flight: parsedFlight,
        requires_clarification: aiResponse.requires_clarification,
      },
    });

    // Merge + persist parameters if we extracted anything and we have a row to update
    if (aiResponse.extracted_params && currentParams) {
      const merged = chatEngine.mergeParameters(aiResponse.extracted_params, currentParams);
      // Persist merged fields first
      await db.updateSearchParameters(conversationId, merged);

      // Now re-fetch the authoritative params (includes multi_city_segments joins)
      const finalParams = await db.getSearchParameters(conversationId);
      let generatedUrl: string | undefined;

      if (finalParams) {
        const complete = isParamsComplete(finalParams);

        // Keep the boolean in sync with reality
        if (finalParams.is_complete !== complete) {
          await db.updateSearchParameters(conversationId, { is_complete: complete });
          // refresh after toggle (optional, but safer)
        }

        if (complete) {
          generatedUrl = urlGenerator.generateBookingURL(finalParams, {
            utm_source: 'chat',
            utm_medium: 'ai',
            utm_campaign: 'natural_language_search',
          });

          await db.updateConversation(conversationId, {
            generated_url: generatedUrl,
            current_step: 'complete',
            status: 'completed',
          });
        } else if (aiResponse.next_step) {
          await db.updateConversation(conversationId, {
            current_step:
              aiResponse.next_step === 'collecting'
                ? 'collecting'
                : aiResponse.next_step === 'confirming'
                ? 'confirming'
                : 'complete',
          });
        }

        // Respond with refreshed state
        const updatedConversation = await db.getConversation(conversationId);
        const refreshedParams = await db.getSearchParameters(conversationId);

        return NextResponse.json({
          message_id: messages.length + 2,
          ai_response: aiResponse,
          parsed_flight: parsedFlight,
          search_parameters: refreshedParams,
          generated_url: updatedConversation?.generated_url ?? generatedUrl,
          conversation_status: updatedConversation?.status,
          conversation_step: updatedConversation?.current_step,
        });
      }
    }

    // Fallback response if no params row yet (e.g., first message before params created)
    const updatedConversation = await db.getConversation(conversationId);
    const refreshedParams = await db.getSearchParameters(conversationId);

    return NextResponse.json({
      message_id: messages.length + 2,
      ai_response: aiResponse,
      parsed_flight: parsedFlight,
      search_parameters: refreshedParams,
      generated_url: updatedConversation?.generated_url,
      conversation_status: updatedConversation?.status,
      conversation_step: updatedConversation?.current_step,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { conversationId } = params;

    const conversation = await db.getConversation(conversationId);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const messages = await db.getMessages(conversationId);

    return NextResponse.json({
      conversation_id: conversationId,
      messages: messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        metadata: msg.metadata,
      })),
      total: messages.length,
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}