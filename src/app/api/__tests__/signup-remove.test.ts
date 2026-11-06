import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../signup/remove/route'
import { mockSupabaseClient } from './setup'
import { NextRequest } from 'next/server'

vi.mock('@/lib/rate-limit', () => ({
  getIpHash: vi.fn(() => 'test-ip-hash'),
}))

vi.mock('@/lib/csrf', () => ({
  requireValidOrigin: vi.fn(() => null),
}))

vi.mock('@/lib/validation-schemas', () => ({
  getPhoneLast4: vi.fn((phone: string) => phone.slice(-4)),
}))

describe('POST /api/signup/remove', () => {
  const mockRequest = (body: unknown) => {
    return new NextRequest('https://test.example.com/api/signup/remove', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://test.example.com',
      },
      body: JSON.stringify(body),
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should successfully remove a signup response with phone verification', async () => {
    const mockResponse = {
      id: 'response-1',
      form_id: 'form-1',
      data: { name: 'Test User', phone: '510-555-1234' },
      member_id: 'member-1',
    }

    const mockForm = {
      fields: [
        { id: 'name', type: 'text' },
        { id: 'phone', type: 'phone' },
      ],
      muted: false,
      title: 'Test Form',
    }

    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'signup_responses') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockResponse }),
          delete: vi.fn().mockReturnThis(),
        }
      }
      if (table === 'signup_forms') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockForm }),
        }
      }
      if (table === 'signup_remove_attempts') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ data: [] }),
          insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }
      }
      if (table === 'audit_log') {
        return {
          insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }
      }
      return { select: vi.fn().mockReturnThis() }
    })

    const req = mockRequest({
      responseId: 'response-1',
      formId: 'form-1',
      phoneLast4: '1234',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.success).toBe(true)
  })

  it('should reject if responseId or formId missing', async () => {
    const req = mockRequest({
      responseId: 'response-1',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBe('responseId and formId required')
    expect(response.status).toBe(400)
  })

  it('should reject if response not found', async () => {
    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'signup_responses') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null }),
        }
      }
      if (table === 'signup_remove_attempts') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ data: [] }),
        }
      }
      return { select: vi.fn().mockReturnThis() }
    })

    const req = mockRequest({
      responseId: 'nonexistent',
      formId: 'form-1',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBe('Not found')
    expect(response.status).toBe(404)
  })

  it('should reject if form is muted', async () => {
    const mockResponse = {
      id: 'response-1',
      form_id: 'form-1',
      data: { name: 'Test User' },
      member_id: null,
    }

    const mockForm = {
      fields: [{ id: 'name', type: 'text' }],
      muted: true,
    }

    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'signup_responses') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockResponse }),
        }
      }
      if (table === 'signup_forms') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockForm }),
        }
      }
      if (table === 'signup_remove_attempts') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ data: [] }),
          insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }
      }
      return { select: vi.fn().mockReturnThis() }
    })

    const req = mockRequest({
      responseId: 'response-1',
      formId: 'form-1',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBe('This form is currently in read-only mode')
    expect(response.status).toBe(403)
  })

  it('should reject if phone verification fails', async () => {
    const mockResponse = {
      id: 'response-1',
      form_id: 'form-1',
      data: { name: 'Test User', phone: '510-555-1234' },
      member_id: null,
    }

    const mockForm = {
      fields: [
        { id: 'name', type: 'text' },
        { id: 'phone', type: 'phone' },
      ],
      muted: false,
    }

    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'signup_responses') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockResponse }),
        }
      }
      if (table === 'signup_forms') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockForm }),
        }
      }
      if (table === 'signup_remove_attempts') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ data: [] }),
          insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }
      }
      return { select: vi.fn().mockReturnThis() }
    })

    const req = mockRequest({
      responseId: 'response-1',
      formId: 'form-1',
      phoneLast4: '9999', // Wrong last 4 digits
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBe('Phone verification failed')
    expect(response.status).toBe(403)
  })

  it('should reject if phone verification required but not provided', async () => {
    const mockResponse = {
      id: 'response-1',
      form_id: 'form-1',
      data: { name: 'Test User', phone: '510-555-1234' },
      member_id: null,
    }

    const mockForm = {
      fields: [
        { id: 'name', type: 'text' },
        { id: 'phone', type: 'phone' },
      ],
      muted: false,
    }

    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'signup_responses') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockResponse }),
        }
      }
      if (table === 'signup_forms') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockForm }),
        }
      }
      if (table === 'signup_remove_attempts') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ data: [] }),
          insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }
      }
      return { select: vi.fn().mockReturnThis() }
    })

    const req = mockRequest({
      responseId: 'response-1',
      formId: 'form-1',
      // No phoneLast4 provided
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBe('Phone verification required')
    expect(response.status).toBe(403)
  })

  it('should enforce rate limiting', async () => {
    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'signup_remove_attempts') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ data: Array(5).fill({}) }), // 5 attempts
          insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }
      }
      return { select: vi.fn().mockReturnThis() }
    })

    const req = mockRequest({
      responseId: 'response-1',
      formId: 'form-1',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBe('Too many removal attempts. Please try again later.')
    expect(response.status).toBe(429)
  })

  it('should create audit log entry with full response data', async () => {
    const mockResponse = {
      id: 'response-1',
      form_id: 'form-1',
      data: { name: 'Test User', notes: 'Important data' },
      member_id: 'member-1',
    }

    const mockForm = {
      fields: [{ id: 'name', type: 'text' }],
      muted: false,
      title: 'Test Form',
    }

    let auditLogData: any

    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'signup_responses') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockResponse }),
          delete: vi.fn().mockResolvedValue({ error: null }),
        }
      }
      if (table === 'signup_forms') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockForm }),
        }
      }
      if (table === 'signup_remove_attempts') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ data: [] }),
          insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }
      }
      if (table === 'audit_log') {
        return {
          insert: vi.fn().mockImplementation((data) => {
            auditLogData = data
            return Promise.resolve({ data: {}, error: null })
          }),
        }
      }
      return { select: vi.fn().mockReturnThis() }
    })

    const req = mockRequest({
      responseId: 'response-1',
      formId: 'form-1',
    })

    await POST(req)

    expect(auditLogData).toBeDefined()
    expect(auditLogData.action).toBe('signup_response_self_removed')
    expect(auditLogData.changes.responseData).toEqual(mockResponse.data)
    expect(auditLogData.changes.memberId).toBe('member-1')
  })

  it('should handle database deletion error', async () => {
    const mockResponse = {
      id: 'response-1',
      form_id: 'form-1',
      data: { name: 'Test User' },
      member_id: null,
    }

    const mockForm = {
      fields: [{ id: 'name', type: 'text' }],
      muted: false,
    }

    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'signup_responses') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockResponse }),
          delete: vi.fn().mockResolvedValue({ error: { message: 'Database error' } }),
        }
      }
      if (table === 'signup_forms') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockForm }),
        }
      }
      if (table === 'signup_remove_attempts') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ data: [] }),
          insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }
      }
      if (table === 'audit_log') {
        return {
          insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }
      }
      return { select: vi.fn().mockReturnThis() }
    })

    const req = mockRequest({
      responseId: 'response-1',
      formId: 'form-1',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBe('Failed to remove')
    expect(response.status).toBe(500)
  })
})
