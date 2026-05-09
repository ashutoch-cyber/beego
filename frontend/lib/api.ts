const API_BASE = process.env.NEXT_PUBLIC_WORKER_URL || 'https://nutrisnap-api.mrashutheboy.workers.dev'

type DashboardResponse = {
  calories_consumed?: number
  calories_goal?: number
  today_calories?: number
  calorie_goal?: number
  protein?: number
  protein_goal?: number
  carbs?: number
  carbs_goal?: number
  fat?: number
  fat_goal?: number
  fiber?: number
  fibre?: number
  fiber_goal?: number
  fibre_goal?: number
  water_goal?: number
  recent_meals?: unknown[]
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }

  if (options.headers) {
    const opts = options.headers as Record<string, string>
    Object.assign(headers, opts)
  }

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return null
  }

  return parseApiResponse(res, 'Request failed')
}

async function parseApiResponse(res: Response, fallbackMessage: string) {
  const text = await res.text()
  let data: any = null

  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(fallbackMessage)
    }
  }

  if (!res.ok) {
    throw new Error(data?.message || fallbackMessage)
  }

  return data
}

function normalizeDashboard(data: DashboardResponse | null) {
  const consumed = data?.calories_consumed ?? data?.today_calories ?? 0
  const goal = data?.calories_goal ?? data?.calorie_goal ?? 2000

  return {
    ...data,
    calories_consumed: consumed,
    calories_goal: goal,
    today_calories: consumed,
    calorie_goal: goal,
    protein: data?.protein ?? 0,
    protein_goal: data?.protein_goal ?? 150,
    carbs: data?.carbs ?? 0,
    carbs_goal: data?.carbs_goal ?? 250,
    fat: data?.fat ?? 0,
    fat_goal: data?.fat_goal ?? 65,
    fiber: data?.fiber ?? data?.fibre ?? 0,
    fibre: data?.fiber ?? data?.fibre ?? 0,
    fiber_goal: data?.fiber_goal ?? data?.fibre_goal ?? 25,
    fibre_goal: data?.fiber_goal ?? data?.fibre_goal ?? 25,
    water_goal: data?.water_goal ?? 2500,
    recent_meals: data?.recent_meals ?? [],
  }
}

export const login = (email: string, password: string) =>
  fetchWithAuth('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

export const register = (email: string, password: string) =>
  fetchWithAuth('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

export const uploadImage = async (file: File) => {
  const formData = new FormData()
  formData.append('image', file)
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  return parseApiResponse(res, 'Upload failed')
}

export const detectFood = async (input: string | File) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const headers: Record<string, string> = {
    ...(token && { Authorization: `Bearer ${token}` }),
  }

  let body: BodyInit
  if (typeof input === 'string') {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify({ imageUrl: input })
  } else {
    const formData = new FormData()
    formData.append('image', input)
    body = formData
  }

  const res = await fetch(`${API_BASE}/api/detect`, {
    method: 'POST',
    headers,
    body,
  })

  return parseApiResponse(res, 'Detection failed')
}

export const analyzeMeal = async (file: File) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const formData = new FormData()
  formData.append('image', file)

  const res = await fetch(`${API_BASE}/api/analyze-meal`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  })

  return parseApiResponse(res, 'Meal scan failed')
}

export const analyzeMealFast = async (file: File) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const formData = new FormData()
  formData.append('image', file)

  const res = await fetch(`${API_BASE}/api/analyze-meal-fast`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  })

  return parseApiResponse(res, 'Fast meal scan failed')
}

export const analyzeNutritionLabel = async (file: File, productName?: string) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const formData = new FormData()
  formData.append('image', file)
  if (productName) formData.append('productName', productName)

  const res = await fetch(`${API_BASE}/api/nutrition-label`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  })

  return parseApiResponse(res, 'Nutrition label scan failed')
}

export const getNutrition = (foodName: string, ingredients?: string) =>
  fetchWithAuth('/api/nutrition', {
    method: 'POST',
    body: JSON.stringify({ foodName, ingredients }),
  })

export const logMeal = (meal: {
  food_name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  meal_type: string
  image_url?: string
}) =>
  fetchWithAuth('/api/log', {
    method: 'POST',
    body: JSON.stringify(meal),
  })

export const getDashboard = async () => normalizeDashboard(await fetchWithAuth('/api/dashboard'))

export const getHistory = (date?: string) =>
  fetchWithAuth(`/api/history${date ? `?date=${date}` : ''}`).then((data) =>
    Array.isArray(data) ? data : data?.meals ?? []
  )

export const logWeight = (weight: number) =>
  fetchWithAuth('/api/weight', {
    method: 'POST',
    body: JSON.stringify({ weight }),
  })

export const getWeightHistory = () =>
  fetchWithAuth('/api/weight').then((data) => Array.isArray(data) ? data : data?.weights ?? [])

export const logWater = (amount: number) =>
  fetchWithAuth('/api/water', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  })

export const getWater = () =>
  fetchWithAuth('/api/water').then((data) => {
    const amount = data?.amount ?? data?.total ?? 0
    return { ...data, amount, total: amount }
  })

export const getWaterToday = getWater;

export const getProfile = () => fetchWithAuth('/api/profile')

export const updateProfile = (data: Record<string, number>) =>
  fetchWithAuth('/api/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  })

export const exportData = () => fetchWithAuth('/api/export')

// Also export the api object for backward compatibility if needed
export const api = {
  login,
  register,
  uploadImage,
  detectFood,
  analyzeMealFast,
  analyzeMeal,
  analyzeNutritionLabel,
  getNutrition,
  logMeal,
  getDashboard,
  getHistory,
  logWeight,
  getWeightHistory,
  logWater,
  getWater,
  getProfile,
  updateProfile,
  exportData,
}
