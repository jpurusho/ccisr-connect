# API Route Tests

This directory contains comprehensive test coverage for critical API routes in the CCISR Connect application.

## Test Coverage

### Routes Tested

1. **Signup Submit** (`/api/signup/submit`)
   - Form submission validation
   - Rate limiting enforcement
   - Honeypot detection
   - Form status checks (active/closed/muted)
   - Max submissions limits
   - Duplicate prevention
   - Capacity management for claim_select fields
   - Phone verification
   - Payload size validation

2. **Dispatch Send** (`/api/dispatch/send`)
   - Email sending functionality
   - SMTP configuration validation
   - Recipient resolution from mailing lists
   - Dispatch status checks (draft/sent/cancelled)
   - Authorization checks (admin only)
   - CSRF protection
   - Rate limiting
   - Error handling for SMTP failures
   - Audit logging

3. **Cards Preview** (`/api/cards/preview`)
   - Card type validation
   - HTML generation for all card types:
     - Birthday
     - Anniversary
     - Bible Study
     - Women's Study
     - Prayer Meeting
     - Bulletin
   - Parameter passing to card builders
   - Rate limiting
   - Content-Type header validation

4. **Users Invite** (`/api/users/invite`)
   - User invitation workflow
   - Email normalization
   - Role validation (super_admin, admin, operator)
   - Authentication checks
   - Authorization checks (admin/super_admin only)
   - Duplicate user detection
   - Rollback on failure (atomic operations)
   - CSRF protection

5. **Signup Remove** (`/api/signup/remove`)
   - Self-service signup removal
   - Phone verification (last 4 digits)
   - Rate limiting (5 attempts per hour per IP per form)
   - Form muted status check
   - Audit logging with full response snapshot
   - Error handling
   - CSRF protection via Origin validation

## Running Tests

### Prerequisites

Install dependencies first:

```bash
npm install
```

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Run Tests with UI

```bash
npm run test:ui
```

### Run Tests with Coverage Report

```bash
npm run test:coverage
```

Coverage reports will be generated in the `coverage/` directory.

## Test Structure

Each test file follows a consistent structure:

1. **Mock Setup** - Mocks for Supabase, nodemailer, and utility functions
2. **Request Builder** - Helper to construct NextRequest objects
3. **Test Cases** - Organized by functionality:
   - Happy path (successful cases)
   - Validation errors
   - Authorization/authentication failures
   - Rate limiting
   - Edge cases
   - Error handling

## Mocking Strategy

### Supabase Client

All database operations are mocked at the `@supabase/supabase-js` level. The mock client provides chainable methods for `.from().select().eq()` patterns.

### Nodemailer

Email transport is fully mocked to avoid actual SMTP connections during tests.

### Next.js Server

NextRequest and NextResponse are mocked to work in the test environment.

## Best Practices

1. **Isolation** - Each test is independent and doesn't rely on shared state
2. **Cleanup** - `beforeEach` hook clears all mocks between tests
3. **Descriptive Names** - Test names clearly describe what they verify
4. **Comprehensive Coverage** - Tests cover both success and failure paths
5. **Mock Validation** - Tests verify that mocked functions are called with expected arguments

## Adding New Tests

When adding tests for new API routes:

1. Create a new test file in this directory: `<route-name>.test.ts`
2. Import necessary mocks from `./setup.ts`
3. Mock any additional dependencies specific to that route
4. Follow the existing test structure pattern
5. Ensure coverage of:
   - Success cases
   - Validation failures
   - Authorization failures
   - Rate limiting
   - Error handling
   - Edge cases

## CI/CD Integration

These tests are designed to run in CI/CD pipelines. They require no external services and use in-memory mocks for all dependencies.

## Troubleshooting

### Tests Failing Locally

1. Ensure all dependencies are installed: `npm install`
2. Clear any cached modules: `rm -rf node_modules/.vite`
3. Check for outdated mocks that may need updating after code changes

### Mock Updates Needed

When API routes change, update the corresponding mocks in:
- `setup.ts` - For shared mocks (Supabase, nodemailer)
- Individual test files - For route-specific mocks

### Type Errors

If TypeScript complains about types in tests:
1. Ensure `@types/node`, `@types/nodemailer` are installed
2. Check `vitest.config.ts` for correct path aliases
3. Verify mock types match actual implementations
