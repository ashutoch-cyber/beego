import { Hono } from 'hono'
import { getUserId } from '../utils/auth'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

app.get('/', async (c) => {
  const userId = getUserId(c)

  // Get user goals
  const user = await c.env.DB.prepare(`
    SELECT calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal
    FROM users WHERE id = ?
  `).bind(userId).first<{ calorie_goal: number; protein_goal: number; carbs_goal: number; fat_goal: number; water_goal: number }>()

  // Get today's meals
  const meals = await c.env.DB.prepare(`
    SELECT id, food_name, calories, protein, carbs, fat, meal_type, created_at, image_url
    FROM meals
    WHERE user_id = ? AND date = date('now')
    ORDER BY created_at DESC
  `).bind(userId).all()

  // Get today's totals
  const totals = await c.env.DB.prepare(`
    SELECT 
      COALESCE(SUM(calories), 0) as total_calories,
      COALESCE(SUM(protein), 0) as total_protein,
      COALESCE(SUM(carbs), 0) as total_carbs,
      COALESCE(SUM(fat), 0) as total_fat
    FROM meals
    WHERE user_id = ? AND date = date('now')
  `).bind(userId).first<{ total_calories: number; total_protein: number; total_carbs: number; total_fat: number }>()

  // Get water intake
  const water = await c.env.DB.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total_water
    FROM water_logs
    WHERE user_id = ? AND date = date('now')
  `).bind(userId).first<{ total_water: number }>()

  // Get streak
  const streakResult = await c.env.DB.prepare(`
    SELECT COUNT(DISTINCT date) as streak_days
    FROM meals
    WHERE user_id = ? AND date >= date('now', '-30 days')
  `).bind(userId).first<{ streak_days: number }>()

  return c.json({
    today_calories: totals?.total_calories || 0,
    calorie_goal: user?.calorie_goal || 2000,
    remaining: Math.max((user?.calorie_goal || 2000) - (totals?.total_calories || 0), 0),
    protein: Math.round((totals?.total_protein || 0) * 10) / 10,
    carbs: Math.round((totals?.total_carbs || 0) * 10) / 10,
    fat: Math.round((totals?.total_fat || 0) * 10) / 10,
    protein_goal: user?.protein_goal || 150,
    carbs_goal: user?.carbs_goal || 250,
    fat_goal: user?.fat_goal || 70,
    water_intake: water?.total_water || 0,
    water_goal: user?.water_goal || 2500,
    recent_meals: meals.results || [],
    streak: streakResult?.streak_days || 0,
  })
})

export { app as dashboardRoutes }
