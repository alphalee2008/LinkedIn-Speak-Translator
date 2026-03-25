import { Hono } from 'hono'
import jwt from 'jsonwebtoken'

export const translateRoute = new Hono()

const PROMPTS = {
  decode: `You are a LinkedIn corporate speak translator. Translate the following LinkedIn-style professional jargon into plain, honest English. Be slightly sarcastic and witty. Keep it concise.

Input: "{text}"

Output (plain English):`,
  
  polish: `You are a LinkedIn content writer. Transform the following plain message into polished, professional LinkedIn-style language. Use corporate buzzwords naturally. Keep it concise.

Input: "{text}"

Output (LinkedIn style):`
}

translateRoute.post('/translate', async (c) => {
  const { text, mode } = await c.req.json()
  const env = c.env
  
  if (!text || !mode) {
    return c.json({ error: 'Missing text or mode' }, 400)
  }
  
  // Verify JWT if present
  let user = null
  const authHeader = c.req.header('Authorization')
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET)
      user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(decoded.userId).first()
    } catch (e) {
      return c.json({ error: 'Invalid token' }, 401)
    }
  }
  
  // Check usage limits
  if (user) {
    if (user.plan === 'free' && user.usage_today >= 5) {
      return c.json({ error: 'Daily limit reached' }, 429)
    }
  }
  
  // Call OpenAI
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
    const result = data.choices[0].message.content.trim()
    
    // Update usage
    if (user) {
      await env.DB.prepare('UPDATE users SET usage_today = usage_today + 1 WHERE id = ?')
        .bind(user.id).run()
    }
    
    return c.json({ result })
  } catch (e) {
    return c.json({ error: 'Translation failed' }, 500)
  }
})
