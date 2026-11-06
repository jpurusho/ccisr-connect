import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import {
  generateCsrfToken,
  validateCsrfToken,
  setCsrfCookie,
  ensureCsrfToken,
  requireCsrfToken,
  validateOrigin,
  requireValidOrigin,
} from '../csrf'

// Mock crypto.getRandomValues
const mockRandomValues = vi.fn((array: Uint8Array) => {
  for (let i = 0; i < array.length; i++) {
    array[i] = i % 256
  }
  return array
})

Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: mockRandomValues,
    subtle: {
      digest: vi.fn(async (algorithm: string, data: BufferSource) => {
        // Simple mock hash for testing
        const array = new Uint8Array(data as ArrayBuffer)
        const hash = new Uint8Array(32)
        for (let i = 0; i < 32; i++) {
          hash[i] = array[i % array.length] ^ i
        }
        return hash.buffer
      }),
    },
  },
})

describe('CSRF Protection', () => {
  describe('generateCsrfToken', () => {
    it('should generate a token of correct length', () => {
      const token = generateCsrfToken()
      expect(token).toHaveLength(64) // 32 bytes = 64 hex characters
    })

    it('should generate unique tokens', () => {
      const token1 = generateCsrfToken()
      const token2 = generateCsrfToken()
      expect(token1).not.toBe(token2)
    })

    it('should generate hex-encoded tokens', () => {
      const token = generateCsrfToken()
      expect(token).toMatch(/^[0-9a-f]+$/)
    })
  })

  describe('setCsrfCookie', () => {
    it('should set CSRF cookie with correct attributes', async () => {
      const response = NextResponse.json({ success: true })
      const token = 'test-token-123'

      const updatedResponse = await setCsrfCookie(response, token)

      const cookie = updatedResponse.cookies.get('csrf_token')
      expect(cookie).toBeDefined()
      expect(cookie?.value).toBeDefined()
      expect(cookie?.httpOnly).toBe(true)
      expect(cookie?.sameSite).toBe('lax')
      expect(cookie?.path).toBe('/')
    })

    it('should use secure flag in production', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const response = NextResponse.json({ success: true })
      const token = 'test-token-123'

      const updatedResponse = await setCsrfCookie(response, token)

      const cookie = updatedResponse.cookies.get('csrf_token')
      expect(cookie?.secure).toBe(true)

      process.env.NODE_ENV = originalEnv
    })

    it('should not use secure flag in development', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const response = NextResponse.json({ success: true })
      const token = 'test-token-123'

      const updatedResponse = await setCsrfCookie(response, token)

      const cookie = updatedResponse.cookies.get('csrf_token')
      expect(cookie?.secure).toBe(false)

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('validateCsrfToken', () => {
    it('should return false when cookie is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
      })

      const result = await validateCsrfToken(req)
      expect(result).toBe(false)
    })

    it('should return false when header is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          Cookie: 'csrf_token=test-cookie',
        },
      })

      const result = await validateCsrfToken(req)
      expect(result).toBe(false)
    })

    it('should return false when tokens do not match', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          Cookie: 'csrf_token=different-hash',
          'x-csrf-token': 'test-token',
        },
      })

      const result = await validateCsrfToken(req)
      expect(result).toBe(false)
    })

    it('should validate matching tokens correctly', async () => {
      const token = generateCsrfToken()
      const response = NextResponse.json({})
      const updatedResponse = await setCsrfCookie(response, token)
      const cookieValue = updatedResponse.cookies.get('csrf_token')?.value

      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          Cookie: `csrf_token=${cookieValue}`,
          'x-csrf-token': token,
        },
      })

      const result = await validateCsrfToken(req)
      expect(result).toBe(true)
    })
  })

  describe('requireCsrfToken', () => {
    it('should return 403 response when token is invalid', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
      })

      const result = await requireCsrfToken(req)
      expect(result).toBeInstanceOf(NextResponse)
      expect(result?.status).toBe(403)

      const json = await result?.json()
      expect(json).toEqual({ error: 'Invalid or missing CSRF token' })
    })

    it('should return null when token is valid', async () => {
      const token = generateCsrfToken()
      const response = NextResponse.json({})
      const updatedResponse = await setCsrfCookie(response, token)
      const cookieValue = updatedResponse.cookies.get('csrf_token')?.value

      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          Cookie: `csrf_token=${cookieValue}`,
          'x-csrf-token': token,
        },
      })

      const result = await requireCsrfToken(req)
      expect(result).toBeNull()
    })
  })

  describe('ensureCsrfToken', () => {
    it('should generate new token when cookie does not exist', async () => {
      const req = new NextRequest('http://localhost:3000')
      const response = NextResponse.next()

      const result = await ensureCsrfToken(req, response)

      expect(result.token).toBeDefined()
      expect(result.token.length).toBeGreaterThan(0)
      expect(result.response.cookies.get('csrf_token')).toBeDefined()
      expect(result.response.headers.get('x-csrf-token')).toBe(result.token)
    })

    it('should not generate new token when cookie exists', async () => {
      const req = new NextRequest('http://localhost:3000', {
        headers: {
          Cookie: 'csrf_token=existing-hash',
        },
      })
      const response = NextResponse.next()

      const result = await ensureCsrfToken(req, response)

      expect(result.token).toBe('')
      expect(result.response).toBe(response)
    })
  })

  describe('validateOrigin', () => {
    const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL

    beforeEach(() => {
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    })

    afterEach(() => {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
    })

    it('should return true for matching origin', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
        },
      })

      const result = validateOrigin(req)
      expect(result).toBe(true)
    })

    it('should return false for non-matching origin', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          origin: 'http://evil.com',
        },
      })

      const result = validateOrigin(req)
      expect(result).toBe(false)
    })

    it('should validate referer when origin is missing', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          referer: 'http://localhost:3000/some-page',
        },
      })

      const result = validateOrigin(req)
      expect(result).toBe(true)
    })

    it('should return false when both origin and referer are missing', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
      })

      const result = validateOrigin(req)
      expect(result).toBe(false)
    })

    it('should handle invalid referer URL', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          referer: 'not-a-valid-url',
        },
      })

      const result = validateOrigin(req)
      expect(result).toBe(false)
    })
  })

  describe('requireValidOrigin', () => {
    const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL

    beforeEach(() => {
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    })

    afterEach(() => {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
    })

    it('should return 403 response for invalid origin', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          origin: 'http://evil.com',
        },
      })

      const result = requireValidOrigin(req)
      expect(result).toBeInstanceOf(NextResponse)
      expect(result?.status).toBe(403)
    })

    it('should return null for valid origin', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
        },
      })

      const result = requireValidOrigin(req)
      expect(result).toBeNull()
    })
  })
})
