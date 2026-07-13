# 0016 — Dynamic capacity management for signup claim_select fields

**Status:** accepted  
**Date:** 2026-07-13

## Context

Signup forms with claim_select fields (e.g., "bring food items") had fixed capacity per item (e.g., "grapes: 5 slots"). When all slots filled, no one else could sign up even if more were needed. Users requested:

1. Ability to claim multiple quantities per item (e.g., bring 3 of 5 grapes)
2. Ability for users to dynamically increase capacity when items are full
3. Manual form closure only — no auto-close on event date

Previous implementation stored claims as `string[]` (checkbox mode). Count mode requires `Record<string, number>` format.

## Decision

**Capacity model:**
- Store `current_capacity?: number` alongside base `capacity` in field options JSONB (no new DB column)
- New `/api/signup/update-capacity` endpoint validates `newCapacity >= claimedCount` before updating
- Submit route uses `current_capacity ?? capacity` for capacity checks
- When `allowCapacityIncrease: true`, skip capacity validation (users can increase on-demand)

**Count selection:**
- Field config: `allowCountSelection: boolean` enables count mode
- Data format: `Record<string, number>` where values are quantities claimed
- Client shows +/− buttons per item; + button auto-expands capacity when `allowCapacityIncrease` enabled
- Backward compatible: both array and object formats handled in all display/validation code

**Form closure:**
- Removed auto-close logic based on `event_date`, `end_date`, `target_month`
- Forms only close if `auto_close_date` is explicitly set or admin manually closes
- Addresses user requirement: "signup should stay open until explicitly closed"

**Multi-field support:**
- Response cards and tables now aggregate items from ALL `claim_select` fields
- Previously only showed first field, causing "Setup & Supplies" items to be hidden

## Consequences

**Positive:**
- Users can self-manage capacity during signup (reduces admin intervention)
- Count mode enables precise quantity tracking ("bring 3 packets" vs. "bring something")
- No accidental form closures after event date
- Backward compatible with existing checkbox-mode signups

**Negative:**
- `current_capacity` scattered in JSONB; harder to query in SQL (trade-off for avoiding schema migration)
- Count format complicates display logic (must handle both array and object formats)
- Rate limit increased to 50/min for member lookup (was causing false negatives during multi-signup sessions)

**Migration notes:**
- Existing forms work unchanged in checkbox mode
- Admin must enable `allowCountSelection` and `allowCapacityIncrease` per field to use new features
- No data migration needed; dual format support handles mixed responses
