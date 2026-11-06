# API Authorization Documentation

## Overview

This document describes the authorization model for all API routes using the Supabase service role key (`SUPABASE_SERVICE_ROLE_KEY`). Service role keys bypass Row Level Security (RLS) and must be carefully protected with explicit authorization checks.

## Authorization Helpers

Location: `src/lib/auth-checks.ts`

### Available Functions

1. **`verifyAuth(req)`** - Verifies the user has a valid Bearer token and is active
2. **`verifyAdmin(req)`** - Requires user to have `admin` or `super_admin` role
3. **`verifySuperAdmin(req)`** - Requires user to have `super_admin` role
4. **`canAccessResource(req, resourceType, resourceId)`** - Flexible resource-level authorization (extensible)

### Usage Example

```typescript
import { verifyAdmin } from "@/lib/auth-checks"

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req)
  if (!auth.authorized) {
    return auth.error
  }
  
  // Proceed with admin-only operation
}
```

## Route Security Matrix

### Public Routes (No Auth Required)

| Route | Protection | Notes |
|-------|-----------|-------|
| `/api/bible` | None (read-only) | Fetches ESV API key from settings; publicly accessible Bible verses |
| `/api/signup/submit` | Global + per-form rate limiting, honeypot | 30 submissions/hour/IP globally; configurable per-form limit |
| `/api/signup/[slug]` | Rate limiting (20/hour/IP) | Public form fetch; validates status and auto_close_date |

### User-Verified Routes (Phone Verification)

| Route | Protection | Notes |
|-------|-----------|-------|
| `/api/signup/remove` | Phone last-4 verification, rate limiting (5/hour) | User can remove their own signup with phone verification |
| `/api/signup/update` | Phone last-4 verification, rate limiting (5/hour) | User can edit their own signup with phone verification |
| `/api/signup/lookup` | Phone last-4 verification, rate limiting (10/hour) | Lookup signup by phone number |

### Form-Protected Routes

| Route | Protection | Notes |
|-------|-----------|-------|
| `/api/signup/member-lookup` | Rate limiting (50/min), form must have `member_autocomplete` enabled | Autocomplete for member names; returns minimal data |

### Admin-Protected Routes

| Route | Protection | Notes |
|-------|-----------|-------|
| `/api/signup/update-capacity` | `verifyAdmin()` | Admins can adjust capacity for claim_select items |
| `/api/dispatch/test` | `verifyAdmin()` | Send test emails |
| `/api/dispatch/send` | `verifyAdmin()`, CSRF, rate limiting (5/5min) | Send emails from dispatch queue |
| `/api/smtp/test` | `verifyAdmin()`, CSRF | Test SMTP configuration |

### Super Admin-Protected Routes

| Route | Protection | Notes |
|-------|-----------|-------|
| `/api/admin/database-stats` | `verifySuperAdmin()` | Database statistics and schema inspection |
| `/api/users/invite` | `verifySuperAdmin()` | Create new users and app_users records |

### System-Protected Routes

| Route | Protection | Notes |
|-------|-----------|-------|
| `/api/dispatch/cron` | CRON_SECRET verification | Automated email dispatch; called by cron service |

## Security Layers

### 1. Global Rate Limiting
- Applied to high-volume public endpoints
- Prevents abuse across multiple forms or resources
- Example: `/api/signup/submit` has 30 submissions/hour/IP global limit

### 2. Per-Form Rate Limiting
- Configurable per signup form (default: 10/hour/IP)
- Stored in `signup_forms.rate_limit_per_hour`
- Example: `/api/signup/submit` checks both global and per-form limits

### 3. Honeypot Protection
- Hidden form fields that bots typically fill
- Silent success response to avoid bot detection
- Applied to: `/api/signup/submit`

### 4. Phone Verification
- Requires last 4 digits of phone number to match stored value
- Prevents unauthorized access to signup responses
- Applied to: `/api/signup/remove`, `/api/signup/update`, `/api/signup/lookup`

