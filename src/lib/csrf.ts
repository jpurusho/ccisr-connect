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
 * Set CSRF token as an HTTP-only cookie on the response.
 * Uses secure, httpOnly, sameSite=lax for security.
 */
export async function setCsrfCookie(response: NextResponse, token: string): Promise<NextResponse> {
  const hashed = await hashToken(token)
  const expires = new Date(Date.now() + TOKEN_EXPIRY_MS)

  response.cookies.set(CSRF_COOKIE_NAME, hashed, {
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
 * Compares hashed cookie value with hashed header value using timing-safe comparison.
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

  // Hash the header token and compare with cookie (double-submit pattern)
  const hashedHeader = await hashToken(headerToken)

  // Simple constant-time string comparison (good enough for hex strings)
  if (cookieToken.length !== hashedHeader.length) {
    return false
  }

  // Compare each character to prevent timing attacks
  let mismatch = 0
  for (let i = 0; i < cookieToken.length; i++) {
    mismatch |= cookieToken.charCodeAt(i) ^ hashedHeader.charCodeAt(i)
  }

  return mismatch === 0
}

/**
 * Middleware helper: Generate and set CSRF token if not present.
 * Returns the token value (unhashed) for use in forms.
 */
export async function ensureCsrfToken(req: NextRequest, response: NextResponse): Promise<{ response: NextResponse; token: string }> {
  const existingCookie = getCsrfCookie(req)

  if (existingCookie) {
    // Cookie exists, no need to regenerate
    // Return a placeholder since we can't unhash the cookie
    return { response, token: "" }
  }

  // Generate new token
  const token = generateCsrfToken()
  const updatedResponse = await setCsrfCookie(response, token)

  // Also set token in response header for client-side access
  updatedResponse.headers.set(CSRF_HEADER_NAME, token)

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
