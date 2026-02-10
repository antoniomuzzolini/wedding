/**
 * Utility functions for caching guest confirmation codes in localStorage
 */

const CACHE_KEY = 'guestConfirmationCode'
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 1 day in milliseconds

interface CachedCode {
  code: string
  expiresAt: number
}

/**
 * Saves guest code to cache with expiration (1 day)
 */
export function saveGuestCodeToCache(code: string): void {
  if (typeof window === 'undefined') return
  
  try {
    const expiresAt = Date.now() + CACHE_DURATION_MS
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      code,
      expiresAt,
    }))
    // Dispatch custom event to notify Navigation component
    window.dispatchEvent(new Event('guestCodeSaved'))
  } catch (err) {
    console.error('Error saving guest code to cache:', err)
  }
}

/**
 * Retrieves cached guest code if valid, otherwise returns null
 */
export function getCachedGuestCode(): string | null {
  if (typeof window === 'undefined') return null
  
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null
    
    const { code, expiresAt }: CachedCode = JSON.parse(cached)
    const now = Date.now()
    
    // Check if cache has expired
    if (now > expiresAt) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }
    
    return code
  } catch {
    return null
  }
}

/**
 * Clears the cached guest code
 */
export function clearCachedGuestCode(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CACHE_KEY)
}
