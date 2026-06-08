import { useState, useRef, useEffect } from 'react'
import { LOCATIONS, useLocation } from '../../context/LocationContext'
import './LocationSwitcher.css'

export function LocationSwitcher() {
  const { locationKey, setLocationKey, location } = useLocation()
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  function select(key) {
    setLocationKey(key)
    setOpen(false)
  }

  const options = Object.values(LOCATIONS).filter((l) => l.key !== locationKey)

  return (
    <div className="loc-switcher" ref={containerRef}>
      <button
        className="loc-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Procurement location: ${location.label}`}
      >
        <span className="loc-trigger__label">{location.label}</span>
        <span className={`loc-trigger__chevron${open ? ' loc-trigger__chevron--open' : ''}`}>
          <ChevronIcon />
        </span>
      </button>

      <div
        className={`loc-dropdown${open ? ' loc-dropdown--open' : ''}`}
        role="listbox"
        aria-label="Select procurement location"
      >
        <div className="loc-dropdown__inner">
          {options.map((opt) => (
            <button
              key={opt.key}
              className="loc-option"
              role="option"
              aria-selected={false}
              onClick={() => select(opt.key)}
            >
              <span className="loc-option__label">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M3 5l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
