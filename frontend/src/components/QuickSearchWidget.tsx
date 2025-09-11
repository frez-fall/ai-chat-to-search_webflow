/**
 * Quick Search Widget Component
 * Simplified search interface for homepage
 */

'use client';

import React, { useState } from 'react';
import { MapPin, ArrowRight, Mountain, Snowflake, Building, Wine, ChevronDown, ChevronUp } from 'lucide-react';
// import { Search, Calendar, Users, Sparkles } from 'lucide-react'; // For traditional search - hidden for now

interface QuickSearchWidgetProps {
  onSearch: (query: string) => void;
}

export default function QuickSearchWidget({ onSearch }: QuickSearchWidgetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  // const [activeTab, setActiveTab] = useState<'ai' | 'traditional'>('ai');
  const [showDestinationToggles, setShowDestinationToggles] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery);
      // if (activeTab === 'ai') {
      //   onSearch(searchQuery);
      // } else {
      //   // Traditional search would go to existing booking system
      //   window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
      // }
    }
  };

  const destinationCategories = [
    {
      id: 'all',
      label: 'All Destinations',
      icon: MapPin,
      prompt: "I'm open to any destination! Can you help me explore different options based on my preferences and travel dates?"
    },
    {
      id: 'island',
      label: 'Island Vibes',
      icon: MapPin,
      prompt: "I'm looking for tropical island destinations with beautiful beaches and crystal clear waters. Can you help me find the perfect island getaway?"
    },
    {
      id: 'mountain',
      label: 'Mountain Views',
      icon: Mountain,
      prompt: "I want to explore mountain destinations with stunning views and outdoor activities. What mountain destinations would you recommend?"
    },
    {
      id: 'snow',
      label: 'Snowy Adventures',
      icon: Snowflake,
      prompt: "I'm interested in snowy destinations for skiing, snowboarding, or winter activities. Can you suggest some great winter destinations?"
    },
    {
      id: 'city',
      label: 'City Escapes',
      icon: Building,
      prompt: "I'm interested in vibrant city destinations with culture, nightlife, and urban experiences. Can you suggest some exciting city breaks?"
    },
    {
      id: 'wine',
      label: 'Wine Tours',
      icon: Wine,
      prompt: "I'd love to visit wine regions with vineyard tours and tastings. What are the best wine destinations you'd recommend?"
    }
  ];

  const handleDestinationToggle = (prompt: string) => {
    onSearch(prompt);
    setShowDestinationToggles(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-4xl mx-auto">
      {/* Tab switcher - hidden for now */}
      {/* <div className="flex items-center justify-center mb-6">
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
      </div> */}

      {/* {activeTab === 'ai' ? ( */}
        <div className="space-y-6">
          {/* AI Search */}
          <div className="text-center mb-4">
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Try: 'Beach vacation in July for 2 weeks' or 'Cheapest flights to Europe'"
                className="w-full px-6 py-4 pr-12 text-lg border border-gray-200 text-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* Destination Help Toggle */}
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setShowDestinationToggles(!showDestinationToggles)}
                className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <span className="underline">Not sure? Let us help you figure it out</span>
                {showDestinationToggles ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Destination Category Toggles */}
            {showDestinationToggles && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-600 mb-3 text-center">Choose a travel theme to get started:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {destinationCategories.map((category) => {
                    const IconComponent = category.icon;
                    return (
                      <button
                        key={category.id}
                        onClick={() => handleDestinationToggle(category.prompt)}
                        className={`
                          px-4 py-2 rounded-full border transition-all
                          ${category.id === 'all' 
                            ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' 
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500 hover:text-blue-600'}
                        `}
                      >
                        <span className="flex items-center space-x-2">
                          <IconComponent className="w-4 h-4" />
                          <span>{category.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </form>
        </div>
      {/* ) : (
        <div className="space-y-6">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Search Flights
            </h2>
            <p className="text-gray-600">
              Use our traditional search form
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
      )} */}
    </div>
  );
}