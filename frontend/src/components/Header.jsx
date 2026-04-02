import React from 'react'

const PLAN_LABELS = {
  free: { label: 'Free', color: '#6b7280' },
  credits: { label: 'Credits', color: '#2563eb' },
  pro: { label: 'Pro', color: '#7c3aed' }
}

export default function Header({ user, onLogin, onLogout }) {
  const planInfo = user ? PLAN_LABELS[user.plan] || PLAN_LABELS.free : null

  function getQuotaText() {
    if (!user) return null
    if (user.plan === 'pro') {
      return `${user.pro_usage_this_month ?? 0}/100 this month`
    }
    return `${user.credits_remaining ?? 0} credits left`
  }

  return (
    <header className="header">
      <div className="container header-inner">
        <div className="header-brand">
          <h1>LinkedIn Speak Translator</h1>
          <span className="header-sub">Decode the jargon. Say what you mean.</span>
        </div>
        <div className="user-section">
          {user ? (
            <>
              {user.avatar && (
                <img src={user.avatar} alt="" className="user-avatar" referrerPolicy="no-referrer" />
              )}
              <div className="user-info">
                <span className="user-name">{user.name || user.email}</span>
                <span className="user-quota">{getQuotaText()}</span>
              </div>
              <span
                className="plan-tag"
                style={{ background: planInfo?.color }}
              >
                {planInfo?.label}
              </span>
              <button onClick={onLogout} className="btn-secondary btn-sm">Logout</button>
            </>
          ) : (
            <button onClick={onLogin} className="btn-google">
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
