import { useState, useEffect, useRef } from 'react'
import { startNegotiation, subscribeToNegotiation } from '../../lib/negotiateApi.js'
import { useWhatsAppStatus } from '../../hooks/useWhatsAppStatus.js'
import { WhatsAppConnect } from '../WhatsAppConnect/WhatsAppConnect.jsx'
import './NegotiateModal.css'

const TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

export function NegotiateModal({ item, sessionId, onClose }) {
  const { company, phone, price } = item

  const { isConnected } = useWhatsAppStatus()
  const [step, setStep] = useState('form') // connect | form | sending | negotiating | done | error
  const [product, setProduct] = useState('')
  const [quantity, setQuantity] = useState('')
  const [targetPrice, setTargetPrice] = useState(price ?? '')
  const [error, setError] = useState(null)

  // Right panel — live WhatsApp chat
  const [messages, setMessages] = useState([])
  const [isTyping, setIsTyping] = useState(false)
  const [summary, setSummary] = useState(null)

  // Left panel — AI activity
  const [activity, setActivity] = useState('Initialising...')
  const [extraction, setExtraction] = useState({ price: null, moq: null, leadTime: null })
  const [elapsed, setElapsed] = useState(0)

  const unsubscribeRef = useRef(null)
  const timeoutRef = useRef(null)
  const timerRef = useRef(null)
  const threadEndRef = useRef(null)

  useEffect(() => () => stopSession(), [])

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  function stopSession() {
    unsubscribeRef.current?.()
    clearTimeout(timeoutRef.current)
    clearInterval(timerRef.current)
  }

  function startSession(id) {
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)

    timeoutRef.current = setTimeout(() => {
      stopSession()
      setError('Negotiation timed out after 30 minutes.')
      setStep('error')
    }, TIMEOUT_MS)

    unsubscribeRef.current = subscribeToNegotiation(id, {
      onMessage: msg => setMessages(prev => [...prev, msg]),
      onStatus: ({ status, summary: s }) => {
        if (status === 'done') {
          stopSession()
          if (s) setSummary(s)
          setStep('done')
        } else if (status === 'failed') {
          stopSession()
          setError('The negotiation encountered an unexpected error.')
          setStep('error')
        }
      },
      onActivity: ({ text }) => setActivity(text),
      onTyping: ({ isTyping: t }) => setIsTyping(t),
      onExtraction: data => setExtraction(prev => ({ ...prev, ...data })),
      onError: () => {
        // SSE connection dropped — non-fatal, events may resume
        setActivity('Connection interrupted — reconnecting...')
      },
    })
  }

  async function handleSend() {
    if (!product.trim() || !quantity.trim() || !targetPrice.trim()) {
      setError('Please fill in all fields.')
      return
    }
    setError(null)
    setStep('sending')

    try {
      const result = await startNegotiation({
        supplier: company,
        phone,
        product: product.trim(),
        quantity: quantity.trim(),
        targetPrice: targetPrice.trim(),
        sessionId: sessionId ?? undefined,
      })
      setStep('negotiating')
      setActivity('Connecting to WhatsApp...')
      startSession(result.id)
    } catch (err) {
      setError(err.message)
      setStep('form')
    }
  }

  function handleRetry() {
    stopSession()
    setElapsed(0)
    setMessages([])
    setSummary(null)
    setError(null)
    setActivity('Initialising...')
    setExtraction({ price: null, moq: null, leadTime: null })
    setIsTyping(false)
    setStep('form')
  }

  function formatElapsed(s) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m > 0 ? `${m}m ${sec.toString().padStart(2, '0')}s` : `${sec}s`
  }

  function formatTime(iso) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div
      className="neg-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className={`neg-modal ${step === 'negotiating' || step === 'done' ? 'neg-modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={`Negotiate with ${company}`}
      >
        {/* ── Header ── */}
        <div className="neg-modal__header">
          <div>
            <h2 className="neg-modal__title">Negotiate with {company}</h2>
            <p className="neg-modal__subtitle">
              {phone ? `WhatsApp · ${phone}` : 'No phone number on record'}
            </p>
          </div>
          <button className="neg-modal__close" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        {/* ── Connect WhatsApp (shown if not linked when modal opens) ── */}
        {step === 'form' && !isConnected && (
          <WhatsAppConnect
            onConnected={() => {/* isConnected will update automatically via hook */}}
            onClose={onClose}
          />
        )}

        {/* ── Form ── */}
        {step === 'form' && isConnected && (
          <div className="neg-modal__body">
            {!phone && (
              <div className="neg-alert">
                This supplier has no phone number — WhatsApp negotiation requires one.
              </div>
            )}
            <div className="neg-field">
              <label className="neg-label">Product / item</label>
              <input
                className="neg-input"
                type="text"
                placeholder="e.g. A4 paper 80gsm"
                value={product}
                onChange={e => setProduct(e.target.value)}
                disabled={!phone}
              />
            </div>
            <div className="neg-field">
              <label className="neg-label">Quantity needed</label>
              <input
                className="neg-input"
                type="text"
                placeholder="e.g. 100 reams"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                disabled={!phone}
              />
            </div>
            <div className="neg-field">
              <label className="neg-label">Target price</label>
              <input
                className="neg-input"
                type="text"
                placeholder="e.g. RM 4,500"
                value={targetPrice}
                onChange={e => setTargetPrice(e.target.value)}
                disabled={!phone}
              />
            </div>
            {error && <p className="neg-error">{error}</p>}
            <button
              className="neg-btn neg-btn--primary"
              onClick={handleSend}
              disabled={!phone}
            >
              <WhatsAppIcon />
              Start Negotiation
            </button>
          </div>
        )}

        {/* ── Sending ── */}
        {step === 'sending' && (
          <div className="neg-modal__body neg-modal__body--center">
            <div className="neg-spinner" />
            <p className="neg-status-text">Connecting to WhatsApp...</p>
          </div>
        )}

        {/* ── Negotiating — split screen ── */}
        {(step === 'negotiating' || step === 'done') && (
          <div className="neg-split">

            {/* Left panel: AI Brain */}
            <div className="neg-panel neg-panel--ai">
              <div className="neg-panel__header">
                <BrainIcon />
                <span>Waddle AI</span>
              </div>

              <div className="neg-ai-activity">
                <div className="neg-activity-dot" />
                <p className="neg-activity-text">{activity}</p>
              </div>

              <div className="neg-ai-timer">
                <span className="neg-timer">{formatElapsed(elapsed)}</span>
                <span className="neg-hint">elapsed</span>
              </div>

              {/* Extracted terms — fills in as supplier reveals info */}
              <div className="neg-extracted">
                <p className="neg-extracted__title">Extracted Terms</p>
                <ExtractedRow label="Price" value={extraction.price} />
                <ExtractedRow label="MOQ" value={extraction.moq} />
                <ExtractedRow label="Lead time" value={extraction.leadTime} />
              </div>

              {step === 'done' && summary && (
                <div className="neg-summary">
                  <p className="neg-summary__label">Final Summary</p>
                  <p className="neg-summary__text">{summary}</p>
                </div>
              )}

              {step === 'done' && (
                <button className="neg-btn neg-btn--primary" onClick={onClose}>
                  Done
                </button>
              )}
            </div>

            {/* Right panel: WhatsApp chat */}
            <div className="neg-panel neg-panel--chat">
              <div className="neg-panel__header neg-panel__header--wa">
                <WhatsAppIcon />
                <div>
                  <p className="neg-chat-name">{company}</p>
                  <p className="neg-chat-phone">{phone}</p>
                </div>
                {step === 'done' && (
                  <span className="neg-done-badge">Done</span>
                )}
              </div>

              <div className="neg-thread">
                {messages.length === 0 ? (
                  <div className="neg-thread__empty">
                    <div className="neg-pulse-ring" />
                    <p className="neg-status-sub">Opening message sending...</p>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`neg-bubble neg-bubble--${msg.role === 'agent' ? 'agent' : 'supplier'}`}
                    >
                      <p className="neg-bubble__text">{msg.text}</p>
                      <span className="neg-bubble__time">{formatTime(msg.timestamp)}</span>
                    </div>
                  ))
                )}

                {isTyping && (
                  <div className="neg-bubble neg-bubble--agent neg-bubble--typing">
                    <TypingDots />
                  </div>
                )}

                <div ref={threadEndRef} />
              </div>
            </div>

          </div>
        )}

        {/* ── Error ── */}
        {step === 'error' && (
          <div className="neg-modal__body neg-modal__body--center">
            <p className="neg-error">{error}</p>
            <button className="neg-btn neg-btn--secondary" onClick={handleRetry}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ExtractedRow({ label, value }) {
  return (
    <div className="neg-extracted__row">
      <span className="neg-extracted__label">{label}</span>
      <span className={`neg-extracted__value ${value ? 'neg-extracted__value--filled' : ''}`}>
        {value ?? '—'}
      </span>
    </div>
  )
}

function TypingDots() {
  return (
    <div className="neg-typing-dots">
      <span /><span /><span />
    </div>
  )
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function BrainIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3Z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3Z" />
    </svg>
  )
}
