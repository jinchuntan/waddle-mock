import { useState, useRef, useCallback, useEffect } from 'react'
import { streamMessage } from '../lib/waddleApi'
import { createSession, getSession, appendSessionMessage } from '../lib/sessionsApi'

const RECOMMENDATIONS_RE = /```recommendations\s*\n([\s\S]*?)\n?```/
const OPTIONS_RE = /```options\s*\n([\s\S]*?)\n?```/

const PROCUREMENT_QUESTIONS = [
  {
    q: 'How many units or items do you need?',
    choices: ['1–10 units', '11–50 units', '50+ units'],
  },
  {
    q: "What's your total budget?",
    choices: ['Under 1,000', '1,000–5,000', '5,000+'],
  },
  {
    q: 'When do you need it by?',
    choices: ['Within 1 week', '2–4 weeks', '1–3 months'],
  },
  {
    q: 'Any specific preferences?',
    choices: ['No preference', 'Local suppliers only', 'Best quality / premium'],
  },
]

function parseRecommendations(text) {
  const match = text.match(RECOMMENDATIONS_RE)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[1].trim())
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
  } catch {}
  return null
}

function parseOptionsBlock(text) {
  const match = text.match(OPTIONS_RE)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[1].trim())
    if (parsed.q && Array.isArray(parsed.a) && parsed.a.length > 0) {
      return { question: parsed.q, choices: parsed.a }
    }
  } catch {}
  return null
}

function compileProcurementMessage(originalQuery, answers, locationContext) {
  const [qty, budget, timeline, prefs] = answers
  const locationNote = locationContext ? `\n\nLocation context: ${locationContext}` : ''
  return `I'm looking to procure: ${originalQuery}

My requirements:
- Quantity: ${qty}
- Budget: ${budget}
- Timeline: ${timeline}
- Preferences: ${prefs}${locationNote}

Please find me the best 4 suppliers or vendors for this and present your recommendations.`
}

function reconstructMessages(dbMessages) {
  return dbMessages.map(dbMsg => {
    try {
      const parsed = JSON.parse(dbMsg.content)
      const base = { id: dbMsg.id }
      switch (dbMsg.role) {
        case 'user':
          return { ...base, role: 'user', text: parsed.text }
        case 'assistant':
          return { ...base, role: 'assistant', text: parsed.text, streaming: false }
        case 'options':
          return { ...base, role: 'options', ...parsed, answered: true }
        case 'recommendations':
          return { ...base, role: 'recommendations', items: parsed.items }
        default:
          return null
      }
    } catch {
      return null
    }
  }).filter(Boolean)
}

