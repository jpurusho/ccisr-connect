import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { getIpHash, checkRateLimit, rateLimitByIp } from '../rate-limit'

// Mock crypto for consistent hashing
vi.mock('crypto', () => ({
  createHash: vi.fn().mockReturnValue({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn().mockReturnValue({
      slice: vi.fn().mockReturnValue('mocked-hash-123'),
    }),
  }),
}))

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Clear the rate limit store between tests
    vi.clearAllMocks()
  })

  describe('getIpHash', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      })

      const hash = getIpHash(req)
      expect(hash).toBe('mocked-hash-123')
    })

    it('should extract IP from x-real-ip header when x-forwarded-for is missing', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-real-ip': '192.168.1.1',
        },
      })

      const hash = getIpHash(req)
      expect(hash).toBe('mocked-hash-123')
    })

    it('should use "unknown" when no IP headers are present', () => {
      const req = new NextRequest('http://localhost:3000/api/test')

      const hash = getIpHash(req)
      expect(hash).toBe('mocked-hash-123')
    })

    it('should handle multiple IPs in x-forwarded-for', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '203.0.113.1, 198.51.100.1, 192.0.2.1',
        },
      })

      const hash = getIpHash(req)
      expect(hash).toBe('mocked-hash-123')
    })
  })

  describe('checkRateLimit', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should allow first request', () => {
      const result = checkRateLimit('test-identifier', {
        maxRequests: 5,
        windowMs: 60000,
      })

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4)
    })

    it('should track request count correctly', () => {
      const identifier = 'test-identifier-2'
      const options = { maxRequests: 3, windowMs: 60000 }

      // First request
      let result = checkRateLimit(identifier, options)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(2)

      // Second request
      result = checkRateLimit(identifier, options)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(1)

      // Third request
      result = checkRateLimit(identifier, options)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(0)

      // Fourth request - should be blocked
      result = checkRateLimit(identifier, options)
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should reset counter after window expires', () => {
      const identifier = 'test-identifier-3'
      const windowMs = 60000
      const options = { maxRequests: 2, windowMs }

      // First request
      let result = checkRateLimit(identifier, options)
      expect(result.allowed).toBe(true)

      // Second request
      result = checkRateLimit(identifier, options)
      expect(result.allowed).toBe(true)

      // Third request - should be blocked
      result = checkRateLimit(identifier, options)
      expect(result.allowed).toBe(false)

      // Fast forward past the window
      vi.advanceTimersByTime(windowMs + 1000)

      // Should be allowed again
      result = checkRateLimit(identifier, options)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(1)
    })

    it('should use default options when none provided', () => {
      const result = checkRateLimit('test-identifier-4')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(9) // default maxRequests is 10
    })

    it('should handle namespace correctly', () => {
      const identifier = 'test-identifier-5'

      // Request to namespace A
      let result = checkRateLimit(identifier, {
        maxRequests: 2,
        namespace: 'api-a',
      })
      expect(result.allowed).toBe(true)

      // Request to namespace B (different namespace, should not affect A's count)
      result = checkRateLimit(identifier, {
        maxRequests: 2,
        namespace: 'api-b',
      })
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(1)

      // Second request to namespace A
      result = checkRateLimit(identifier, {
        maxRequests: 2,
        namespace: 'api-a',
      })
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(0)
    })

    it('should return correct resetAt timestamp', () => {
      const now = Date.now()
      vi.setSystemTime(now)

      const windowMs = 60000
      const result = checkRateLimit('test-identifier-6', { windowMs })

      expect(result.resetAt).toBe(now + windowMs)
    })

    it('should handle concurrent requests correctly', () => {
      const identifier = 'test-identifier-7'
      const options = { maxRequests: 5, windowMs: 60000 }

      // Simulate 5 concurrent requests
      const results = Array.from({ length: 5 }, () =>
        checkRateLimit(identifier, options)
      )

      // All should be allowed
      expect(results.every((r) => r.allowed)).toBe(true)

      // Next request should be blocked
      const nextResult = checkRateLimit(identifier, options)
      expect(nextResult.allowed).toBe(false)
    })
  })

  describe('rateLimitByIp', () => {
    it('should rate limit based on IP address', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      })

      const result = rateLimitByIp(req, {
        maxRequests: 3,
        windowMs: 60000,
      })

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(2)
    })

    it('should use default options', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.2',
        },
      })

      const result = rateLimitByIp(req)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBeGreaterThanOrEqual(0)
    })

    it('should track different IPs separately', () => {
      const req1 = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.3',
        },
      })

      const req2 = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.4',
        },
      })

      const options = { maxRequests: 2, windowMs: 60000 }

      // First IP - 2 requests
      rateLimitByIp(req1, options)
      const result1 = rateLimitByIp(req1, options)
      expect(result1.allowed).toBe(true)

      // Second IP - should be independent
      const result2 = rateLimitByIp(req2, options)
      expect(result2.allowed).toBe(true)
      expect(result2.remaining).toBe(1)
    })
  })

  describe('Edge cases', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should handle maxRequests of 1', () => {
      const result1 = checkRateLimit('single-request', { maxRequests: 1 })
      expect(result1.allowed).toBe(true)

      const result2 = checkRateLimit('single-request', { maxRequests: 1 })
      expect(result2.allowed).toBe(false)
    })

    it('should handle very short time windows', () => {
      const identifier = 'short-window'
      const options = { maxRequests: 2, windowMs: 100 }

      const result1 = checkRateLimit(identifier, options)
      expect(result1.allowed).toBe(true)

      const result2 = checkRateLimit(identifier, options)
      expect(result2.allowed).toBe(true)

      const result3 = checkRateLimit(identifier, options)
      expect(result3.allowed).toBe(false)

      // Fast forward
      vi.advanceTimersByTime(150)

      const result4 = checkRateLimit(identifier, options)
      expect(result4.allowed).toBe(true)
    })

    it('should handle empty identifier', () => {
      const result = checkRateLimit('', { maxRequests: 5 })
      expect(result.allowed).toBe(true)
    })

    it('should handle very large maxRequests', () => {
      const result = checkRateLimit('large-limit', { maxRequests: 1000000 })
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(999999)
    })
  })
})
