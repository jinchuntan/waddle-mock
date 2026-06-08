import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { useLocation } from '../../context/LocationContext'
import { useWaddleChat } from '../../hooks/useWaddleChat'
import { QuestionCard } from '../QuestionCard/QuestionCard'
import { RecommendationCard } from '../RecommendationCard/RecommendationCard'
import { NegotiateModal } from '../NegotiateModal/NegotiateModal'
import { EmailModal } from '../EmailModal/EmailModal'
import { WaddlingLoader } from '../WaddlingLoader/WaddlingLoader'
import { exportRecommendationsToExcel } from '../../lib/exportToExcel'
import './HeroSearch.css'

export function HeroSearch({ sessionId = null, onSessionCreated = null }) {
  const { location } = useLocation()
  const {
    messages, isLoading, isSearching, send, answer,
    startNegotiate, closeNegotiation, negotiationItem,
    startEmail, closeEmail, emailItem,
    currentSessionId,
  } = useWaddleChat({ sessionId, onSessionCreated })
  const [query, setQuery] = useState('')
  const textareaRef = useRef(null)
  const messagesEndRef = useRef(null)

  const hasSentMessage = messages.length > 0

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSearching])

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }

  function handleChange(e) {
    setQuery(e.target.value)
    autoResize()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function submit() {
    const trimmed = query.trim()
    if (!trimmed || isLoading) return
    send(trimmed, location.searchInstruction)
    setQuery('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const isEmpty = !query.trim()

  return (
    <div className={`hero-wrapper${hasSentMessage ? ' hero-wrapper--chat' : ''}`}>
      {!hasSentMessage && (
        <section className="hero">
          <p className="hero__tagline">
            Waddling your way to the best deals for your business.
          </p>
          <h2 className="hero__heading">
            What are we waddling into today?
          </h2>
        </section>
      )}

      {hasSentMessage && (
        <div className="chat-thread">
          {messages.map((msg) => {
            if (msg.role === 'options') {
              return (
                <div key={msg.id} className="chat-msg chat-msg--assistant">
                  <QuestionCard
                    question={msg.question}
                    choices={msg.choices}
                    answered={msg.answered}
                    selectedChoice={msg.selectedChoice}
                    onAnswer={(choice) => answer(msg.id, choice)}
                  />
                </div>
              )
            }

            if (msg.role === 'recommendations') {
              return (
                <div key={msg.id} className="rec-section">
                  <div className="rec-section__header">
                    <span className="rec-section__label">4 recommendations</span>
                    <button
                      className="rec-section__export"
                      onClick={() => exportRecommendationsToExcel(msg.items)}
                      title="Download as Excel"
                    >
                      <DownloadIcon />
                      Export to Excel
                    </button>
                  </div>
                  <div className="rec-grid">
                    {msg.items.slice(0, 4).map((item, i) => (
                      <RecommendationCard
                        key={i}
                        item={item}
                        onNegotiate={startNegotiate}
                        onEmail={startEmail}
                      />
                    ))}
                  </div>
                </div>
              )
            }

            if (msg.role === 'user') {
              return (
                <div key={msg.id} className="chat-msg chat-msg--user">
                  <p className="chat-msg__text">{msg.text}</p>
                </div>
              )
            }

            // assistant — hide the raw streaming output while the search loader is active
            if (msg.streaming && isSearching) return null

            return (
              <div key={msg.id} className={`chat-msg chat-msg--assistant${msg.error ? ' chat-msg--error' : ''}`}>
                <div className="chat-msg__text chat-msg__text--md">
                  {msg.text && <ReactMarkdown>{msg.text}</ReactMarkdown>}
                  {msg.streaming && (
                    <span className="chat-cursor" aria-hidden="true" />
                  )}
                </div>
              </div>
            )
          })}

          {isSearching && <WaddlingLoader />}

          <div ref={messagesEndRef} />
        </div>
      )}

      <div className={`search-wrap${hasSentMessage ? ' search-wrap--bottom' : ''}`}>
        <form
          className="hero__form"
          onSubmit={(e) => { e.preventDefault(); submit() }}
        >
          <div className={`search-box${isEmpty ? '' : ' search-box--active'}`}>
            <textarea
              ref={textareaRef}
              className="search-box__input"
              rows={1}
              placeholder={
                hasSentMessage
                  ? 'Ask a follow-up…'
                  : `Search for products or suppliers in ${location.label}…`
              }
              value={query}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              aria-label="Procurement search"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="search-box__btn"
              disabled={isEmpty || isLoading}
              aria-label="Send"
            >
              {isLoading ? <SpinnerIcon /> : <ArrowIcon />}
            </button>
          </div>
          {!hasSentMessage && (
            <p className="hero__hint">
              Press <kbd>Enter</kbd> to search · <kbd>Shift + Enter</kbd> for a new line
            </p>
          )}
        </form>
      </div>

      {negotiationItem && (
        <NegotiateModal
          item={negotiationItem}
          sessionId={currentSessionId}
          onClose={closeNegotiation}
        />
      )}
      {emailItem && (
        <EmailModal
          item={emailItem}
          onClose={closeEmail}
        />
      )}
    </div>
  )
}

function ArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 10h12M10 4l6 6-6 6" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="spinner" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-label="Loading">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeDasharray="38" strokeDashoffset="15" />
    </svg>
  )
}
