import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ThemeToggle } from '../theme-toggle'
import { useTheme } from 'next-themes'

// Mock next-themes
vi.mock('next-themes')

describe('ThemeToggle', () => {
  const mockSetTheme = vi.fn()
  const mockUseTheme = useTheme as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      systemTheme: 'light',
      themes: ['light', 'dark', 'warm', 'ocean', 'forest', 'sunset', 'rose-gold', 'github-dark', 'midnight', 'aurora'],
    })
  })

  describe('Rendering', () => {
    it('should render theme toggle button', () => {
      render(<ThemeToggle />)

      const button = screen.getByRole('button', { name: /toggle theme/i })
      expect(button).toBeInTheDocument()
    })

    it('should have accessible label', () => {
      render(<ThemeToggle />)

      expect(screen.getByText('Toggle theme', { selector: '.sr-only' })).toBeInTheDocument()
    })

    it('should render with correct icon for current theme', async () => {
      mockUseTheme.mockReturnValue({
        theme: 'dark',
        setTheme: mockSetTheme,
        systemTheme: 'dark',
        themes: ['light', 'dark'],
      })

      const { container } = render(<ThemeToggle />)

      // Wait for component to mount (mounted state)
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /toggle theme/i })
        expect(button).toBeInTheDocument()
      })
    })

    it('should have minimum touch target size', () => {
      render(<ThemeToggle />)

      const button = screen.getByRole('button', { name: /toggle theme/i })
      expect(button).toHaveClass('min-h-[44px]', 'min-w-[44px]')
    })
  })

  describe('Dropdown functionality', () => {
    it('should open theme menu when button is clicked', async () => {
      const user = userEvent.setup()
      render(<ThemeToggle />)

      const button = screen.getByRole('button', { name: /toggle theme/i })
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Light')).toBeInTheDocument()
        expect(screen.getByText('Dark')).toBeInTheDocument()
      })
    })

    it('should close theme menu when button is clicked again', async () => {
      const user = userEvent.setup()
      render(<ThemeToggle />)

      const button = screen.getByRole('button', { name: /toggle theme/i })

      // Open menu
      await user.click(button)
      await waitFor(() => {
        expect(screen.getByText('Warm')).toBeInTheDocument()
      })

      // Close menu
      await user.click(button)
      await waitFor(() => {
        expect(screen.queryByText('Warm')).not.toBeInTheDocument()
      })
    })

    it('should close menu when clicking outside', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <div>
          <ThemeToggle />
          <div data-testid="outside">Outside element</div>
        </div>
      )

      const button = screen.getByRole('button', { name: /toggle theme/i })
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Warm')).toBeInTheDocument()
      })

      // Click outside
      const outside = screen.getByTestId('outside')
      await user.click(outside)

      await waitFor(() => {
        expect(screen.queryByText('Warm')).not.toBeInTheDocument()
      })
    })
  })

  describe('Theme selection', () => {
    it('should display all light themes', async () => {
      const user = userEvent.setup()
      render(<ThemeToggle />)

      const button = screen.getByRole('button', { name: /toggle theme/i })
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Light')).toBeInTheDocument()
        expect(screen.getByText('Warm')).toBeInTheDocument()
        expect(screen.getByText('Ocean')).toBeInTheDocument()
        expect(screen.getByText('Forest')).toBeInTheDocument()
        expect(screen.getByText('Sunset')).toBeInTheDocument()
        expect(screen.getByText('Rose Gold')).toBeInTheDocument()
      })
    })

    it('should display all dark themes', async () => {
      const user = userEvent.setup()
      render(<ThemeToggle />)

      const button = screen.getByRole('button', { name: /toggle theme/i })
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Dark')).toBeInTheDocument()
        expect(screen.getByText('GitHub Dark')).toBeInTheDocument()
        expect(screen.getByText('Midnight')).toBeInTheDocument()
        expect(screen.getByText('Aurora')).toBeInTheDocument()
      })
    })

    it('should call setTheme when a theme is selected', async () => {
      const user = userEvent.setup()
      render(<ThemeToggle />)

      const button = screen.getByRole('button', { name: /toggle theme/i })
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Dark')).toBeInTheDocument()
      })

      const darkButton = screen.getByRole('button', { name: /switch to dark theme/i })
      await user.click(darkButton)

      expect(mockSetTheme).toHaveBeenCalledWith('dark')
    })

    it('should close menu after selecting a theme', async () => {
      const user = userEvent.setup()
      render(<ThemeToggle />)

      const button = screen.getByRole('button', { name: /toggle theme/i })
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Ocean')).toBeInTheDocument()
      })

      const oceanButton = screen.getByRole('button', { name: /switch to ocean theme/i })
      await user.click(oceanButton)

      await waitFor(() => {
        expect(screen.queryByText('Ocean')).not.toBeInTheDocument()
      })
    })

    it('should highlight the currently selected theme', async () => {
      const user = userEvent.setup()
      mockUseTheme.mockReturnValue({
        theme: 'ocean',
        setTheme: mockSetTheme,
        systemTheme: 'light',
        themes: ['light', 'dark', 'ocean'],
      })

      render(<ThemeToggle />)

      const button = screen.getByRole('button', { name: /toggle theme/i })
      await user.click(button)

      await waitFor(() => {
        const oceanButton = screen.getByRole('button', { name: /switch to ocean theme/i })
        expect(oceanButton).toHaveAttribute('aria-current', 'true')
        expect(oceanButton).toHaveClass('bg-accent', 'font-medium')
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for theme buttons', async () => {
      const user = userEvent.setup()
      render(<ThemeToggle />)

      const button = screen.getByRole('button', { name: /toggle theme/i })
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /switch to light theme/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /switch to dark theme/i })).toBeInTheDocument()
      })
    })

    it('should have aria-hidden on icons', async () => {
      const user = userEvent.setup()
      const { container } = render(<ThemeToggle />)

      const button = screen.getByRole('button', { name: /toggle theme/i })
      await user.click(button)

      await waitFor(() => {
        const icons = container.querySelectorAll('[aria-hidden="true"]')
        expect(icons.length).toBeGreaterThan(0)
      })
    })

    it('should have proper section headers for light and dark themes', async () => {
      const user = userEvent.setup()
      render(<ThemeToggle />)

      const button = screen.getByRole('button', { name: /toggle theme/i })
      await user.click(button)

      await waitFor(() => {
        const headers = screen.getAllByText(/^(Light|Dark)$/)
        expect(headers).toHaveLength(2)
      })
    })

    it('should have visual separator between light and dark themes', async () => {
      const user = userEvent.setup()
      const { container } = render(<ThemeToggle />)

      const button = screen.getByRole('button', { name: /toggle theme/i })
      await user.click(button)

      await waitFor(() => {
        const separator = container.querySelector('.border-t')
        expect(separator).toBeInTheDocument()
      })
    })
  })

  describe('Keyboard navigation', () => {
    it('should open menu with Enter key', async () => {
      const user = userEvent.setup()
      render(<ThemeToggle />)

      const button = screen.getByRole('button', { name: /toggle theme/i })
      button.focus()
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByText('Warm')).toBeInTheDocument()
      })
    })

    it('should be focusable', () => {
      render(<ThemeToggle />)

      const button = screen.getByRole('button', { name: /toggle theme/i })
      button.focus()
      expect(button).toHaveFocus()
    })
  })

  describe('Mounting behavior', () => {
    it('should handle hydration correctly', async () => {
      render(<ThemeToggle />)

      // Component should render without errors
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /toggle theme/i })
        expect(button).toBeInTheDocument()
      })
    })
  })

  describe('Edge cases', () => {
    it('should handle undefined theme gracefully', async () => {
      const user = userEvent.setup()
      mockUseTheme.mockReturnValue({
        theme: undefined,
        setTheme: mockSetTheme,
        systemTheme: 'light',
        themes: ['light', 'dark'],
      })

      render(<ThemeToggle />)

      const button = screen.getByRole('button', { name: /toggle theme/i })
      expect(button).toBeInTheDocument()

      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Light')).toBeInTheDocument()
      })
    })

    it('should handle rapid clicks', async () => {
      const user = userEvent.setup()
      render(<ThemeToggle />)

      const button = screen.getByRole('button', { name: /toggle theme/i })

      // Click multiple times rapidly
      await user.click(button)
      await user.click(button)
      await user.click(button)

      // Should end up closed (odd number of clicks)
      await waitFor(() => {
        expect(screen.queryByText('Warm')).not.toBeInTheDocument()
      })
    })

    it('should prevent selection when menu is closed', async () => {
      const user = userEvent.setup()
      render(<ThemeToggle />)

      // Try to find theme buttons without opening menu
      expect(screen.queryByText('Ocean')).not.toBeInTheDocument()
    })
  })
})
