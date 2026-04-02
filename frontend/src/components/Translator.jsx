import React, { useState } from 'react'
import ShareCard from './ShareCard'

const API_BASE = import.meta.env.VITE_API_URL || ''

// ─── Hardcoded examples (zero API cost) ──────────────────────────────────────
const EXAMPLES = [
  {
    mode: 'decode',
    input: 'We need to leverage our core competencies and synergize cross-functional teams to move the needle on our strategic pillars.',
    output: 'We should use what we\'re already good at and get different departments to work together to make progress on our main goals.'
  },
  {
    mode: 'decode',
    input: 'Excited to announce I\'m pivoting to a new opportunity that aligns with my passion for disrupting the status quo and driving impactful change.',
    output: 'I got a new job. I\'m framing a pretty ordinary career move as a revolutionary act of self-reinvention.'
  },
  {
    mode: 'decode',
    input: 'We\'re not firing people, we\'re rightsizing the organization to ensure long-term sustainability and competitive agility.',
    output: 'We\'re laying people off. We just can\'t bring ourselves to say that.'
  },
  {
    mode: 'polish',
    input: 'I got promoted at work today.',
    output: 'Thrilled to share that I\'ve been recognized with a well-deserved promotion! Grateful for the incredible team that supported my journey and excited to drive even greater impact in this new chapter. 🚀 #CareerGrowth #Grateful #Leadership'
  },
  {
    mode: 'polish',
    input: 'Our team finished a project on time.',
    output: 'Incredibly proud to announce that our cross-functional team has successfully delivered a high-impact project on schedule — a testament to our collective commitment to excellence and execution. #TeamWork #ProjectManagement #WinningTogether'
  }
]

// ─── Character limits per plan ────────────────────────────────────────────────
const CHAR_LIMITS = {
  guest: 0,    // cannot type
  free: 500,
  credits: 800,
  pro: 1500
}

const MODES = [
  { id: 'decode', label: '🔍 Decode', desc: 'LinkedIn speak → Plain English' },
  { id: 'polish', label: '✨ Polish', desc: 'Plain English → LinkedIn style' }
]

