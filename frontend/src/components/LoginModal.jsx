import React, { useState } from 'react'

export default function LoginModal({ onClose }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSend() {
    if (!email.includes('@')) {
      setError('Please enter a valid email')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (res.ok) {
        setSent(true)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to send login link')
      }
    } catch (e) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        {!sent ? (
          <>
            <h2>Login to Continue</h2>
            <p>Get 5 free translations per day. No password needed.</p>
            
            <input
              type="email"
              className="input-email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSend()}
            />
            
            {error && <div className="error-text">{error}</div>}
            
            <button
              className="btn-primary btn-full"
              onClick={handleSend}
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </>
        ) : (
          <>
            <h2>✉️ Check Your Email</h2>
            <p>We sent a login link to <strong>{email}</strong></p>
            <p className="hint">Click the link to log in. It expires in 15 minutes.</p>
            <button className="btn-secondary btn-full" onClick={onClose}>
              Got it
            </button>
          </>
        )}
      </div>
    </div>
  )
}
