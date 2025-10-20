# AI Chat → Flight Search (Webflow + Vercel)

This project is a production-ready AI-powered flight search chat integrated into a Webflow Code Component (frontend) with a Next.js (App Router) backend deployed on Vercel, and powered by Supabase and OpenAI.

## Repository Structure

ai-chat-to-search_webflow/
```bash
├─ backend/ – Next.js API backend (deploy target)
│ ├─ src/
│ │ ├─ app/api/...                  – API route handlers (conversations, messages, chat/stream, etc.)
│ │ ├─ lib/...                      – Chat engine, flight-parser, URL generator
│ │ ├─ models/...                   – Zod schemas for validation & types
│ │ └─ middleware.ts                – Handles CORS dynamically via env var
│ ├─ package.json
│ ├─ tsconfig.json
│ └─ next.config.js
└─ webflow-components/              – Webflow Code Component frontend
├─ src/
│ ├─ ChatWidget.webflow.tsx         – Webflow wrapper – exposes apiBaseUrl
│ ├─ ChatWidget.tsx                 – Mounts QuickSearch + ChatModal
│ ├─ components/...                 – ChatModal, MessageList, MessageInput etc.
│ ├─ hooks/...                      – useChat, useLockBodyScroll, etc.
│ └─ styles/
│ ├─ tokens.css                     – Design tokens (CSS vars)
│ └─ tailwind.out.css               – Precompiled Tailwind utilities
├─ package.json
└─ webflow.config.ts                – Webflow CLI config for build/publish
```
## Overview

Users can search for flights conversationally using AI directly on a Webflow page. The backend handles AI intent parsing, flight parameter extraction, conversation persistence, and booking link generation. The frontend (Webflow component) handles UI, modal logic, and API communication.

### Backend Configuration (Next.js + Vercel)

- Framework preset: Next.js
- Root directory: /backend
- Install command: npm ci (clean install using package-lock.json)
- Build command: next build
- Output directory: Default (Next.js)
- Node version: 18+

### Required Environment Variables

Set the following keys in Vercel → Settings → Environment Variables:

- CORS_ALLOWED_ORIGINS=https://paylatertravel-au.webflow.io,https://www.yourdomain.com
- OPENAI_API_KEY=sk-...
- SUPABASE_URL=https://xxxx.supabase.co
- SUPABASE_ANON_KEY=...
- SUPABASE_SERVICE_KEY=...

These environment variables are required for the backend to function. The service key should only be used server-side, while the anon key is optional for client-safe reads.

### CORS Handling (middleware.ts)

All CORS logic is handled dynamically in backend/src/middleware.ts, which runs before every API route.

**How it works**
Reads the environment variable CORS_ALLOWED_ORIGINS (comma-separated list of allowed domains).

CORS_ALLOWED_ORIGINS=https://paylatertravel-au.webflow.io,https://www.paylatertravel.com

