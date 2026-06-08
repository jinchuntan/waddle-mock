import { useState, useEffect } from 'react'
import './WaddlingLoader.css'

const PHASES = [
  'Waddling...',
  'Waddle waddle...',
  'Sniffing out the best deals...',
  'Rounding up suppliers...',
]

export function WaddlingLoader() {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setPhase(p => (p + 1) % PHASES.length), 2200)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="waddling-loader" role="status" aria-label="Searching for suppliers">
      <svg className="waddling-loader__ring" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle className="waddling-loader__track" cx="24" cy="24" r="20" />
        <circle className="waddling-loader__arc"   cx="24" cy="24" r="20" />
      </svg>
      <span className="waddling-loader__label" key={phase}>{PHASES[phase]}</span>
    </div>
  )
}
