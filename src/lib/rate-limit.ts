import { NextRequest } from "next/server"
import { createHash } from "crypto"

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}, 10 * 60 * 1000)

/**
 * Extract and hash IP address from request
 */
export function getIpHash(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "unknown"
  const salt = process.env.IP_SALT || "default-rate-limit-salt"
  return createHash("sha256").update(ip + salt).digest("hex").slice(0, 16)
}

export interface RateLimitOptions {
  /**
   * Maximum number of requests allowed in the time window
   * @default 10
   */
  maxRequests?: number

  /**
   * Time window in milliseconds
   * @default 3600000 (1 hour)
   */
  windowMs?: number

  /**
   * Optional namespace to separate rate limits for different endpoints
   * @default ""
   */
  namespace?: string
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * Check if a request should be rate limited
 *
 * @example
 * ```ts
 * const ipHash = getIpHash(req)
 * const result = checkRateLimit(ipHash, { maxRequests: 5, windowMs: 60000 })
 * if (!result.allowed) {
 *   return NextResponse.json({ error: "Too many requests" }, { status: 429 })
 * }
 * ```
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const {
    maxRequests = 10,
    windowMs = 3600000, // 1 hour
    namespace = "",
  } = options

  const key = namespace ? `${namespace}:${identifier}` : identifier
  const now = Date.now()

  const entry = rateLimitStore.get(key)

  // If no entry exists or window has expired, create new entry
  if (!entry || entry.resetAt < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + windowMs,
    }
    rateLimitStore.set(key, newEntry)

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: newEntry.resetAt,
    }
  }

  // Check if limit is exceeded
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  // Increment count
  entry.count += 1
  rateLimitStore.set(key, entry)

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  }
}

/**
 * Convenience function to rate limit by IP address
 */
export function rateLimitByIp(
  req: NextRequest,
  options: RateLimitOptions = {}
): RateLimitResult {
  const ipHash = getIpHash(req)
  return checkRateLimit(ipHash, options)
}
