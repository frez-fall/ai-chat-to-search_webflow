// webflow-components/src/ChatWidget.tsx
import React, { useState } from "react";
import { ApiConfigProvider } from "./ApiConfigContext";
import QuickSearchWidget from "./components/QuickSearchWidget";
import ChatModal from "./components/ChatModal";


export default function ChatWidget({ apiBaseUrl }: { apiBaseUrl: string }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState("");

  const handleSearch = (q: string) => {
    setInitialQuery(q);
    setIsChatOpen(true);
  };

  const handleBookingUrlGenerated = (url: string) => {
    console.log("Booking URL:", url);
  };

  return (
    <ApiConfigProvider apiBaseUrl={apiBaseUrl}>
      <div className="w-full">
        <div className="w-full max-w-3xl mx-auto px-4">
          <QuickSearchWidget onSearch={handleSearch} />
        </div>

        <ChatModal
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          initialQuery={initialQuery}
          onBookingUrlGenerated={handleBookingUrlGenerated}
        />
      </div>
    </ApiConfigProvider>
  );
}