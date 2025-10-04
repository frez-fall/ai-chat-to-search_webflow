'use client';

import { useApiConfig } from '../ApiConfigContext';

type CreateConversationResponse = {
  conversation_id: string;
  initial_message: string;
  user_id?: string;
  ai_response?: any;
};

type SendMessageResponse = {
  ai_response: {
    content: string;
    extracted_params?: any;
    requires_clarification?: boolean;
    next_step?: 'collecting' | 'confirming' | 'complete';
  };
  parsed_flight?: any;
  search_parameters?: any;
  generated_url?: string;
  conversation_status?: string;
  conversation_step?: string;
};

export function useChat() {
  const { apiBaseUrl } = useApiConfig();
  // Fail fast if not configured
  const base = (apiBaseUrl || '').trim().replace(/\/+$/, '');

  function ensureBase() {
    if (!base) {
      throw new Error(
        'Missing API Base URL. Set it in the Webflow component props (apiBaseUrl).'
      );
    }
  }

  async function createConversation(initialQuery?: string): Promise<CreateConversationResponse> {
    ensureBase();
    const res = await fetch(`${base}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Only include initial_query if provided
      body: JSON.stringify(
        initialQuery ? { initial_query: initialQuery } : {}
      ),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Create conversation failed (${res.status}): ${text}`);
    }
    return res.json();
  }

  async function sendMessage(conversationId: string, message: string): Promise<SendMessageResponse> {
    ensureBase();
    const res = await fetch(`${base}/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      (res as any).status = res.status; // so your ChatModal error handler can read error.status
      throw Object.assign(new Error(`Send message failed (${res.status}): ${text}`), { status: res.status });
    }
    return res.json();
  }

  // Optional streaming helper — use only if your UI uses streaming
  async function streamMessage(
    conversationId: string,
    message: string,
    onChunk: (text: string) => void
  ) {
    ensureBase();
    const res = await fetch(`${base}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: conversationId, message }),
    });
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      throw new Error(`Stream failed (${res.status}): ${text}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value, { stream: true }));
    }
  }

  return { createConversation, sendMessage, streamMessage };
}