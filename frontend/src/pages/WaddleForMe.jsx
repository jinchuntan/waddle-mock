import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import './WaddleForMe.css'

export function WaddleForMe({ user, onSignIn }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    contactType: 'phone',
    supplierContact: '',
    productDescription: '',
    quantity: '',
    budget: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [job, setJob] = useState(null)
  const [error, setError] = useState(null)

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await apiFetch('/api/waddle-for-me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactType: form.contactType,
          supplierContact: form.supplierContact.trim(),
          productDescription: form.productDescription.trim(),
          quantity: form.quantity.trim() || undefined,
          budget: form.budget.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Error ${res.status}`)
      }
      setJob(await res.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="wfm">
      {/* Nav */}
      <header className="wfm-nav">
        <button className="wfm-nav__logo" onClick={() => navigate('/')}>
          <img src="/logo.jpg" alt="Waddle" className="wfm-nav__logo-img" />
          <span className="wfm-nav__logo-name">Waddle</span>
        </button>
        <div className="wfm-nav__right">
          {user ? (
            <button className="wfm-nav__btn" onClick={() => navigate('/app')}>
              Go to App
            </button>
          ) : (
            <button className="wfm-nav__btn" onClick={onSignIn}>
              <GoogleIcon /> Sign in
            </button>
          )}
        </div>
      </header>

      <div className="wfm-body">
        {job ? (
          /* Success state */
          <div className="wfm-success">
            <div className="wfm-success__icon">
              <CheckCircleIcon />
            </div>
            <h1 className="wfm-success__heading">You're all set!</h1>
            <p className="wfm-success__sub">
              Waddle is on it. We'll negotiate with your supplier and report back in 6–8 hours.
            </p>
            <div className="wfm-success__card">
              <div className="wfm-success__row">
                <span className="wfm-success__label">Job ID</span>
                <span className="wfm-success__val wfm-success__val--mono">{job.id.slice(0, 8)}…</span>
              </div>
              <div className="wfm-success__row">
                <span className="wfm-success__label">Supplier</span>
                <span className="wfm-success__val">{job.supplierContact}</span>
              </div>
              <div className="wfm-success__row">
                <span className="wfm-success__label">Status</span>
                <span className="wfm-success__badge">Pending</span>
              </div>
            </div>
            <div className="wfm-success__actions">
              <button className="wfm-btn wfm-btn--primary" onClick={() => setJob(null)}>
                Submit another
              </button>
              <button className="wfm-btn wfm-btn--ghost" onClick={() => navigate('/app')}>
                Go to chat
              </button>
            </div>
          </div>
        ) : (
          /* Form */
          <div className="wfm-form-wrap">
            <div className="wfm-form-header">
              <span className="wfm-eyebrow">Done for you</span>
              <h1 className="wfm-heading">Waddle for Me</h1>
              <p className="wfm-sub">
                Give us the supplier's contact and what you want to procure.
                We'll handle the negotiation and report back in 6–8 hours.
              </p>
            </div>

            {!user ? (
              <div className="wfm-signin-gate">
                <p>Sign in to use this service.</p>
                <button className="wfm-btn wfm-btn--primary" onClick={onSignIn}>
                  <GoogleIcon /> Sign in with Google
                </button>
              </div>
            ) : (
              <form className="wfm-form" onSubmit={handleSubmit}>
                {/* Contact type */}
                <div className="wfm-field">
                  <label className="wfm-label">Contact type</label>
                  <div className="wfm-radio-group">
                    <label className={`wfm-radio ${form.contactType === 'phone' ? 'wfm-radio--active' : ''}`}>
                      <input
                        type="radio"
                        name="contactType"
                        value="phone"
                        checked={form.contactType === 'phone'}
                        onChange={set('contactType')}
                      />
                      <PhoneIcon /> WhatsApp / Phone
                    </label>
                    <label className={`wfm-radio ${form.contactType === 'email' ? 'wfm-radio--active' : ''}`}>
                      <input
                        type="radio"
                        name="contactType"
                        value="email"
                        checked={form.contactType === 'email'}
                        onChange={set('contactType')}
                      />
                      <EmailIcon /> Email
                    </label>
                  </div>
                </div>

                {/* Supplier contact */}
                <div className="wfm-field">
                  <label className="wfm-label" htmlFor="supplierContact">
                    {form.contactType === 'phone' ? 'Supplier phone number' : 'Supplier email address'}
                  </label>
                  <input
                    id="supplierContact"
                    className="wfm-input"
                    type={form.contactType === 'email' ? 'email' : 'tel'}
                    placeholder={form.contactType === 'phone' ? '+60 12-345 6789' : 'supplier@example.com'}
                    value={form.supplierContact}
                    onChange={set('supplierContact')}
                    required
                  />
                </div>

                {/* Product description */}
                <div className="wfm-field">
                  <label className="wfm-label" htmlFor="productDescription">
                    What do you want to procure?
                  </label>
                  <textarea
                    id="productDescription"
                    className="wfm-textarea"
                    placeholder="e.g. 500 units of A4 paper, 80gsm, brand doesn't matter"
                    value={form.productDescription}
                    onChange={set('productDescription')}
                    rows={3}
                    required
                  />
                </div>

                {/* Quantity + Budget — two columns */}
                <div className="wfm-field-row">
                  <div className="wfm-field">
                    <label className="wfm-label" htmlFor="quantity">
                      Quantity <span className="wfm-optional">(optional)</span>
                    </label>
                    <input
                      id="quantity"
                      className="wfm-input"
                      placeholder="e.g. 500 units"
                      value={form.quantity}
                      onChange={set('quantity')}
                    />
                  </div>
                  <div className="wfm-field">
                    <label className="wfm-label" htmlFor="budget">
                      Target budget <span className="wfm-optional">(optional)</span>
                    </label>
                    <input
                      id="budget"
                      className="wfm-input"
                      placeholder="e.g. RM 200 total"
                      value={form.budget}
                      onChange={set('budget')}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="wfm-field">
                  <label className="wfm-label" htmlFor="notes">
                    Any additional instructions <span className="wfm-optional">(optional)</span>
                  </label>
                  <textarea
                    id="notes"
                    className="wfm-textarea"
                    placeholder="e.g. Ask for bulk discount, need delivery by Friday, prefer cash on delivery"
                    value={form.notes}
                    onChange={set('notes')}
                    rows={2}
                  />
                </div>

                {error && <p className="wfm-error">{error}</p>}

                <button className="wfm-btn wfm-btn--primary wfm-btn--submit" type="submit" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Let Waddle handle it'} {!submitting && <ArrowIcon />}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 10h12M10 4l6 6-6 6" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .99h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  )
}

function EmailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
