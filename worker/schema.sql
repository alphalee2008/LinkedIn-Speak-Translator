-- Users table (updated schema)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  plan TEXT DEFAULT 'free',                  -- 'free' | 'credits' | 'pro'
  credits_remaining INTEGER DEFAULT 5,       -- Free=5初始, Credits购买后+30, Pro不用此字段
  pro_usage_this_month INTEGER DEFAULT 0,    -- Pro用户本月已用次数
  pro_reset_at DATETIME,                     -- Pro每月重置日期
  stripe_customer_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Usage logs
CREATE TABLE IF NOT EXISTS usage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES users(id),
  mode TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Webhook events (idempotency)
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  processed_at DATETIME,
  user_id TEXT REFERENCES users(id)
);
