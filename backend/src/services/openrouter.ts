import OpenAI from 'openai'

// ── OpenRouter client ────────────────────────────────────────────────────────
// OpenRouter exposes an OpenAI-compatible API, so we use the official `openai`
// SDK pointed at OpenRouter's base URL. All AI calls in the backend go through
// this single client — the API key never reaches the browser.
//
// The constructor needs a non-empty apiKey, so we fall back to a placeholder
// when it's unset. That keeps the server booting (WhatsApp, sessions, auth all
// keep working) and only the AI features fail — with a clear 401 — at call time.
export const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY ?? 'OPENROUTER_API_KEY_NOT_SET',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    // Optional attribution headers OpenRouter uses for its dashboard / rankings.
    'HTTP-Referer': process.env.OPENROUTER_SITE_URL ?? 'http://localhost:5173',
    'X-Title': process.env.OPENROUTER_APP_NAME ?? 'Waddle',
  },
})

// Main model — used for generation that needs quality (negotiation replies,
// email drafts, procurement search/recommendations).
export const MAIN_MODEL = process.env.OPENROUTER_MODEL ?? 'anthropic/claude-sonnet-4.5'

// Small model — used for cheap, high-volume classification / extraction tasks
// (e.g. detecting supplier intent from an incoming WhatsApp message).
export const SMALL_MODEL = process.env.OPENROUTER_SMALL_MODEL ?? 'anthropic/claude-3.5-haiku'
