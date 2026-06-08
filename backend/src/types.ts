// ── Message & Negotiation ──────────────────────────────────────────────────

export interface ConversationMessage {
  role: 'agent' | 'supplier'
  text: string
  timestamp: string
}

export type NegotiationStatus = 'sent' | 'negotiating' | 'done' | 'failed'

export interface Negotiation {
  id: string
  supplier: string
  phone: string
  product: string
  quantity: string
  targetPrice: string
  status: NegotiationStatus
  sentAt: string
  messages: ConversationMessage[]
  summary?: string
}

export interface ParsedQuotation {
  price: string | null
  moq: string | null
  leadTime: string | null
  raw: string
}

// ── Request bodies ─────────────────────────────────────────────────────────

export interface StartNegotiateBody {
  supplier: string
  phone: string
  product: string
  quantity: string
  targetPrice: string
  sessionId?: string
}

// ── Queue ──────────────────────────────────────────────────────────────────

export type QueueItemStatus = 'pending' | 'active' | 'waiting_reply' | 'timed_out' | 'done'

export interface QueueItem {
  id: string
  negotiationId: string
  position: number
  status: QueueItemStatus
  lastMessageAt: string | null
  timeoutAt: string | null
  createdAt: string
}

// ── Negotiation agent ──────────────────────────────────────────────────────

export type NegotiationTurnResult =
  | { done: true; summary: string }
  | { done: false }

export interface DetectionResult {
  hasQuotedPrice: boolean
  isNegotiationComplete: boolean
  isRejection: boolean
  asksQuestion: boolean
  extractedPrice: string | null
  extractedMoq: string | null
  extractedLeadTime: string | null
}

// ── SSE events ─────────────────────────────────────────────────────────────

export type SSEEventType = 'message' | 'status' | 'activity' | 'typing' | 'extraction'

export interface SSEPayload {
  message: ConversationMessage
  status: { status: NegotiationStatus; summary?: string }
  activity: { text: string }
  typing: { isTyping: boolean }
  extraction: { price?: string; moq?: string; leadTime?: string }
}

// ── Sessions ───────────────────────────────────────────────────────────────

export interface Session {
  id: string
  title: string
  threadId: string
  createdAt: string
  updatedAt: string
  messageCount?: number
  negotiationCount?: number
}

export interface SessionMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant' | 'options' | 'recommendations'
  content: string
  createdAt: string
}

// ── WhatsApp connection ────────────────────────────────────────────────────

export type WhatsAppConnectionStatus = 'disconnected' | 'connecting' | 'qr_ready' | 'connected'
