import { useState } from 'react'
import { previewEmail, sendEmail } from '../../lib/emailApi'
import './EmailModal.css'

const SENDER_NAME_KEY = 'waddle_sender_name'

export function EmailModal({ item, onClose }) {
  const { company, email: supplierEmail, price } = item

  // Form state
  const [recipientEmail, setRecipientEmail] = useState(supplierEmail ?? '')
  const [product, setProduct] = useState('')
  const [quantity, setQuantity] = useState('')
  const [targetPrice, setTargetPrice] = useState(price ?? '')
  const [senderName, setSenderName] = useState(
    () => localStorage.getItem(SENDER_NAME_KEY) ?? ''
  )

  // Draft state
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  const [step, setStep] = useState('form') // form | generating | preview | sending | done | error
  const [error, setError] = useState(null)

  async function handleGenerate() {
    if (!recipientEmail.trim() || !product.trim() || !quantity.trim() ||
        !targetPrice.trim() || !senderName.trim()) {
      setError('Please fill in all fields.')
      return
    }
    setError(null)
    setStep('generating')
    localStorage.setItem(SENDER_NAME_KEY, senderName.trim())

    try {
      const draft = await previewEmail({
        supplierName: company,
        supplierEmail: recipientEmail.trim(),
        product: product.trim(),
        quantity: quantity.trim(),
        targetPrice: targetPrice.trim(),
        senderName: senderName.trim(),
      })
      setSubject(draft.subject)
      setBody(draft.body)
      setStep('preview')
    } catch (err) {
      setError(err.message)
      setStep('form')
    }
  }

  async function handleSend() {
    setStep('sending')
    try {
      await sendEmail({ to: recipientEmail.trim(), subject, body })
      setStep('done')
    } catch (err) {
      setError(err.message)
      setStep('error')
    }
  }

  function handleRetry() {
    setError(null)
    setStep('form')
  }

  return (
    <div
      className="email-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="email-modal" role="dialog" aria-modal="true" aria-label={`Email ${company}`}>

        {/* ── Header ── */}
        <div className="email-modal__header">
          <div>
            <h2 className="email-modal__title">Email {company}</h2>
            <p className="email-modal__subtitle">
              {step === 'preview' || step === 'done'
                ? `To: ${recipientEmail}`
                : 'AI will draft the email — you review before sending'}
            </p>
          </div>
          <button className="email-modal__close" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        {/* ── Form ── */}
        {step === 'form' && (
          <div className="email-modal__body">
            <div className="email-field">
              <label className="email-label">Supplier email</label>
              <input
                className="email-input"
                type="email"
                placeholder="supplier@company.com"
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
              />
            </div>
            <div className="email-field">
              <label className="email-label">Product / item needed</label>
              <input
                className="email-input"
                type="text"
                placeholder="e.g. A4 paper 80gsm"
                value={product}
                onChange={e => setProduct(e.target.value)}
              />
            </div>
            <div className="email-field">
              <label className="email-label">Quantity required</label>
              <input
                className="email-input"
                type="text"
                placeholder="e.g. 100 reams"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
              />
            </div>
            <div className="email-field">
              <label className="email-label">Target price / budget</label>
              <input
                className="email-input"
                type="text"
                placeholder="e.g. RM 4,500"
                value={targetPrice}
                onChange={e => setTargetPrice(e.target.value)}
              />
            </div>
            <div className="email-field">
              <label className="email-label">Your name</label>
              <input
                className="email-input"
                type="text"
                placeholder="e.g. Ahmad bin Razali"
                value={senderName}
                onChange={e => setSenderName(e.target.value)}
              />
            </div>
            {error && <p className="email-error">{error}</p>}
            <button className="email-btn email-btn--primary" onClick={handleGenerate}>
              <SparkleIcon />
              Generate Email Draft
            </button>
          </div>
        )}

        {/* ── Generating ── */}
        {step === 'generating' && (
          <div className="email-modal__body email-modal__body--center">
            <div className="email-spinner" />
            <p className="email-status-text">Lua AI is drafting your email…</p>
          </div>
        )}

        {/* ── Preview / edit ── */}
        {step === 'preview' && (
          <div className="email-modal__body email-modal__body--preview">
            <div className="email-field">
              <label className="email-label">Subject</label>
              <input
                className="email-input"
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
              />
            </div>
            <div className="email-field email-field--grow">
              <label className="email-label">Body — edit before sending</label>
              <textarea
                className="email-textarea"
                value={body}
                onChange={e => setBody(e.target.value)}
                spellCheck
              />
            </div>
            <div className="email-preview__actions">
              <button className="email-btn email-btn--secondary" onClick={() => setStep('form')}>
                Back
              </button>
              <button className="email-btn email-btn--primary" onClick={handleSend}>
                <SendIcon />
                Send Email
              </button>
            </div>
          </div>
        )}

        {/* ── Sending ── */}
        {step === 'sending' && (
          <div className="email-modal__body email-modal__body--center">
            <div className="email-spinner" />
            <p className="email-status-text">Sending email…</p>
          </div>
        )}

        {/* ── Done ── */}
        {step === 'done' && (
          <div className="email-modal__body email-modal__body--center">
            <div className="email-success-icon">
              <CheckIcon />
            </div>
            <p className="email-status-text">Email sent to {company}!</p>
            <p className="email-status-sub">{recipientEmail}</p>
            <button className="email-btn email-btn--primary" onClick={onClose}>
              Done
            </button>
          </div>
        )}

        {/* ── Error ── */}
        {step === 'error' && (
          <div className="email-modal__body email-modal__body--center">
            <p className="email-error">{error}</p>
            <button className="email-btn email-btn--secondary" onClick={handleRetry}>
              Try Again
            </button>
          </div>
        )}
      </div>
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

function SparkleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/>
      <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75z"/>
      <path d="M5 3l.5 1.5L7 5l-1.5.5L5 7l-.5-1.5L3 5l1.5-.5z"/>
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
