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
    id: `pending-${Date.now()}`,
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

export async function removePendingMeal(id: string) {
  const db = await openDB()
  const tx = db.transaction('pendingMeals', 'readwrite')
  const store = tx.objectStore('pendingMeals')
  await store.delete(id)
  db.close()
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

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope)
      })
      .catch((error) => {
        console.log('SW registration failed:', error)
      })
  }
}

export const cacheMeal = savePendingMeal;
