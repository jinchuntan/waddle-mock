import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { ChatApp } from './pages/ChatApp'
import { WaddleForMe } from './pages/WaddleForMe'
import { getMe } from './lib/authApi'
import './index.css'

export default function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      localStorage.setItem('waddle_token', token)
      window.history.replaceState({}, '', window.location.pathname)
    }

    getMe()
      .then(setUser)
      .catch(() => setUser(null))
  }, [])

  function handleSignIn() {
    const base = import.meta.env.VITE_API_BASE_URL ?? ''
    window.location.href = `${base}/api/auth/google`
  }

  function handleSignOut() {
    localStorage.removeItem('waddle_token')
    setUser(null)
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<LandingPage user={user} onSignIn={handleSignIn} />}
      />
      <Route
        path="/app"
        element={<ChatApp user={user} onSignIn={handleSignIn} onSignOut={handleSignOut} />}
      />
      <Route
        path="/waddle-for-me"
        element={<WaddleForMe user={user} onSignIn={handleSignIn} />}
      />
    </Routes>
  )
}
