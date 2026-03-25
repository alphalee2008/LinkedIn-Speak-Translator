-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free',
  credits_remaining INTEGER DEFAULT 0,
  usage_today INTEGER DEFAULT 0,
  usage_reset_at DATE,
  subscription_expires_at DATETIME,
  stripe_customer_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Webhook events (idempotency)
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  processed_at DATETIME,
  user_id TEXT REFERENCES users(id)
);

-- Usage logs
CREATE TABLE IF NOT EXISTS usage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES users(id),
  mode TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
