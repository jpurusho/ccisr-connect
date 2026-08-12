# 0018 — Optional subject prefix field for email reminders

**Status:** accepted  
**Date:** 2026-07-30

## Context

Users need to send reminder emails for recurring events (Bible Study, Prayer Meeting, etc.) and want to distinguish them with prefixes like "Reminder:", "Final Notice:", "Urgent:", etc. Without a prefix mechanism, users would have to manually edit the subject line each time, which:
- Modifies the template's base subject
- Requires manual cleanup afterward
- Is error-prone (typos, inconsistent formatting)

We considered three approaches:
1. **Prefix dropdown** with preset options ("Reminder", "Final", "Urgent") + custom
2. **Subject template field** with placeholders like `{{prefix}}: {{subject}}`
3. **Optional prefix input field** that combines with subject at send time

## Decision

Implement approach #3: an optional text input field for subject prefix that appears when editing email cards.

**Key design choices:**

1. **State management:** Store prefix separately from subject in `subjectPrefixes` state map (keyed by CommType or custom template ID), not in template or instance
2. **Combination timing:** Merge prefix + subject at send/queue/save operations via `combineSubject()` helper
3. **Auto-reminder fallback:** If status is "sent"/"scheduled" AND no manual prefix → auto-add "Reminder:" (backward compatible behavior)
4. **UI placement:** Show prefix field above subject line, only when editing
5. **Storage:** Final combined subject stored in `dispatch_queue.subject` — no schema changes needed

## Consequences

**Positive:**
- Templates stay clean — prefix is instance-specific, not baked in
- Flexible — users control exact wording
- Non-intrusive — only appears when editing
- No database migration needed
- Backward compatible with existing auto-reminder logic

**Negative:**
- Prefix is ephemeral (lost after send unless user remembers to set it again)
- State lives only in UI session, not persisted in draft instances
- Cannot pre-configure default prefix per template type

**Future considerations:**
- If users want persistent prefixes, add `subject_prefix` field to `composed_instances` table
- Could add quick-select buttons for common prefixes alongside text input
- Could store "last used prefix" per card type for convenience
