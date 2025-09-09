/**
 * Quick Search Widget Component
 * Simplified search interface for homepage
 */

'use client';

import React, { useState } from 'react';
import { Search, MapPin, Calendar, Users, ArrowRight, Sparkles } from 'lucide-react';

interface QuickSearchWidgetProps {
  onSearch: (query: string) => void;
  onOpenChat: () => void;
}

export default function QuickSearchWidget({ onSearch, onOpenChat }: QuickSearchWidgetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ai' | 'traditional'>('ai');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (activeTab === 'ai') {
        onSearch(searchQuery);
      } else {
        // Traditional search would go to existing booking system
        window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
      }
    }
  };

  const popularSearches = [
    "Weekend in Paris",
    "Bali honeymoon next month",
    "Business trip to Singapore",
    "Family vacation to Orlando",
    "Cheap flights to Bangkok",
    "Tokyo cherry blossom season",
  ];

  const handlePopularSearch = (search: string) => {
    setSearchQuery(search);
    onSearch(search);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-4xl mx-auto">
      {/* Tab switcher */}
      <div className="flex items-center justify-center mb-6">
        <div className="bg-gray-100 rounded-lg p-1 inline-flex">
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'ai'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4" />
              <span>AI Search</span>
            </span>
          </button>
          <button
            onClick={() => setActiveTab('traditional')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'traditional'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="flex items-center space-x-2">
              <Search className="w-4 h-4" />
              <span>Traditional</span>
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'ai' ? (
        <div className="space-y-6">
          {/* AI Search */}
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Where do you want to go?
            </h2>
            <p className="text-gray-600">
              Tell me your travel plans in your own words
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Try: 'Beach vacation in July for 2 weeks' or 'Cheapest flights to Europe'"
                className="w-full px-6 py-4 pr-12 text-lg border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* AI Features */}
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
              <span className="flex items-center space-x-1">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                <span>Natural language</span>
              </span>
              <span className="flex items-center space-x-1">
                <Search className="w-4 h-4 text-blue-500" />
                <span>Smart suggestions</span>
              </span>
              <span className="flex items-center space-x-1">
                <Calendar className="w-4 h-4 text-green-500" />
                <span>Flexible dates</span>
              </span>
            </div>
          </form>

          {/* Popular searches */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Popular searches:</p>
            <div className="flex flex-wrap gap-2">
              {popularSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handlePopularSearch(search)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                >
                  {search}
                </button>
              ))}
            </div>
          </div>

          {/* Chat option */}
          <div className="text-center pt-4 border-t">
            <button
              onClick={onOpenChat}
              className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              <Sparkles className="w-5 h-5" />
              <span>Or have a conversation with our AI assistant</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Traditional Search */}
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Search Flights
            </h2>
            <p className="text-gray-600">
              Use our traditional search form
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* From */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">From</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="City or airport"
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* To */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">To</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="City or airport"
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Dates</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Departure - Return"
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Passengers */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Passengers</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                  <option>1 Adult</option>
                  <option>2 Adults</option>
                  <option>3 Adults</option>
                  <option>4+ Adults</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="submit"
              className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Search className="w-5 h-5" />
              <span>Search Flights</span>
            </button>
          </div>

          {/* Switch to AI */}
          <div className="text-center pt-4 border-t">
            <button
              onClick={() => setActiveTab('ai')}
              className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              <Sparkles className="w-5 h-5" />
              <span>Try our new AI-powered search</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}