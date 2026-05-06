import { Hono } from 'hono'
import { createToken, hashPassword } from '../utils/auth'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

// Register
app.post('/register', async (c) => {
  const { email, password } = await c.req.json()

  if (!email || !password || password.length < 6) {
    return c.json({ message: 'Invalid email or password (min 6 chars)' }, 400)
  }

  const existing = await c.env.DB.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).bind(email).first()

  if (existing) {
    return c.json({ message: 'Email already registered' }, 409)
  }

  const hashedPassword = await hashPassword(password)

  const result = await c.env.DB.prepare(`
    INSERT INTO users (email, password_hash, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal)
    VALUES (?, ?, 2000, 150, 250, 70, 2500, 70)
  `).bind(email, hashedPassword).run()

  const userId = result.meta.last_row_id
  const token = await createToken({ userId, email }, c.env.JWT_SECRET)

  return c.json({ token, userId, email })
})

// Login
app.post('/login', async (c) => {
  const { email, password } = await c.req.json()

  const user = await c.env.DB.prepare(
    'SELECT id, email, password_hash FROM users WHERE email = ?'
  ).bind(email).first<{ id: number; email: string; password_hash: string }>()

  if (!user) {
    return c.json({ message: 'Invalid credentials' }, 401)
  }

  const hashedPassword = await hashPassword(password)
  if (hashedPassword !== user.password_hash) {
    return c.json({ message: 'Invalid credentials' }, 401)
  }

  const token = await createToken({ userId: user.id, email: user.email }, c.env.JWT_SECRET)

  return c.json({ token, userId: user.id, email: user.email })
})

export { app as authRoutes }
