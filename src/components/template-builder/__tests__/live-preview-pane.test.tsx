import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LivePreviewPane } from '../live-preview-pane'

// Mock the sanitize-html module
vi.mock('@/lib/sanitize-html', () => ({
  sanitizeHtml: vi.fn((html: string) => html),
}))

describe('LivePreviewPane', () => {
  describe('Rendering', () => {
    it('should render placeholder when html is null', () => {
      render(<LivePreviewPane html={null} />)

      expect(screen.getByText('Preview will appear here')).toBeInTheDocument()
    })

    it('should render placeholder when html is empty string', () => {
      render(<LivePreviewPane html="" />)

      expect(screen.getByText('Preview will appear here')).toBeInTheDocument()
    })

    it('should render HTML content when provided', () => {
      const html = '<div>Test content</div>'
      render(<LivePreviewPane html={html} />)

      expect(screen.getByText('Test content')).toBeInTheDocument()
    })

    it('should render complex HTML structure', () => {
      const html = `
        <div>
          <h1>Title</h1>
          <p>Paragraph text</p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
      `
      render(<LivePreviewPane html={html} />)

      expect(screen.getByText('Title')).toBeInTheDocument()
      expect(screen.getByText('Paragraph text')).toBeInTheDocument()
      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 2')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for placeholder', () => {
      const { container } = render(<LivePreviewPane html={null} />)

      const placeholder = screen.getByText('Preview will appear here')
      expect(placeholder).toHaveAttribute('role', 'status')
      expect(placeholder).toHaveAttribute('aria-live', 'polite')
      expect(placeholder).toHaveAttribute('aria-label', 'Email preview placeholder')
    })

    it('should have proper ARIA labels for preview content', () => {
      const html = '<div>Test content</div>'
      const { container } = render(<LivePreviewPane html={html} />)

      const previewRegion = container.querySelector('[role="region"]')
      expect(previewRegion).toBeInTheDocument()
      expect(previewRegion).toHaveAttribute('aria-label', 'Email preview')
    })
  })

  describe('HTML Sanitization', () => {
    it('should call sanitizeHtml with the provided HTML', () => {
      const { sanitizeHtml } = require('@/lib/sanitize-html')
      const html = '<div>Content</div>'

      render(<LivePreviewPane html={html} />)

      expect(sanitizeHtml).toHaveBeenCalledWith(html)
    })

    it('should render sanitized HTML safely', () => {
      const { sanitizeHtml } = require('@/lib/sanitize-html')
      const maliciousHtml = '<script>alert("xss")</script><div>Safe content</div>'
      const sanitizedHtml = '<div>Safe content</div>'

      sanitizeHtml.mockReturnValueOnce(sanitizedHtml)

      render(<LivePreviewPane html={maliciousHtml} />)

      expect(screen.queryByText('alert("xss")')).not.toBeInTheDocument()
      expect(screen.getByText('Safe content')).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should apply correct classes to placeholder', () => {
      const { container } = render(<LivePreviewPane html={null} />)

      const placeholder = screen.getByText('Preview will appear here')
      expect(placeholder).toHaveClass('flex', 'items-center', 'justify-center')
      expect(placeholder).toHaveClass('border-dashed')
    })

    it('should apply correct classes to preview container', () => {
      const html = '<div>Content</div>'
      const { container } = render(<LivePreviewPane html={html} />)

      const previewRegion = container.querySelector('[role="region"]')
      expect(previewRegion).toHaveClass('rounded-lg', 'border', 'bg-white', 'p-4')
    })
  })

  describe('Memoization', () => {
    it('should not re-render when props have not changed', () => {
      const { sanitizeHtml } = require('@/lib/sanitize-html')
      sanitizeHtml.mockClear()

      const html = '<div>Content</div>'
      const { rerender } = render(<LivePreviewPane html={html} />)

      expect(sanitizeHtml).toHaveBeenCalledTimes(1)

      // Rerender with same props
      rerender(<LivePreviewPane html={html} />)

      // Should not call sanitizeHtml again due to memoization
      expect(sanitizeHtml).toHaveBeenCalledTimes(1)
    })

    it('should re-render when html changes', () => {
      const { sanitizeHtml } = require('@/lib/sanitize-html')
      sanitizeHtml.mockClear()

      const { rerender } = render(<LivePreviewPane html="<div>First</div>" />)

      expect(sanitizeHtml).toHaveBeenCalledTimes(1)

      // Rerender with different html
      rerender(<LivePreviewPane html="<div>Second</div>" />)

      expect(sanitizeHtml).toHaveBeenCalledTimes(2)
    })
  })

  describe('Edge cases', () => {
    it('should handle HTML with special characters', () => {
      const html = '<div>Test &amp; &lt;special&gt; characters</div>'
      render(<LivePreviewPane html={html} />)

      expect(screen.getByText(/Test & <special> characters/)).toBeInTheDocument()
    })

    it('should handle very long HTML content', () => {
      const longHtml = '<div>' + 'Content '.repeat(1000) + '</div>'
      render(<LivePreviewPane html={longHtml} />)

      expect(screen.getByRole('region')).toBeInTheDocument()
    })

    it('should handle HTML with inline styles', () => {
      const html = '<div style="color: red; font-size: 20px;">Styled content</div>'
      render(<LivePreviewPane html={html} />)

      expect(screen.getByText('Styled content')).toBeInTheDocument()
    })

    it('should handle HTML with data attributes', () => {
      const html = '<div data-testid="custom-test-id">Content with data</div>'
      render(<LivePreviewPane html={html} />)

      expect(screen.getByText('Content with data')).toBeInTheDocument()
    })

    it('should transition from null to content correctly', () => {
      const { rerender } = render(<LivePreviewPane html={null} />)

      expect(screen.getByText('Preview will appear here')).toBeInTheDocument()

      rerender(<LivePreviewPane html="<div>Now has content</div>" />)

      expect(screen.queryByText('Preview will appear here')).not.toBeInTheDocument()
      expect(screen.getByText('Now has content')).toBeInTheDocument()
    })

    it('should transition from content to null correctly', () => {
      const { rerender } = render(<LivePreviewPane html="<div>Has content</div>" />)

      expect(screen.getByText('Has content')).toBeInTheDocument()

      rerender(<LivePreviewPane html={null} />)

      expect(screen.queryByText('Has content')).not.toBeInTheDocument()
      expect(screen.getByText('Preview will appear here')).toBeInTheDocument()
    })
  })
})
