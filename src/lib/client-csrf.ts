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
      return decodeURIComponent(value)
    }
  }
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

  return fetch(url, {
    ...options,
    headers,
  })
}
