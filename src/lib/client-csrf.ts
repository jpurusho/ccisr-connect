/**
 * Client-side CSRF token helper
 * Gets the CSRF token from cookies to include in mutating API requests
 */

export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null

  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'csrf-token') {
      const token = decodeURIComponent(value)
      console.log('[CSRF] Token found:', token.substring(0, 8) + '...')
      return token
    }
  }
  console.warn('[CSRF] Token not found. Available cookies:', cookies.map(c => c.trim().split('=')[0]))
  return null
}

/**
 * Get headers with CSRF token for mutating requests
 */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const csrfToken = getCsrfToken()
  if (csrfToken) {
    headers['x-csrf-token'] = csrfToken
  }

  return headers
}

/**
 * Fetch wrapper that automatically includes CSRF token
 * Retries once on CSRF failure to handle race conditions on initial page load
 */
export async function fetchWithCsrf(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers)

  const csrfToken = getCsrfToken()
  if (csrfToken && (options.method === 'POST' || options.method === 'PUT' || options.method === 'DELETE')) {
    headers.set('x-csrf-token', csrfToken)
  }

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  // If we get a 403 (CSRF failure) and haven't retried yet, try once more
  // This handles the race condition where the token wasn't available on first call
  if (response.status === 403 && !headers.has('x-csrf-retry')) {
    // Wait a moment for cookie to be committed
    await new Promise(resolve => setTimeout(resolve, 100))

    // Retry with fresh token
    const retryHeaders = new Headers(headers)
    const freshToken = getCsrfToken()
    if (freshToken) {
      retryHeaders.set('x-csrf-token', freshToken)
      retryHeaders.set('x-csrf-retry', 'true') // Prevent infinite retry

      return fetch(url, {
        ...options,
        headers: retryHeaders,
      })
    }
  }

  return response
}
