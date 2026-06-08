import { useState } from 'react'
import './QuestionCard.css'

export function QuestionCard({ question, choices, onAnswer, answered, selectedChoice }) {
  const [custom, setCustom] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  // Guard against double-clicks racing with the `answered` prop update
  const [fired, setFired] = useState(false)

  function handleChoice(choice) {
    if (answered || fired) return
    setFired(true)
    onAnswer(choice)
  }

  function handleCustomSubmit(e) {
    e.preventDefault()
    const trimmed = custom.trim()
    if (!trimmed || answered || fired) return
    setFired(true)
    onAnswer(trimmed)
  }

  if (answered) {
    return (
      <div className="qcard qcard--answered">
        <p className="qcard__question">{question}</p>
        <span className="qcard__selected">{selectedChoice}</span>
      </div>
    )
  }

  return (
    <div className="qcard">
      <p className="qcard__question">{question}</p>

      <div className="qcard__choices">
        {choices.map((choice) => (
          <button
            key={choice}
            type="button"
            className="qcard__choice"
            onClick={() => handleChoice(choice)}
          >
            {choice}
          </button>
        ))}
      </div>

      <div className="qcard__custom">
        {!showCustom ? (
          <button
            type="button"
            className="qcard__custom-toggle"
            onClick={() => setShowCustom(true)}
          >
            + Other
          </button>
        ) : (
          <form className="qcard__custom-form" onSubmit={handleCustomSubmit}>
            <input
              className="qcard__custom-input"
              type="text"
              placeholder="Type your own answer…"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              className="qcard__custom-btn"
              disabled={!custom.trim()}
              aria-label="Submit"
            >
              <ArrowIcon />
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 10h12M10 4l6 6-6 6" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
