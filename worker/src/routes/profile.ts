import { Hono } from 'hono'
import { getUserId } from '../utils/auth'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

// Get profile
app.get('/', async (c) => {
  const userId = getUserId(c)

  const user = await c.env.DB.prepare(`
    SELECT email, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, current_weight
    FROM users WHERE id = ?
  `).bind(userId).first()

  if (!user) {
    return c.json({ message: 'User not found' }, 404)
  }

  return c.json(user)
})

// Update profile/goals
app.put('/', async (c) => {
  const userId = getUserId(c)
  const updates = await c.req.json()

  const allowedFields = ['calorie_goal', 'protein_goal', 'carbs_goal', 'fat_goal', 'water_goal', 'weight_goal']
  const fields: string[] = []
  const values: any[] = []

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      fields.push(`${field} = ?`)
      values.push(updates[field])
    }
  }

  if (fields.length === 0) {
    return c.json({ message: 'No valid fields to update' }, 400)
  }

  values.push(userId)

  await c.env.DB.prepare(`
    UPDATE users SET ${fields.join(', ')} WHERE id = ?
  `).bind(...values).run()

  return c.json({ message: 'Profile updated successfully' })
})

export { app as profileRoutes }
