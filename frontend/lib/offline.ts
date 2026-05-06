// Offline support utilities

const DB_NAME = 'nutrisnap-offline'
const DB_VERSION = 1

interface PendingMeal {
  id: string
  food_name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  meal_type: string
  image_url?: string
  date: string
  timestamp: number
}

interface PendingWeight {
  id: string
  weight: number
  timestamp: number
}

interface PendingWater {
  id: string
  amount: number
  timestamp: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('pendingMeals')) {
        db.createObjectStore('pendingMeals', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('pendingWeights')) {
        db.createObjectStore('pendingWeights', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('pendingWater')) {
        db.createObjectStore('pendingWater', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('cachedDashboard')) {
        db.createObjectStore('cachedDashboard', { keyPath: 'key' })
      }
    }
  })
}

export async function savePendingMeal(meal: Omit<PendingMeal, 'id' | 'timestamp'>) {
  const db = await openDB()
  const tx = db.transaction('pendingMeals', 'readwrite')
  const store = tx.objectStore('pendingMeals')
  const pendingMeal: PendingMeal = {
    ...meal,
    id: `pending-meal-${Date.now()}`,
    timestamp: Date.now(),
  }
  await store.put(pendingMeal)
  db.close()
  return pendingMeal.id
}

export async function getPendingMeals(): Promise<PendingMeal[]> {
  const db = await openDB()
  const tx = db.transaction('pendingMeals', 'readonly')
  const store = tx.objectStore('pendingMeals')
  const request = store.getAll()
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    db.close()
  })
}

export async function cacheWeight(data: { weight: number; date?: string }) {
  const db = await openDB()
  const tx = db.transaction('pendingWeights', 'readwrite')
  const store = tx.objectStore('pendingWeights')
  await store.put({
    id: `pending-weight-${Date.now()}`,
    ...data,
    timestamp: Date.now(),
  })
  db.close()
}

export async function getCachedWeights(): Promise<PendingWeight[]> {
  const db = await openDB()
  const tx = db.transaction('pendingWeights', 'readonly')
  const store = tx.objectStore('pendingWeights')
  const request = store.getAll()
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    db.close()
  })
}

export async function cacheWater(data: number | { amount: number; date?: string }) {
  const db = await openDB()
  const tx = db.transaction('pendingWater', 'readwrite')
  const store = tx.objectStore('pendingWater')
  const amount = typeof data === 'number' ? data : data.amount
  await store.put({
    id: `pending-water-${Date.now()}`,
    amount,
    timestamp: Date.now(),
  })
  db.close()
}

export async function getCachedWater(date?: string): Promise<PendingWater[]> {
  const db = await openDB()
  const tx = db.transaction('pendingWater', 'readonly')
  const store = tx.objectStore('pendingWater')
  const request = store.getAll()
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      let results = request.result as PendingWater[]
      if (date) {
        // Filter by date if provided (assuming the timestamp matches the date)
        results = results.filter(w => new Date(w.timestamp).toISOString().split('T')[0] === date)
      }
      resolve(results)
    }
    request.onerror = () => reject(request.error)
    db.close()
  })
}

export async function cacheDashboard(data: any) {
  const db = await openDB()
  const tx = db.transaction('cachedDashboard', 'readwrite')
  const store = tx.objectStore('cachedDashboard')
  await store.put({ key: 'latest', data, timestamp: Date.now() })
  db.close()
}

export async function getCachedDashboard(): Promise<any | null> {
  const db = await openDB()
  const tx = db.transaction('cachedDashboard', 'readonly')
  const store = tx.objectStore('cachedDashboard')
  const request = store.get('latest')
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const result = request.result
      resolve(result ? result.data : null)
    }
    request.onerror = () => reject(request.error)
    db.close()
  })
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine
}

export const cacheMeal = savePendingMeal;
export const getCachedMeals = getPendingMeals;
export const getCachedWeightHistory = getCachedWeights;
