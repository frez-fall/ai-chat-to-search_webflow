import React, { useState } from "react";
import { ApiConfigProvider } from "./ApiConfigContext";
import QuickSearchWidget from "./components/QuickSearchWidget";
import ChatModal from "./components/ChatModal";
import { useLockBodyScroll } from "./hooks/useLockBodyScroll";
import Portal from "./components/Portal"; // ← add this import

export default function ChatWidget({ apiBaseUrl }: { apiBaseUrl: string }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState("");

  useLockBodyScroll(isChatOpen);

  const handleSearch = (q: string) => {
    setInitialQuery(q);
    setIsChatOpen(true);
  };

  const handleBookingUrlGenerated = (url: string) => {
    console.log("Booking URL:", url);
  };

  return (
    <ApiConfigProvider apiBaseUrl={apiBaseUrl}>
      <div className="w-full" data-modal-open={isChatOpen ? "true" : "false"}>
        <div className="w-full max-w-3xl mx-auto px-4">
          <QuickSearchWidget onSearch={handleSearch} />
        </div>

        {/* Render the modal at document.body level to escape Webflow stacking contexts */}
        <Portal
          // optional: if you want a specific z-index or styling for the overlay container
          style={{ zIndex: 2147483647 }}
        >
          {/* Inside the portal, enable interactions again */}
          <div style={{ pointerEvents: isChatOpen ? "auto" : "none" }}>
            <ChatModal
              isOpen={isChatOpen}
              onClose={() => setIsChatOpen(false)}
              initialQuery={initialQuery}
              onBookingUrlGenerated={handleBookingUrlGenerated}
            />
          </div>
        </Portal>
      </div>
    </ApiConfigProvider>
  );
}