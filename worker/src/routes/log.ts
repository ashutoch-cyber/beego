import { Hono } from 'hono'
import { getUserId } from '../utils/auth'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

// Log a meal
app.post('/', async (c) => {
  const userId = getUserId(c)
  const { food_name, calories, protein, carbs, fat, meal_type, image_url } = await c.req.json()

  if (!food_name || calories === undefined) {
    return c.json({ message: 'Food name and calories are required' }, 400)
  }

  const result = await c.env.DB.prepare(`
    INSERT INTO meals (user_id, food_name, calories, protein, carbs, fat, meal_type, image_url, date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, date('now'))
  `).bind(
    userId,
    food_name,
    calories,
    protein || 0,
    carbs || 0,
    fat || 0,
    meal_type || 'snack',
    image_url || null
  ).run()

  return c.json({
    id: result.meta.last_row_id,
    message: 'Meal logged successfully',
  })
})

// Delete a meal
app.delete('/:id', async (c) => {
  const userId = getUserId(c)
  const id = c.req.param('id')

  await c.env.DB.prepare(`
    DELETE FROM meals WHERE id = ? AND user_id = ?
  `).bind(id, userId).run()

  return c.json({ message: 'Meal deleted' })
})

export { app as logRoutes }
