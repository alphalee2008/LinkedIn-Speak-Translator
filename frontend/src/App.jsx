import React, { useState, useEffect } from 'react'
import Translator from './components/Translator'
import LoginModal from './components/LoginModal'
import Header from './components/Header'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function App() {
  const [user, setUser] = useState(null)
  const [showLogin, setShowLogin] = useState(false)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    // Check for JWT from Google OAuth redirect (?jwt=...)
    const params = new URLSearchParams(window.location.search)
    const jwt = params.get('jwt')
    const authErr = params.get('auth_error')

    if (authErr) {
      setAuthError('Login failed. Please try again.')
      window.history.replaceState({}, '', '/')
      return
    }

    if (jwt) {
      localStorage.setItem('lst_jwt', jwt)
      window.history.replaceState({}, '', '/')
      fetchMe(jwt)
      return
    }

    // Load from localStorage
    const savedJwt = localStorage.getItem('lst_jwt')
    if (savedJwt) {
      fetchMe(savedJwt)
    }
  }, [])

  async function fetchMe(jwt) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${jwt}` }
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data)
      } else {
        // JWT invalid/expired
        localStorage.removeItem('lst_jwt')
      }
    } catch (e) {
      console.error('fetchMe error', e)
    }
  }

  function handleLoginClick() {
    setAuthError('')
    setShowLogin(true)
  }

  function logout() {
    const jwt = localStorage.getItem('lst_jwt')
    if (jwt) {
      fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` }
      }).catch(() => {})
    }
    localStorage.removeItem('lst_jwt')
    setUser(null)
  }

  // Called after a successful translation to sync updated quota
  function updateUserQuota(quota) {
    if (!quota) return
    setUser(prev => prev ? { ...prev, ...quota } : prev)
  }

  return (
    <div className="app">
      <Header user={user} onLogin={handleLoginClick} onLogout={logout} />
      {authError && (
        <div className="auth-error-banner">
          {authError}
          <button onClick={() => setAuthError('')}>×</button>
        </div>
      )}
      <Translator
        user={user}
        onLoginRequired={handleLoginClick}
        onQuotaUpdate={updateUserQuota}
      />
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  )
}
