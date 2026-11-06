# Test Setup Guide

This document explains how to set up and run tests for the CCISR Connect application.

## Installation

The required testing dependencies are already installed:

- `@testing-library/react` - React Testing Library
- `@testing-library/jest-dom` - Custom matchers for DOM testing
- `@testing-library/user-event` - User event simulation
- `vitest` - Modern test runner
- `jsdom` - DOM environment for tests
- `@vitejs/plugin-react` - React plugin for Vite/Vitest
- `@vitest/coverage-v8` - Code coverage
- `@vitest/ui` - Test UI

## Test Configuration

The project uses Vitest with the following configuration files:

- `vitest.config.ts` - Main Vitest configuration
- `src/test/setup.ts` - Global test setup and mocks

## Running Tests

The scripts are already configured in `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

Run tests with:

```bash
# Run all tests in watch mode
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage

# Run tests once (no watch)
npm test run

# Run specific test file
npm test -- error-boundary.test
```

## Test Files

Tests are organized alongside the source files in `__tests__` directories:

### Critical Components Tested

1. **ErrorBoundary** (`src/components/layout/__tests__/error-boundary.test.tsx`)
   - Error catching and display
   - Reset functionality
   - Custom fallback rendering
   - Accessibility

2. **CSRF Protection** (`src/lib/__tests__/csrf.test.ts`)
   - Token generation
   - Token validation
   - Cookie handling
   - Origin validation

3. **Rate Limiting** (`src/lib/__tests__/rate-limit.test.ts`)
   - Request counting
   - Time window management
   - IP-based limiting
   - Namespace isolation

4. **LivePreviewPane** (`src/components/template-builder/__tests__/live-preview-pane.test.tsx`)
   - HTML rendering
   - Sanitization
   - Accessibility
   - Memoization

5. **Form Components** (`src/components/dashboard/__tests__/communication-edit-forms.test.tsx`)
   - HostFamilyInput autocomplete
   - Search functionality
   - Selection handling
   - Data mapping

## Test Utilities

Common test utilities are available in `src/lib/__tests__/test-utils.tsx`:

```tsx
import { renderWithProviders, mockFetch, createMockSupabaseClient } from '@/lib/__tests__/test-utils'

// Example usage
test('my component test', () => {
  const mockClient = createMockSupabaseClient()
  mockClient.from.mockReturnValue({ data: mockData })
  
  renderWithProviders(<MyComponent />)
  // ... assertions
})
```

## Mocking

### Supabase Client

```tsx
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))
```

### Next.js Router

The router is automatically mocked in `src/test/setup.ts`.

### Environment Variables

Set test environment variables in `src/test/setup.ts` or individual test files:

```tsx
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
```

## Coverage Thresholds

Current coverage thresholds (in `vitest.config.ts`):

- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## Writing New Tests

When writing new tests:

1. Create a `__tests__` directory next to the component/module
2. Name test files with `.test.ts` or `.test.tsx` extension
3. Use descriptive test names that explain what is being tested
4. Group related tests with `describe` blocks
5. Test both happy paths and edge cases
6. Include accessibility tests where applicable

### Example Test Structure

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MyComponent } from '../my-component'

describe('MyComponent', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<MyComponent />)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  describe('User interactions', () => {
    it('should handle click events', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn()
      
      render(<MyComponent onClick={onClick} />)
      
      await user.click(screen.getByRole('button'))
      
      expect(onClick).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<MyComponent />)
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'My action')
    })
  })

  describe('Edge cases', () => {
    it('should handle null props gracefully', () => {
      render(<MyComponent data={null} />)
      expect(screen.getByText('No data')).toBeInTheDocument()
    })
  })
})
```

## Debugging Tests

### Run a single test file

```bash
npm test -- error-boundary.test.tsx
```

### Run tests matching a pattern

```bash
npm test -- --testNamePattern="should render"
```

### Debug with VSCode

Add this configuration to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## CI/CD Integration

For CI/CD pipelines, use:

```bash
npm test run -- --coverage
```

This runs tests with:
- No watch mode
- Coverage collection
- Fails on low coverage thresholds

## Troubleshooting

### "Cannot find module" errors

Make sure your path aliases in `vitest.config.ts` match your `tsconfig.json`:

```ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

### Async timeout errors

Increase timeout for specific tests:

```tsx
it('should handle slow operation', async () => {
  // Test code
}, 10000) // 10 second timeout
```

### Memory issues

Reduce the number of workers:

```bash
npm test -- --maxWorkers=2
```

## Best Practices

1. **Test behavior, not implementation** - Focus on what the component does, not how it does it
2. **Use semantic queries** - Prefer `getByRole`, `getByLabelText` over `getByTestId`
3. **Avoid test interdependence** - Each test should be independent
4. **Mock external dependencies** - Don't make real API calls or database queries
5. **Keep tests simple** - Each test should verify one thing
6. **Use test utilities** - Reuse common setup code
7. **Clean up after tests** - Reset mocks and clear timers

## Resources

- [React Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Vitest UI](https://vitest.dev/guide/ui.html)
