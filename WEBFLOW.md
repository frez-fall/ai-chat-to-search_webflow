# AI Chat → Flight Search (Webflow + Vercel)

Production-ready implementation of an AI-powered flight search chat integrated as a **Webflow Code Component** frontend and a **Next.js (App Router)** backend hosted on **Vercel**.

---

## :bricks: Project Structure

ai-chat-to-search_webflow/
├─ backend/ # Next.js API (deployed on Vercel)
│ ├─ src/
│ │ ├─ app/api/... # API route handlers
│ │ ├─ lib/... # chat-engine, flight-parser, url-generator
│ │ ├─ models/... # zod schemas
│ │ └─ services/database.ts # Supabase client & DB operations
│ ├─ package.json
│ ├─ tsconfig.json
│ ├─ next.config.js
│ └─ vercel.json # CORS headers
│
└─ webflow-components/ # Webflow Code Component (frontend)
├─ src/
│ ├─ ChatWidget.webflow.tsx # Wrapper for Webflow library
│ ├─ ChatWidget.tsx # Main component entry
│ ├─ components/... # ChatModal, QuickSearchWidget, etc.
│ ├─ hooks/... # useChat, useLockBodyScroll, etc.
│ ├─ lib/... # conversation-store, utils
│ └─ styles/
│ ├─ tokens.css # CSS variables (brand colors, fonts)
│ └─ tailwind.out.css # Compiled Tailwind utilities
├─ package.json
└─ webflow.config.ts

yaml
Copy code

---

## :gear: How It Works

1. **Quick Search Widget** captures a user query or suggestion.
2. **Chat Modal** opens and auto-sends that query as the first user message.
3. Backend routes handle:
   - `POST /api/conversations` → Create or restore conversation.
   - `POST /api/conversations/:id/messages` → Send message and return AI response.
   - `POST /api/chat/stream` → Optional streaming endpoint.
4. Backend uses **OpenAI (via `ai` SDK)** + **Supabase** to parse queries and store chat data.
5. When sufficient parameters are collected, backend returns a `generated_url`, and frontend displays a **"View & Book Flights"** CTA.

---

## :old_key: Environment Variables

Set these in **Vercel → Project → Settings → Environment Variables** (and optionally `backend/.env.local`):

```bash
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://xyzcompany.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
# Optional anon key
SUPABASE_ANON_KEY=...

# Comma-separated Webflow origins
CORS_ALLOWED_ORIGINS=https://paylatertravel-au.webflow.io,https://your-custom-domain.com
:rocket: Backend Deployment (Vercel)
Vercel Settings
Setting	Value
Root Directory	backend
Framework	Next.js
Build Command	next build
Output Directory	.next

vercel.json
json
Copy code
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Methods", "value": "GET,POST,PUT,DELETE,OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type, Authorization, X-Requested-With" },
        { "key": "Access-Control-Allow-Credentials", "value": "true" }
      ]
    }
  ]
}
:globe_with_meridians: CORS Configuration
CORS is enforced dynamically in all /api/* routes using the environment variable CORS_ALLOWED_ORIGINS.

OPTIONS requests → 200 with headers.

Requests with unknown Origin → 403.

Access-Control-Allow-Origin → only set when origin matches allowlist.

:white_check_mark: Example:

bash
Copy code
curl -i -X OPTIONS "https://your-backend.vercel.app/api/health" \
  -H "Origin: https://paylatertravel-au.webflow.io" \
  -H "Access-Control-Request-Method: GET"
:speech_balloon: Webflow Component Setup
Props
apiBaseUrl – URL of your deployed Vercel backend (e.g. https://ai-chat-to-search.vercel.app).

Options
ssr: false – disables server rendering (prevents hydration mismatch).

applyTagSelectors: false – isolates component styles from Webflow's global typography.

Build & Publish
bash
Copy code
cd webflow-components
npm i
npx webflow login
npx webflow build
npx webflow library publish
Then:

In Webflow Designer → Components → Your Library, add "PayLater Chat Widget".

Set API Base URL prop to your backend URL.

Publish your Webflow site.

:jigsaw: Local Development
Backend
bash
Copy code
cd backend
npm i
cp .env.local.example .env.local
npm run dev
# http://localhost:3000/api/health
Component
bash
Copy code
cd webflow-components
npm i
npx webflow build
:test_tube: API Quick Tests
bash
Copy code
# Health
curl -i https://your-backend.vercel.app/api/health

# New conversation
curl -X POST https://your-backend.vercel.app/api/conversations \
  -H "Content-Type: application/json" \
  -d '{"initial_query":"Flights from Sydney to Tokyo"}'

# Send a message
curl -X POST https://your-backend.vercel.app/api/conversations/<id>/messages \
  -H "Content-Type: application/json" \
  -d '{"message":"2 adults, economy, mid October"}'
:bulb: Common Issues
Problem	Fix
401 Unauthorized (HTML page)	Vercel Preview Deployment Protection – disable or use bypass token
403 CORS	Add your Webflow domain to CORS_ALLOWED_ORIGINS
500 Internal Error	Check Supabase keys or missing env vars
Chat modal opens too early	Handled – modal now opens only on "Let's go"
Auto-send not working	Ensure initialQuery prop is passed from QuickSearchWidget

:lock: Security Notes
Never commit keys – always use env vars.

Keep CORS_ALLOWED_ORIGINS specific to trusted domains.

Use Supabase service key only server-side.

Enable RLS in Supabase for public tables.

:chart_with_upwards_trend: Maintenance Ideas
Add Sentry or Vercel Analytics for error tracking.

Abstract tokens into a design system for rebranding.

Extend API for hotel/car search flows.

:white_check_mark: Quick Setup Recap
Deploy backend to Vercel (backend directory).

Add all env vars in Vercel.

Add your Webflow domains to CORS_ALLOWED_ORIGINS.

Publish Webflow Code Component and set its apiBaseUrl prop.

Test the chat on your live Webflow page. :tada: