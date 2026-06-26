# 0011 — Signup form mute mode (read-only state)

**Status:** accepted  
**Date:** 2026-06-25

## Context

Users requested the ability to "freeze" a signup form so attendees can view existing signups but cannot make changes. The use case: a picnic signup where the admin wants to finalize logistics while allowing people to see who's bringing what items and who volunteered for cleanup helpers.

Considered alternatives:
1. **Status = "closed"** — rejected because this hides the form entirely; users can't even view signups
2. **Separate "view-only" visibility mode** — rejected because it conflates access control with mutability; we already have `visibility` for access control
3. **New `muted` boolean flag** — selected because it's orthogonal to `status` and `visibility`, clearly named, and doesn't overload existing fields

Key requirement: muting must block **all** mutations (submit, select items, remove signups, add custom items) while preserving full visibility of the form, statistics, and existing signups.

## Decision

Add a `muted` boolean column to `signup_forms` (default `false`). When `true`:
- Public form displays an amber banner: "This form is currently in read-only mode"
- All input fields disabled (text, email, phone, checkboxes, custom item input)
- Submit button disabled with text "Form is Read-Only"
- Remove signup buttons hidden
- API routes (`/api/signup/submit`, `/api/signup/remove`) reject with HTTP 403

Admin UI:
- Mute/Unmute toggle button on form cards
- "Muted" badge displayed on muted forms  
- Toggle in form editor settings
- Context menu option for quick mute/unmute

Orthogonality preserved:
- `status: "active"` + `muted: true` → form is open for viewing but not editing
- `status: "closed"` → form hidden regardless of `muted`
- `visibility: "admin_only"` → only admins see it regardless of `muted`

## Consequences

**Positive:**
- Admin can freeze signups for any reason (finalizing logistics, preventing last-minute changes, conducting a review)
- Users retain visibility into who signed up for what, enabling coordination without further edits
- Clean separation: `status` controls lifecycle, `visibility` controls access, `muted` controls mutability

**Negative:**
- One more field to reason about in form state
- If user forgets form is muted and tries to submit, they get an error message (mitigated by prominent banner and disabled submit button)

**Implementation notes:**
- Disabled inputs use `disabled={form.muted}` prop
- Remove buttons check `!muted && !isPast` before allowing deletion
- Custom item input hidden entirely when muted (`field.allowCustom && !disabled`)
- Claim_select checkboxes disabled: `disabled={disabled || (full && !checked) || (atMax && !checked)}`
