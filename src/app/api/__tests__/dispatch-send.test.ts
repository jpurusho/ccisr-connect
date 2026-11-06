import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../dispatch/send/route'
import { mockSupabaseClient, mockTransporter } from './setup'
import { NextRequest } from 'next/server'

vi.mock('@/lib/rate-limit', () => ({
  rateLimitByIp: vi.fn(() => ({ allowed: true })),
}))

vi.mock('@/lib/csrf', () => ({
  requireCsrfToken: vi.fn(async () => null),
}))

vi.mock('@/lib/auth-checks', () => ({
  verifyAdmin: vi.fn(async () => ({ authorized: true, userId: 'admin-1' })),
}))

vi.mock('@/lib/validation-schemas', () => ({
  dispatchSendSchema: {},
  validateRequest: vi.fn(() => ({
    success: true,
    data: { dispatchId: 'dispatch-1' },
  })),
}))

describe('POST /api/dispatch/send', () => {
  const mockRequest = (body: unknown) => {
    const req = new NextRequest('https://test.example.com/api/dispatch/send', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer test-token',
        'x-csrf-token': 'test-csrf',
      },
      body: JSON.stringify(body),
    })
    req.cookies.set('csrf_token', 'test-csrf-hash')
    return req
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should successfully send an email dispatch', async () => {
    const mockDispatch = {
      id: 'dispatch-1',
      status: 'draft',
      subject: 'Test Email',
      body_html: '<p>Test content</p>',
      smtp_config_id: 'smtp-1',
      mailing_list_id: 'list-1',
      template_type: 'bulletin',
      week_start: '2026-04-27',
    }

    const mockSmtp = {
      id: 'smtp-1',
      name: 'Gmail',
      host: 'smtp.gmail.com',
      port: 465,
      username: 'test@example.com',
      encrypted_password: 'encrypted',
      from_email: 'test@example.com',
      from_name: 'Test Sender',
    }

    const mockMembers = [
      { external_email: 'user1@example.com', recipient_type: 'to', members: null },
      { external_email: null, recipient_type: 'to', members: { email: 'user2@example.com' } },
    ]

    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'dispatch_queue') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockDispatch, error: null }),
          update: vi.fn().mockReturnThis(),
        }
      }
      if (table === 'smtp_configs') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockSmtp, error: null }),
        }
      }
      if (table === 'mailing_list_members') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: mockMembers }),
        }
      }
      if (table === 'mailing_lists') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { google_group_email: 'group@example.com' } }),
        }
      }
      if (table === 'dispatch_history') {
        return {
          insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }
      }
      if (table === 'audit_log') {
        return {
          insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
      }
    })

    mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' })

    const req = mockRequest({ dispatchId: 'dispatch-1' })
    const response = await POST(req)
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(data.recipientCount).toBeGreaterThan(0)
    expect(mockTransporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Test Email',
        html: '<p>Test content</p>',
      })
    )
  })

  it('should reject if dispatch not found', async () => {
    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'dispatch_queue') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
        }
      }
      return { select: vi.fn().mockReturnThis() }
    })

    const req = mockRequest({ dispatchId: 'nonexistent' })
    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBe('Not found')
    expect(response.status).toBe(404)
  })

  it('should reject if already sent', async () => {
    const mockDispatch = {
      id: 'dispatch-1',
      status: 'sent',
      subject: 'Test',
      body_html: '<p>Test</p>',
    }

    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'dispatch_queue') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockDispatch, error: null }),
        }
      }
      return { select: vi.fn().mockReturnThis() }
    })

    const req = mockRequest({ dispatchId: 'dispatch-1' })
    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBe('Already sent')
    expect(response.status).toBe(400)
  })

  it('should reject if no SMTP config', async () => {
    const mockDispatch = {
      id: 'dispatch-1',
      status: 'draft',
      smtp_config_id: null,
    }

    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'dispatch_queue') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockDispatch, error: null }),
          update: vi.fn().mockReturnThis(),
        }
      }
      return { select: vi.fn().mockReturnThis() }
    })

    const req = mockRequest({ dispatchId: 'dispatch-1' })
    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBe('No SMTP account configured')
    expect(response.status).toBe(400)
  })

  it('should reject if no recipients found', async () => {
    const mockDispatch = {
      id: 'dispatch-1',
      status: 'draft',
      subject: 'Test',
      body_html: '<p>Test</p>',
      smtp_config_id: 'smtp-1',
      mailing_list_id: 'list-1',
    }

    const mockSmtp = {
      id: 'smtp-1',
      host: 'smtp.gmail.com',
      port: 465,
      username: 'test@example.com',
      encrypted_password: 'encrypted',
      from_email: 'test@example.com',
    }

    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'dispatch_queue') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockDispatch, error: null }),
          update: vi.fn().mockReturnThis(),
        }
      }
      if (table === 'smtp_configs') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockSmtp, error: null }),
        }
      }
      if (table === 'mailing_list_members') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [] }),
        }
      }
      if (table === 'mailing_lists') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { google_group_email: null } }),
        }
      }
      return { select: vi.fn().mockReturnThis() }
    })

    const req = mockRequest({ dispatchId: 'dispatch-1' })
    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBe('No recipients found')
    expect(response.status).toBe(400)
  })

  it('should handle SMTP errors gracefully', async () => {
    const mockDispatch = {
      id: 'dispatch-1',
      status: 'draft',
      subject: 'Test',
      body_html: '<p>Test</p>',
      smtp_config_id: 'smtp-1',
      mailing_list_id: 'list-1',
    }

    const mockSmtp = {
      id: 'smtp-1',
      host: 'smtp.gmail.com',
      port: 465,
      username: 'test@example.com',
      encrypted_password: 'encrypted',
      from_email: 'test@example.com',
    }

    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'dispatch_queue') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockDispatch, error: null }),
          update: vi.fn().mockReturnThis(),
        }
      }
      if (table === 'smtp_configs') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockSmtp, error: null }),
        }
      }
      if (table === 'mailing_list_members') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [{ external_email: 'user@example.com', recipient_type: 'to', members: null }],
          }),
        }
      }
      if (table === 'mailing_lists') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: {} }),
        }
      }
      return { select: vi.fn().mockReturnThis() }
    })

    mockTransporter.sendMail.mockRejectedValue(new Error('SMTP connection failed'))

    const req = mockRequest({ dispatchId: 'dispatch-1' })
    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBe('SMTP connection failed')
    expect(response.status).toBe(500)
  })
})
