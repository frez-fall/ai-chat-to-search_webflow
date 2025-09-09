'use client';

import React, { useState } from 'react';
import QuickSearchWidget from '@/components/QuickSearchWidget';
import ChatModal from '@/components/ChatModal';
import ChatTriggerButton from '@/components/ChatTriggerButton';
import DestinationCards from '@/components/DestinationCards';
import { Plane, Globe, Shield, Clock } from 'lucide-react';

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState<string>('');

  const handleSearch = (query: string) => {
    setInitialQuery(query);
    setIsChatOpen(true);
  };

  const handleOpenChat = () => {
    setInitialQuery('');
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
              onOpenChat={handleOpenChat}
            />
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-3">
                <Plane className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">AI-Powered Search</h3>
              <p className="text-sm text-gray-600">Natural language flight search</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-3">
                <Globe className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Global Coverage</h3>
              <p className="text-sm text-gray-600">Flights to anywhere in the world</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full p-4 w-16 h-16 mx-auto mb-3">
                <Shield className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Secure Booking</h3>
              <p className="text-sm text-gray-600">Book with confidence</p>
            </div>
            <div className="text-center">
              <div className="bg-orange-100 rounded-full p-4 w-16 h-16 mx-auto mb-3">
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Real-Time Updates</h3>
              <p className="text-sm text-gray-600">Live flight information</p>
            </div>
          </div>
        </div>
      </div>

      {/* Popular Destinations */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Popular Destinations
          </h2>
          <p className="text-lg text-gray-600">
            Get inspired by our most searched routes
          </p>
        </div>
        <DestinationCards onSelectDestination={handleSearch} />
      </div>

      {/* Chat Modal */}
      <ChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        initialQuery={initialQuery}
        onBookingUrlGenerated={handleBookingUrlGenerated}
      />

      {/* Chat Trigger Button */}
      <ChatTriggerButton onClick={handleOpenChat} />

      {/* Footer */}
      <footer className="bg-gray-50 border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500">
            <p>© 2025 AI Flight Search. Powered by Paylater Travel.</p>
            <p className="mt-2">
              Built with Next.js, AI SDK, and OpenAI GPT-4
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}