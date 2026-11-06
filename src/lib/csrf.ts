import { NextRequest, NextResponse } from "next/server"

const CSRF_TOKEN_LENGTH = 32
const CSRF_COOKIE_NAME = "csrf-token" // Must match client-csrf.ts
const CSRF_HEADER_NAME = "x-csrf-token"
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Generate a cryptographically secure CSRF token using Web Crypto API.
 * Returns a hex-encoded random string.
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(CSRF_TOKEN_LENGTH)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

/**
 * Hash a CSRF token for double-submit cookie pattern using Web Crypto API.
 * This prevents token fixation attacks.
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

/**
 * Set CSRF token as a cookie on the response.
 * Uses secure, sameSite=lax for security.
 * httpOnly=false is required for double-submit pattern (client must read cookie).
 */
export async function setCsrfCookie(response: NextResponse, token: string): Promise<NextResponse> {
  const expires = new Date(Date.now() + TOKEN_EXPIRY_MS)

  // Store unhashed token - double-submit pattern compares cookie === header
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by JavaScript for double-submit pattern
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  })

  return response
}

/**
 * Get the CSRF token from the request cookie.
 */
function getCsrfCookie(req: NextRequest): string | null {
  return req.cookies.get(CSRF_COOKIE_NAME)?.value || null
}

/**
 * Get the CSRF token from the request header.
 */
function getCsrfHeader(req: NextRequest): string | null {
  return req.headers.get(CSRF_HEADER_NAME) || null
}

/**
 * Validate CSRF token using double-submit cookie pattern.
 * Compares cookie value with header value using timing-safe comparison.
 *
 * @returns true if valid, false otherwise
 */
export async function validateCsrfToken(req: NextRequest): Promise<boolean> {
  const cookieToken = getCsrfCookie(req)
  const headerToken = getCsrfHeader(req)

  // Both must be present
  if (!cookieToken || !headerToken) {
    return false
  }

  // Simple constant-time string comparison to prevent timing attacks
  if (cookieToken.length !== headerToken.length) {
    return false
  }

  // Compare each character to prevent timing attacks
  let mismatch = 0
  for (let i = 0; i < cookieToken.length; i++) {
    mismatch |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i)
  }

  return mismatch === 0
}

/**
 * Middleware helper: Generate and set CSRF token if not present.
 * Returns the token value for use in forms (though client reads from cookie).
 */
export async function ensureCsrfToken(req: NextRequest, response: NextResponse): Promise<{ response: NextResponse; token: string }> {
  const existingCookie = getCsrfCookie(req)

  if (existingCookie) {
    // Cookie exists, no need to regenerate
    return { response, token: existingCookie }
  }

  // Generate new token and store in cookie
  const token = generateCsrfToken()
  const updatedResponse = await setCsrfCookie(response, token)

  return { response: updatedResponse, token }
}

/**
 * API route helper: Validate CSRF token and return 403 if invalid.
 * Use this at the start of POST/PUT/DELETE route handlers.
 */
export async function requireCsrfToken(req: NextRequest): Promise<NextResponse | null> {
  const isValid = await validateCsrfToken(req)
  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid or missing CSRF token" },
      { status: 403 }
    )
  }
  return null
}

/**
 * Validate Origin/Referer headers for public endpoints (lightweight CSRF protection).
 * This is useful for public forms where traditional CSRF tokens aren't practical.
 *
 * @returns true if valid, false otherwise
 */
export function validateOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin")
  const referer = req.headers.get("referer")

  // Get the expected origin from environment or request
  const expectedOrigin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin

  // Check if origin matches (preferred)
  if (origin) {
    return origin === expectedOrigin
  }

  // Fallback to referer check
  if (referer) {
    try {
      const refererUrl = new URL(referer)
      return refererUrl.origin === expectedOrigin
    } catch {
      return false
    }
  }

  // No origin or referer header (suspicious for AJAX requests)
  return false
}

/**
 * Public endpoint CSRF protection: Validate Origin/Referer headers.
 * Use this for public forms that don't have authenticated sessions.
 */
export function requireValidOrigin(req: NextRequest): NextResponse | null {
  if (!validateOrigin(req)) {
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 }
    )
  }
  return null
}
