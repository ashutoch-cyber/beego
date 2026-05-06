import { Hono } from 'hono'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

interface NutritionData {
  food_name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  serving_size: string
  source: string
}

// USDA API nutrition lookup
async function getUSDANutrition(foodName: string, apiKey: string): Promise<NutritionData | null> {
  try {
    // Search USDA FoodData Central
    const searchUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(foodName)}&pageSize=1&api_key=${apiKey}`
    const searchResponse = await fetch(searchUrl)

    if (!searchResponse.ok) {
      return null
    }

    const searchData = await searchResponse.json()

    if (!searchData.foods || searchData.foods.length === 0) {
      return null
    }

    const food = searchData.foods[0]
    const fdcId = food.fdcId

    // Get detailed nutrition
    const detailUrl = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${apiKey}`
    const detailResponse = await fetch(detailUrl)

    if (!detailResponse.ok) {
      return null
    }

    const detailData = await detailResponse.json()

    // Extract nutrients
    const nutrients = detailData.foodNutrients || []
    const getNutrient = (name: string) => {
      const nutrient = nutrients.find((n: any) =>
        n.nutrientName?.toLowerCase().includes(name.toLowerCase())
      )
      return nutrient?.value || 0
    }

    return {
      food_name: food.description || foodName,
      calories: Math.round(getNutrient('Energy')),
      protein: Math.round(getNutrient('Protein') * 10) / 10,
      carbs: Math.round(getNutrient('Carbohydrate') * 10) / 10,
      fat: Math.round(getNutrient('Total lipid') * 10) / 10,
      serving_size: food.servingSize ? `${food.servingSize}${food.servingSizeUnit || 'g'}` : '100g',
      source: 'USDA',
    }
  } catch (error) {
    console.error('USDA API error:', error)
    return null
  }
}

