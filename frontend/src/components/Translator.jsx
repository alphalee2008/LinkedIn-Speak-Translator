import React, { useState } from 'react'
import ShareCard from './ShareCard'

const API_BASE = import.meta.env.VITE_API_URL || ''

// ─── Hardcoded examples ───────────────────────────────────────────────────────
const EXAMPLES = {
  decode: [
    {
      input: '"We need to leverage our core competencies and synergize cross-functional teams to move the needle on our strategic pillars."',
      output: 'We should use what we\'re already good at and get different teams to work together on our main goals.'
    },
    {
      input: '"Excited to announce I\'m pivoting to a new opportunity that aligns with my passion for impact-driven growth."',
      output: 'I got a new job. I\'m making a normal career move sound like a spiritual awakening.'
    },
    {
      input: '"We\'re not firing people, we\'re rightsizing the organization to ensure long-term sustainability."',
      output: 'We\'re laying people off. We just can\'t bring ourselves to say that.'
    }
  ],
  polish: [
    {
      input: '"I got promoted at work today."',
      output: 'Thrilled to share that I\'ve been recognized with a well-deserved promotion! Grateful for the incredible team and excited to drive even greater impact in this new chapter. 🚀 #CareerGrowth #Grateful'
    },
    {
      input: '"Our team finished a project on time."',
      output: 'Incredibly proud to announce our cross-functional team has delivered a high-impact project on schedule — a testament to our collective commitment to excellence. #TeamWork #Execution'
    },
    {
      input: '"I learned a lot this year."',
      output: 'This year has been a masterclass in growth, resilience, and leaning into discomfort. Grateful for every challenge that shaped me into a better leader. 💡 #GrowthMindset #Reflection'
    }
  ]
}

// ─── Character limits per plan ────────────────────────────────────────────────
const CHAR_LIMITS = { free: 500, credits: 800, pro: 1500 }

const MODES = [
  { id: 'decode', icon: '🔍', label: 'Decode', desc: 'LinkedIn jargon → plain English' },
  { id: 'polish', icon: '✨', label: 'Polish', desc: 'Plain English → LinkedIn style' }
]

export default function Translator({ user, onLoginRequired, onQuotaUpdate }) {
  const [mode, setMode] = useState('decode')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showShare, setShowShare] = useState(false)
  const [expandedExample, setExpandedExample] = useState(0) // first example expanded by default

  const plan = user?.plan || 'free'
  const charLimit = CHAR_LIMITS[plan] ?? 500
  const isOverLimit = input.length > charLimit
  const canSubmit = user && input.trim() && !isOverLimit && !loading

  function handleModeSwitch(newMode) {
    setMode(newMode)
    setOutput('')
    setError('')
    setExpandedExample(0)
    setInput('')
  }

  function handleExampleClick(idx) {
    setExpandedExample(expandedExample === idx ? -1 : idx)
  }

  function handleInputChange(e) {
    if (!user) { onLoginRequired(); return }
    const val = e.target.value
    if (val.length <= charLimit + 10) setInput(val) // allow slight overrun to show error
  }

  async function handleTranslate() {
    if (!user) { onLoginRequired(); return }
    if (!input.trim() || isOverLimit) return
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
      if (res.status === 401) { onLoginRequired(); return }
      if (res.status === 402) {
        setError('🎉 You\'ve used all your free credits! Upgrade to keep translating.')
        return
      }
      if (res.status === 429) {
        setError('📊 Monthly limit reached (100/month on Pro).')
        return
      }
      if (res.status === 400 && data.code === 'TEXT_TOO_LONG') {
        setError(`Text too long. Max ${charLimit} characters for your plan.`)
        return
      }
      if (!res.ok) { setError(data.error || 'Something went wrong.'); return }
      setOutput(data.result)
      if (data.quota) onQuotaUpdate(data.quota)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const examples = EXAMPLES[mode]
  const outputLabel = mode === 'decode' ? 'PLAIN ENGLISH' : 'LINKEDIN STYLE'

  return (
    <main className="main">
      <div className="container">

        {/* ── Hero ── */}
        <div className="hero">
          <h2 className="hero-title">Stop nodding along. Actually understand what they're saying.</h2>
          <p className="hero-sub">Translate corporate jargon into plain English — or the other way around.</p>
        </div>

        {/* ── Mode Tabs ── */}
        <div className="mode-tabs">
          {MODES.map(m => (
            <button
              key={m.id}
              className={`mode-tab ${mode === m.id ? 'active' : ''}`}
              onClick={() => handleModeSwitch(m.id)}
            >
              <span className="mode-tab-icon">{m.icon}</span>
              <span className="mode-tab-text">
                <span className="mode-tab-label">{m.label}</span>
                <span className="mode-tab-desc">{m.desc}</span>
              </span>
            </button>
          ))}
        </div>

        {/* ── Examples ── */}
        <div className="section-label">TRY AN EXAMPLE</div>
        <div className="examples-list">
          {examples.map((ex, i) => (
            <div
              key={i}
              className={`example-item ${expandedExample === i ? 'expanded' : ''}`}
              onClick={() => handleExampleClick(i)}
            >
              <p className="example-input">{ex.input}</p>
              {expandedExample === i && (
                <div className="example-output">
                  <div className="example-output-label">{outputLabel}</div>
                  <p className="example-output-text">{ex.output}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Input + Translate ── */}
        <div className="input-card">
          <textarea
            className={`input-area ${isOverLimit ? 'over-limit' : ''}`}
            placeholder={user
              ? mode === 'decode'
                ? 'Paste LinkedIn speak here...'
                : 'Write your plain message here...'
              : 'Sign in to translate your own content...'}
            value={input}
            onChange={handleInputChange}
            onClick={() => { if (!user) onLoginRequired() }}
            rows={5}
            readOnly={!user}
          />
          <div className="input-footer">
            <span className={`char-count ${isOverLimit ? 'over' : ''}`}>
              {input.length} / {charLimit}
            </span>
            <button
              className="btn-translate"
              onClick={handleTranslate}
              disabled={!canSubmit}
            >
              {loading ? 'Translating...' : 'Translate'}
            </button>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="error-card">
            <span>{error}</span>
            {error.includes('credits') && (
              <button className="btn-upgrade">Upgrade — $5</button>
            )}
          </div>
        )}

        {/* ── Result ── */}
        {output && (
          <div className="result-card">
            <div className="result-header">
              <span className="result-label">{outputLabel}</span>
              <div className="result-actions">
                <button className="btn-action" onClick={() => navigator.clipboard.writeText(output)}>
                  Copy
                </button>
                <button className="btn-action" onClick={() => setShowShare(true)}>
                  Share card
                </button>
              </div>
            </div>
            <p className="result-text">{output}</p>
          </div>
        )}

        {/* ── Guest CTA ── */}
        {!user && (
          <div className="guest-cta">
            <button className="btn-google-cta" onClick={onLoginRequired}>
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0}}>
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Sign in with Google — Get 5 free credits
            </button>
            <p className="guest-fine">No credit card needed · 5 credits last forever</p>
          </div>
        )}

        {showShare && (
          <ShareCard input={input} output={output} mode={mode} onClose={() => setShowShare(false)} />
        )}
      </div>
    </main>
  )
}
