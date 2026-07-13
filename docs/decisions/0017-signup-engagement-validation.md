# 0017 — Require engagement validation for signup forms

**Status:** accepted  
**Date:** 2026-07-13

## Context

After implementing optional claim_select fields and notes, users could submit signups with only their name filled in. This created "name-only" entries that provided no useful information about what people were bringing or their intentions.

For event signups (picnics, potlucks), the primary purpose is coordination — knowing who's bringing what. Name-only signups defeat this purpose and require manual follow-up.

## Decision

**Validation rule:**  
When a form contains `claim_select` fields, submission requires at least one of:
- One or more claim_select items selected (any field)
- Notes/textarea field filled with non-empty text

**Implementation:**
- Client-side: Submit button disabled until criteria met (reactive, updates on every form change)
- Client-side: Manual validation in `handleSubmit` with friendly error message
- Server-side: Same validation in `/api/signup/submit` to prevent bypass
- Error display: Inline red banner with dismissible message (no redirects or ugly error pages)

**Notes field visibility:**
- Response cards: Shows below "Bringing:" line in italic gray text
- Response table: Separate column, hidden on small screens (< 1280px), truncated to prevent wrapping
- Included in validation check even if field is not marked required

## Consequences

**Positive:**
- Eliminates useless signups that require manual follow-up
- Clear UX: button stays disabled with visual feedback
- Flexibility: users can fill notes if they haven't decided what to bring yet
- Consistent validation client and server-side

**Negative:**
- Adds complexity to validation logic (must check across multiple field types)
- Notes field becomes pseudo-required even if marked optional (acceptable trade-off)
- Disabled button may confuse users who don't understand why (mitigated by immediate re-enabling when criteria met)

**Alternative considered:**
Making individual claim_select fields required was rejected because:
- Too restrictive (forces food OR supplies choice)
- Doesn't allow "just notes" signups
- Would require at least N items per field rather than any engagement

**Edge cases:**
- Forms without claim_select fields: no special validation (allows name-only)
- All claim fields empty but notes filled: valid (user explaining their situation)
- Whitespace-only notes: rejected (trim check)
