import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'

/**
 * Custom render function that wraps components with common providers
 * for testing purposes.
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  // Add any providers needed for tests here (theme, router context, etc.)
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <>{children}</>
  }

  return render(ui, { wrapper: Wrapper, ...options })
}

/**
 * Mock fetch for API testing
 */
export function mockFetch(response: any, ok = true) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok,
      status: ok ? 200 : 400,
      json: async () => response,
      text: async () => JSON.stringify(response),
      headers: new Headers(),
    })
  ) as jest.Mock
}

/**
 * Reset fetch mock
 */
export function resetFetchMock() {
  if (global.fetch && typeof global.fetch === 'function') {
    ;(global.fetch as jest.Mock).mockClear()
  }
}

/**
 * Create mock NextRequest for testing
 */
export function createMockRequest(url: string, options: RequestInit = {}) {
  return new Request(url, {
    method: 'GET',
    ...options,
  })
}

/**
 * Wait for async operations with timeout
 */
export async function waitForAsync(ms = 100) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Mock console methods for testing
 */
export function mockConsole() {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
  }

  const mocks = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  }

  console.log = mocks.log
  console.error = mocks.error
  console.warn = mocks.warn
  console.info = mocks.info

  return {
    mocks,
    restore: () => {
      console.log = originalConsole.log
      console.error = originalConsole.error
      console.warn = originalConsole.warn
      console.info = originalConsole.info
    },
  }
}

/**
 * Create a spy on a module's export
 */
export function spyOnModule<T>(
  modulePath: string,
  exportName: string,
  implementation?: T
) {
  const module = require(modulePath)
  const original = module[exportName]

  const spy = implementation
    ? jest.spyOn(module, exportName).mockImplementation(implementation as any)
    : jest.spyOn(module, exportName)

  return {
    spy,
    restore: () => {
      spy.mockRestore()
      module[exportName] = original
    },
  }
}

/**
 * Suppress React error boundaries in tests
 */
export function suppressErrorBoundary() {
  const originalError = console.error
  beforeAll(() => {
    console.error = jest.fn((message) => {
      if (
        typeof message === 'string' &&
        (message.includes('Error boundaries') ||
          message.includes('React will try to recreate'))
      ) {
        return
      }
      originalError(message)
    })
  })

  afterAll(() => {
    console.error = originalError
  })
}

/**
 * Create a mock Supabase client for testing
 */
export function createMockSupabaseClient() {
  return {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    containedBy: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    then: jest.fn().mockResolvedValue({ data: [], error: null }),
  }
}

/**
 * Mock timers utilities
 */
export function mockTimers() {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  return {
    advance: (ms: number) => jest.advanceTimersByTime(ms),
    advanceToNext: () => jest.runOnlyPendingTimers(),
    advanceAll: () => jest.runAllTimers(),
  }
}

// Re-export testing library utilities
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