**For every API request:**
- Checks the request's Origin header.
- If the origin matches one of the allowed domains, it sets Access-Control-Allow-Origin to that value.
- Responds automatically to OPTIONS (preflight) requests with 200 OK.
- Applies to all routes under /api/*.

**Benefits of this approach:**
- Dynamic — you can add or remove domains from CORS without redeploying code.
- Secure — only approved origins can access your backend.
- Simple — no need for a vercel.json config file.
- Vercel-native — the middleware runs at the edge before your API logic executes.

This middleware automatically reads allowed origins from the environment variable CORS_ALLOWED_ORIGINS, responds to preflight OPTIONS requests, and sets Access-Control-Allow-Origin only for whitelisted domains.

### API Routes

- /api/health – GET – health check
- /api/conversations – POST – create conversation
- /api/conversations/[id]/messages – POST – send message and get AI reply
- /api/conversations/[id]/parameters – GET/PUT – get or update flight search parameters
- /api/chat/stream – POST – stream AI responses (optional)
- /api/destinations – GET – destination recommendations

### Webflow Component Setup

The Webflow component is located in webflow-components/. It is a self-contained chat widget built in React and compiled for Webflow's Code Component system.

**Key files**

- ChatWidget.webflow.tsx – declares the component for Webflow with an apiBaseUrl prop
- ChatWidget.tsx – mounts QuickSearchWidget and ChatModal
- ChatModal.tsx – manages AI conversation and modal UI
- MessageList.tsx – handles chat bubble display and extracted info logic
- tokens.css – contains CSS design tokens for brand consistency

**Prop Configuration**

apiBaseUrl (string) – Required. The base URL of your backend (e.g. https://your-backend.vercel.app)

**Build commands** 

- cd webflow-components
- npm install
- npx webflow build
- npx webflow library share

**How to add to page** 

1. Add in Webflow Designer
2. Open Webflow Designer and go to Components → Code Components
3. Drag PayLater Chat Widget onto your page
4. In Component Settings, set the prop:
5. API Base URL = https://your-backend.vercel.app
6. Publish your Webflow site
7. When published, the component connects to your backend automatically and powers the live chat assistant.

### Conversation Flow

- Suggestions in QuickSearch only fill the search box
- Clicking "Let's go" opens the modal and auto-sends the query
- The modal locks background scroll and connects to the backend
- Chat messages display one by one as the AI responds
- Extracted Information is shown only once all flight parameters are complete
- Once booking details are complete, a "View & Book Flights" button appears linking to the generated booking URL
- Session data persists locally, allowing the user to reopen the modal and continue within a limited time window


### For local development
**Example .env.local**
- OPENAI_API_KEY=sk-...
- SUPABASE_URL=https://xxxx.supabase.co
- SUPABASE_ANON_KEY=...
- SUPABASE_SERVICE_KEY=...
- CORS_ALLOWED_ORIGINS=http://localhost:3000,https://paylatertravel-au.webflow.io,https://paylatertravel.com

**Running Locally**
Backend: 
- cd backend
- npm install
- npm run dev

The backend will be available at http://localhost:3000

Webflow Component:
- cd webflow-components
- npm install
- npx webflow build

You can then link the component to a test Webflow project or a local HTML sandbox with the apiBaseUrl set to http://localhost:3000 for testing.

### Troubleshooting

- 401 Unauthorized – Vercel Preview Protection is enabled → Disable protection or use a bypass token
- 403 CORS – Origin not in allowlist → Add your Webflow staging and production domains to CORS_ALLOWED_ORIGINS
- 500 Internal Server Error – Missing or incorrect env variables → Verify Supabase and OpenAI keys
- Broken styling in Webflow – Global CSS bleeding → Ensure applyTagSelectors: false in ChatWidget.webflow.tsx
- Chat opens on suggestion click – Fixed: only "Let's go" triggers the modal
- Extracted information always showing – Fixed: now gated by completion logic
- Button not showing – Appears once backend returns generated_url

### Security Best Practices

- Never commit any keys. Store them in Vercel's Environment Variables.
- Limit CORS_ALLOWED_ORIGINS to your actual Webflow domains.
- Use SUPABASE_SERVICE_KEY only on the backend; use SUPABASE_ANON_KEY for any client reads.
- Validate and sanitize all API requests before forwarding to OpenAI.

### Maintenance

- Keep your color and brand updates in webflow-components/src/styles/tokens.css
- Use npm ci instead of npm install to ensure consistent dependency versions during builds.
- Test /api/health regularly to confirm deployment health.
- Monitor error logs in Vercel → Logs.
- Update Webflow components by rebuilding and republishing via the CLI when new UI changes are made.

### Deployment Checklist

- Set environment variables in Vercel
- Deploy backend (root: /backend)
- Build & publish Webflow component
- Add the widget in Webflow Designer
- Set API Base URL to production backend
- Publish and test
