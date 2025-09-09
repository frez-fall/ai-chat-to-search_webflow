/**
 * Message List Component
 * Displays chat messages with appropriate styling
 */

'use client';

import React from 'react';
import { Bot, User, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import type { Message } from '../types/chat';

interface MessageListProps {
  messages: Message[];
  isTyping?: boolean;
}

export default function MessageList({ messages, isTyping }: MessageListProps) {
  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';
    const isAssistant = message.role === 'assistant';
    
    // System messages (errors, success, etc.)
    if (isSystem) {
      const isError = message.content.toLowerCase().includes('error');
      const isSuccess = message.metadata?.url;
      
      return (
        <div
          key={message.id}
          className={`flex items-start space-x-3 py-3 px-4 rounded-lg ${
            isError ? 'bg-red-50' : isSuccess ? 'bg-green-50' : 'bg-gray-50'
          }`}
        >
          <div className={`mt-1 ${
            isError ? 'text-red-600' : isSuccess ? 'text-green-600' : 'text-gray-600'
          }`}>
            {isError ? (
              <AlertCircle className="w-5 h-5" />
            ) : isSuccess ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1">
            <p className={`text-sm ${
              isError ? 'text-red-800' : isSuccess ? 'text-green-800' : 'text-gray-800'
            }`}>
              {message.content}
            </p>
          </div>
        </div>
      );
    }
    
    return (
      <div
        key={message.id}
        className={`flex items-start space-x-3 py-4 ${
          isUser ? 'flex-row-reverse space-x-reverse' : ''
        }`}
      >
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isUser ? 'ml-3' : 'mr-3'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isUser ? 'bg-blue-600' : 'bg-gray-200'
          }`}>
            {isUser ? (
              <User className="w-5 h-5 text-white" />
            ) : (
              <Bot className="w-5 h-5 text-gray-600" />
            )}
          </div>
        </div>
        
        {/* Message bubble */}
        <div className={`flex-1 max-w-[80%] ${isUser ? 'flex justify-end' : ''}`}>
          <div className={`rounded-2xl px-4 py-3 ${
            isUser 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-900'
          }`}>
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
            
            {/* Show extracted parameters for assistant messages */}
            {isAssistant && message.metadata && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs font-medium mb-2 text-gray-600">
                  Extracted information:
                </p>
                <div className="space-y-1">
                  {message.metadata.origin_code && (
                    <div className="text-xs text-gray-500">
                      From: {message.metadata.origin_name || message.metadata.origin_code}
                    </div>
                  )}
                  {message.metadata.destination_code && (
                    <div className="text-xs text-gray-500">
                      To: {message.metadata.destination_name || message.metadata.destination_code}
                    </div>
                  )}
                  {message.metadata.departure_date && (
                    <div className="text-xs text-gray-500">
                      Departure: {new Date(message.metadata.departure_date).toLocaleDateString()}
                    </div>
                  )}
                  {message.metadata.return_date && (
                    <div className="text-xs text-gray-500">
                      Return: {new Date(message.metadata.return_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Timestamp */}
          <div className={`mt-1 text-xs text-gray-400 ${
            isUser ? 'text-right' : 'text-left'
          }`}>
            {formatTimestamp(message.timestamp)}
          </div>
        </div>
      </div>
    );
  };
  
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };
  
  return (
    <div className="space-y-2">
      {messages.map(renderMessage)}
      
      {/* Typing indicator */}
      {isTyping && (
        <div className="flex items-start space-x-3 py-4">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <Bot className="w-5 h-5 text-gray-600" />
            </div>
          </div>
          <div className="bg-gray-100 rounded-2xl px-4 py-3">
            <div className="flex items-center space-x-1">
              <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
              <span className="text-sm text-gray-500">Assistant is typing...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}