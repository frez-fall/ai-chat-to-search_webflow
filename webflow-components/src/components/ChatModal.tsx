// webflow-components/src/components/ChatModal.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useApiConfig } from '../ApiConfigContext';

type Message = {
  id: string | number;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  metadata?: any;
};

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  onBookingUrlGenerated?: (url: string) => void;
}

export default function ChatModal({
  isOpen,
  onClose,
  initialQuery = '',
  onBookingUrlGenerated
}: ChatModalProps) {
  const { apiBaseUrl } = useApiConfig();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // Prevent re-sending initialQuery on re-renders / re-open
  const hasBootstrapped = useRef(false);

  // Create conversation on first need
  const ensureConversation = async (): Promise<string> => {
    if (conversationId) return conversationId;
    const res = await fetch(`${apiBaseUrl}/api/conversations`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to create conversation');
    const data = await res.json();
    setConversationId(data.id);
    return data.id;
  };

  // Push user message locally, send to backend, handle AI response
  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);

    try {
      const convId = await ensureConversation();

      // Optimistic add user message
      setMessages(prev => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          role: 'user',
          content: trimmed
        }
      ]);

      // Send to backend
      const res = await fetch(`${apiBaseUrl}/api/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed })
      });

      if (!res.ok) {
        throw new Error(`Send failed: ${res.status}`);
      }

      const data = await res.json();

      // Append assistant response
      if (data?.ai_response?.content) {
        setMessages(prev => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.ai_response.content
          }
        ]);
      }

      // If the backend generated a booking URL, surface it
      if (data?.generated_url && onBookingUrlGenerated) {
        onBookingUrlGenerated(data.generated_url);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      // Optional: surface an error message in chat
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I ran into an issue sending that. Please try again.'
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  // Auto-send initialQuery when the modal opens (once per open)
  useEffect(() => {
    if (!isOpen) {
      // reset bootstrap flag so next open can auto-send again
      hasBootstrapped.current = false;
      return;
    }
    if (hasBootstrapped.current) return;

    const q = initialQuery?.trim();
    if (q) {
      hasBootstrapped.current = true;
      setInput(''); // clear input UI
      // Immediately show the user's message and send it
      handleSend(q);
    }
  }, [isOpen, initialQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Optional: load previous messages when we get a conversationId
  useEffect(() => {
    const loadHistory = async () => {
      if (!conversationId) return;
      try {
        const res = await fetch(`${apiBaseUrl}/api/conversations/${conversationId}/messages`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.messages)) {
            setMessages(
              data.messages.map((m: any) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                timestamp: m.timestamp,
                metadata: m.metadata
              }))
            );
          }
        }
      } catch (e) {
        console.warn('Failed to fetch history:', e);
      }
    };
    loadHistory();
  }, [conversationId, apiBaseUrl]);

  // Handlers
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    await handleSend(input);
    setInput('');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden"
        style={{ maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--border-default)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            PayLater Travel — AI Flight Assistant
          </h2>
          <button
            onClick={onClose}
            className="text-sm px-2 py-1 rounded-md"
            style={{ color: 'var(--text-secondary)' }}
          >
            Close
          </button>
        </div>

        {/* Messages */}
        <div className="px-5 py-4 space-y-3 overflow-y-auto" style={{ maxHeight: '58vh' }}>
          {messages.map((m) => (
            <div key={m.id} className={`chat-message ${m.role}`}>
              <div
                className="bubble"
                style={{
                  borderRadius: '14px',
                  padding: '10px 12px',
                  background:
                    m.role === 'user'
                      ? 'rgba(17,86,249,0.12)'
                      : 'rgba(255,255,255,0.08)',
                  color:
                    m.role === 'user'
                      ? 'var(--text-primary)'
                      : 'var(--text-secondary)'
                }}
              >
                {m.content}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={onSubmit} className="px-5 pb-5 pt-2 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message…"
            className="flex-1 bg-white rounded-md px-3 py-2 border"
            style={{
              borderColor: 'var(--border-default)',
              color: '#171316'
            }}
          />
          <button
            type="submit"
            disabled={sending}
            className="px-4 py-2 rounded-md text-white"
            style={{
              background: 'var(--brand-primary)',
              opacity: sending ? 0.75 : 1
            }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}