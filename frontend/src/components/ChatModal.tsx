/**
 * Chat Modal Component
 * Main chat interface for flight search
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Plane, MapPin, Calendar, Users, Loader2 } from 'lucide-react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { useChat } from '../hooks/useChat';
import { useFlightSearch } from '../hooks/useFlightSearch';
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  
  const { sendMessage, createConversation, streamMessage } = useChat();
  const { parseFlightQuery } = useFlightSearch();

  // Initialize conversation
  useEffect(() => {
    if (isOpen && !conversationId) {
      initializeConversation();
    }
  }, [isOpen]);

  // Scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle initial query
  useEffect(() => {
    if (conversationId && initialQuery && messages.length === 0) {
      // Add user message immediately
      const userMessage: Message = {
        id: `user-init-${Date.now()}`,
        role: 'user',
        content: initialQuery,
        timestamp: new Date().toISOString(),
      };
      setMessages([userMessage]);
      
      // Then process the AI response
      handleInitialQuery(initialQuery);
    }
  }, [conversationId, initialQuery]);

  const initializeConversation = async () => {
    try {
      setIsLoading(true);
      const response = await createConversation(initialQuery);
      setConversationId(response.conversation_id);
      
      // Only add initial greeting if there's no initial query
      if (!initialQuery) {
        setMessages([{
          id: '1',
          role: 'assistant',
          content: response.initial_message,
          timestamp: new Date().toISOString(),
        }]);
      }
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
      setMessages([{
        id: 'error',
        role: 'system',
        content: 'Sorry, I encountered an error starting the conversation. Please try again.',
        timestamp: new Date().toISOString(),
      }]);
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
      
      // Add assistant message
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.ai_response.content,
        timestamp: new Date().toISOString(),
        metadata: response.ai_response.extracted_params,
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Update search parameters
      if (response.search_parameters) {
        setSearchParams(response.search_parameters);
      }
      
      // Handle generated URL
      if (response.generated_url) {
        setBookingUrl(response.generated_url);
        onBookingUrlGenerated?.(response.generated_url);
        
        // Add success message
        setMessages(prev => [...prev, {
          id: `success-${Date.now()}`,
          role: 'system',
          content: `Great! I've found flights for you. Click the button below to view and book your flights.`,
          timestamp: new Date().toISOString(),
          metadata: { url: response.generated_url },
        }]);
      }
    } catch (error) {
      console.error('Failed to process initial query:', error);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'system',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!conversationId || !content.trim() || isLoading) return;

    // Add user message
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
      // Check if streaming is preferred
      const useStreaming = localStorage.getItem('preferStreaming') === 'true';
      
      if (useStreaming) {
        // Stream response
        await streamMessage(conversationId, content, (chunk) => {
          // Handle streaming chunks
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
              return [
                ...prev.slice(0, -1),
                { ...lastMessage, content: lastMessage.content + chunk },
              ];
            } else {
              return [...prev, {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: chunk,
                timestamp: new Date().toISOString(),
                isStreaming: true,
              }];
            }
          });
        });
      } else {
        // Regular response
        const response = await sendMessage(conversationId, content);
        
        // Add assistant message
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.ai_response.content,
          timestamp: new Date().toISOString(),
          metadata: response.ai_response.extracted_params,
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        // Update search parameters
        if (response.search_parameters) {
          setSearchParams(response.search_parameters);
        }
        
        // Handle generated URL
        if (response.generated_url) {
          setBookingUrl(response.generated_url);
          onBookingUrlGenerated?.(response.generated_url);
          
          // Add success message
          setMessages(prev => [...prev, {
            id: `success-${Date.now()}`,
            role: 'system',
            content: `Great! I've found flights for you. Click the button below to view and book your flights.`,
            timestamp: new Date().toISOString(),
            metadata: { url: response.generated_url },
          }]);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'system',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleClose = () => {
    if (bookingUrl) {
      const confirmClose = window.confirm(
        'You have a booking URL ready. Are you sure you want to close?'
      );
      if (!confirmClose) return;
    }
    onClose();
  };

  const handleBookingClick = () => {
    if (bookingUrl) {
      window.open(bookingUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col animate-slide-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Plane className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Flight Search Assistant</h2>
              <p className="text-sm text-gray-500">Tell me where you want to go</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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

        {/* Booking Button */}
        {bookingUrl && (
          <div className="px-6 py-3 border-t bg-green-50">
            <button
              onClick={handleBookingClick}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Plane className="w-5 h-5" />
              <span>View & Book Flights</span>
            </button>
          </div>
        )}

        {/* Input */}
        <div className="p-6 border-t">
          <MessageInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            placeholder={
              messages.length === 1
                ? "Try: 'Flights from New York to Tokyo next month'"
                : "Ask me anything about your flight search..."
            }
          />
        </div>
      </div>
    </div>
  );
}