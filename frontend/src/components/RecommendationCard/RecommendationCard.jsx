import './RecommendationCard.css'

export function RecommendationCard({ item, onNegotiate, onEmail }) {
  const { company, price, phone, email, website } = item

  function handleBuyNow() {
    if (website) window.open(website, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="rec-card">
      <div className="rec-card__body">
        <h3 className="rec-card__company">{company}</h3>

        {price && (
          <p className="rec-card__price">{price}</p>
        )}

        <div className="rec-card__contacts">
          {phone && (
            <a className="rec-card__contact" href={`tel:${phone}`}>
              <PhoneIcon />
              <span>{phone}</span>
            </a>
          )}
          {email && (
            <a className="rec-card__contact" href={`mailto:${email}`}>
              <EmailIcon />
              <span>{email}</span>
            </a>
          )}
          {website && (
            <a
              className="rec-card__contact rec-card__contact--link"
              href={website}
              target="_blank"
              rel="noopener noreferrer"
            >
              <GlobeIcon />
              <span>{website.replace(/^https?:\/\//, '')}</span>
            </a>
          )}
        </div>
      </div>

      <div className={`rec-card__actions ${!phone ? 'rec-card__actions--email-only' : ''}`}>
        {/* Buy Now — left slot */}
        <button
          className="rec-card__btn rec-card__btn--buy"
          onClick={handleBuyNow}
          disabled={!website}
          title={website ? 'Open supplier website' : 'No website available'}
        >
          Buy Now
        </button>

        {/* Email — only shown when supplier has no phone (email-only) or always */}
        <button
          className="rec-card__btn rec-card__btn--email"
          onClick={() => onEmail(item)}
          title="Send procurement email"
        >
          <EmailBtnIcon />
          {phone ? 'Email' : 'Send Email'}
        </button>

        {/* Negotiate via WhatsApp — only when phone exists */}
        {phone && (
          <button
            className="rec-card__btn rec-card__btn--negotiate"
            onClick={() => onNegotiate(item)}
            title="Negotiate via WhatsApp"
          >
            Negotiate
          </button>
        )}
      </div>
    </div>
  )
}

function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.5 10.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012.41 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l1.27-.81a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
    </svg>
  )
}

function EmailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  )
}

function EmailBtnIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
    </svg>
  )
}
