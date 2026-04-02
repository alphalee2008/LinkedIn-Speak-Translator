import { Hono } from 'hono'
import { requireAuth } from './auth.js'

export const translateRoute = new Hono()

// ─── Character limits per plan ────────────────────────────────────────────────
const CHAR_LIMITS = {
  free: 500,
  credits: 800,
  pro: 1500
}

// ─── Prompts (do NOT change — these call the existing AI correctly) ────────────
const PROMPTS = {
  decode: `You are a LinkedIn corporate speak translator. Translate the following LinkedIn-style professional jargon into plain, honest English. Be slightly sarcastic and witty. Keep it concise.

Input: "{text}"

Output (plain English):`,

  polish: `You are a LinkedIn content writer. Transform the following plain message into polished, professional LinkedIn-style language. Use corporate buzzwords naturally. Keep it concise.

Input: "{text}"

Output (LinkedIn style):`
}

// ─── Translate endpoint ────────────────────────────────────────────────────────
translateRoute.post('/translate', async (c) => {
  const env = c.env

  // Must be authenticated — no anonymous API calls
  const user = await requireAuth(c, env)
  if (!user) {
    return c.json({ error: 'Login required', code: 'AUTH_REQUIRED' }, 401)
  }

  let body
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const { text, mode } = body

  if (!text || !mode) {
    return c.json({ error: 'Missing text or mode' }, 400)
  }

  if (!['decode', 'polish'].includes(mode)) {
    return c.json({ error: 'Invalid mode. Must be "decode" or "polish"' }, 400)
  }

  // ── Server-side character limit check ────────────────────────────────────────
  const charLimit = CHAR_LIMITS[user.plan] ?? CHAR_LIMITS.free
  if (text.length > charLimit) {
    return c.json({
      error: `Text too long. Your plan allows ${charLimit} characters (got ${text.length}).`,
      code: 'TEXT_TOO_LONG',
      limit: charLimit
    }, 400)
  }

  // ── Quota check ───────────────────────────────────────────────────────────────
  if (user.plan === 'free' || user.plan === 'credits') {
    if (user.credits_remaining <= 0) {
      return c.json({
        error: 'No credits remaining.',
        code: 'NO_CREDITS',
        plan: user.plan
      }, 402)
    }
  } else if (user.plan === 'pro') {
    // Check if monthly reset is needed
    const now = new Date()
    const resetAt = user.pro_reset_at ? new Date(user.pro_reset_at) : null
    if (resetAt && now >= resetAt) {
      const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
      await env.DB.prepare(
        'UPDATE users SET pro_usage_this_month = 0, pro_reset_at = ? WHERE id = ?'
      ).bind(nextReset, user.id).run()
      user.pro_usage_this_month = 0
    }

    if (user.pro_usage_this_month >= 100) {
      return c.json({
        error: 'Monthly limit reached (100/month for Pro).',
        code: 'PRO_LIMIT_REACHED',
        plan: 'pro'
      }, 429)
    }
  }

  // ── Call the AI (existing model — do not change) ──────────────────────────────
  const prompt = PROMPTS[mode].replace('{text}', text)

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.7
      })
    })

    const data = await response.json()
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Empty AI response')
    }
    const result = data.choices[0].message.content.trim()

    // ── Deduct quota after successful call ────────────────────────────────────
    if (user.plan === 'free' || user.plan === 'credits') {
      await env.DB.prepare(
        'UPDATE users SET credits_remaining = credits_remaining - 1 WHERE id = ?'
      ).bind(user.id).run()
    } else if (user.plan === 'pro') {
      await env.DB.prepare(
        'UPDATE users SET pro_usage_this_month = pro_usage_this_month + 1 WHERE id = ?'
      ).bind(user.id).run()
    }

    // Log usage
    await env.DB.prepare(
      'INSERT INTO usage_logs (user_id, mode, created_at) VALUES (?, ?, ?)'
    ).bind(user.id, mode, new Date().toISOString()).run()

    // Return updated quota info
    const updatedUser = await env.DB.prepare(
      'SELECT plan, credits_remaining, pro_usage_this_month FROM users WHERE id = ?'
    ).bind(user.id).first()

    return c.json({
      result,
      quota: {
        plan: updatedUser.plan,
        credits_remaining: updatedUser.credits_remaining,
        pro_usage_this_month: updatedUser.pro_usage_this_month
      }
    })
  } catch (e) {
    console.error('Translation error:', e)
    return c.json({ error: 'Translation failed. Please try again.' }, 500)
  }
})
