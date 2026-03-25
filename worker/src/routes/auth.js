import { Hono } from 'hono'
import jwt from 'jsonwebtoken'
import { nanoid } from 'nanoid'

export const authRoutes = new Hono()

// Send magic link
authRoutes.post('/login', async (c) => {
  const { email } = await c.req.json()
  
  if (!email || !email.includes('@')) {
    return c.json({ error: 'Invalid email' }, 400)
  }

  const env = c.env
  const token = nanoid(32)
  
  // Store token in KV (15 min expiry)
  await env.KV.put(`magic:${token}`, email, { expirationTtl: 900 })
  
  // Send email via Resend
  const magicLink = `${c.req.header('origin') || 'http://localhost:3000'}?token=${token}`
  
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'LinkedIn Translator <noreply@yourdomain.com>',
        to: email,
        subject: 'Your login link',
        html: `<p>Click to login: <a href="${magicLink}">${magicLink}</a></p><p>Expires in 15 minutes.</p>`
      })
    })
    
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Failed to send email' }, 500)
  }
})

// Verify magic link token
authRoutes.post('/verify', async (c) => {
  const { token } = await c.req.json()
  const env = c.env
  
  const email = await env.KV.get(`magic:${token}`)
  if (!email) {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
  
  // Delete used token
  await env.KV.delete(`magic:${token}`)
  
  // Get or create user
  let user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
  
  if (!user) {
    const userId = nanoid()
    await env.DB.prepare(
      'INSERT INTO users (id, email, plan, usage_today, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(userId, email, 'free', 0, new Date().toISOString()).run()
    
    user = { id: userId, email, plan: 'free', usage_today: 0 }
  }
  
  // Generate JWT
  const jwtToken = jwt.sign({ userId: user.id, email: user.email }, env.JWT_SECRET, { expiresIn: '30d' })
  
  return c.json({
    user: {
      id: user.id,
      email: user.email,
      plan: user.plan,
      usage_today: user.usage_today
    },
    jwt: jwtToken
  })
})
