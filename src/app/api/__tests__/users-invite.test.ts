import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../users/invite/route'
import { NextRequest } from 'next/server'

const mockAdminClient = {
  from: vi.fn((table: string) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
  })),
  auth: {
    admin: {
      createUser: vi.fn(),
      deleteUser: vi.fn(),
    },
  },
}

const mockUserClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn((table: string) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
  })),
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockUserClient),
}))

vi.mock('@/lib/csrf', () => ({
  requireCsrfToken: vi.fn(async () => null),
}))

describe('POST /api/users/invite', () => {
  const mockRequest = (body: unknown) => {
    const req = new NextRequest('https://test.example.com/api/users/invite', {
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

    // Default mock: authenticated admin user
    mockUserClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-1', email: 'admin@example.com' } },
      error: null,
    })

    mockUserClient.from.mockImplementation((table) => {
      if (table === 'app_users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { role: 'admin', is_active: true },
            error: null,
          }),
        }
      }
      return { select: vi.fn().mockReturnThis() }
    })
  })

  it('should successfully invite a new user', async () => {
    const newUser = {
      id: 'user-1',
      email: 'newuser@example.com',
      user_metadata: { full_name: 'New User' },
    }

    mockAdminClient.from.mockImplementation((table) => {
      if (table === 'app_users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null }),
          insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }
      }
      return { select: vi.fn().mockReturnThis() }
    })

    mockAdminClient.auth.admin.createUser.mockResolvedValue({
      data: { user: newUser },
      error: null,
    })

    const req = mockRequest({
      email: 'newuser@example.com',
      display_name: 'New User',
      role: 'operator',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(data.user.email).toBe('newuser@example.com')
    expect(data.user.role).toBe('operator')
    expect(mockAdminClient.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'newuser@example.com',
        email_confirm: true,
      })
    )
  })

  it('should reject if user not authenticated', async () => {
    mockUserClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const req = mockRequest({
      email: 'newuser@example.com',
      role: 'operator',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBe('Unauthorized')
    expect(response.status).toBe(401)
  })

  it('should reject if caller is not admin', async () => {
    mockUserClient.from.mockImplementation((table) => {
      if (table === 'app_users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { role: 'operator', is_active: true },
            error: null,
          }),
        }
      }
      return { select: vi.fn().mockReturnThis() }
    })

    const req = mockRequest({
      email: 'newuser@example.com',
      role: 'operator',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBe('Insufficient permissions')
    expect(response.status).toBe(403)
  })

  it('should reject if account is deactivated', async () => {
    mockUserClient.from.mockImplementation((table) => {
      if (table === 'app_users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { role: 'admin', is_active: false },
            error: null,
          }),
        }
      }
      return { select: vi.fn().mockReturnThis() }
    })

    const req = mockRequest({
      email: 'newuser@example.com',
      role: 'operator',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBe('Account is deactivated')
    expect(response.status).toBe(403)
  })

  it('should reject if email is missing', async () => {
    const req = mockRequest({
      display_name: 'New User',
      role: 'operator',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBe('Email is required')
    expect(response.status).toBe(400)
  })

  it('should reject if role is invalid', async () => {
    const req = mockRequest({
      email: 'newuser@example.com',
      role: 'invalid_role',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBe('Invalid role specified')
    expect(response.status).toBe(400)
  })

  it('should reject if user already exists', async () => {
    mockAdminClient.from.mockImplementation((table) => {
      if (table === 'app_users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'existing-user' },
            error: null,
          }),
        }
      }
      return { select: vi.fn().mockReturnThis() }
    })

    const req = mockRequest({
      email: 'existing@example.com',
      role: 'operator',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBe('User already exists')
    expect(response.status).toBe(409)
  })

  it('should handle auth user creation failure', async () => {
    mockAdminClient.from.mockImplementation((table) => {
      if (table === 'app_users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null }),
        }
      }
      return { select: vi.fn().mockReturnThis() }
    })

    mockAdminClient.auth.admin.createUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Email already registered' },
    })

    const req = mockRequest({
      email: 'newuser@example.com',
      role: 'operator',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBe('Email already registered')
    expect(response.status).toBe(400)
  })

  it('should rollback auth user if app_users insert fails', async () => {
    const newUser = {
      id: 'user-1',
      email: 'newuser@example.com',
    }

    mockAdminClient.from.mockImplementation((table) => {
      if (table === 'app_users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null }),
          insert: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }
      }
      return { select: vi.fn().mockReturnThis() }
    })

    mockAdminClient.auth.admin.createUser.mockResolvedValue({
      data: { user: newUser },
      error: null,
    })

    const req = mockRequest({
      email: 'newuser@example.com',
      role: 'operator',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toContain('Failed to create app user')
    expect(response.status).toBe(400)
    expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith('user-1')
  })

  it('should normalize email to lowercase', async () => {
    const newUser = {
      id: 'user-1',
      email: 'newuser@example.com',
    }

    mockAdminClient.from.mockImplementation((table) => {
      if (table === 'app_users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null }),
          insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }
      }
      return { select: vi.fn().mockReturnThis() }
    })

    mockAdminClient.auth.admin.createUser.mockResolvedValue({
      data: { user: newUser },
      error: null,
    })

    const req = mockRequest({
      email: 'NEWUSER@EXAMPLE.COM',
      role: 'operator',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.user.email).toBe('newuser@example.com')
    expect(mockAdminClient.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'newuser@example.com',
      })
    )
  })
})
