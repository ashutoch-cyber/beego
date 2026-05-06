import { Hono } from 'hono'
import { getUserId } from '../utils/auth'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

app.get('/', async (c) => {
  const userId = getUserId(c)
  const date = c.req.query('date') || new Date().toISOString().split('T')[0]

  const meals = await c.env.DB.prepare(`
    SELECT id, food_name, calories, protein, carbs, fat, meal_type, created_at, image_url
    FROM meals
    WHERE user_id = ? AND date = ?
    ORDER BY created_at DESC
  `).bind(userId, date).all()

  const totals = await c.env.DB.prepare(`
    SELECT 
      COALESCE(SUM(calories), 0) as total_calories,
      COALESCE(SUM(protein), 0) as total_protein,
      COALESCE(SUM(carbs), 0) as total_carbs,
      COALESCE(SUM(fat), 0) as total_fat
    FROM meals
    WHERE user_id = ? AND date = ?
  `).bind(userId, date).first<{ total_calories: number; total_protein: number; total_carbs: number; total_fat: number }>()

  return c.json({
    date,
    meals: meals.results || [],
    total_calories: totals?.total_calories || 0,
    total_protein: Math.round((totals?.total_protein || 0) * 10) / 10,
    total_carbs: Math.round((totals?.total_carbs || 0) * 10) / 10,
    total_fat: Math.round((totals?.total_fat || 0) * 10) / 10,
  })
})

export { app as historyRoutes }
