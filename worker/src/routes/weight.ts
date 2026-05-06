import { Hono } from 'hono'
import { getUserId } from '../utils/auth'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

// Log weight
app.post('/', async (c) => {
  const userId = getUserId(c)
  const { weight } = await c.req.json()

  if (!weight || weight <= 0) {
    return c.json({ message: 'Valid weight is required' }, 400)
  }

  await c.env.DB.prepare(`
    INSERT INTO weight_logs (user_id, weight, date)
    VALUES (?, ?, date('now'))
  `).bind(userId, weight).run()

  // Update current weight in users table
  await c.env.DB.prepare(`
    UPDATE users SET current_weight = ? WHERE id = ?
  `).bind(weight, userId).run()

  return c.json({ message: 'Weight logged successfully' })
})

// Get weight history
app.get('/', async (c) => {
  const userId = getUserId(c)

  const weights = await c.env.DB.prepare(`
    SELECT id, weight, created_at
    FROM weight_logs
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 30
  `).bind(userId).all()

  return c.json({
    weights: weights.results || [],
  })
})

export { app as weightRoutes }
