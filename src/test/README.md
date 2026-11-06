# Testing Infrastructure

This directory contains the testing setup and configuration for CCISR Connect.

## Setup

The project uses:
- **Vitest** - Fast unit test framework
- **Testing Library** - React component testing utilities
- **jsdom** - Browser environment simulation

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Test Organization

### Test Files
- Place test files next to the code they test (co-located)
- Use `.test.ts` or `.test.tsx` extension
- Follow naming convention: `ComponentName.test.tsx` or `utils.test.ts`

### Example Structure
```
src/
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx
├── lib/
│   ├── utils.ts
│   └── utils.test.ts
└── app/
    └── api/
        └── route.test.ts
```

## Writing Tests

### Utility Functions
See `examples/utility.test.ts` for examples of testing pure functions.

```typescript
import { describe, it, expect } from 'vitest';

describe('myFunction', () => {
  it('should do something', () => {
    expect(myFunction('input')).toBe('output');
  });
});
```

### React Components
See `examples/component.test.tsx` for component testing patterns.

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('renders and handles interaction', async () => {
  render(<MyComponent />);
  const button = screen.getByRole('button');
  await userEvent.click(button);
  expect(button).toHaveTextContent('Clicked');
});
```

### API Routes
See `examples/api-route.test.ts` for API testing patterns.

```typescript
import { NextRequest } from 'next/server';

it('returns expected response', async () => {
  const request = new NextRequest('http://localhost/api/test');
  const response = await GET(request);
  expect(response.status).toBe(200);
});
```

## Configuration Files

- `vitest.config.ts` - Main Vitest configuration
- `src/test/setup.ts` - Global test setup and mocks
- `tsconfig.json` - TypeScript configuration with path aliases

## Best Practices

1. **Test behavior, not implementation** - Focus on what the user sees/does
2. **Use descriptive test names** - Clearly state what is being tested
3. **Arrange-Act-Assert pattern** - Setup, execute, verify
4. **Mock external dependencies** - Keep tests isolated and fast
5. **Test edge cases** - Empty inputs, errors, boundary conditions

## Mocking

### Next.js Router
Already mocked in `setup.ts`. Use directly in tests:

```typescript
import { useRouter } from 'next/navigation';
// Router is already mocked
```

### Supabase Client
Mock in individual test files:

```typescript
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  })),
}));
```

## Coverage

Coverage reports are generated in the `coverage/` directory.

Target coverage goals:
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

## Troubleshooting

### Tests fail with "Cannot find module '@/...'"
Ensure path aliases are configured in both `tsconfig.json` and `vitest.config.ts`.

### Component tests fail with "document is not defined"
Verify `environment: 'jsdom'` is set in `vitest.config.ts`.

### Async tests timeout
Increase timeout in test: `it('test', { timeout: 10000 }, async () => { ... })`