// Open Food Facts fallback
async function getOpenFoodFactsNutrition(foodName: string): Promise<NutritionData | null> {
  try {
    const searchUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(foodName)}&search_simple=1&action=process&json=1&page_size=1`
    const response = await fetch(searchUrl)

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    if (!data.products || data.products.length === 0) {
      return null
    }

    const product = data.products[0]
    const nutriments = product.nutriments || {}

    return {
      food_name: product.product_name || foodName,
      calories: Math.round(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0),
      protein: Math.round((nutriments.proteins_100g || 0) * 10) / 10,
      carbs: Math.round((nutriments.carbohydrates_100g || 0) * 10) / 10,
      fat: Math.round((nutriments.fat_100g || 0) * 10) / 10,
      serving_size: product.serving_size || '100g',
      source: 'Open Food Facts',
    }
  } catch (error) {
    console.error('Open Food Facts error:', error)
    return null
  }
}

// Indian food nutrition database (fallback for common Indian foods)
const INDIAN_FOOD_DB: Record<string, NutritionData> = {
  'biryani': { food_name: 'Chicken Biryani', calories: 292, protein: 16.5, carbs: 32, fat: 10.5, serving_size: '1 cup (200g)', source: 'Indian Food DB' },
  'chicken biryani': { food_name: 'Chicken Biryani', calories: 292, protein: 16.5, carbs: 32, fat: 10.5, serving_size: '1 cup (200g)', source: 'Indian Food DB' },
  'veg biryani': { food_name: 'Vegetable Biryani', calories: 240, protein: 6, carbs: 38, fat: 8, serving_size: '1 cup (200g)', source: 'Indian Food DB' },
  'pulao': { food_name: 'Vegetable Pulao', calories: 220, protein: 5, carbs: 36, fat: 7, serving_size: '1 cup (200g)', source: 'Indian Food DB' },
  'dal': { food_name: 'Dal (Lentils)', calories: 116, protein: 9, carbs: 20, fat: 2, serving_size: '1 cup (200g)', source: 'Indian Food DB' },
  'dal makhani': { food_name: 'Dal Makhani', calories: 278, protein: 12, carbs: 28, fat: 14, serving_size: '1 cup (200g)', source: 'Indian Food DB' },
  'curry': { food_name: 'Mixed Vegetable Curry', calories: 180, protein: 5, carbs: 15, fat: 12, serving_size: '1 cup (200g)', source: 'Indian Food DB' },
  'naan': { food_name: 'Naan Bread', calories: 262, protein: 8, carbs: 45, fat: 6, serving_size: '1 piece (90g)', source: 'Indian Food DB' },
  'roti': { food_name: 'Whole Wheat Roti', calories: 120, protein: 4, carbs: 22, fat: 3, serving_size: '1 piece (40g)', source: 'Indian Food DB' },
  'paratha': { food_name: 'Aloo Paratha', calories: 280, protein: 6, carbs: 38, fat: 12, serving_size: '1 piece (80g)', source: 'Indian Food DB' },
  'dosa': { food_name: 'Plain Dosa', calories: 133, protein: 3.5, carbs: 26, fat: 2, serving_size: '1 piece (80g)', source: 'Indian Food DB' },
  'masala dosa': { food_name: 'Masala Dosa', calories: 213, protein: 5, carbs: 38, fat: 5, serving_size: '1 piece (150g)', source: 'Indian Food DB' },
  'idli': { food_name: 'Idli', calories: 58, protein: 2, carbs: 12, fat: 0.5, serving_size: '1 piece (40g)', source: 'Indian Food DB' },
  'samosa': { food_name: 'Samosa', calories: 262, protein: 4, carbs: 30, fat: 14, serving_size: '1 piece (60g)', source: 'Indian Food DB' },
  'paneer': { food_name: 'Paneer Tikka', calories: 265, protein: 18, carbs: 8, fat: 18, serving_size: '100g', source: 'Indian Food DB' },
  'paneer tikka': { food_name: 'Paneer Tikka', calories: 265, protein: 18, carbs: 8, fat: 18, serving_size: '100g', source: 'Indian Food DB' },
  'butter chicken': { food_name: 'Butter Chicken', calories: 298, protein: 22, carbs: 8, fat: 20, serving_size: '1 cup (200g)', source: 'Indian Food DB' },
  'chicken tikka': { food_name: 'Chicken Tikka', calories: 260, protein: 28, carbs: 4, fat: 14, serving_size: '100g', source: 'Indian Food DB' },
  'tandoori chicken': { food_name: 'Tandoori Chicken', calories: 240, protein: 26, carbs: 3, fat: 13, serving_size: '100g', source: 'Indian Food DB' },
  'chole': { food_name: 'Chole (Chickpea Curry)', calories: 180, protein: 8, carbs: 28, fat: 5, serving_size: '1 cup (200g)', source: 'Indian Food DB' },
  'rajma': { food_name: 'Rajma (Kidney Bean Curry)', calories: 170, protein: 9, carbs: 25, fat: 4, serving_size: '1 cup (200g)', source: 'Indian Food DB' },
  'palak paneer': { food_name: 'Palak Paneer', calories: 240, protein: 14, carbs: 12, fat: 16, serving_size: '1 cup (200g)', source: 'Indian Food DB' },
  'aloo gobi': { food_name: 'Aloo Gobi', calories: 150, protein: 4, carbs: 20, fat: 7, serving_size: '1 cup (200g)', source: 'Indian Food DB' },
  'poha': { food_name: 'Poha (Flattened Rice)', calories: 180, protein: 4, carbs: 35, fat: 3, serving_size: '1 cup (150g)', source: 'Indian Food DB' },
  'upma': { food_name: 'Upma', calories: 192, protein: 5, carbs: 32, fat: 5, serving_size: '1 cup (150g)', source: 'Indian Food DB' },
  'khichdi': { food_name: 'Khichdi', calories: 160, protein: 6, carbs: 28, fat: 3, serving_size: '1 cup (200g)', source: 'Indian Food DB' },
  'dhokla': { food_name: 'Dhokla', calories: 152, protein: 6, carbs: 24, fat: 4, serving_size: '100g', source: 'Indian Food DB' },
  'thepla': { food_name: 'Thepla', calories: 120, protein: 4, carbs: 18, fat: 4, serving_size: '1 piece (40g)', source: 'Indian Food DB' },
  'vada': { food_name: 'Medu Vada', calories: 155, protein: 5, carbs: 20, fat: 6, serving_size: '1 piece (50g)', source: 'Indian Food DB' },
  'poori': { food_name: 'Poori', calories: 140, protein: 3, carbs: 18, fat: 7, serving_size: '1 piece (30g)', source: 'Indian Food DB' },
  'kheer': { food_name: 'Rice Kheer', calories: 200, protein: 5, carbs: 30, fat: 7, serving_size: '1 cup (200g)', source: 'Indian Food DB' },
  'jalebi': { food_name: 'Jalebi', calories: 150, protein: 1, carbs: 35, fat: 2, serving_size: '2 pieces (50g)', source: 'Indian Food DB' },
  'gulab jamun': { food_name: 'Gulab Jamun', calories: 175, protein: 2, carbs: 25, fat: 8, serving_size: '1 piece (50g)', source: 'Indian Food DB' },
  'rasgulla': { food_name: 'Rasgulla', calories: 106, protein: 3, carbs: 20, fat: 1, serving_size: '1 piece (50g)', source: 'Indian Food DB' },
  'lassi': { food_name: 'Sweet Lassi', calories: 150, protein: 5, carbs: 22, fat: 4, serving_size: '1 glass (250ml)', source: 'Indian Food DB' },
  'chai': { food_name: 'Masala Chai', calories: 80, protein: 3, carbs: 10, fat: 3, serving_size: '1 cup (200ml)', source: 'Indian Food DB' },
  'thali': { food_name: 'Indian Thali (Mixed)', calories: 800, protein: 25, carbs: 100, fat: 30, serving_size: '1 plate', source: 'Indian Food DB' },
}

app.post('/', async (c) => {
  const { foodName } = await c.req.json()

  if (!foodName) {
    return c.json({ message: 'No food name provided' }, 400)
  }

  const normalizedName = foodName.toLowerCase().trim()

  // 1. Try USDA API first
  const usdaResult = await getUSDANutrition(foodName, c.env.USDA_API_KEY)
  if (usdaResult) {
    return c.json(usdaResult)
  }

  // 2. Try Open Food Facts
  const offResult = await getOpenFoodFactsNutrition(foodName)
  if (offResult) {
    return c.json(offResult)
  }

  // 3. Try Indian food database
  const indianResult = INDIAN_FOOD_DB[normalizedName]
  if (indianResult) {
    return c.json(indianResult)
  }

  // 4. Try fuzzy match on Indian DB
  for (const [key, value] of Object.entries(INDIAN_FOOD_DB)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return c.json(value)
    }
  }

  // 5. Return generic estimate
  return c.json({
    food_name: foodName,
    calories: 200,
    protein: 8,
    carbs: 25,
    fat: 8,
    serving_size: '1 serving (approx 150g)',
    source: 'Estimated',
    note: 'Could not find exact match. Values are estimates. Please verify.',
  })
})

export { app as nutritionRoutes }
