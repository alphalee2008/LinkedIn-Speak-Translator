import { Hono } from 'hono'
import { nanoid } from 'nanoid'

export const authRoutes = new Hono()

// ─── Google OAuth: Step 1 — Redirect to Google ───────────────────────────────
authRoutes.get('/google', async (c) => {
  const env = c.env
  const state = nanoid(16)
  const origin = c.req.header('origin') || `https://${c.req.header('host')}`

  // Store state in KV (10 min expiry) to prevent CSRF
  await env.KV.put(`oauth_state:${state}`, '1', { expirationTtl: 600 })

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${origin}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'select_account'
  })

  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
})

// ─── Google OAuth: Step 2 — Handle callback ───────────────────────────────────
authRoutes.get('/google/callback', async (c) => {
  const env = c.env
  const { code, state, error } = c.req.query()

  // Determine frontend origin
  const host = c.req.header('host') || ''
  const proto = host.includes('localhost') ? 'http' : 'https'
  const origin = `${proto}://${host}`

  if (error || !code || !state) {
    return c.redirect(`${origin}/?auth_error=access_denied`)
  }

  // Validate state
  const storedState = await env.KV.get(`oauth_state:${state}`)
  if (!storedState) {
    return c.redirect(`${origin}/?auth_error=invalid_state`)
  }
  await env.KV.delete(`oauth_state:${state}`)

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${origin}/api/auth/google/callback`,
        grant_type: 'authorization_code'
      })
    })

    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      return c.redirect(`${origin}/?auth_error=token_exchange_failed`)
    }

    // Get user info from Google
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    })
    const googleUser = await userInfoRes.json()

    if (!googleUser.email) {
      return c.redirect(`${origin}/?auth_error=no_email`)
    }

    // Get or create user in D1
    let user = await env.DB.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).bind(googleUser.email).first()

    if (!user) {
      const userId = nanoid()
      await env.DB.prepare(
        `INSERT INTO users (id, email, name, avatar, plan, credits_remaining, pro_usage_this_month, pro_reset_at, created_at)
         VALUES (?, ?, ?, ?, 'free', 5, 0, ?, ?)`
      ).bind(
        userId,
        googleUser.email,
        googleUser.name || '',
        googleUser.picture || '',
        new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
        new Date().toISOString()
      ).run()

      user = {
        id: userId,
        email: googleUser.email,
        name: googleUser.name || '',
        avatar: googleUser.picture || '',
        plan: 'free',
        credits_remaining: 5,
        pro_usage_this_month: 0
      }
    }

    // Generate JWT and store in KV (30 days)
    const payload = {
      userId: user.id,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 3600
    }
    const jwtToken = await signJWT(payload, env.JWT_SECRET)
    await env.KV.put(`jwt:${user.id}`, jwtToken, { expirationTtl: 30 * 24 * 3600 })

    // Redirect to frontend with token in fragment (never in query string)
    return c.redirect(`${origin}/?jwt=${jwtToken}`)
  } catch (e) {
    console.error('OAuth callback error:', e)
    return c.redirect(`${origin}/?auth_error=server_error`)
  }
})

// ─── Get current user info ─────────────────────────────────────────────────────
authRoutes.get('/me', async (c) => {
  const env = c.env
  const user = await requireAuth(c, env)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  return c.json({
    id: user.id,
    email: user.email,
    name: user.name || '',
    avatar: user.avatar || '',
    plan: user.plan,
    credits_remaining: user.credits_remaining,
    pro_usage_this_month: user.pro_usage_this_month
  })
})

// ─── Logout ────────────────────────────────────────────────────────────────────
authRoutes.post('/logout', async (c) => {
  const env = c.env
  const user = await requireAuth(c, env)
  if (user) {
    await env.KV.delete(`jwt:${user.id}`)
  }
  return c.json({ success: true })
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function requireAuth(c, env) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.substring(7)
  try {
    const payload = await verifyJWT(token, env.JWT_SECRET)
    if (!payload) return null
    return await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(payload.userId).first()
  } catch (e) {
    return null
  }
}

// ─── Simple HMAC-SHA256 JWT (no external deps) ────────────────────────────────

async function signJWT(payload, secret) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const body = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const data = `${header}.${body}`
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${data}.${sigB64}`
}

export async function verifyJWT(token, secret) {
  const [header, body, sig] = token.split('.')
  if (!header || !body || !sig) return null
  const data = `${header}.${body}`
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  )
  const sigBytes = Uint8Array.from(atob(sig.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data))
  if (!valid) return null
  const payload = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')))
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
  return payload
}