// sessionId: current session UUID from parent, or null for a fresh chat
// onSessionCreated: called with the new session ID when the first message creates a session
export function useWaddleChat({ sessionId = null, onSessionCreated = null } = {}) {
  const [messages, setMessages]     = useState([])
  const [isLoading, setIsLoading]   = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  const threadId        = useRef(crypto.randomUUID())
  const lastLocationRef = useRef(null)
  const flowRef         = useRef(null)
  const flowDoneRef     = useRef(false)

  // Tracks which session is actually loaded in state right now.
  // Updated immediately when we create a new session so persistence calls
  // can use the new ID before the parent prop re-renders.
  const activeSessionRef = useRef(null)

  // When the sessionId prop changes, load (or reset) the chat.
  // Skip if activeSessionRef already equals sessionId — that means WE just
  // created this session ourselves (via ensureSession), so messages are
  // already in state and we must not overwrite them with an empty DB fetch.
  useEffect(() => {
    if (activeSessionRef.current === sessionId) return

    activeSessionRef.current = sessionId

    if (sessionId === null) {
      setMessages([])
      flowRef.current = null
      flowDoneRef.current = false
      threadId.current = crypto.randomUUID()
      return
    }

    // User clicked a past session in the sidebar — restore it from DB
    getSession(sessionId).then(({ session, messages: dbMessages }) => {
      threadId.current = session.threadId
      const restored = reconstructMessages(dbMessages)
      setMessages(restored)
      flowDoneRef.current = restored.some(m => m.role === 'recommendations')
      flowRef.current = null
    }).catch(err => {
      console.error('[session] failed to load:', err)
    })
  }, [sessionId])

  // Persist a message to the current session (fire-and-forget)
  function persist(role, contentObj, overrideSid) {
    const sid = overrideSid ?? activeSessionRef.current
    if (!sid) return
    appendSessionMessage(sid, role, JSON.stringify(contentObj)).catch(err => {
      console.error('[session] persist failed:', err)
    })
  }

  // Creates a session on the first message if none exists yet; returns the session ID
  async function ensureSession(firstMessageText) {
    if (activeSessionRef.current) return activeSessionRef.current
    const title = firstMessageText.length > 50
      ? firstMessageText.slice(0, 50) + '…'
      : firstMessageText
    const session = await createSession(title, threadId.current)
    activeSessionRef.current = session.id
    onSessionCreated?.(session.id)
    return session.id
  }

  const _streamFromLLM = useCallback(async (llmMessage, sid, { searching = false } = {}) => {
    const assistantId = crypto.randomUUID()
    let fullText = ''

    if (searching) setIsSearching(true)
    setMessages(prev => [
      ...prev,
      { id: assistantId, role: 'assistant', text: '', streaming: true },
    ])
    setIsLoading(true)

    await streamMessage({
      message: llmMessage,
      locationContext: lastLocationRef.current,
      threadId: threadId.current,
      onChunk: (delta) => {
        fullText += delta
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, text: m.text + delta } : m)
        )
      },
      onDone: () => {
        setIsSearching(false)
        const activeSid = sid ?? activeSessionRef.current
        const recs = parseRecommendations(fullText)
        const opts = parseOptionsBlock(fullText)

        if (recs) {
          const cleanText = fullText.replace(RECOMMENDATIONS_RE, '').trim()
          // Side effects outside the updater — safe from StrictMode double-invocation
          flowDoneRef.current = true
          flowRef.current = null
          if (activeSid) {
            if (cleanText) persist('assistant', { text: cleanText }, activeSid)
            persist('recommendations', { items: recs }, activeSid)
          }
          setMessages(prev => [
            ...prev.map(m => m.id === assistantId ? { ...m, text: cleanText, streaming: false } : m),
            { id: crypto.randomUUID(), role: 'recommendations', items: recs },
          ])
        } else if (opts) {
          const cleanText = fullText.replace(OPTIONS_RE, '').trim()
          if (activeSid && cleanText) persist('assistant', { text: cleanText }, activeSid)
          setMessages(prev => [
            ...prev.map(m => m.id === assistantId ? { ...m, text: cleanText, streaming: false } : m),
            {
              id: crypto.randomUUID(),
              role: 'options',
              question: opts.question,
              choices: opts.choices,
              answered: false,
              selectedChoice: null,
            },
          ])
        } else {
          flowRef.current = null
          if (activeSid) persist('assistant', { text: fullText }, activeSid)
          setMessages(prev =>
            prev.map(m => m.id === assistantId ? { ...m, streaming: false } : m)
          )
        }

        setIsLoading(false)
      },
      onError: (errMsg) => {
        setIsSearching(false)
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, text: `Something went wrong — ${errMsg}`, streaming: false, error: true }
              : m
          )
        )
        setIsLoading(false)
        flowRef.current = null
      },
    })
  }, [])

  const send = useCallback(async (userText, locationContext) => {
    if (!userText.trim() || isLoading) return

    if (locationContext !== undefined) lastLocationRef.current = locationContext

    const sid = await ensureSession(userText)

    setMessages(prev => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', text: userText },
    ])
    persist('user', { text: userText }, sid)

    // First message — start 4-question procurement flow
    if (!flowRef.current && !flowDoneRef.current) {
      flowRef.current = { originalQuery: userText, answers: [] }
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'options',
          question: PROCUREMENT_QUESTIONS[0].q,
          choices: PROCUREMENT_QUESTIONS[0].choices,
          answered: false,
          selectedChoice: null,
        },
      ])
      return
    }

    // Follow-up after recommendations — direct LLM call
    await _streamFromLLM(userText, sid)
  }, [isLoading, _streamFromLLM])

  const answer = useCallback((questionId, choiceText) => {
    if (!flowRef.current) return

    // Capture question index BEFORE push (for persist)
    const questionIndex = flowRef.current.answers.length
    const questionData = PROCUREMENT_QUESTIONS[questionIndex]

    // Pure state update — no side effects inside the updater
    setMessages(prev =>
      prev.map(m => m.id === questionId ? { ...m, answered: true, selectedChoice: choiceText } : m)
    )

    // Persist outside the updater
    if (questionData) {
      persist('options', {
        question: questionData.q,
        choices: questionData.choices,
        answered: true,
        selectedChoice: choiceText,
      })
    }

    flowRef.current.answers.push(choiceText)
    const { answers } = flowRef.current
    const nextIndex = answers.length

    if (nextIndex < PROCUREMENT_QUESTIONS.length) {
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'options',
          question: PROCUREMENT_QUESTIONS[nextIndex].q,
          choices: PROCUREMENT_QUESTIONS[nextIndex].choices,
          answered: false,
          selectedChoice: null,
        },
      ])
    } else if (nextIndex === PROCUREMENT_QUESTIONS.length) {
      const compiled = compileProcurementMessage(
        flowRef.current.originalQuery,
        answers,
        lastLocationRef.current,
      )
      _streamFromLLM(compiled, activeSessionRef.current, { searching: true })
    }
  }, [_streamFromLLM])

  const [negotiationItem, setNegotiationItem] = useState(null)
  const startNegotiate = useCallback((item) => setNegotiationItem(item), [])
  const closeNegotiation = useCallback(() => setNegotiationItem(null), [])

  const [emailItem, setEmailItem] = useState(null)
  const startEmail = useCallback((item) => setEmailItem(item), [])
  const closeEmail = useCallback(() => setEmailItem(null), [])

  return {
    messages,
    isLoading,
    isSearching,
    send,
    answer,
    startNegotiate,
    closeNegotiation,
    negotiationItem,
    startEmail,
    closeEmail,
    emailItem,
    currentSessionId: activeSessionRef.current,
  }
}
