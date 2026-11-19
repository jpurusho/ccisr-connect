# 0026 — Templates Must Not Manage Operational Data

**Status:** accepted  
**Date:** 2026-11-18  
**Supersedes:** None (fixes architectural boundary violation)

## Context

The Templates page (`/templates`) was managing both presentation defaults (colors, styling) AND operational data (breaks) by deleting ALL breaks for an event when saving template changes, then recreating only breaks present in the template form.

This caused the "break disappearing bug" where:
1. User adds Christmas break via Calendar page
2. Break saved to `event_breaks` table ✓
3. User edits template in Templates page
4. Template save triggers deletion: `DELETE FROM event_breaks WHERE event_id = X`
5. Only template form breaks re-inserted
6. Calendar breaks not in form → **LOST**

This violated the clean separation principle: Templates (presentation) managing Calendar (operational) data.

The bug was discovered after San Ramon Bible Study Christmas break disappeared multiple times, requiring manual re-entry.

## Decision

**Remove break management from Templates page entirely.**

Templates page now manages ONLY:
- Email styling (colors, fonts, gradients)
- Default message content
- Template structure

Templates page NEVER touches:
- `event_breaks` table
- `event_instances` table
- Any operational data

Breaks are managed exclusively in Calendar page (`/calendar`).

Code changes (v1.90.3):
- Removed lines 328-356 in `src/app/(dashboard)/templates/page.tsx`
- Deleted `syncOperationalDataToDb` break management section
- Added comment explaining boundary violation and why removed

## Consequences

### Positive
- **Clean separation maintained:** Each system touches only its own database tables
- **No data loss:** Breaks persist forever, never accidentally deleted
- **Clear ownership:** Calendar owns ALL operational data (schedules, breaks, subjects)
- **Documented boundaries:** ARCHITECTURE.md now documents strict separation rules
- **Prevented future violations:** PR template includes boundary checklist

### Negative
- **Loss of feature:** Cannot manage breaks via Templates page (intentional)
- **Migration needed:** If breaks existed in template forms, they must be moved to Calendar manually

### Architecture Impact

Reinforces 4-layer architecture with strict boundaries:

| Layer | Manages | Never Touches |
|-------|---------|---------------|
| Calendar | Schedules, Breaks, Subjects | Templates, Styling |
| Templates | Colors, Styling, Defaults | Breaks, Schedules, Instances |
| Dashboard | Week-specific overrides | Schedules, Templates |
| Dispatches | History (immutable) | Everything (read-only) |

### Prevention Measures
- PR template now includes boundary violation checklist
- ARCHITECTURE.md documents the violation that was fixed
- Code comment warns future developers not to re-add break management

### Related Documentation
- `ARCHITECTURE.md` - Complete architecture boundaries
- `BREAK_BUG_FIXED.md` - Root cause analysis and fix details
- `AGENTS.md` - Quick boundary reference
- `.github/PULL_REQUEST_TEMPLATE.md` - Violation prevention checklist

## Alternative Considered

**Keep break management in Templates with `managed_by` column:**
```sql
ALTER TABLE event_breaks ADD COLUMN managed_by text;
DELETE FROM event_breaks 
WHERE event_id = X AND managed_by = 'template';
```

Rejected because:
- Adds complexity without benefit
- Still violates boundary separation
- Breaks should have single source of truth (Calendar)
- User confusion: "Where do I manage breaks?"

Current approach is simpler and clearer: Calendar = all operational data.