export default function Translator({ user, onLoginRequired, onQuotaUpdate }) {
  const [mode, setMode] = useState('decode')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showShare, setShowShare] = useState(false)
  const [activeExample, setActiveExample] = useState(null)

  const plan = user?.plan || 'guest'
  const charLimit = CHAR_LIMITS[plan] ?? CHAR_LIMITS.free

  // Filter examples for current mode
  const modeExamples = EXAMPLES.filter(e => e.mode === mode)

  function handleExampleClick(ex) {
    setActiveExample(ex)
    setOutput(ex.output)
    setInput(ex.input)
    setError('')
  }

  function handleInputChange(e) {
    if (!user) {
      // Unauthenticated user tries to type → show login wall
      onLoginRequired()
      return
    }
    const val = e.target.value
    if (val.length <= charLimit) {
      setInput(val)
    }
  }

  async function handleTranslate() {
    if (!user) {
      onLoginRequired()
      return
    }
    if (!input.trim()) return
    if (input.length > charLimit) return

    setError('')
    setLoading(true)
    try {
      const jwt = localStorage.getItem('lst_jwt')
      const res = await fetch(`${API_BASE}/api/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`
        },
        body: JSON.stringify({ text: input, mode })
      })

      const data = await res.json()

      if (res.status === 401) {
        onLoginRequired()
        return
      }
      if (res.status === 402) {
        setError(
          plan === 'free'
            ? '🎉 You\'ve used all 5 free credits! Upgrade for more translations.'
            : '💳 No credits remaining. Purchase more to continue.'
        )
        return
      }
      if (res.status === 429) {
        setError('📊 Monthly limit reached (100/month on Pro). Add more if you need.')
        return
      }
      if (res.status === 400 && data.code === 'TEXT_TOO_LONG') {
        setError(`Text too long. Max ${charLimit} characters for your plan.`)
        return
      }
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        return
      }

      setOutput(data.result)
      setActiveExample(null)
      if (data.quota) onQuotaUpdate(data.quota)
    } catch (e) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isOverLimit = user && input.length > charLimit
  const canSubmit = user && input.trim() && !isOverLimit && !loading

  return (
    <main className="main">
      <div className="container">
        <p className="tagline">Stop nodding along. Actually understand what they're saying.</p>

        {/* Mode Tabs */}
        <div className="mode-tabs">
          {MODES.map(m => (
            <button
              key={m.id}
              className={`mode-tab ${mode === m.id ? 'active' : ''}`}
              onClick={() => { setMode(m.id); setOutput(''); setError(''); setActiveExample(null) }}
            >
              {m.label}
              <small>{m.desc}</small>
            </button>
          ))}
        </div>

        {/* ── Hardcoded Examples ── */}
        <div className="examples-section">
          <p className="examples-label">
            {user ? '💡 Try an example or type your own below' : '👇 Click an example to see the magic — or sign in to use your own text'}
          </p>
          <div className="examples-grid">
            {modeExamples.map((ex, i) => (
              <div
                key={i}
                className={`example-card ${activeExample === ex ? 'active' : ''}`}
                onClick={() => handleExampleClick(ex)}
              >
                <p className="example-input">"{ex.input.substring(0, 80)}{ex.input.length > 80 ? '…' : ''}"</p>
                <span className="example-hint">↓ click to see translation</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Show example result ── */}
        {activeExample && (
          <div className="output-section example-result">
            <div className="output-label">Translation</div>
            <div className="output-box">
              <p>{activeExample.output}</p>
            </div>
            {!user && (
              <div className="login-nudge">
                <p>✨ Want to translate your own LinkedIn content?</p>
                <button className="btn-primary" onClick={onLoginRequired}>
                  Sign in with Google — Get 5 Free Credits
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Input (only shown to logged-in users or on click) ── */}
        {user ? (
          <>
            <div className="input-section">
              <textarea
                className={`input-box ${isOverLimit ? 'over-limit' : ''}`}
                placeholder={
                  mode === 'decode'
                    ? 'Paste LinkedIn speak here…\ne.g. "We need to leverage our synergies…"'
                    : 'Write your plain message here…\ne.g. "Our team finished the project on time."'
                }
                value={input}
                onChange={handleInputChange}
                rows={5}
              />
              <div className="input-footer">
                <span className={`char-count ${isOverLimit ? 'over' : ''}`}>
                  {input.length} / {charLimit}
                </span>
                <span className="plan-badge plan-{plan}">{plan.toUpperCase()}</span>
              </div>
            </div>

            <button
              className="btn-translate"
              onClick={handleTranslate}
              disabled={!canSubmit}
            >
              {loading ? 'Translating…' : mode === 'decode' ? '🔍 Decode It' : '✨ Polish It'}
            </button>

            {error && (
              <div className="error-box">
                {error}
                {(error.includes('free credits') || error.includes('No credits')) && (
                  <div className="upgrade-cta">
                    <p>Get 30 more credits for just <strong>$5</strong></p>
                    <button className="btn-upgrade">Upgrade — $5</button>
                  </div>
                )}
              </div>
            )}

            {output && !activeExample && (
              <div className="output-section">
                <div className="output-label">Translation</div>
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
          </>
        ) : (
          /* Not logged in → show CTA to sign in */
          <div className="guest-cta">
            <button className="btn-primary btn-large" onClick={onLoginRequired}>
              🚀 Sign in with Google to translate your own content
            </button>
            <p className="guest-sub">Free account · 5 credits · No credit card needed</p>
          </div>
        )}

        {showShare && (
          <ShareCard
            input={input}
            output={output}
            mode={mode}
            onClose={() => setShowShare(false)}
          />
        )}
      </div>
    </main>
  )
}
