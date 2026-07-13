# ADR 0018: Signup Removal Tracking and Audit Visibility

**Status:** Implemented  
**Date:** 2026-07-13  
**Version:** 1.69.0

## Context

When reviewing signup responses, administrators noticed that the count had dropped (e.g., 25 signups became 23) but had no visibility into:
1. Who removed their signup
2. Whether the person removing was the same person who originally signed up
3. What was removed (for potential recovery or pattern analysis)

The existing system logged removals to the audit_log table but:
- Did not capture whether the response was linked to a member account
- The audit logs were not visible to administrators viewing responses
- No easy way to see if legitimate self-removals vs. potential abuse

## Decision

Implement **Option 2 & 3** approach:

### Option 2: Member Linkage Visibility
- Store `member_id` in audit log when a response is removed
- Show "Member" badge on both active responses and removal audit logs
- This indicates if the removed response was tied to a known member account

### Option 3: Audit Log Display on Responses Page
- Add collapsible "Recent Removals" section on the responses view
- Display what was removed, when, and member status
- Show verification method used (phone verification badge)
- Display claimed items that were removed for recovery reference

## Implementation

### API Changes

**`/api/signup/remove/route.ts`**
- Added `member_id` to the response query (line 91)
- Included `memberId` in audit log changes object (line 147)

**`/api/signup/[slug]/audit/route.ts`** (new)
- Fetch audit logs filtered by `signup_response_self_removed` action
- Filter by formId in JSONB changes field
- Return up to 50 most recent removals

### UI Changes

**`/app/signup/[slug]/responses/page.tsx`**
- Added `AuditLogEntry` interface with member tracking
- Fetch audit logs alongside responses
- Added collapsible "Recent Removals" section showing:
  - Removed person's name
  - "Member" badge if `member_id` was present
  - "Verified" badge if phone verification was used
  - What items were claimed (for recovery)
  - Timestamp of removal
- Added "Member" badge to active responses table

## Benefits

1. **Transparency**: Admins can now see who removed signups
2. **Member Detection**: Easily identify if a member removed their own signup vs. someone else
3. **Recovery Data**: Full snapshot of removed response available in audit log
4. **Pattern Detection**: Can spot if certain people frequently remove signups
5. **Accountability**: Phone verification badge shows stronger identity confirmation

## Trade-offs

- **Privacy**: Member linkage is visible to admins (acceptable for internal tools)
- **Performance**: Additional API call to fetch audit logs (cached, negligible impact)
- **Storage**: Audit logs accumulate over time (already had this, just adding visibility)

## Future Considerations

- Could add IP hash tracking on signup submission (Option 1) to compare removal IP
- Could add export/download of removal history
- Could add notifications when specific members remove signups
- Could implement automatic cleanup of old audit logs (>90 days)

## Related

- Migration 00043: signup_remove_attempts table for rate limiting
- ADR 0017: Signup engagement validation (claim/notes requirement)
