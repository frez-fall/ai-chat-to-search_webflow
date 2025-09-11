'use client';

import React, { useState } from 'react';
import QuickSearchWidget from '@/components/QuickSearchWidget';
import ChatModal from '@/components/ChatModal';
import ChatTriggerButton from '@/components/ChatTriggerButton';

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState<string>('');

  const handleSearch = (query: string) => {
    setInitialQuery(query);
    setIsChatOpen(true);
  };


  const handleBookingUrlGenerated = (url: string) => {
    console.log('Booking URL generated:', url);
    // You could add analytics or other tracking here
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-600 opacity-5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Find Your Perfect Flight
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Use natural language to search for flights. Just tell us where you want to go, 
              and our AI will handle the rest.
            </p>
          </div>

          {/* Search Widget */}
          <div className="mb-16">
            <QuickSearchWidget 
              onSearch={handleSearch}
            />
          </div>
        </div>
      </div>

      {/* Chat Modal */}
      <ChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        initialQuery={initialQuery}
        onBookingUrlGenerated={handleBookingUrlGenerated}
      />

      {/* Chat Trigger Button */}
      <ChatTriggerButton onClick={() => {
        setInitialQuery('');
        setIsChatOpen(true);
      }} />
    </div>
  );
}