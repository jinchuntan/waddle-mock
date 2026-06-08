import { useState, useEffect, useCallback } from 'react'
import { getSessions, deleteSession } from '../../lib/sessionsApi'
import './SessionsSidebar.css'

export function SessionsSidebar({ activeSessionId, onSelectSession, onNewSession, user, onSignIn }) {
  const [sessions, setSessions]   = useState([])
  const [loading, setLoading]     = useState(false)
  const [dismissing, setDismissing] = useState(new Set())

  const load = useCallback(() => {
    if (!user) return
    setLoading(true)
    getSessions()
      .then(setSessions)
      .catch(err => console.error('[sidebar] load failed:', err))
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (activeSessionId) load()
  }, [activeSessionId, load])

  async function handleDelete(e, id) {
    e.stopPropagation()
    setDismissing(prev => new Set([...prev, id]))
    await deleteSession(id)
    // Wait for CSS animation before removing from state
    setTimeout(() => {
      setSessions(prev => prev.filter(s => s.id !== id))
      setDismissing(prev => { const n = new Set(prev); n.delete(id); return n })
      if (activeSessionId === id) onNewSession()
    }, 280)
  }

  return (
    <aside className="sessions-sidebar">
      <div className="sessions-sidebar__header">
        <span className="sessions-sidebar__title">Procurements</span>
        <button
          className="sessions-sidebar__new-btn"
          onClick={onNewSession}
          title="New procurement"
        >
          <PlusIcon />
          New
        </button>
      </div>

      <div className="sessions-sidebar__list">
        {!user && (
          <div className="sessions-sidebar__signin">
            <p>Sign in to save and revisit your procurement history.</p>
            <button className="sessions-sidebar__signin-btn" onClick={onSignIn}>
              Sign in with Google
            </button>
          </div>
        )}
        {user && loading && (
          <p className="sessions-sidebar__empty">Loading…</p>
        )}
        {user && !loading && sessions.length === 0 && (
          <p className="sessions-sidebar__empty">No procurements yet.<br />Start a search above.</p>
        )}
        {user && sessions.map(session => (
          <button
            key={session.id}
            data-dismissing={dismissing.has(session.id) ? 'true' : undefined}
            className={`session-item${session.id === activeSessionId ? ' session-item--active' : ''}`}
            onClick={() => onSelectSession(session.id)}
          >
            <div className="session-item__body">
              <p className="session-item__title">{session.title}</p>
              <p className="session-item__meta">
                {formatDate(session.updatedAt)}
                {session.negotiationCount > 0 && (
                  <span className="session-item__badge">{session.negotiationCount} nego</span>
                )}
              </p>
            </div>
            <button
              className="session-item__delete"
              onClick={e => handleDelete(e, session.id)}
              title="Delete"
              aria-label="Delete session"
            >
              <TrashIcon />
            </button>
          </button>
        ))}
      </div>
    </aside>
  )
}

function formatDate(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now - d
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  )
}
