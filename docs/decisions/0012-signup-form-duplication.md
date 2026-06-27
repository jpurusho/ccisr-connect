# 0012 — Signup form duplication for recurring events

**Status:** accepted  
**Date:** 2026-06-26

## Context

Users need to reuse signup forms for recurring events (e.g., annual picnics, monthly meetings) without manually rebuilding all fields. Two approaches were considered:

1. **Reuse existing form** — reactivate the old form, mixing old and new responses
2. **Duplicate form structure** — copy all settings but start with 0 responses

Reusing causes confusion: "Summer Picnic 2025" responses mixed with "Summer Picnic 2026" signups makes reporting unclear and exports messy.

## Decision

Add **"Duplicate Form"** button that:
- Copies all form structure (fields, theme, settings, dates)
- Resets to 0 responses (clean slate)
- Sets status to `draft` (requires review before activation)
- Generates unique slug with `-copy` suffix, auto-incrementing if needed (`-copy-2`, `-copy-3`)
- Appends `(Copy)` to title
- Resets notifications (disabled by default)

Duplication creates a **brand new database row** with new ID — completely independent from original.

## Why this approach

**Pros:**
- Clean data separation (each event has its own response set)
- Historical preservation (old form stays intact with its responses)
- Easy to modify for new event (change dates, add/remove fields)
- CSV exports are per-event
- Audit trail clear (which responses belong to which event)

**Cons:**
- Must update title/dates manually after duplication
- Slightly more storage (one form row per event)

**Alternative rejected:** "Reuse form" would require:
- Complex filtering UI to separate 2025 vs 2026 responses
- Export confusion
- Risk of accidentally viewing/editing wrong year's data

## Consequences

**Positive:**
- Saves time vs rebuilding 15+ fields manually
- Each event instance has clean boundaries
- Can archive old forms while keeping new active
- Easy to compare attendance across years (separate exports)

**Negative:**
- User must remember to duplicate, not just reactivate
- Slug proliferation (`picnic-copy`, `picnic-copy-2`, etc.) — mitigated by editing slug after duplication

**Usage pattern:**
1. Archive "Summer Picnic 2025" after event
2. Duplicate → "Summer Picnic 2025 (Copy)"
3. Edit: rename to "Summer Picnic 2026", update dates
4. Activate
5. Old form: archived with 50 responses. New form: 0 responses, ready for 2026 signups.
