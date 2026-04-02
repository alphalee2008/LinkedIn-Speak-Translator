import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authRoutes } from './routes/auth.js'
import { translateRoute } from './routes/translate.js'

const app = new Hono()

app.use('/*', cors({
  origin: (origin) => origin, // reflect origin for credentials
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}))

app.get('/', (c) => c.json({ message: 'LinkedIn Speak Translator API' }))

app.route('/api/auth', authRoutes)
app.route('/api', translateRoute)

export default app
