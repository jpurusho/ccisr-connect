# 0013 — Signup form archive status and visibility filtering

**Status:** accepted  
**Date:** 2026-06-26

## Context

Users needed a way to hide old/past-event signup forms from the main list while preserving them for historical reference. Three states were already defined:

- **draft** — work in progress, not public
- **active** — live and accepting signups
- **closed** — temporarily disabled

An `archived` status existed in the database schema but was not exposed in the UI. User asked: "Archiving original means deactivating right?"

## Decision

Add full **Archive feature** with:

1. **"Archived" status option** in form editor dropdown (4th option alongside draft/active/closed)
2. **Archive/Unarchive button** on form cards (Archive icon) and context menu
3. **"Show Archived" toggle** in page header — archived forms hidden by default, shown when enabled
4. **Archive = status change** — sets `status = 'archived'`, not just metadata flag
5. **Unarchive restores to draft** — user can then activate if desired
6. **Archived forms can be reactivated** — same slug, same responses, just changes status back

## Why archive ≠ closed

**"Closed"** = temporarily disabled (e.g., form full, waiting for approval)  
**"Archived"** = historical/past event, hidden from main list by default

Semantic difference:
- Closed forms stay visible → admin knows they exist and may need attention
- Archived forms hidden → out of the way, but preserved for historical lookups

## Consequences

**Positive:**
- Clean main forms list (only active/draft/closed visible by default)
- Archived forms preserved with all responses
- Can view archived form responses anytime (toggle "Show Archived")
- Can reactivate if needed (e.g., forgot to duplicate, need to reopen)
- Clear distinction: closed = paused, archived = done/historical

**Negative:**
- One more status to understand
- Risk: user might archive when they meant to close (mitigated by separate button + confirmation)

**Visual design:**
- Traffic light colors added: Green (active), Red (closed), Gray (archived), Yellow (draft)
- Makes status instantly recognizable without reading text

**Workflow examples:**

**Scenario 1: Archive + clean slate (recommended)**
1. Archive "Summer Picnic 2025" after event
2. Duplicate → "Summer Picnic 2026"
3. Old = archived (hidden), new = active

**Scenario 2: Reactivate archived form (mixing responses)**
1. Find archived "Summer Picnic 2025" (toggle "Show Archived")
2. Unarchive → status becomes draft
3. Edit dates, activate
4. Form accepts 2026 signups, 2025 responses still in same form (not recommended, but supported)

**Default behavior:** Archived forms hidden from list unless toggle enabled. Prevents clutter while preserving history.
