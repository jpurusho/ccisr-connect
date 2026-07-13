# ADR 0019: Signup Edit Functionality

**Status:** Implemented  
**Date:** 2026-07-13  
**Version:** 1.70.0

## Context

Users who signed up for events would sometimes want to change what they're bringing (e.g., change from "Salad" to "Dessert") but had no way to edit their response. Their only option was to:
1. Remove their entire signup
2. Re-submit a new signup

This caused problems:
- **Signup count fluctuation**: Count drops from 25→24 then back to 25, confusing administrators
- **Lost context**: No visibility that it's the same person just changing their item
- **Capacity issues**: Brief window where items are unclaimed before re-submission
- **Poor UX**: Requires memorizing all previous answers to re-enter them

## Decision

Implement **in-place editing** of signup responses with full audit tracking:

### User Flow

1. **Edit Lookup**: "Already signed up? Edit your response" link on public form
2. **Phone Verification**: Enter last 4 digits of phone (same as removal)
3. **Pre-filled Form**: Existing response loads into form fields
4. **Edit & Save**: Modify any fields and click "Update Response"
5. **Audit Trail**: All changes logged with before/after values

### API Implementation

**`/api/signup/lookup`** (new)
- Takes formId + phoneLast4
- Returns responseId + existing data
- Rate limited (10 attempts/hour)

**`/api/signup/update`** (new)
- Takes responseId, formId, data, phoneLast4
- Same validations as submit (capacity, duplicates, required fields)
- Phone verification required
- Excludes current response from capacity calculations
- Preserves original `created_at` timestamp
- Logs field-level changes to audit_log

### Audit Tracking

Logs capture:
- Action: `signup_response_updated`
- Member ID (if linked)
- Verification method
- Field-level changes: `{ fieldId: { from: oldValue, to: newValue, label: fieldLabel } }`
- Timestamp

### UI Changes

**Public Form (`/signup/[slug]`)**
- Collapsible "Edit your response" section (only if form has phone field)
- Phone lookup with 4-digit verification
- "Edit Mode" banner when editing
- Button changes to "Update Response"
- Cancel button to exit edit mode

**Responses Page (`/signup/[slug]/responses`)**
- "Recent Changes" section (renamed from "Recent Removals")
- Shows both removals and edits
- Edit entries display field-level before/after changes
- Color-coded badges: Red = Removed, Amber = Edited

## Benefits

1. **Preserves Signup Count**: No fluctuation when people just want to change items
2. **Better Audit Trail**: See exactly what changed (not just removal + new signup)
3. **Improved UX**: One-click edit instead of remove + re-submit
4. **Capacity Accuracy**: No brief gaps in claimed items
5. **Member Context**: Original member linkage preserved
6. **Same Security**: Phone verification just like removal

## Implementation Details

### Files Changed

**API Routes (new)**
- `src/app/api/signup/lookup/route.ts`: Fetch response by phone verification
- `src/app/api/signup/update/route.ts`: Update existing response

**API Routes (modified)**
- `src/app/api/signup/[slug]/audit/route.ts`: Fetch both removals AND updates

**Pages (modified)**
- `src/app/signup/[slug]/page.tsx`: Edit mode UI and handlers
- `src/app/signup/[slug]/responses/page.tsx`: Display edit audit logs

### Database

No schema changes needed! Uses existing:
- `signup_responses` table (update data column)
- `audit_log` table (new action type)
- `signup_remove_attempts` table (reused for rate limiting)

### Security

- ✓ Phone verification required (last 4 digits)
- ✓ Rate limiting (reuses existing table)
- ✓ Form muted check (read-only mode)
- ✓ All validations enforced (capacity, duplicates, required fields)
- ✓ Audit logging (full before/after)

## Trade-offs

**Pros:**
- Preserves signup count stability
- Better audit trail with field-level changes
- User-friendly (no need to re-enter everything)
- Original timestamp preserved

**Cons:**
- Slightly more complex UI with edit mode
- Lookup requires phone field (but most forms have this)
- Rate limiting shared with removal attempts

## Future Considerations

- Could add "Edit" button directly in the responses list (admin-only)
- Could support edit via email link (no phone required)
- Could limit edit window (e.g., no edits within 24 hours of event)
- Could show edit history on response detail view

## Related

- ADR 0018: Signup removal tracking with member linkage
- Migration 00043: signup_remove_attempts table (reused here)
