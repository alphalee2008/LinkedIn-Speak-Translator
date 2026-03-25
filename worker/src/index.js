import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authRoutes } from './routes/auth.js'
import { translateRoute } from './routes/translate.js'

const app = new Hono()

app.use('/*', cors())

app.get('/', (c) => c.json({ message: 'LinkedIn Speak Translator API' }))

app.route('/api/auth', authRoutes)
app.route('/api', translateRoute)

export default app
