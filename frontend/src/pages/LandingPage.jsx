import { useNavigate } from 'react-router-dom'
import './LandingPage.css'

export function LandingPage({ user, onSignIn }) {
  const navigate = useNavigate()

  function goToApp() { navigate('/app') }
  function goToWaddleForMe() {
    if (!user) { onSignIn(); return }
    navigate('/waddle-for-me')
  }

  return (
    <div className="landing">

      {/* ── Navbar ── */}
      <header className="landing-nav">
        <div className="landing-nav__logo">
          <img src="/logo.jpg" alt="Waddle AI procurement tool" className="landing-nav__logo-img" />
          <span className="landing-nav__logo-name">Waddle</span>
        </div>
        <div className="landing-nav__right">
          {user ? (
            <div className="landing-nav__user">
              {user.avatar && (
                <img src={user.avatar} alt={user.name} className="landing-nav__avatar" referrerPolicy="no-referrer" />
              )}
              <button className="landing-nav__btn landing-nav__btn--outline" onClick={goToApp}>
                Go to App
              </button>
            </div>
          ) : (
            <button className="landing-nav__btn landing-nav__btn--outline" onClick={onSignIn}>
              <GoogleIcon /> Sign in
            </button>
          )}
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-hero__eyebrow">Agentic AI Procurement Platform for Malaysian and Singaporean SMEs</div>
        <h1 className="landing-hero__headline">
          Your AI procurement agent,<br />
          <span className="landing-hero__accent">working while you grow.</span>
        </h1>
        <p className="landing-hero__sub">
          Waddle's agentic AI autonomously contacts suppliers, negotiates prices,
          and closes deals via WhatsApp or email. Spend more time improving your
          business and leave procurement to us.
        </p>
        <div className="landing-hero__ctas">
          <button className="landing-btn landing-btn--primary" onClick={goToWaddleForMe}>
            Let Waddle negotiate <ArrowIcon />
          </button>
          <button className="landing-btn landing-btn--ghost" onClick={goToApp}>
            Search suppliers first
          </button>
        </div>
        <div className="landing-hero__markets">
          <span>🇲🇾 Malaysia</span>
          <span className="landing-hero__dot" />
          <span>🇸🇬 Singapore</span>
        </div>
      </section>

      {/* ── Two paths ── */}
      <section className="landing-paths" aria-label="How to use Waddle">
        <div className="landing-paths__grid">

          {/* Self-serve */}
          <div className="landing-card">
            <div className="landing-card__icon landing-card__icon--blue">
              <SearchIcon />
            </div>
            <h2 className="landing-card__title">Search and Compare</h2>
            <p className="landing-card__desc">
              Not sure who to contact yet? Tell Waddle what you need and get
              ranked supplier recommendations with prices and contacts in minutes.
              Then hand it off to Waddle for Me to negotiate for you.
            </p>
            <ul className="landing-card__features">
              <li><CheckIcon /> AI-powered supplier search</li>
              <li><CheckIcon /> Price and contact comparison</li>
              <li><CheckIcon /> 4 ranked recommendations</li>
              <li><CheckIcon /> Export to Excel</li>
              <li><CheckIcon /> Follow-up Q&amp;A with Waddle</li>
            </ul>
            <button className="landing-btn landing-btn--primary landing-btn--full" onClick={goToApp}>
              Search suppliers <ArrowIcon />
            </button>
          </div>

          {/* Done-for-you */}
          <div className="landing-card landing-card--highlight">
            <div className="landing-card__badge">New</div>
            <div className="landing-card__icon landing-card__icon--teal">
              <BoltIcon />
            </div>
            <h2 className="landing-card__title">Waddle for Me</h2>
            <p className="landing-card__desc">
              Our agentic AI autonomously contacts your supplier via WhatsApp or
              email, negotiates the best price on your behalf, and delivers a full
              report. You focus on your business. We handle procurement.
            </p>
            <ul className="landing-card__features">
              <li><CheckIcon /> Agentic AI negotiates autonomously</li>
              <li><CheckIcon /> Works via WhatsApp or email</li>
              <li><CheckIcon /> Tailored to your communication channel</li>
              <li><CheckIcon /> 6 to 8 hour turnaround</li>
              <li><CheckIcon /> Full negotiation report delivered</li>
            </ul>
            <button className="landing-btn landing-btn--teal landing-btn--full" onClick={goToWaddleForMe}>
              Let Waddle handle it <ArrowIcon />
            </button>
            {!user && (
              <p className="landing-card__auth-note">Requires sign-in</p>
            )}
          </div>

        </div>
      </section>

      {/* ── How it works ── */}
      <section className="landing-how" aria-label="How Waddle works">
        <h2 className="landing-how__heading">How it works</h2>
        <div className="landing-how__grid">

          <div className="landing-how__col">
            <h3 className="landing-how__col-title">Search and Compare</h3>
            <div className="landing-steps">
              <div className="landing-step">
                <span className="landing-step__num">1</span>
                <div>
                  <strong>Describe what you need</strong>
                  <p>Product, quantity, budget, and timeline. Waddle asks the right questions.</p>
                </div>
              </div>
              <div className="landing-step">
                <span className="landing-step__num">2</span>
                <div>
                  <strong>Waddle searches for you</strong>
                  <p>We scan curated supplier directories across Malaysia and Singapore.</p>
                </div>
              </div>
              <div className="landing-step">
                <span className="landing-step__num">3</span>
                <div>
                  <strong>Compare and decide</strong>
                  <p>Get 4 ranked suppliers with prices and contacts. Reach out with one click.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="landing-how__divider" role="separator" />

          <div className="landing-how__col">
            <h3 className="landing-how__col-title">Waddle for Me</h3>
            <div className="landing-steps">
              <div className="landing-step">
                <span className="landing-step__num landing-step__num--teal">1</span>
                <div>
                  <strong>Give us the supplier's contact</strong>
                  <p>WhatsApp number or email, what you need, and your target price. That is all we need.</p>
                </div>
              </div>
              <div className="landing-step">
                <span className="landing-step__num landing-step__num--teal">2</span>
                <div>
                  <strong>Our agentic AI takes over</strong>
                  <p>Waddle autonomously reaches out via your chosen channel, negotiates pricing, and handles all follow-ups.</p>
                </div>
              </div>
              <div className="landing-step">
                <span className="landing-step__num landing-step__num--teal">3</span>
                <div>
                  <strong>Get your report. Get back to work.</strong>
                  <p>Within 6 to 8 hours, receive a full negotiation report with what was agreed. Zero effort from you.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="landing-faq" aria-label="Frequently asked questions about Waddle">
        <h2 className="landing-faq__heading">Frequently asked questions</h2>
        <div className="landing-faq__list">
          <details className="landing-faq__item">
            <summary className="landing-faq__q">What is Waddle?</summary>
            <p className="landing-faq__a">Waddle is an agentic AI procurement platform built for SMEs in Malaysia and Singapore. It autonomously contacts suppliers, negotiates prices, and closes deals via WhatsApp or email on your behalf, so you can spend more time growing your business and less time chasing quotes.</p>
          </details>
          <details className="landing-faq__item">
            <summary className="landing-faq__q">How does Waddle find suppliers?</summary>
            <p className="landing-faq__a">Waddle uses AI to search curated supplier directories across Malaysia and Singapore. Describe what you need and it returns up to 4 ranked supplier recommendations with prices and contact details within minutes.</p>
          </details>
          <details className="landing-faq__item">
            <summary className="landing-faq__q">What is the Waddle for Me service?</summary>
            <p className="landing-faq__a">Waddle for Me uses agentic AI to autonomously contact and negotiate prices with suppliers on behalf of SMEs. You provide the supplier's WhatsApp number or email, your procurement requirements, and your target price. Waddle's AI agent reaches out through your preferred channel, conducts the full negotiation autonomously, and delivers a detailed report within 6 to 8 hours. This lets you spend more time improving your business while we handle procurement.</p>
          </details>
          <details className="landing-faq__item">
            <summary className="landing-faq__q">Who built Waddle?</summary>
            <p className="landing-faq__a">Waddle is built by <a href="https://www.fovea.space/" target="_blank" rel="noopener noreferrer">Fovea</a>, a company focused on AI tools for Southeast Asian SMEs. The AI is powered by <a href="https://heylua.ai/" target="_blank" rel="noopener noreferrer">Lua AI</a>, a Y Combinator-backed company.</p>
          </details>
          <details className="landing-faq__item">
            <summary className="landing-faq__q">Which countries does Waddle support?</summary>
            <p className="landing-faq__a">Waddle currently serves SMEs in Malaysia and Singapore, with supplier directories covering both markets.</p>
          </details>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="landing-cta" aria-label="Get started with Waddle">
        <h2 className="landing-cta__heading">
          Focus on your business.<br />Leave procurement to us.
        </h2>
        <p className="landing-cta__sub">
          Join SMEs in Malaysia and Singapore using agentic AI to negotiate better deals,
          faster, via WhatsApp and email.
        </p>
        <div className="landing-cta__btns">
          {user ? (
            <button className="landing-btn landing-btn--primary landing-btn--lg" onClick={goToApp}>
              Go to App <ArrowIcon />
            </button>
          ) : (
            <button className="landing-btn landing-btn--primary landing-btn--lg" onClick={onSignIn}>
              <GoogleIcon /> Sign in with Google
            </button>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <span>
          Built by <a href="https://www.fovea.space/" target="_blank" rel="noopener noreferrer" className="landing-footer__link">Fovea</a>
          {' '}&middot;{' '}
          Powered by <a href="https://heylua.ai/" target="_blank" rel="noopener noreferrer" className="landing-footer__link">Lua AI</a> (YC-backed)
        </span>
        <span>Malaysia &amp; Singapore</span>
      </footer>

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

function SearchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

function BoltIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
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
