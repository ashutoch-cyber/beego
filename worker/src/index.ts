import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authRoutes } from './routes/auth'
import { uploadRoutes } from './routes/upload'
import { detectRoutes } from './routes/detect'
import { nutritionRoutes } from './routes/nutrition'
import { logRoutes } from './routes/log'
import { dashboardRoutes } from './routes/dashboard'
import { historyRoutes } from './routes/history'
import { weightRoutes } from './routes/weight'
import { waterRoutes } from './routes/water'
import { profileRoutes } from './routes/profile'

export interface Env {
  DB: D1Database
  IMAGES: R2Bucket
  HUGGINGFACE_API_KEY: string
  USDA_API_KEY: string
  JWT_SECRET: string
}

const app = new Hono<{ Bindings: Env }>()

// CORS
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Public routes
app.route('/api/auth', authRoutes)

// Protected routes middleware
app.use('/api/*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ message: 'Unauthorized' }, 401)
  }

  const token = authHeader.split(' ')[1]
  try {
    const { jwtVerify } = await import('jose')
    const secret = new TextEncoder().encode(c.env.JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    c.set('jwtPayload', payload)
    await next()
  } catch {
    return c.json({ message: 'Invalid token' }, 401)
  }
})

// Protected routes
app.route('/api/upload', uploadRoutes)
app.route('/api/detect', detectRoutes)
app.route('/api/nutrition', nutritionRoutes)
app.route('/api/log', logRoutes)
app.route('/api/dashboard', dashboardRoutes)
app.route('/api/history', historyRoutes)
app.route('/api/weight', weightRoutes)
app.route('/api/water', waterRoutes)
app.route('/api/profile', profileRoutes)

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

export default app
