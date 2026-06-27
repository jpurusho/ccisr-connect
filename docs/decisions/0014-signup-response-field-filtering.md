# 0014 — Signup response field-based filtering with summary cards

**Status:** accepted  
**Date:** 2026-06-26

## Context

User asked: "On signup form for picnic, where does people who sign up for cleanup after the picnic show?"

The form had a checkbox "I can help with cleanup after the picnic" but no easy way to:
- See at-a-glance how many people selected "Yes"
- Filter the responses table to show only cleanup volunteers

All responses were in one flat table. User had to:
1. Scan entire table visually, or
2. Export to CSV and filter in spreadsheet, or
3. Use text search (unreliable for checkbox values)

## Decision

Add **summary cards with one-click filtering** for filterable field types:

**Summary Cards:**
- Display at top of responses page (above table)
- One card per filterable field (checkbox, select, multi_select)
- Each option shows count badge (e.g., "Yes: 5", "No: 12")
- Click option → filter table to show only matching responses

**Filterable fields:**
- `checkbox` — Yes/No options
- `select` — all unique values from responses
- `multi_select` — all selected values (future: may need refinement for arrays)

**Active filter badge:**
- Shows which filter is active (e.g., "Cleanup: Yes")
- Displays "Showing X of Y responses"
- Click X to clear filter

**Filter behavior:**
- Field filter + text search can combine (AND logic)
- Only one field filter active at a time
- Clearing field filter restores full list (text search still applies)

## Why summary cards instead of advanced filtering UI

**Alternatives considered:**

**Option 1: Dropdown filter per column** (rejected)
- Too cluttered with many fields
- Hidden until user clicks dropdown
- No at-a-glance counts

**Option 2: Advanced filter builder** (rejected)
- Overkill for simple use case
- Adds complexity to UI
- Users want quick answers, not query builder

**Option 3: Summary cards (selected)**
- Counts visible at a glance (e.g., "5 cleanup volunteers")
- One click to filter (no menu navigation)
- Works for non-technical users
- Progressive disclosure: no cards if no filterable fields

## Consequences

**Positive:**
- Instant visibility: "5 people signed up for cleanup" without clicking anything
- One-click filtering: click "Yes" → table shows only those 5
- Works for multiple fields (e.g., "Cleanup: Yes" + "Bringing food: Salad")
- No training needed (obvious UI: click badge → see those responses)

**Negative:**
- Only works for simple field types (checkbox, select)
- Can't filter by text fields, numbers, dates (would require input UI)
- Summary cards take vertical space (mitigated: only show if filterable fields exist)

**Future enhancements:**
- Multi-select field handling needs review (currently treats each value independently)
- Could add date range filter for date fields
- Could add number range filter (e.g., "Adults: 2-5")

**Real-world impact:**
- User: "Who signed up for cleanup?" → glance at summary, see "5 Yes"
- User: "Email cleanup volunteers" → click "Yes", export CSV with filtered list
- User: "How many people bringing dessert?" → click "Dessert" in food field → see count + names

**Implementation note:**
TypeScript error fixed: removed invalid "radio" field type (not in `SignupFieldType` union). Only `checkbox`, `select`, `multi_select` are filterable.
