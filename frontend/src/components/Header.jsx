import React from 'react'

export default function Header({ user, onLogin, onLogout }) {
  return (
    <header className="header">
      <div className="container">
        <h1>LinkedIn Speak Translator</h1>
        <div className="user-section">
          {user ? (
            <>
              <span className="usage">{user.usage_today}/5 today</span>
              <span className="email">{user.email}</span>
              <button onClick={onLogout} className="btn-secondary">Logout</button>
            </>
          ) : (
            <button onClick={onLogin} className="btn-primary">Login</button>
          )}
        </div>
      </div>
    </header>
  )
}
