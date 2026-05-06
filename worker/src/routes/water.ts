import { Hono } from 'hono'
import { getUserId } from '../utils/auth'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

// Log water
app.post('/', async (c) => {
  const userId = getUserId(c)
  const { amount } = await c.req.json()

  if (!amount || amount <= 0) {
    return c.json({ message: 'Valid amount is required' }, 400)
  }

  await c.env.DB.prepare(`
    INSERT INTO water_logs (user_id, amount, date)
    VALUES (?, ?, date('now'))
  `).bind(userId, amount).run()

  return c.json({ message: 'Water logged successfully' })
})

// Get today's water
app.get('/', async (c) => {
  const userId = getUserId(c)

  const result = await c.env.DB.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM water_logs
    WHERE user_id = ? AND date = date('now')
  `).bind(userId).first<{ total: number }>()

  return c.json({ total: result?.total || 0 })
})

export { app as waterRoutes }