### 5. CSRF Protection
- Validates CSRF token for state-changing operations
- Applied to: `/api/dispatch/send`, `/api/smtp/test`

### 6. Content-Length Limits
- Prevents payload abuse
- Example: `/api/signup/submit` rejects payloads > 50KB

## When to Use Service Role Key vs RLS

### Use Service Role Key When:
- ✅ Public read-only operations (with explicit checks)
- ✅ Admin operations requiring cross-user data access
- ✅ Cron jobs and system operations
- ✅ User-initiated operations with alternative verification (phone, etc.)

### Use RLS (Regular Client) When:
- ✅ User operations on their own data
- ✅ Simple CRUD operations with clear ownership
- ✅ Client-side queries that don't need elevated permissions

## Audit Logging

All sensitive operations log to the `audit_log` table:
- `email_sent` - Email dispatch
- `signup_response_self_removed` - User removed their signup
- `signup_response_updated` - User edited their signup

## Best Practices

1. **Always verify authorization before database operations**
   - Check auth at the top of the handler
   - Return immediately if unauthorized

2. **Use the most restrictive authorization level**
   - Prefer `verifySuperAdmin()` over `verifyAdmin()` when appropriate
   - Add resource-level checks when needed

3. **Layer defenses**
   - Combine rate limiting + auth + validation
   - Example: `/api/dispatch/send` uses CSRF + admin auth + rate limiting

4. **Log sensitive operations**
   - Use `audit_log` for accountability
   - Include relevant context (IP hash, user ID, etc.)

5. **Validate all inputs**
   - Use Zod schemas for request validation
   - Sanitize user-provided data

## Adding Authorization to New Routes

1. Import the appropriate helper:
   ```typescript
   import { verifyAdmin } from "@/lib/auth-checks"
   ```

2. Add the check at the top of your handler:
   ```typescript
   export async function POST(req: NextRequest) {
     const auth = await verifyAdmin(req)
     if (!auth.authorized) {
       return auth.error
     }
     // ... rest of handler
   }
   ```

3. Update this documentation with the new route.

## Security Improvements Implemented (v1.74)

### Routes Secured
1. `/api/signup/update-capacity` - Added admin authorization
2. `/api/dispatch/test` - Added admin authorization  
3. `/api/dispatch/send` - Added admin authorization (already had CSRF + rate limiting)
4. `/api/smtp/test` - Added admin authorization (already had CSRF)
5. `/api/signup/submit` - Added global rate limiting (30/hour/IP) to prevent cross-form abuse

### New Infrastructure
- Created `src/lib/auth-checks.ts` with reusable authorization helpers
- Standardized error responses using `ApiError` helpers
- Documented all 14 service-role routes and their protection mechanisms

## Testing Authorization

Test unauthorized access:
```bash
curl -X POST https://your-app.com/api/signup/update-capacity \
  -H "Content-Type: application/json" \
  -d '{"formId": "123", "fieldId": "field1", "itemValue": "item1", "newCapacity": 10}'
# Expected: 401 Unauthorized
```

Test with invalid token:
```bash
curl -X POST https://your-app.com/api/signup/update-capacity \
  -H "Authorization: Bearer invalid-token" \
  -H "Content-Type: application/json" \
  -d '{"formId": "123", "fieldId": "field1", "itemValue": "item1", "newCapacity": 10}'
# Expected: 401 Unauthorized
```

Test with non-admin user:
```bash
curl -X POST https://your-app.com/api/signup/update-capacity \
  -H "Authorization: Bearer <viewer-token>" \
  -H "Content-Type: application/json" \
  -d '{"formId": "123", "fieldId": "field1", "itemValue": "item1", "newCapacity": 10}'
# Expected: 403 Forbidden
```

Test with admin user:
```bash
curl -X POST https://your-app.com/api/signup/update-capacity \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"formId": "123", "fieldId": "field1", "itemValue": "item1", "newCapacity": 10}'
# Expected: 200 OK
```
