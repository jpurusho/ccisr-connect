# 0006 — Dynamic Attendance Statistics for Signup Forms

**Status:** accepted  
**Date:** 2026-06-23

## Context

Signup forms collect RSVPs with attendee counts (adults, kids) via number fields, but these counts were invisible until opening individual responses. Users managing events (picnics, retreats, dinners) needed quick visibility into total attendance without drilling into response tables.

The challenge: signup forms are flexible — field labels are user-defined, so we couldn't hardcode field IDs or assume fixed schema.

## Decision

Implement dynamic attendance statistics that auto-detect count fields by label matching:

1. **Detection logic** (shared function):
   ```typescript
   // Number fields with labels containing these keywords:
   - "adult" or "grown" → adults count
   - "kid", "child", "youth", "teen" → kids count
   - Total = adults + kids
   ```

2. **Display locations**:
   - **Dashboard cards** (`/signups`): Shows below response count on each form card
   - **Public signup page** (`/signup/[slug]`): Stats card appears between header and form body
   - Only visible when `stats.total > 0` (hide if no attendance data)

3. **Data flow**:
   - Dashboard: Fetch all `signup_responses.data` per form, calculate stats on client
   - Public page: Calculate from loaded responses (already fetched for signup list)
   - No new database queries — uses existing response data

4. **Format**:
   - Dashboard card: `42 Adults | 18 Kids • 60 Total` (compact, one line)
   - Public page: Large numbers with labels in a bordered card (prominent display)

## Consequences

**Positive:**
- Works automatically for any signup form with appropriately labeled fields
- No configuration required — purely convention-based
- Users see attendance at a glance from dashboard
- Public signup page shows real-time totals to encourage participation
- Resilient to schema changes (adds/removes fields don't break stats)

**Negative:**
- Relies on consistent labeling conventions (e.g., "Attendees" won't be detected)
- Non-English labels won't match (hardcoded English keywords)
- Fetching full response data for dashboard adds query weight (vs just counts)

**Alternatives considered:**
- Explicit field designation: Requires UI for "mark as adult count" — adds complexity
- Server-side aggregation: Requires new API endpoints and DB functions
- Fixed field names: Too rigid, breaks existing forms

**Edge cases handled:**
- Forms without number fields → stats hidden
- Forms with only generic counts ("Total Guests") → stats hidden (avoids double-counting)
- Multiple adult/kid fields → sums all matching fields correctly

**Notes:**
- If internationalization is needed, replace keyword matching with field metadata flag
- Current implementation is client-side; could be optimized with server-side aggregation if response counts grow large (>1000 per form)
