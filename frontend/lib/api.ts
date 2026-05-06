const API_BASE = process.env.NEXT_PUBLIC_WORKER_URL || ''

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

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `HTTP ${res.status}`)
  }

  return res.json()
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
  if (!res.ok) throw new Error('Upload failed')
  return res.json()
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

  if (!res.ok) throw new Error('Detection failed')
  return res.json()
}

export const getNutrition = (foodName: string) =>
  fetchWithAuth('/api/nutrition', {
    method: 'POST',
    body: JSON.stringify({ foodName }),
  })

export const logMeal = (meal: {
  food_name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  meal_type: string
  image_url?: string
}) =>
  fetchWithAuth('/api/log', {
    method: 'POST',
    body: JSON.stringify(meal),
  })

export const getDashboard = () => fetchWithAuth('/api/dashboard')

export const getHistory = (date?: string) =>
  fetchWithAuth(`/api/history${date ? `?date=${date}` : ''}`)

export const logWeight = (weight: number) =>
  fetchWithAuth('/api/weight', {
    method: 'POST',
    body: JSON.stringify({ weight }),
  })

export const getWeightHistory = () => fetchWithAuth('/api/weight')

export const logWater = (amount: number) =>
  fetchWithAuth('/api/water', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  })

export const getWater = () => fetchWithAuth('/api/water')

export const getWaterToday = getWater;

export const getProfile = () => fetchWithAuth('/api/profile')

export const updateProfile = (data: Record<string, number>) =>
  fetchWithAuth('/api/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  })

// Also export the api object for backward compatibility if needed
export const api = {
  login,
  register,
  uploadImage,
  detectFood,
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
}
