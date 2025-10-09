/**
 * Chat Modal Component
 * Main chat interface for flight search
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Plane, Clock, MessageSquare, Loader2 } from 'lucide-react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { useChat } from '../hooks/useChat';
import { conversationStore } from '../lib/conversation-store';
import type { Message } from '../types/chat';
import type { SearchParameters } from '../types/search';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  onBookingUrlGenerated?: (url: string) => void;
}

export default function ChatModal({
  isOpen,
  onClose,
  initialQuery,
  onBookingUrlGenerated,
}: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<SearchParameters | null>(null);
  const [bookingUrl, setBookingUrl] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState<number>(0);
  const [isRestoringSession, setIsRestoringSession] = useState(false);
  const [localInitialQuery, setLocalInitialQuery] = useState<string | undefined>(initialQuery);
  const [isNewSearch, setIsNewSearch] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);

  // :white_check_mark: NEW: ensure we only auto-send once per modal open
  const autoSentRef = useRef(false);

  const { sendMessage, createConversation, streamMessage } = useChat();

  // Keep local copy of initialQuery unless starting a new search
  useEffect(() => {
    if (!isNewSearch) {
      setLocalInitialQuery(initialQuery);
    }
  }, [initialQuery, isNewSearch]);

  // Initialize or restore conversation on open
  useEffect(() => {
    if (isOpen) {
      const existingState = conversationStore.initialize();

      if (existingState && existingState.conversationId && !localInitialQuery && !isNewSearch) {
        // Restore existing session
        setIsRestoringSession(true);
        setConversationId(existingState.conversationId);

        const restoredMessages = [...existingState.messages];
        if (existingState.bookingUrl) {
          const timeRemaining = conversationStore.getSessionTimeRemaining();
          const minutes = Math.floor(timeRemaining / 60);

          restoredMessages.push({
            id: `welcome-back-${Date.now()}`,
            role: 'assistant',
            content: `Welcome back! I still have your flight search ready. You have ${minutes} minutes remaining in this session.\n\nWould you like to modify your search or look for different flights?`,
            timestamp: new Date().toISOString(),
          });
        }

        setMessages(restoredMessages);
        setSearchParams(existingState.searchParams);
        setBookingUrl(existingState.bookingUrl);
        setIsRestoringSession(false);

        conversationStore.updateActivity();
      } else if (!conversationId) {
        // Brand new conversation
        initializeConversation();
      }

      if (isNewSearch) {
        setIsNewSearch(false);
      }

      startSessionTimer();
    } else {
      // Closing modal — reset auto-send so next open can send again
      autoSentRef.current = false;

      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    }

    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll and persist state when messages change
  useEffect(() => {
    scrollToBottom();

    if (conversationId && messages.length > 0) {
      conversationStore.save({
        conversationId,
        messages,
        searchParams,
        bookingUrl,
      });
    }
  }, [messages, conversationId, searchParams, bookingUrl]);

  // :white_check_mark: Auto-send initial query once per open, even if messages already exist
  useEffect(() => {
    if (!isOpen) return;
    if (!conversationId) return;
    const q = (localInitialQuery || '').trim();
    if (!q) return;
    if (isNewSearch) return;

    if (!autoSentRef.current) {
      autoSentRef.current = true;

      // Optimistic echo if not already last message
      const last = messages[messages.length - 1];
      const shouldShowOptimistic =
        !last || !(last.role === 'user' && last.content.trim() === q);

      if (shouldShowOptimistic) {
        const userMessage: Message = {
          id: `user-init-${Date.now()}`,
          role: 'user',
          content: q,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, userMessage]);
      }

      // Use your existing flow to process
      handleInitialQuery(q);
    }
  }, [isOpen, conversationId, localInitialQuery, isNewSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const initializeConversation = async () => {
    try {
      setIsLoading(true);
      const queryToUse = isNewSearch ? undefined : localInitialQuery;
      const response = await createConversation(queryToUse);
      setConversationId(response.conversation_id);

      // If no initial query (or new search), show greeting
      if (!queryToUse || isNewSearch) {
        setMessages([
          {
            id: '1',
            role: 'assistant',
            content: response.initial_message,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
      setMessages([
        {
          id: 'error',
          role: 'system',
          content: 'Sorry, I encountered an error starting the conversation. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitialQuery = async (query: string) => {
    if (!conversationId) return;

    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await sendMessage(conversationId, query);

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.ai_response.content,
        timestamp: new Date().toISOString(),
        metadata: response.ai_response.extracted_params,
      };
      setMessages(prev => [...prev, assistantMessage]);

      if (response.search_parameters) {
        setSearchParams(response.search_parameters);
      }

      if (response.generated_url) {
        setBookingUrl(response.generated_url);
        onBookingUrlGenerated?.(response.generated_url);

        const passengerSummary = [
          response.search_parameters?.adults &&
            `${response.search_parameters.adults} adult${
              response.search_parameters.adults > 1 ? 's' : ''
            }`,
          response.search_parameters?.children &&
            response.search_parameters.children > 0 &&
            `${response.search_parameters.children} child${
              response.search_parameters.children > 1 ? 'ren' : ''
            }`,
          response.search_parameters?.infants &&
            response.search_parameters.infants > 0 &&
            `${response.search_parameters.infants} infant${
              response.search_parameters.infants > 1 ? 's' : ''
            }`,
        ]
          .filter(Boolean)
          .join(', ');

        setMessages(prev => [
          ...prev,
          {
            id: `success-${Date.now()}`,
            role: 'system',
            content: `✈️ Perfect! I've found flights for you:\n\n📍: ${
              response.search_parameters?.origin_name ||
              response.search_parameters?.origin_code
            } → ${
              response.search_parameters?.destination_name ||
              response.search_parameters?.destination_code
            }\n👥${passengerSummary}\n📅 ${response.search_parameters?.departure_date}${
              response.search_parameters?.return_date
                ? ` - ${response.search_parameters?.return_date}`
                : ' (One-way)'
            }\n\nClick the button below to view and book your flights.\n\nWant to adjust dates, change destinations, or search for different flights? Just let me know!`,
            timestamp: new Date().toISOString(),
            metadata: { url: response.generated_url },
          },
        ]);
      }
    } catch (error: any) {
      console.error(
        'Failed to process initial query:',
        error?.status || '',
        error?.message || error
      );
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'system',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!conversationId || !content.trim() || isLoading) return;

    conversationStore.updateActivity();

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setIsTyping(true);

    try {
      const useStreaming = localStorage.getItem('preferStreaming') === 'true';

      if (useStreaming) {
        await streamMessage(conversationId, content, chunk => {
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.role === 'assistant' && (lastMessage as any).isStreaming) {
              return [
                ...prev.slice(0, -1),
                { ...lastMessage, content: lastMessage.content + chunk },
              ];
            } else {
              return [
                ...prev,
                {
                  id: `assistant-${Date.now()}`,
                  role: 'assistant',
                  content: chunk,
                  timestamp: new Date().toISOString(),
                  isStreaming: true as any,
                } as Message,
              ];
            }
          });
        });
      } else {
        const response = await sendMessage(conversationId, content);

        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.ai_response.content,
          timestamp: new Date().toISOString(),
          metadata: response.ai_response.extracted_params,
        };
        setMessages(prev => [...prev, assistantMessage]);

        retryCountRef.current = 0;

        if (response.search_parameters) {
          setSearchParams(response.search_parameters);
        }

        if (response.generated_url) {
          setBookingUrl(response.generated_url);
          onBookingUrlGenerated?.(response.generated_url);

          const passengerSummary = [
            response.search_parameters?.adults &&
              `${response.search_parameters.adults} adult${
                response.search_parameters.adults > 1 ? 's' : ''
              }`,
            response.search_parameters?.children &&
              response.search_parameters.children > 0 &&
              `${response.search_parameters.children} child${
                response.search_parameters.children > 1 ? 'ren' : ''
              }`,
            response.search_parameters?.infants &&
              response.search_parameters.infants > 0 &&
              `${response.search_parameters.infants} infant${
                response.search_parameters.infants > 1 ? 's' : ''
              }`,
          ]
            .filter(Boolean)
            .join(', ');

          setMessages(prev => [
            ...prev,
            {
              id: `success-${Date.now()}`,
              role: 'system',
              content: `:airplane: Perfect! I've found flights for you:\n\n:round_pushpin: ${
                response.search_parameters?.origin_name ||
                response.search_parameters?.origin_code
              } → ${
                response.search_parameters?.destination_name ||
                response.search_parameters?.destination_code
              }\n:busts_in_silhouette: ${passengerSummary}\n:date: ${response.search_parameters?.departure_date}${
                response.search_parameters?.return_date
                  ? ` - ${response.search_parameters?.return_date}`
                  : ' (One-way)'
              }\n\nClick the button below to view and book your flights.\n\nWant to adjust dates, change destinations, or search for different flights? Just let me know!`,
              timestamp: new Date().toISOString(),
              metadata: { url: response.generated_url },
            },
          ]);
        }
      }
    } catch (error: any) {
      console.error('Failed to send message:', error);

      if (error.status === 400 || error.status === 404) {
        if (retryCountRef.current >= 2) {
          console.error('Max retries reached, stopping retry attempts');
          setMessages(prev => [
            ...prev,
            {
              id: `error-${Date.now()}`,
              role: 'system',
              content:
                'Sorry, I encountered an error connecting to the service. Please refresh the page and try again.',
              timestamp: new Date().toISOString(),
            },
          ]);
          retryCountRef.current = 0;
          return;
        }

        retryCountRef.current++;
        conversationStore.clearIfMatches(conversationId);

        setMessages(prev => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'system',
            content: 'Your previous session has expired. Starting a new conversation...',
            timestamp: new Date().toISOString(),
          },
        ]);

        const oldConversationId = conversationId;
        setConversationId(null);
        setSearchParams(null);
        setBookingUrl(null);

        try {
          setIsLoading(true);
          const response = await createConversation();
          const newConversationId = response.conversation_id;
          setConversationId(newConversationId);

          setMessages([
            {
              id: '1',
              role: 'assistant',
              content: response.initial_message,
              timestamp: new Date().toISOString(),
            },
          ]);

          if (newConversationId && newConversationId !== oldConversationId) {
            setTimeout(async () => {
              try {
                const retryResponse = await sendMessage(newConversationId, content);

                const assistantMessage: Message = {
                  id: `assistant-${Date.now()}`,
                  role: 'assistant',
                  content: retryResponse.ai_response.content,
                  timestamp: new Date().toISOString(),
                  metadata: retryResponse.ai_response.extracted_params,
                };
                setMessages(prev => [...prev, assistantMessage]);

                retryCountRef.current = 0;

                if (retryResponse.search_parameters) {
                  setSearchParams(retryResponse.search_parameters);
                }

                if (retryResponse.generated_url) {
                  setBookingUrl(retryResponse.generated_url);
                  onBookingUrlGenerated?.(retryResponse.generated_url);
                }
              } catch (retryError) {
                console.error('Retry failed:', retryError);
                setMessages(prev => [
                  ...prev,
                  {
                    id: `error-${Date.now()}`,
                    role: 'system',
                    content:
                      'Sorry, I encountered an error. Please try again or start a new search.',
                    timestamp: new Date().toISOString(),
                  },
                ]);
              }
            }, 1000);
          }
        } catch (initError) {
          console.error('Failed to initialize new conversation:', initError);
          setMessages(prev => [
            ...prev,
            {
              id: `error-${Date.now()}`,
              role: 'system',
              content: 'Sorry, I could not start a new conversation. Please refresh and try again.',
              timestamp: new Date().toISOString(),
            },
          ]);
        }
        return;
      }

      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'system',
          content: 'Sorry, I encountered an error processing your message. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleClose = () => {
    if (bookingUrl && messages.length > 2) {
      const timeRemaining = conversationStore.getSessionTimeRemaining();
      const minutes = Math.floor(timeRemaining / 60);

      const confirmMessage = `Your flight search is ready! You can come back to this conversation for the next ${minutes} minutes.\n\nWould you like to close for now?`;

      const confirmClose = window.confirm(confirmMessage);
      if (!confirmClose) return;
    }

    onClose();
  };

  const handleStartNewSearch = () => {
    conversationStore.clear();
    setConversationId(null);
    setMessages([]);
    setSearchParams(null);
    setBookingUrl(null);
    setLocalInitialQuery(undefined);
    setIsNewSearch(true);

    // reset auto-send for next open
    autoSentRef.current = false;

    initializeConversation();
  };

  const startSessionTimer = () => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
    }

    sessionTimerRef.current = setInterval(() => {
      const timeRemaining = conversationStore.getSessionTimeRemaining();
      setSessionTimeRemaining(timeRemaining);

      if (timeRemaining <= 0) {
        conversationStore.clear();
        if (sessionTimerRef.current) {
          clearInterval(sessionTimerRef.current);
        }
      }
    }, 1000);
  };

  const handleNewSearch = () => {
    conversationStore.clear();
    setConversationId(null);
    setMessages([]);
    setSearchParams(null);
    setBookingUrl(null);
    setLocalInitialQuery(undefined);
    setIsNewSearch(true);
    // reset auto-send for next open
    autoSentRef.current = false;
    initializeConversation();
  };

  const handleBookingClick = () => {
    if (bookingUrl) {
      window.open(bookingUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(23, 19, 22, 0.8)' }}>
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col animate-slide-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ backgroundColor: 'var(--brand-primary-light)' }}>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--text-on-brand)' }}>
              <Plane className="w-6 h-6" style={{ color: 'var(--brand-primary)' }} />
            </div>
            <div>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Paylater Travel's Flight Assistant</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Tell me where you want to go</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg transition-colors hover:opacity-80"
            aria-label="Close chat"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <MessageList messages={messages} isTyping={isTyping} />
          <div ref={messagesEndRef} />
        </div>

        {/* Booking + Timer */}
        {bookingUrl && (
          <div className="px-6 py-3 border-t space-y-2" style={{ backgroundColor: 'var(--brand-primary-light)' }}>
            <button
              onClick={handleBookingClick}
              className="w-full py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              style={{
                backgroundColor: 'var(--brand-secondary)',
                color: 'var(--text-on-brand)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--brand-secondary-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--brand-secondary)')}
            >
              <Plane className="w-5 h-5" />
              <span>View & Book Flights</span>
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                onClick={handleStartNewSearch}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-md transition-colors"
                style={{
                  color: 'var(--brand-primary)',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--brand-primary-light)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Start New Search</span>
              </button>

              {sessionTimeRemaining > 0 && (
                <div className="flex items-center space-x-1" style={{ color: 'var(--text-secondary)' }}>
                  <Clock className="w-4 h-4" />
                  <span className="text-xs">
                    Session: {Math.floor(sessionTimeRemaining / 60)}:
                    {String(sessionTimeRemaining % 60).padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-6 border-t">
          {isRestoringSession ? (
            <div className="flex items-center justify-center py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Restoring your conversation...
            </div>
          ) : (
            <MessageInput
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              placeholder={
                bookingUrl && !isNewSearch
                  ? 'Want to change something? Ask me!'
                  : messages.length <= 1
                  ? 'Try: Flights from New York to Tokyo next month'
                  : 'Ask me anything about your flight search...'
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}