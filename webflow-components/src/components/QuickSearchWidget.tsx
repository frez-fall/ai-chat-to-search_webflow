/**
 * Quick Search Widget Component
 * Simplified search interface for homepage
 */

'use client';

import React, { useState } from 'react';
import { MapPin, Mountain, Snowflake, Building, Wine, ChevronDown, ChevronUp } from 'lucide-react';

interface QuickSearchWidgetProps {
  onSearch: (query: string) => void;
}

export default function QuickSearchWidget({ onSearch }: QuickSearchWidgetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDestinationToggles, setShowDestinationToggles] = useState(false);

  // :white_check_mark: Only this submit handler will trigger the modal via parent onSearch
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) onSearch(q);
  };

  const destinationCategories = [
    {
      id: 'all',
      label: 'All Destinations',
      icon: MapPin,
      prompt:
        "I'm open to any destination! Can you help me explore different options based on my preferences and travel dates?"
    },
    {
      id: 'island',
      label: 'Island Vibes',
      icon: MapPin,
      prompt:
        "I'm looking for tropical island destinations with beautiful beaches and crystal clear waters. Can you help me find the perfect island getaway?"
    },
    {
      id: 'mountain',
      label: 'Mountain Views',
      icon: Mountain,
      prompt:
        "I want to explore mountain destinations with stunning views and outdoor activities. What mountain destinations would you recommend?"
    },
    {
      id: 'snow',
      label: 'Snowy Adventures',
      icon: Snowflake,
      prompt:
        "I'm interested in snowy destinations for skiing, snowboarding, or winter activities. Can you suggest some great winter destinations?"
    },
    {
      id: 'city',
      label: 'City Escapes',
      icon: Building,
      prompt:
        "I'm interested in vibrant city destinations with culture, nightlife, and urban experiences. Can you suggest some exciting city breaks?"
    },
    {
      id: 'wine',
      label: 'Wine Tours',
      icon: Wine,
      prompt:
        "I'd love to visit wine regions with vineyard tours and tastings. What are the best wine destinations you'd recommend?"
    }
  ];

  // :white_check_mark: Suggestions now ONLY set the input value; they DO NOT call onSearch
  const handleDestinationToggle = (prompt: string) => {
    setSearchQuery(prompt);
    setShowDestinationToggles(false);
    // :x: removed: onSearch(prompt);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="space-y-6">
        {/* AI Search */}
        <div className="text-center mb-4" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Anywhere in the world"
              className="w-full px-6 py-4 pr-44 text-lg bg-white rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                borderColor: 'var(--border-default)',
                color: 'var(--text-tertiary)'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--brand-primary)';
                e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-primary-light)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors flex items-center space-x-1"
            >
              <span>Let's go</span>
              <span>→</span>
            </button>
          </div>

          {/* Destination Help Toggle */}
          <div className="text-center mt-8">
            <button
              type="button"
              onClick={() => setShowDestinationToggles(!showDestinationToggles)}
              className="text-white text-lg hover:text-gray-300 transition-colors inline-flex items-center space-x-2"
            >
              <span className="underline">Not sure where you wanna go? Let's help you figure it out!</span>
              {showDestinationToggles ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Destination Category Toggles */}
          {showDestinationToggles && (
            <div className="mt-6 p-6 bg-gray-900 bg-opacity-50 rounded-2xl backdrop-blur-sm">
              <p className="text-sm text-gray-400 mb-4 text-center">Choose a travel theme to get started:</p>
              <div className="flex flex-wrap gap-3 justify-center">
                {destinationCategories.map((category) => {
                  const IconComponent = category.icon;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleDestinationToggle(category.prompt)}
                      className="px-4 py-2.5 rounded-full border transition-all hover:scale-105 transform"
                      style={{
                        backgroundColor: category.id === 'all' ? '#1156F9' : 'transparent',
                        color: category.id === 'all' ? '#FFFFFF' : '#E5E7EB',
                        borderColor: category.id === 'all' ? '#1156F9' : '#4B5563'
                      }}
                      onMouseEnter={(e) => {
                        if (category.id !== 'all') {
                          e.currentTarget.style.borderColor = '#1156F9';
                          e.currentTarget.style.color = '#FFFFFF';
                          e.currentTarget.style.backgroundColor = '#1156F920';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (category.id !== 'all') {
                          e.currentTarget.style.borderColor = '#4B5563';
                          e.currentTarget.style.color = '#E5E7EB';
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <span className="flex items-center space-x-2">
                        <IconComponent className="w-4 h-4" />
                        <span className="font-medium">{category.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}