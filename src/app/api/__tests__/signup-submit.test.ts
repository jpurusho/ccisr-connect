import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../signup/submit/route'
import { mockSupabaseClient } from './setup'
import { NextRequest } from 'next/server'

// Mock the helper modules
vi.mock('@/lib/rate-limit', () => ({
  getIpHash: vi.fn(() => 'test-ip-hash'),
  rateLimitByIp: vi.fn(() => ({ allowed: true })),
}))

vi.mock('@/lib/csrf', () => ({
  requireValidOrigin: vi.fn(() => null),
}))

vi.mock('@/lib/signup/field-registry', () => ({
  buildFormSchema: vi.fn(() => ({
    safeParse: vi.fn((data) => ({ success: true, data })),
  })),
}))

vi.mock('@/lib/signup/sanitize', () => ({
  sanitizeFormData: vi.fn((data) => data),
}))

describe('POST /api/signup/submit', () => {
  const mockRequest = (body: unknown, headers: Record<string, string> = {}) => {
    const req = new NextRequest('https://test.example.com/api/signup/submit', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': '100',
        origin: 'https://test.example.com',
        ...headers,
      },
      body: JSON.stringify(body),
    })
    return req
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should successfully submit a signup response', async () => {
    const mockForm = {
      id: 'form-1',
      status: 'active',
      muted: false,
      fields: [{ id: 'name', type: 'text', label: 'Name', required: true }],
      rate_limit_per_hour: 10,
      allow_duplicates: true,
    }

    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'signup_forms') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockForm, error: null }),
        }
      }
      if (table === 'signup_responses') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      }
    })

    const req = mockRequest({
      formId: 'form-1',
      data: { name: 'Test User' },
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data).toEqual({ success: true })
    expect(response.status).toBe(201)
  })

  it('should reject requests with missing formId', async () => {
    const req = mockRequest({
      data: { name: 'Test User' },
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBe('formId and data are required')
    expect(response.status).toBe(400)
  })

  it('should reject honeypot submissions', async () => {
    const req = mockRequest({
      formId: 'form-1',
      data: { name: 'Test User' },
      honeypot: 'bot-filled-value',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data).toEqual({ success: true })
    expect(response.status).toBe(201)
    // Should not actually insert into database
  })

  it('should reject submissions when form is not active', async () => {
    const mockForm = {
      id: 'form-1',
      status: 'closed',
      fields: [],
    }

    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'signup_forms') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockForm, error: null }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
      }
    })

    const req = mockRequest({
      formId: 'form-1',
      data: { name: 'Test User' },
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBe('This form is no longer accepting responses')
    expect(response.status).toBe(410)
  })

  it('should reject submissions when form is muted', async () => {
    const mockForm = {
      id: 'form-1',
      status: 'active',
      muted: true,
      fields: [],
    }

    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'signup_forms') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockForm, error: null }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
      }
    })

    const req = mockRequest({
      formId: 'form-1',
      data: { name: 'Test User' },
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBe('This form is currently in read-only mode')
    expect(response.status).toBe(403)
  })

  it('should enforce max submissions limit', async () => {
    const mockForm = {
      id: 'form-1',
      status: 'active',
      muted: false,
      fields: [{ id: 'name', type: 'text', label: 'Name', required: true }],
      max_submissions: 10,
      rate_limit_per_hour: 10,
    }

    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'signup_forms') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockForm, error: null }),
        }
      }
      if (table === 'signup_responses') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ count: 10 }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
      }
    })

    const req = mockRequest({
      formId: 'form-1',
      data: { name: 'Test User' },
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBe('This form has reached its maximum number of responses')
    expect(response.status).toBe(410)
  })

  it('should reject duplicate submissions when not allowed', async () => {
    const mockForm = {
      id: 'form-1',
      status: 'active',
      muted: false,
      fields: [{ id: 'name', type: 'text', label: 'Name', required: true }],
      allow_duplicates: false,
      rate_limit_per_hour: 10,
    }

    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'signup_forms') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockForm, error: null }),
        }
      }
      if (table === 'signup_responses') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          contains: vi.fn().mockResolvedValue({ count: 1 }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
      }
    })

    const req = mockRequest({
      formId: 'form-1',
      data: { name: 'Test User' },
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBe('You have already signed up for this event')
    expect(response.status).toBe(409)
  })

  it('should enforce payload size limit', async () => {
    const req = mockRequest(
      {
        formId: 'form-1',
        data: { name: 'Test User' },
      },
      { 'content-length': '60000' }
    )

    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBe('Request payload too large')
    expect(response.status).toBe(413)
  })
})
