/**
 * Streaming Chat API Endpoint (minimal v5 fix)
 * POST /api/chat/stream
 */
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { db } from '@/services/database';

const StreamChatRequestSchema = z.object({
  conversation_id: z.string().uuid(),
  message: z.string().min(1, 'Message cannot be empty'),
  user_location: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversation_id, message } = StreamChatRequestSchema.parse(body);

    // validate conversation
    const conversation = await db.getConversation(conversation_id);
    if (!conversation)
      return new Response(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });

    if (conversation.status !== 'active')
      return new Response(JSON.stringify({ error: 'Conversation is no longer active' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });

    // record user message
    await db.createMessage({
      conversation_id,
      role: 'user',
      content: message,
    });

    // stream model output
    const result = await streamText({
      model: openai('gpt-4o'),
      prompt: message,
      temperature: 0.6,
    });

    // client will receive streamed text chunks
    return result.toTextStreamResponse({
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Conversation-Id': conversation_id,
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError)
      return new Response(JSON.stringify({ error: 'Validation error', details: error.errors }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

// keep existing OPTIONS handler
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}