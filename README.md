# 🐧 Waddle

**Winner · Dollar Track, AI.SEA $1 Sprint**

[Product](https://waddle.fovea.space/) · [Project and recognition](https://www.fovea.space/#recognition)

**Waddle is an agentic AI procurement assistant for SMEs.** It helps small and
medium businesses source products without a dedicated procurement team: search
for suppliers, compare options, draft supplier inquiry emails, and negotiate
with suppliers over WhatsApp or email.

Waddle currently focuses on Malaysia and Singapore.

## What Waddle does

- **Conversational procurement search** — describe what you need; Waddle asks a
  few qualifying questions (quantity, budget, timeline, preferences) and returns
  a shortlist of suppliers with indicative pricing and contact details.
- **Email outreach** — generates a professional supplier inquiry email you can
  review, edit, and send.
- **WhatsApp negotiation** — an autonomous agent negotiates with a supplier over
  WhatsApp on your behalf (price, MOQ, lead time, payment terms), with live
  updates streamed to the UI.
- **Sessions & history** — chats are saved so you can revisit past searches.
- **Google sign-in** — optional auth; anonymous search also works.

All AI runs **server-side through OpenRouter** — no AI provider keys are ever
exposed to the browser.

---

## Project structure

```
waddle/
├── frontend/        React + Vite SPA  → deploys to Vercel
│   ├── src/
│   │   ├── lib/         API clients (call the backend via VITE_API_BASE_URL)
│   │   ├── hooks/       chat + WhatsApp state
│   │   ├── pages/       LandingPage, ChatApp (/app), WaddleForMe (/waddle-for-me)
│   │   └── components/
│   ├── vercel.json     SPA rewrites + build settings
│   └── .env.example
│
├── backend/         Express API + WhatsApp/Baileys  → deploys to Railway/Render/Fly.io
│   ├── src/
│   │   ├── index.ts            server entry (runs migrations, then listens)
│   │   ├── routes/             auth, sessions, email, negotiate, whatsapp, chat
│   │   ├── services/           openrouter, searchAgent, negotiationAgent,
│   │   │                       emailAgent, emailService, whatsappBaileys, queue
│   │   └── db/                 pg client, migrations, queries
│   ├── railway.toml / fly.toml / Dockerfile
│   └── .env.example
│
├── render.yaml      Render Blueprint for the backend
└── src/             Standalone Lua AI agent with Playwright scraping tools
                     (separate MVP scraping experiment — see "Scraping" below)
```

> **Why two deploy targets?** The backend keeps a **long-lived WhatsApp
> connection** (Baileys) and a persistent Express process. That cannot run on
> Vercel's serverless functions, so the frontend and backend are deployed
> separately. See [Deploying the backend](#deploying-the-backend-railway--render--flyio).

---

## Architecture

```
 Browser (Vercel)                Backend (Railway/Render/Fly)         External
 ─────────────────               ────────────────────────────        ──────────
 React SPA                       Express server                       OpenRouter (AI)
   │  fetch VITE_API_BASE_URL      │  /api/chat/stream  ──────────────►  (search/chat)
   ├──────────────────────────────►  /api/email         ──────────────►  (email drafts)
   │                               │  /api/negotiate     ──────────────►  (negotiation)
   │                               │  /api/sessions      ──► PostgreSQL (Railway/Supabase/Neon)
   │                               │  /api/auth (Google) ──► Google OAuth
   │                               │  /api/whatsapp      ──► WhatsApp (Baileys socket)
```

The browser never talks to OpenRouter, Anthropic, or any AI provider directly —
every AI call is proxied through the backend.

---

## Deploying the frontend (Vercel)

Deploy `frontend/` as its **own** Vercel project.

| Vercel setting     | Value          |
| ------------------ | -------------- |
| **Root Directory** | `frontend`     |
| **Build Command**  | `npm run build` |
| **Output Directory** | `dist`       |
| **Framework**      | Vite (auto)    |

These are also encoded in [`frontend/vercel.json`](frontend/vercel.json), which
additionally adds an SPA rewrite so client-side routes like `/app` and
`/waddle-for-me` work when refreshed or opened directly.

**Environment variable** (Vercel → Project → Settings → Environment Variables):

```
VITE_API_BASE_URL = https://your-backend-host.example.com   # no trailing slash
```

Only non-secret, `VITE_`-prefixed variables belong in the frontend — they are
bundled into the public build. **Never put API keys here.**

---

## Deploying the backend (Railway / Render / Fly.io)

The backend is a **persistent Express server** — keep it as a long-running
process. Do **not** convert it to serverless functions (WhatsApp/Baileys needs a
live socket).

First provision a **hosted PostgreSQL** database (Railway Postgres, Supabase, or
Neon) and grab its connection string for `DATABASE_URL`. Managed providers
usually need SSL — append `?sslmode=require` if connections fail.

Set every variable from [`backend/.env.example`](backend/.env.example) in your
host's environment settings. Migrations run automatically on boot, and
`GET /health` is available for platform health checks.

### Railway (recommended)

1. New service from this repo → **Settings → Root Directory = `backend`**.
2. Railway reads [`backend/railway.toml`](backend/railway.toml):
   build `npm ci && npm run build`, start `npm start`, health check `/health`.
3. Add the environment variables. (Add a Railway Postgres plugin and reference
   its `DATABASE_URL`.)

### Render

Use the [`render.yaml`](render.yaml) Blueprint (New → Blueprint), or create a
Web Service manually with **Root Directory = `backend`**, build
`npm ci && npm run build`, start `npm start`, health check path `/health`.
Use a paid plan so the service stays always-on for WhatsApp.

### Fly.io

From the `backend/` directory:

```bash
fly launch --no-deploy          # set app name / region (uses Dockerfile + fly.toml)
fly secrets set DATABASE_URL=... OPENROUTER_API_KEY=... JWT_SECRET=...   # etc.
fly deploy
```

[`backend/fly.toml`](backend/fly.toml) keeps a machine always running
(`min_machines_running = 1`, no auto-stop) so the WhatsApp socket survives.

> **WhatsApp persistence:** Baileys stores its session in
> `backend/.baileys-auth`. On ephemeral container filesystems this is wiped on
> redeploy, requiring a re-scan of the QR code. For production, mount a
> persistent volume there (see the commented `[mounts]` block in `fly.toml`, or
> add a Railway/Render volume).

---

## Required environment variables

### Frontend (`frontend/.env.example`) — public, non-secret only

| Variable            | Description                                            |
| ------------------- | ------------------------------------------------------ |
| `VITE_API_BASE_URL` | Backend base URL. Empty in local dev (uses Vite proxy). |

### Backend (`backend/.env.example`) — server-side secrets

| Variable                 | Description                                              |
| ------------------------ | ------------------------------------------------------- |
| `DATABASE_URL`           | Hosted PostgreSQL connection string                     |
| `BACKEND_URL`            | Public URL of this server (used for the OAuth callback) |
| `FRONTEND_URL`           | The Vercel site URL — **CORS allows only this origin**  |
| `SESSION_SECRET`         | Random string for the OAuth session cookie              |
| `JWT_SECRET`             | Random string for signing auth tokens                   |
| `GOOGLE_CLIENT_ID`       | Google OAuth client ID                                  |
| `GOOGLE_CLIENT_SECRET`   | Google OAuth client secret                              |
| `EMAIL_USER`             | SMTP / Gmail address used to send supplier emails       |
| `EMAIL_PASS`             | SMTP password / Gmail App Password                      |
| `EMAIL_FROM_NAME`        | Display name on outgoing emails                         |
| `OPENROUTER_API_KEY`     | OpenRouter API key (all AI runs through this)           |
| `OPENROUTER_MODEL`       | Main model, e.g. `anthropic/claude-sonnet-4.5`          |
| `OPENROUTER_SMALL_MODEL` | Cheap model for classification/extraction               |
| `OPENROUTER_SITE_URL`    | Attribution URL for the OpenRouter dashboard (optional) |
| `OPENROUTER_APP_NAME`    | Attribution app name (optional)                         |

> Google OAuth: set the authorised redirect URI to
> `<BACKEND_URL>/api/auth/google/callback`.

**Never commit `.env` files or expose any backend key to the browser.**

---

## Local development

Prerequisites: Node 20+, a PostgreSQL database (local or hosted), an OpenRouter
API key.

```bash
# 1. Install dependencies (root tooling + both apps)
npm ci
npm ci --prefix backend
npm ci --prefix frontend

# 2. Configure environment
cp backend/.env.example  backend/.env     # fill in DATABASE_URL, OPENROUTER_API_KEY, etc.
cp frontend/.env.example frontend/.env    # leave VITE_API_BASE_URL empty to use the dev proxy

# 3. Run both apps together (backend on :3001, frontend on :5173)
npm run web

# …or run them separately:
npm run dev --prefix backend
npm run dev --prefix frontend
```

In local dev, Vite proxies `/api/*` to `http://localhost:3001`
(see [`frontend/vite.config.js`](frontend/vite.config.js)), so no CORS setup is
needed.

**Build (what the deploy hosts run):**

```bash
npm run build --prefix backend     # tsc → dist/, copies SQL migrations (cross-platform)
npm run build --prefix frontend    # vite build → dist/
```

To connect WhatsApp locally, start the backend and open
`http://localhost:3001/api/whatsapp/qr-page`, then scan with WhatsApp →
Linked Devices.

---

## Scraping (MVP)

The standalone Lua AI agent in [`src/`](src/) contains Playwright + curated-source
scraping tools (`find_supplier_sources`, `scrape_public_page`, `score_suppliers`).
This is an MVP experiment that runs on the Lua platform, **separate** from the
Express backend and the Vercel frontend.

For the deployed app, supplier recommendations are generated by the backend
through OpenRouter (see `backend/src/services/searchAgent.ts`).

> **Bright Data:** not used for now. We're keeping the Playwright / curated-source
> approach for the MVP. Bright Data (or a similar managed scraping/proxy service)
> can be added later **if** scraping reliability, anti-bot blocking, or scale
> becomes a problem.

---

## Current MVP limitations

- **Search recommendations** come from the OpenRouter model's knowledge, not from
  live scraping in the chat path. Prices and contact details are *indicative* and
  should be verified with the supplier. (The Playwright scraper in `src/` is not
  yet wired into the backend search endpoint.)
- **The chat endpoint is stateless** — the frontend sends conversation history on
  each request. Very long chats grow the request payload.
- **WhatsApp is single-account / single-instance.** Baileys keeps one socket;
  running multiple backend instances would conflict, and session state needs a
  persistent volume to survive redeploys.
- **Negotiation** is capped at a fixed number of rounds and has a simple
  in-memory rate limiter (resets on restart).
- **Email** assumes common SMTP providers (Gmail/Outlook auto-detected, others by
  `smtp.<domain>`).

## Future work

- Wire the Playwright/curated-source scraper into the backend search endpoint so
  recommendations are backed by live data (optionally via Bright Data).
- Persist chat threads server-side instead of replaying history from the client.
- Multi-tenant WhatsApp (per-user numbers / provider API) for horizontal scaling.
- Smarter negotiation strategy and quote parsing.
- Tests and CI for the backend services and API routes.
