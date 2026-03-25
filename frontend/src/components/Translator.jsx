import React, { useState } from 'react'
import ShareCard from './ShareCard'

const MODES = [
  { id: 'decode', label: '🔍 Decode', desc: 'LinkedIn speak → Plain English', tier: 'free' },
  { id: 'polish', label: '✨ Polish', desc: 'Plain English → LinkedIn style', tier: 'pro' }
]

export default function Translator({ user, onLoginRequired }) {
  const [mode, setMode] = useState('decode')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showShare, setShowShare] = useState(false)
  const [guestCount, setGuestCount] = useState(
    parseInt(localStorage.getItem('lst_guest_count') || '0')
  )

  async function handleTranslate() {
    if (!input.trim()) return
    setError('')

    // Guest: allow 2 free tries before login wall
    if (!user) {
      if (guestCount >= 2) {
        onLoginRequired()
        return
      }
    }

    setLoading(true)
    try {
      const jwt = localStorage.getItem('lst_jwt')
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {})
        },
        body: JSON.stringify({ text: input, mode })
      })

      const data = await res.json()

      if (res.status === 401) {
        onLoginRequired()
        return
      }
      if (res.status === 429) {
        setError("You've hit your daily limit (5/day). Upgrade to Pro for unlimited translations.")
        return
      }
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        return
      }

      setOutput(data.result)

      // Track guest usage
      if (!user) {
        const newCount = guestCount + 1
        setGuestCount(newCount)
        localStorage.setItem('lst_guest_count', newCount)
      }
    } catch (e) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleModeSwitch(newMode) {
    if (newMode === 'polish' && (!user || user.plan === 'free')) {
      onLoginRequired()
      return
    }
    setMode(newMode)
    setOutput('')
    setError('')
  }

  return (
    <main className="main">
      <div className="container">
        <p className="tagline">Stop nodding along. Actually understand what they're saying.</p>

        {/* Mode Tabs */}
        <div className="mode-tabs">
          {MODES.map(m => (
            <button
              key={m.id}
              className={`mode-tab ${mode === m.id ? 'active' : ''} ${m.tier === 'pro' ? 'pro-tab' : ''}`}
              onClick={() => handleModeSwitch(m.id)}
            >
              {m.label}
              {m.tier === 'pro' && <span className="pro-badge">PRO</span>}
              <small>{m.desc}</small>
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="input-section">
          <textarea
            className="input-box"
            placeholder={mode === 'decode'
              ? 'Paste LinkedIn speak here...\ne.g. "We need to leverage our synergies to move the needle on our core competencies."'
              : 'Write your plain message here...\ne.g. "We should work together to improve our main skills."'
            }
            value={input}
            onChange={e => setInput(e.target.value)}
            rows={5}
          />
          <div className="input-footer">
            <span className="char-count">{input.length} chars</span>
            {!user && <span className="guest-hint">{2 - guestCount} free tries left</span>}
          </div>
        </div>

        {/* Translate Button */}
        <button
          className="btn-translate"
          onClick={handleTranslate}
          disabled={loading || !input.trim()}
        >
          {loading ? 'Translating...' : mode === 'decode' ? '🔍 Decode It' : '✨ Polish It'}
        </button>

        {/* Error */}
        {error && <div className="error-box">{error}</div>}

        {/* Output */}
        {output && (
          <div className="output-section">
            <div className="output-box">
              <p>{output}</p>
            </div>
            <div className="output-actions">
              <button className="btn-copy" onClick={() => navigator.clipboard.writeText(output)}>
                📋 Copy
              </button>
              <button className="btn-share" onClick={() => setShowShare(true)}>
                🔗 Share
              </button>
            </div>
          </div>
        )}

        {/* Share Card */}
        {showShare && (
          <ShareCard
            input={input}
            output={output}
            mode={mode}
            isPro={user?.plan === 'pro'}
            onClose={() => setShowShare(false)}
          />
        )}
      </div>
    </main>
  )
}
