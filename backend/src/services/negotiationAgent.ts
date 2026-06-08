import Anthropic from '@anthropic-ai/sdk'
import { getNegotiation, updateNegotiation } from '../db/queries/negotiations.js'
import { appendMessage, getRecentMessages } from '../db/queries/messages.js'
import { whatsAppService } from './whatsappBaileys.js'
import { sseManager } from './sseManager.js'
import { calculateReadDelay, calculateTypingDelay } from '../utils/delayCalculator.js'
import type { ConversationMessage, DetectionResult, NegotiationTurnResult } from '../types.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CONTEXT_WINDOW_SIZE = 6
const MAX_AGENT_ROUNDS    = 5

// In-memory rate limiter: max 10 messages per phone per minute
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000

function isRateLimited(phone: string): boolean {
  const now = Date.now()
  const timestamps = (rateLimitMap.get(phone) ?? []).filter(t => now - t < RATE_LIMIT_WINDOW_MS)
  timestamps.push(now)
  rateLimitMap.set(phone, timestamps)
  return timestamps.length > RATE_LIMIT_MAX
}

// Cached system prompt — Anthropic charges 10% for cache hits vs full price
// This alone cuts ~65–70% of input token cost across a multi-turn negotiation
const SYSTEM_PROMPT = `You are a procurement negotiation assistant for Waddle. You negotiate with suppliers via WhatsApp on behalf of a buyer.

Your goal: get the best price, MOQ (minimum order quantity), and lead time for the requested product.

Tone: professional, warm, and confident — like an experienced buyer texting on WhatsApp. Be concise and natural. No markdown, no bullet points, no numbered lists. Sound human.

Each turn you should:
- Push politely for a better price or more favourable terms
- Fill in any missing details (MOQ, lead time, payment terms) if not yet known
- Build rapport — be friendly but focused on getting a good deal
- Show professionalism without being rude or aggressive

When negotiation is complete (you have price, MOQ, and lead time) OR after ${MAX_AGENT_ROUNDS} rounds, respond ONLY with this exact JSON and nothing else:
{"action":"done","summary":"<concise summary of agreed terms: price, MOQ, lead time, payment terms, any special conditions>"}

Otherwise respond with only the WhatsApp message text to send — no JSON, no extra formatting.`

// ── Token-efficient detection (Haiku — ~25x cheaper than Sonnet) ──────────
// Classifies incoming supplier message before deciding how to respond
async function detectSupplierIntent(supplierText: string): Promise<DetectionResult> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    messages: [
      {
        role: 'user',
        content: `Analyse this WhatsApp message from a supplier and respond with ONLY valid JSON, no other text.

Message: "${supplierText.replace(/"/g, "'")}"

JSON format:
{
  "hasQuotedPrice": boolean,
  "isNegotiationComplete": boolean,
  "isRejection": boolean,
  "asksQuestion": boolean,
  "extractedPrice": string | null,
  "extractedMoq": string | null,
  "extractedLeadTime": string | null
}

Rules:
- hasQuotedPrice: true if a specific price/cost figure is mentioned
- isNegotiationComplete: true if all key terms are confirmed and supplier is ready to proceed
- isRejection: true if supplier declined, cannot supply, or is out of stock
- asksQuestion: true if the supplier is asking a question that needs a specific answer (delivery address, company name, specifications, etc.)
- extractedPrice: exact price string mentioned (e.g. "RM 4,500"), null if none
- extractedMoq: MOQ string if mentioned (e.g. "50 units"), null if none
- extractedLeadTime: lead time string if mentioned (e.g. "7 days"), null if none`,
      },
    ],
  })

  const textBlock = response.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    return { hasQuotedPrice: false, isNegotiationComplete: false, isRejection: false, asksQuestion: false, extractedPrice: null, extractedMoq: null, extractedLeadTime: null }
  }

  try {
    return JSON.parse(textBlock.text.trim()) as DetectionResult
  } catch {
    return { hasQuotedPrice: false, isNegotiationComplete: false, isRejection: false, asksQuestion: false, extractedPrice: null, extractedMoq: null, extractedLeadTime: null }
  }
}

// ── Context window builder ─────────────────────────────────────────────────
function buildMessages(messages: ConversationMessage[]): Anthropic.MessageParam[] {
  return messages.map(msg => ({
    role: msg.role === 'agent' ? ('assistant' as const) : ('user' as const),
    content: msg.text,
  }))
}

function countAgentRounds(messages: ConversationMessage[]): number {
  return messages.filter((m, i) => m.role === 'agent' && i > 0).length
}

