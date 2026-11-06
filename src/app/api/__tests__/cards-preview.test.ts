import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../cards/preview/route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/rate-limit', () => ({
  rateLimitByIp: vi.fn(() => ({ allowed: true })),
}))

vi.mock('@/lib/validation-schemas', () => ({
  cardPreviewSchema: {},
  validateRequest: vi.fn(() => ({
    success: true,
    data: { type: 'birthday' },
  })),
}))

// Mock card builders
vi.mock('@/lib/email/card-builder', () => ({
  buildBirthdayCard: vi.fn(() => '<div>Birthday Card</div>'),
  buildAnniversaryCard: vi.fn(() => '<div>Anniversary Card</div>'),
  buildBibleStudyCard: vi.fn(() => '<div>Bible Study Card</div>'),
  buildWomensStudyCard: vi.fn(() => '<div>Womens Study Card</div>'),
  buildPrayerMeetingCard: vi.fn(() => '<div>Prayer Meeting Card</div>'),
  buildBulletinCard: vi.fn(() => '<div>Bulletin Card</div>'),
}))

describe('GET /api/cards/preview', () => {
  const mockRequest = (searchParams: Record<string, string> = {}) => {
    const url = new URL('https://test.example.com/api/cards/preview')
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
    return new NextRequest(url, {
      method: 'GET',
      headers: {
        'content-type': 'application/json',
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate birthday card preview', async () => {
    const req = mockRequest({ type: 'birthday' })
    const response = await GET(req)
    const html = await response.text()

    expect(html).toContain('Birthday Card')
    expect(html).toContain('<!DOCTYPE html>')
    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
  })

  it('should generate anniversary card preview', async () => {
    const { validateRequest } = await import('@/lib/validation-schemas')
    vi.mocked(validateRequest).mockReturnValue({
      success: true,
      data: { type: 'anniversary' },
    })

    const req = mockRequest({ type: 'anniversary' })
    const response = await GET(req)
    const html = await response.text()

    expect(html).toContain('Anniversary Card')
  })

  it('should generate bible study card preview', async () => {
    const { validateRequest } = await import('@/lib/validation-schemas')
    vi.mocked(validateRequest).mockReturnValue({
      success: true,
      data: { type: 'bible_study' },
    })

    const req = mockRequest({
      type: 'bible_study',
      date: 'Friday, May 2nd',
      time: '7:30 PM',
    })
    const response = await GET(req)
    const html = await response.text()

    expect(html).toContain('Bible Study Card')
  })

  it('should generate womens study card preview', async () => {
    const { validateRequest } = await import('@/lib/validation-schemas')
    vi.mocked(validateRequest).mockReturnValue({
      success: true,
      data: { type: 'womens_study' },
    })

    const req = mockRequest({ type: 'womens_study' })
    const response = await GET(req)
    const html = await response.text()

    expect(html).toContain('Womens Study Card')
  })

  it('should generate prayer meeting card preview', async () => {
    const { validateRequest } = await import('@/lib/validation-schemas')
    vi.mocked(validateRequest).mockReturnValue({
      success: true,
      data: { type: 'prayer_meeting' },
    })

    const req = mockRequest({ type: 'prayer_meeting' })
    const response = await GET(req)
    const html = await response.text()

    expect(html).toContain('Prayer Meeting Card')
  })

  it('should generate bulletin card preview', async () => {
    const { validateRequest } = await import('@/lib/validation-schemas')
    vi.mocked(validateRequest).mockReturnValue({
      success: true,
      data: { type: 'bulletin' },
    })

    const req = mockRequest({ type: 'bulletin' })
    const response = await GET(req)
    const html = await response.text()

    expect(html).toContain('Bulletin Card')
  })

  it('should handle rate limiting', async () => {
    const { rateLimitByIp } = await import('@/lib/rate-limit')
    vi.mocked(rateLimitByIp).mockReturnValue({ allowed: false })

    const req = mockRequest({ type: 'birthday' })
    const response = await GET(req)
    const data = await response.json()

    expect(data.error).toBeDefined()
    expect(response.status).toBe(429)
  })

  it('should reject invalid card type', async () => {
    const { validateRequest } = await import('@/lib/validation-schemas')
    vi.mocked(validateRequest).mockReturnValue({
      success: false,
      error: 'Invalid type',
    })

    const req = mockRequest({ type: 'invalid' })
    const response = await GET(req)
    const data = await response.json()

    expect(data.error).toBe('Invalid type')
    expect(response.status).toBe(400)
  })

  it('should include all required HTML structure', async () => {
    const req = mockRequest({ type: 'birthday' })
    const response = await GET(req)
    const html = await response.text()

    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html>')
    expect(html).toContain('<head>')
    expect(html).toContain('<meta charset="utf-8"')
    expect(html).toContain('<meta name="viewport"')
    expect(html).toContain('<title>')
    expect(html).toContain('</html>')
  })

  it('should pass custom parameters to card builders', async () => {
    const { buildBibleStudyCard } = await import('@/lib/email/card-builder')

    const req = mockRequest({
      type: 'bible_study',
      date: 'Custom Date',
      time: 'Custom Time',
      host: 'Custom Host',
    })

    await GET(req)

    expect(buildBibleStudyCard).toHaveBeenCalledWith(
      expect.objectContaining({
        date: 'Custom Date',
        time: 'Custom Time',
        hostNames: 'Custom Host',
      })
    )
  })
})
