import React, { useState, useEffect } from 'react'
import Translator from './components/Translator'
import LoginModal from './components/LoginModal'
import Header from './components/Header'

export default function App() {
  const [user, setUser] = useState(null)
  const [showLogin, setShowLogin] = useState(false)

  useEffect(() => {
    // Check for magic link token in URL
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      verifyToken(token)
    } else {
      // Load user from localStorage
      const saved = localStorage.getItem('lst_user')
      if (saved) setUser(JSON.parse(saved))
    }
  }, [])

  async function verifyToken(token) {
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })
      const data = await res.json()
      if (data.user) {
        localStorage.setItem('lst_user', JSON.stringify(data.user))
        localStorage.setItem('lst_jwt', data.jwt)
        setUser(data.user)
        window.history.replaceState({}, '', '/')
      }
    } catch (e) {
      console.error('Token verification failed', e)
    }
  }

  function logout() {
    localStorage.removeItem('lst_user')
    localStorage.removeItem('lst_jwt')
    setUser(null)
  }

  return (
    <div className="app">
      <Header user={user} onLogin={() => setShowLogin(true)} onLogout={logout} />
      <Translator user={user} onLoginRequired={() => setShowLogin(true)} />
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  )
}
