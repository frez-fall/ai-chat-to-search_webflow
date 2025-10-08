// /backend/src/app/api/conversations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/services/database';
import { urlGenerator } from '@/lib/url-generator';

const CreateConversationSchema = z.object({
  initial_query: z.string().optional(),
  user_id: z.string().uuid().optional(), // if you pass it
  user_location: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { initial_query } = CreateConversationSchema.parse(body);

    // 1) Create conversation
    const convo = await db.createConversation({
      user_id: body.user_id ?? 'anonymous', // or however you want to store it
    });

    // 2) IMPORTANT: create default search_parameters immediately
    await db.createSearchParameters({
      conversation_id: convo.id,
      // reasonable defaults that match your schema
      trip_type: 'return',
      adults: 1,
      children: 0,
      infants: 0,
      is_complete: false,
    });

    // 3) Initial assistant message (same as before)
    const initialMessage = `Hi! I'm your flight assistant. Tell me where you'd like to go and when, and I'll help you find flights.`;

    // Optional: if you want to seed the very first user turn with initial_query
    // keep it purely conversational (don't send to the model here)
    if (initial_query?.trim()) {
      await db.createMessage({
        conversation_id: convo.id,
        role: 'user',
        content: initial_query.trim(),
      });
    }

    return NextResponse.json({
      conversation_id: convo.id,
      initial_message: initialMessage,
    });
  } catch (err) {
    console.error('Error creating conversation:', err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  // optional health/read endpoint for conversations collection
  return NextResponse.json({ ok: true });
}