// ── Main turn ──────────────────────────────────────────────────────────────
export async function runNegotiationTurn(negotiationId: string): Promise<NegotiationTurnResult> {
  const negotiation = await getNegotiation(negotiationId)
  if (!negotiation) return { done: false }
  if (negotiation.status === 'done' || negotiation.status === 'failed') return { done: true, summary: negotiation.summary ?? '' }

  const allMessages = negotiation.messages

  // Opening turn — no supplier message yet, just send the first message
  if (allMessages.length === 0) {
    return sendOpeningMessage(negotiation.id, negotiation.supplier, negotiation.product, negotiation.quantity, negotiation.targetPrice)
  }

  const supplierMessages = allMessages.filter(m => m.role === 'supplier')
  if (supplierMessages.length === 0) return { done: false }

  const lastSupplierMsg = supplierMessages[supplierMessages.length - 1]

  if (isRateLimited(negotiation.phone)) {
    sseManager.emit(negotiationId, 'activity', { text: 'Rate limit reached — pausing briefly...' })
    return { done: false }
  }

  // Enforce max rounds
  if (countAgentRounds(allMessages) >= MAX_AGENT_ROUNDS) {
    const summary = 'Maximum negotiation rounds reached. Review the conversation and contact the supplier directly for final confirmation.'
    await updateNegotiation(negotiationId, { status: 'done', summary })
    sseManager.emit(negotiationId, 'status', { status: 'done', summary })
    return { done: true, summary }
  }

  // Phase 1: Detect supplier intent (Haiku — cheap)
  sseManager.emit(negotiationId, 'activity', { text: 'Reading supplier message...' })
  const detection = await detectSupplierIntent(lastSupplierMsg.text)

  // Emit any extracted terms to the frontend panel
  if (detection.extractedPrice || detection.extractedMoq || detection.extractedLeadTime) {
    sseManager.emit(negotiationId, 'extraction', {
      price: detection.extractedPrice ?? undefined,
      moq: detection.extractedMoq ?? undefined,
      leadTime: detection.extractedLeadTime ?? undefined,
    })
  }

  if (detection.isRejection) {
    const summary = `Supplier declined or cannot fulfil the order. Last message: "${lastSupplierMsg.text}"`
    await updateNegotiation(negotiationId, { status: 'done', summary })
    sseManager.emit(negotiationId, 'status', { status: 'done', summary })
    return { done: true, summary }
  }

  if (detection.asksQuestion) {
    sseManager.emit(negotiationId, 'activity', { text: 'Supplier asked a question — preparing answer...' })
  }

  // Phase 2: Simulate reading delay
  const readDelay = calculateReadDelay(lastSupplierMsg.text)
  await new Promise(r => setTimeout(r, readDelay))

  // Re-check in case the negotiation was cancelled while we waited
  const fresh = await getNegotiation(negotiationId)
  if (!fresh || fresh.status === 'done' || fresh.status === 'failed') {
    return { done: true, summary: fresh?.summary ?? '' }
  }

  // Phase 3: Craft reply (Sonnet with cached system prompt + sliding window)
  sseManager.emit(negotiationId, 'activity', { text: 'Crafting response...' })

  const recentMessages = await getRecentMessages(negotiationId, CONTEXT_WINDOW_SIZE)

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 350,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: buildMessages(recentMessages),
  })

  const textBlock = response.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') return { done: false }

  const replyText = textBlock.text.trim()

  // Check if Claude signalled completion
  try {
    const parsed = JSON.parse(replyText) as { action?: string; summary?: string }
    if (parsed.action === 'done' && typeof parsed.summary === 'string') {
      await updateNegotiation(negotiationId, { status: 'done', summary: parsed.summary })
      sseManager.emit(negotiationId, 'status', { status: 'done', summary: parsed.summary })
      return { done: true, summary: parsed.summary }
    }
  } catch {
    // Not JSON — treat as a regular message to send
  }

  // Phase 4: Show typing indicator then send
  sseManager.emit(negotiationId, 'typing', { isTyping: true })
  const typingDelay = calculateTypingDelay(replyText)
  await whatsAppService.sendTypingIndicator(fresh.phone, typingDelay)
  sseManager.emit(negotiationId, 'typing', { isTyping: false })

  await whatsAppService.sendMessage(fresh.phone, replyText)

  const agentMessage: ConversationMessage = {
    role: 'agent',
    text: replyText,
    timestamp: new Date().toISOString(),
  }
  const saved = await appendMessage(negotiationId, agentMessage)
  await updateNegotiation(negotiationId, { status: 'negotiating' })

  sseManager.emit(negotiationId, 'message', saved)
  sseManager.emit(negotiationId, 'status', { status: 'negotiating' })
  sseManager.emit(negotiationId, 'activity', { text: 'Message sent — waiting for reply...' })

  return { done: false }
}

// ── Opening message ────────────────────────────────────────────────────────
async function sendOpeningMessage(
  negotiationId: string,
  supplier: string,
  product: string,
  quantity: string,
  targetPrice: string,
): Promise<NegotiationTurnResult> {
  const text = buildOpeningMessage({ supplier, product, quantity, targetPrice })

  sseManager.emit(negotiationId, 'activity', { text: 'Sending opening message...' })
  sseManager.emit(negotiationId, 'typing', { isTyping: true })

  const typingDelay = calculateTypingDelay(text)
  const negotiation = await getNegotiation(negotiationId)
  if (!negotiation) return { done: false }

  await whatsAppService.sendTypingIndicator(negotiation.phone, typingDelay)
  sseManager.emit(negotiationId, 'typing', { isTyping: false })

  await whatsAppService.sendMessage(negotiation.phone, text)

  const message: ConversationMessage = {
    role: 'agent',
    text,
    timestamp: new Date().toISOString(),
  }
  const saved = await appendMessage(negotiationId, message)
  await updateNegotiation(negotiationId, { status: 'sent' })

  sseManager.emit(negotiationId, 'message', saved)
  sseManager.emit(negotiationId, 'activity', { text: `Opening message sent to ${supplier} — waiting for reply...` })

  return { done: false }
}

function buildOpeningMessage(params: {
  supplier: string
  product: string
  quantity: string
  targetPrice: string
}): string {
  const { supplier, product, quantity, targetPrice } = params
  return `Hi ${supplier}, hope you're doing well!

We're looking to procure ${product} and came across your business. We're interested in placing an order.

Quantity needed: ${quantity}
Budget target: ${targetPrice}

Could you share your best price for this quantity, along with MOQ, lead time, and payment terms? Looking forward to hearing from you!`
}
