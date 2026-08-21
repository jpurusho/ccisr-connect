# Layered Subject Architecture - Separate Storage from Presentation

**Date**: 2026-08-19  
**Status**: Accepted  
**Context**: v1.77.0 - v1.77.1

## Problem

The subject prefix system was accumulating prefixes over multiple saves, leading to subjects like:
- "Reminder: Reminder: Bible Study..."
- "Reminder: [Updated Email Title]: Reminder: Bible Study..."

**Root Cause:** The system was saving the **concatenated** subject (prefix + base) back to the database. Each save would read the concatenated subject, apply another prefix, and save it again.

```typescript
// OLD (WRONG):
const finalSubject = prefix ? `${prefix}: ${baseSubject}` : baseSubject
// Save finalSubject to DB → next time, reads concatenated subject → applies prefix again
```

## Decision

Implement a **layered architecture** that separates data storage from presentation:

### Storage Layer (Database)
- `composed_instances.subject` → Store ONLY base subject (no prefix)
- `dispatch_queue.subject` → Store final subject AS SENT (preserves what was actually sent)
- `email_templates.subject` → Store base template (no prefix)

### Presentation Layer (Runtime)
- Display: Compute `prefix + base` on the fly
- Send: Compute `prefix + base` at send time
- **Never** save the concatenated version back to `composed_instances`

### Code Changes

**Before (accumulating):**
```typescript
async function handleSaveInstance(type: CommType) {
  const baseSubject = getSubject(type)
  const subject = combineSubject(baseSubject, type)  // Concatenates
  
  await supabase.from("composed_instances").update({
    subject,  // ❌ Saves concatenated → accumulates on next save
  })
}
```

**After (layered):**
```typescript
async function handleSaveInstance(type: CommType) {
  const baseSubject = getSubject(type)
  
  await supabase.from("composed_instances").update({
    subject: baseSubject,  // ✅ Saves ONLY base
  })
}

async function handleSendNow(type: CommType) {
  const baseSubject = getSubject(type, isReminder)
  const finalSubject = subjectPrefixes[type]?.trim()
    ? combineSubject(baseSubject, type)  // Compute at send time
    : baseSubject
  
  // Save base to draft, send final
  await supabase.from("composed_instances").update({ subject: baseSubject })
  await supabase.from("dispatch_queue").insert({ subject: finalSubject })
}
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│ User Input                                              │
├─────────────────────────────────────────────────────────┤
│ Subject Field:        "Bible Study This Friday"         │
│ Subject Prefix Field: "Reminder"                        │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ Storage Layer (Database)                                │
├─────────────────────────────────────────────────────────┤
│ composed_instances.subject = "Bible Study This Friday"  │
│ (NO prefix stored)                                      │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ Presentation Layer (Runtime)                            │
├─────────────────────────────────────────────────────────┤
│ Display: prefix + base                                  │
│ → "Reminder: Bible Study This Friday"                   │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ Dispatch Layer (Sent Emails)                            │
├─────────────────────────────────────────────────────────┤
│ dispatch_queue.subject = "Reminder: Bible Study..."     │
│ (Preserves exactly what was sent)                       │
└─────────────────────────────────────────────────────────┘
```

## Benefits

1. **No Accumulation** - Base subject never contains prefixes, impossible to accumulate
2. **Clean Data** - Database contains normalized data, not presentation strings
3. **Flexibility** - Can change prefix without affecting base subject
4. **Consistency** - Same behavior for all email types (no special cases)
5. **Auditability** - `dispatch_queue` preserves exact subject that was sent

## Consequences

### Positive
- User has complete control via Subject Prefix field
- No automatic prefix additions (no assumptions)
- Can change prefix without re-saving draft
- Clean separation of concerns

### Negative
- Must compute concatenated subject at runtime (minimal overhead)
- Two sources of truth: `composed_instances` (base) vs `dispatch_queue` (final)

### Neutral
- Subject Prefix field is optional (blank = no prefix)
- Templates can still have default subjects (no prefix in template recommended)

## Implementation

**Files Changed:**
- `src/app/(dashboard)/dashboard/page.tsx`
  - `handleSaveInstance()` - Save base only
  - `handleSendNow()` - Compute final at send time
  - Removed all automatic "Reminder:" prefix logic

**Version:** v1.77.0 (breaking change) → v1.77.1 (refinement)

## Alternatives Considered

### Alternative 1: Strip Prefixes Before Save
**Approach:** Detect and strip "Reminder:", "Final Notice:", etc. before saving

**Rejected Because:**
- Fragile - requires maintaining list of known prefixes
- Doesn't handle custom prefixes
- User's explicit "Reminder" in subject field would be stripped

### Alternative 2: Store Prefix Separately
**Approach:** Add `subject_prefix` column to all relevant tables

**Rejected Because:**
- Already have `subject_prefix` in UI state (`subjectPrefixes`)
- Would require schema migration
- Layered approach achieves same result without DB changes

## Migration

**Existing Data:** No migration needed. Old concatenated subjects will:
1. Be read as base subject (may contain old prefix)
2. User can edit to remove prefix
3. New saves will store clean base

**Recommendation:** Users should edit templates to remove any prefixes from subject fields.

## Related

- [0018 - Email Subject Prefix Field](0018-email-subject-prefix-field.md) - Introduced the prefix field
- [0022 - Improve Break Visibility](0022-improve-break-visibility.md) - Related UX improvements

## Decision Log

- **2026-08-18**: Initial attempts to strip prefixes programmatically (failed)
- **2026-08-19**: Adopted layered architecture approach
- **v1.77.0**: Removed all automatic prefix logic
- **v1.77.1**: Implemented clean layered storage
- **2026-08-21**: Fixed card display to show fresh subject for reminders (not old sent subject)

## User Guidance

**For operators:**
1. Edit your email templates and remove any prefixes from subject fields
2. Use Subject Prefix field for "Reminder", "Final Notice", etc.
3. Leave Subject Prefix blank for no prefix

**For developers:**
- Never concatenate prefix + subject before saving to `composed_instances`
- Always compute concatenation at display/send time
- Only `dispatch_queue` should store final concatenated subjects
- When displaying sent emails on cards, use `forceFresh=true` to show what WILL be sent for reminders, not what WAS sent

## UI Implications

**Card Display Behavior:**
- **Draft emails**: Show current subject (either user override or template-generated)
- **Sent/scheduled emails**: Show FRESH subject (what will be sent for next reminder)
  - This prevents confusion where card shows "Old Subject" but Send Reminder uses "New Subject"
  - User can still edit the subject — their edits (subjectOverride) take precedence

**Code Pattern:**
```typescript
// Card display for sent emails
subject={(() => {
  const status = getStatus(type)
  const isReminderContext = status === "sent" || status === "scheduled"
  return getSubject(type, isReminderContext)  // forceFresh for reminders
})()}
```

This ensures the card always displays what will ACTUALLY be sent when you click "Send Reminder".
