# LinkedIn Speak Translator

> Stop nodding along. Actually understand what they're saying.

Translate LinkedIn corporate speak into plain human language — and vice versa.

## Tech Stack

- **Frontend**: React + Vite → Cloudflare Pages
- **Backend**: Cloudflare Workers (Hono)
- **Database**: Cloudflare D1 (SQLite)
- **Cache/Sessions**: Cloudflare KV
- **Email**: Resend (Magic Link login)
- **AI**: OpenAI API (gpt-4o-mini)
- **Payments**: Stripe + Lemon Squeezy (Week 3)

## Project Structure

```
├── frontend/          # React + Vite app
│   └── src/
│       ├── components/
│       │   ├── Header.jsx
│       │   ├── Translator.jsx
│       │   ├── LoginModal.jsx
│       │   └── ShareCard.jsx
│       ├── App.jsx
│       └── index.css
└── worker/            # Cloudflare Worker API
    ├── src/
    │   ├── routes/
    │   │   ├── auth.js
    │   │   └── translate.js
    │   └── index.js
    ├── schema.sql
    └── wrangler.toml
```

## Setup

### 1. Cloudflare Setup

```bash
# Install Wrangler
npm install -g wrangler
wrangler login

# Create D1 database
wrangler d1 create linkedin-translator-db

# Create KV namespace
wrangler kv:namespace create KV

# Update wrangler.toml with the IDs above
```

### 2. Set Secrets

```bash
cd worker
wrangler secret put OPENAI_API_KEY
wrangler secret put RESEND_API_KEY
wrangler secret put JWT_SECRET
```

### 3. Initialize Database

```bash
wrangler d1 execute linkedin-translator-db --file=schema.sql
```

### 4. Deploy

```bash
# Deploy Worker
cd worker && wrangler deploy

# Deploy Frontend to Pages
cd frontend && npm run build
# Upload dist/ to Cloudflare Pages
```

## Pricing

| Plan | Price | Translations |
|------|-------|-------------|
| Free | $0 | 5/day |
| Pro | $9/mo or $79/yr | Unlimited |
| Credits | $4/pack | 50 credits |
