# ADR: Signup Form Count Selection and Auto-Close Enhancements

**Date:** 2026-07-07
**Status:** Implemented

## Context

The current signup form system has two limitations:

1. **Automatic closure on event date**: Forms automatically close when the event date passes, even if the admin wants to keep collecting signups or the event is still ongoing.

2. **Single item selection**: When users sign up for items (e.g., bringing food to a picnic), they can only claim 1 of n available spots. If someone wants to bring 4 packets of grapes out of 5 available, they can't indicate that.

## Decision

We implemented two enhancements to address these issues:

### 1. Explicit Auto-Close Control

Added an `auto_close_date` field to `signup_forms` table:
- **Optional field**: If NULL, form stays open indefinitely (until manually closed)
- **Explicit date**: Form automatically closes on the specified date
- **Admin control**: Admin can set any date, independent of the event date

This replaces the implicit "close on event date" behavior with explicit admin control.

### 2. Count Selection for Claim Items

Added `allow_count_selection` boolean to both:
- `signup_forms` table (global form setting)
- `claim_select` field config (per-field setting)

When enabled:
- Users see **number inputs** instead of checkboxes
- Users can select **multiple counts** of a single item (e.g., "I'll bring 4 out of 5 grapes")
- System tracks availability in real-time (shows "3 available" based on what others claimed)
- Data structure changes:
  - **Old format** (checkbox): `{ fieldId: ["item1", "item2"] }` (array of strings)
  - **New format** (count): `{ fieldId: { "item1": 4, "item2": 2 } }` (object with counts)

## Implementation Details

### Database Changes

```sql
-- Migration 00045
ALTER TABLE signup_forms
  ADD COLUMN auto_close_date date,
  ADD COLUMN allow_count_selection boolean NOT NULL DEFAULT false;
```

### Type Changes

```typescript
// ClaimSelectFieldConfig
interface ClaimSelectFieldConfig {
  // ... existing fields
  allowCountSelection?: boolean  // New field
}

// Signup response data format (claim_select fields)
// Old: string[]
// New: string[] | Record<string, number>
```

### UI Changes

1. **Admin Form Builder**:
   - New "Auto Close Date" field in duration section
   - New "Allow Count Selection" toggle in field settings (for claim_select fields)
   - New global "Allow Count Selection" toggle (applies to all claim_select fields)

2. **Public Signup Form**:
   - When `allowCountSelection` is true: Shows +/- buttons and number input for each item
   - When `allowCountSelection` is false: Shows checkboxes (original behavior)
   - Real-time availability display: "3 available" or "2/5 claimed"

### Backward Compatibility

- Old responses with array format `["item1", "item2"]` still work
- System aggregates counts from both formats when calculating availability
- Forms without `allowCountSelection` default to checkbox mode

## Consequences

### Positive

- **More flexibility**: Admins control exactly when forms close
- **Better UX**: Users can claim multiple counts of items in one submission
- **Accurate tracking**: System knows exact quantities claimed, not just "who claimed what"
- **Backward compatible**: Existing forms and responses continue to work

### Negative

- **Complexity**: Two data formats for claim_select fields (array vs object)
- **Migration**: Existing forms must explicitly set `auto_close_date` if they want auto-close behavior

## Example Use Case: Picnic Signup

**Before:**
- Form closes automatically on picnic date
- If someone wants to bring 4 packets of grapes, they can only select "grapes" once
- No way to indicate quantity

**After:**
- Admin sets `auto_close_date` to picnic date (or leaves NULL to keep open)
- User selects "Grapes" and enters "4" → claims 4 out of 5 available
- System shows "1 available" for grapes
- Next person can claim the remaining 1

## Applying to Picnic Form

```sql
-- Enable count selection for existing picnic form
UPDATE signup_forms
SET
  allow_count_selection = true,
  auto_close_date = '2026-07-15'  -- Set explicit close date
WHERE slug = 'picnic';

-- Then update the claim_select field config in the admin UI:
-- Enable "Allow Count Selection" toggle for food items field
```

## References

- Migration: `supabase/migrations/00045_signup_count_and_close_enhancements.sql`
- Admin UI: `src/app/(dashboard)/signups/page.tsx`
- Public form: `src/app/signup/[slug]/page.tsx`
- Field types: `src/lib/signup/field-registry.ts`
