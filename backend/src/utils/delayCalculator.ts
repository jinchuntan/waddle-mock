// Calculates realistic human-like delays split into two phases:
//   Phase 1 — read delay:  simulates opening the chat and reading the incoming message
//   Phase 2 — type delay:  simulates composing and typing the outgoing reply
//
// Both phases fire separately so we can show accurate WhatsApp typing indicators.

const WORDS_PER_MINUTE_READING = 200
const CHARS_PER_SECOND_TYPING = 38 // average human typing speed
const THINK_MIN_MS = 3_000
const THINK_MAX_MS = 8_000
const READ_DELAY_MIN_MS = 4_000
const READ_DELAY_MAX_MS = 25_000
const TYPE_DELAY_MIN_MS = 3_000
const TYPE_DELAY_MAX_MS = 55_000

function addVariance(value: number, fraction: number): number {
  const delta = value * fraction
  return Math.round(value + (Math.random() * delta * 2 - delta))
}

/**
 * How long to wait (and show the read receipt) before starting to type.
 * Based on reading the incoming supplier message.
 */
export function calculateReadDelay(incomingText: string): number {
  const wordCount = incomingText.trim().split(/\s+/).length
  const readMs = Math.round((wordCount / WORDS_PER_MINUTE_READING) * 60_000)
  const thinkMs = THINK_MIN_MS + Math.round(Math.random() * (THINK_MAX_MS - THINK_MIN_MS))
  const raw = addVariance(readMs + thinkMs, 0.15)
  return Math.max(READ_DELAY_MIN_MS, Math.min(READ_DELAY_MAX_MS, raw))
}

/**
 * How long to show the "typing..." indicator before sending the reply.
 * Based on the character length of the outgoing message.
 */
export function calculateTypingDelay(outgoingText: string): number {
  const charCount = outgoingText.length
  const typeMs = Math.round((charCount / CHARS_PER_SECOND_TYPING) * 1_000)
  const raw = addVariance(typeMs, 0.2)
  return Math.max(TYPE_DELAY_MIN_MS, Math.min(TYPE_DELAY_MAX_MS, raw))
}
