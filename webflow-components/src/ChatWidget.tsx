// webflow-components/src/ChatWidget.tsx
import React, { useRef, useState } from "react";
import { ApiConfigProvider } from "./ApiConfigContext";
import QuickSearchWidget from "./components/QuickSearchWidget";
import ChatModal from "./components/ChatModal";
import { useLockBodyScroll } from "./hooks/useLockBodyScroll";
import PortalWithStyles from "./components/Portal";

export default function ChatWidget({ apiBaseUrl }: { apiBaseUrl: string }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);

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
      <div
        ref={rootRef}
        className="w-full chat-root"
        data-modal-open={isChatOpen ? "true" : "false"}
      >
        <div className="w-full max-w-3xl mx-auto px-4">
          <QuickSearchWidget onSearch={handleSearch} />
        </div>

        {/* Render modal above Webflow with inherited Shadow DOM styles/vars */}
        <PortalWithStyles
          inheritFrom={rootRef.current}
          style={{ zIndex: 2147483647 }}
        >
          <div style={{ pointerEvents: isChatOpen ? "auto" : "none" }}>
            <ChatModal
              isOpen={isChatOpen}
              onClose={() => setIsChatOpen(false)}
              initialQuery={initialQuery}
              onBookingUrlGenerated={handleBookingUrlGenerated}
            />
          </div>
        </PortalWithStyles>
      </div>
    </ApiConfigProvider>
  );
}