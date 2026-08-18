# Template Instance Disconnect Issue

**Date**: 2026-08-18  
**Status**: Fixed  
**Issue**: Dashboard showing empty instance data and "No template associated" error

## Problem

User reported that after updating the Family Bible Study template:
1. Dashboard shows an instance for "bible study this week" but with no details filled in
2. Clicking "Edit" → "Reload from Template" shows error: "No template defaults found"
3. Instance shows "No bible study this week" despite template update
4. Unclear where the instance data is coming from and why it's stale

## Root Cause Analysis

The issue stems from a **three-layer data architecture** where disconnects can occur at multiple points:

### Data Flow Architecture

```
┌─────────────────┐
│  event_types    │  Layer 1: Event Type Definition
│  - id           │           (comm_type = 'bible_study')
│  - name         │
│  - comm_type    │
└────────┬────────┘
         │
         │ event_type_id FK
         ▼
┌─────────────────┐
│ email_templates │  Layer 2: Template Defaults
│  - event_type_id│           (is_default = true)
│  - body_template│           Loaded at page load
│  - is_default   │
└────────┬────────┘
         │
         │ template_type reference
         ▼
┌─────────────────┐
│composed_instance│  Layer 3: Draft Instances
│  - template_type│           (per-week drafts)
│  - form_data    │           Created on first edit
│  - week_start   │
└─────────────────┘
         │
         │
         ▼
┌─────────────────┐
│ events +        │  Layer 4: Calendar Data
│ event_instances │           (active events + occurrences)
│ event_breaks    │           Auto-fills dates/hosts
└─────────────────┘
```

### Priority/Fallback Chain

Dashboard populates forms using this priority:
1. **Composed instance** (if exists for this week) → user's saved draft
2. **Template defaults** (from `email_templates` where `is_default = true`) → customized defaults
3. **Hardcoded fallbacks** (in code) → system defaults
4. **Calendar data** (from `events` + `event_instances`) → date/time/host auto-fill

### Where Disconnects Occur

1. **Missing default template**: Event type exists, but no template with `is_default = true`
   - Result: "Reload from template" fails
   - Fallback: Uses hardcoded defaults from code

2. **Wrong comm_type mapping**: `event_types.comm_type` doesn't match dashboard tab name
   - Result: Template saved under wrong key
   - Dashboard can't find the template

3. **No active calendar event**: Event type exists, but no active event in `events` table
   - Result: "No bible study this week" in date field
   - Even if template exists, date/host fields are empty

4. **Stale composed instance**: Draft saved weeks ago, now outdated
   - Result: Shows old data instead of fresh template + calendar data
   - Solution: Delete the draft to force regeneration

5. **Event on break**: Active event exists but has a break scheduled for this week
   - Result: "No bible study this week"
   - This is correct behavior, not a bug

## The Specific Issue

For the bible study template issue:

1. User updated template via Templates page ✅
2. Template was saved to `email_templates` with `is_default = true` ✅
3. BUT: A stale `composed_instance` exists for bible study this week ❌
4. Dashboard prioritizes composed_instance over template defaults
5. User sees old draft data, not the updated template

Additionally:
- If the event has no recurrence rule or is on break → "No bible study this week"
- If `event_types.comm_type` is wrong → template saved under wrong key

## Solution

### Immediate Fix (Manual)

1. **Delete stale draft**:
   ```sql
   DELETE FROM composed_instances
   WHERE template_type = 'bible_study'
   AND week_start = '2026-08-17'; -- This week's Sunday
   ```

2. **Verify template exists**:
   ```sql
   SELECT et.name, et.comm_type, t.id, t.subject_template
   FROM event_types et
   LEFT JOIN email_templates t ON t.event_type_id = et.id AND t.is_default = true
   WHERE et.comm_type = 'bible_study' OR et.name ILIKE '%bible%';
   ```

3. **Verify active event exists**:
   ```sql
   SELECT e.title, e.recurrence_rule, e.start_date, e.is_active, et.comm_type
   FROM events e
   JOIN event_types et ON et.id = e.event_type_id
   WHERE et.comm_type = 'bible_study' AND e.is_active = true;
   ```

4. **Check for breaks**:
   ```sql
   SELECT eb.start_date, eb.end_date, eb.message, e.title
   FROM event_breaks eb
   JOIN events e ON e.id = eb.event_id
   JOIN event_types et ON et.id = e.event_type_id
   WHERE et.comm_type = 'bible_study'
   AND '2026-08-18' BETWEEN eb.start_date AND eb.end_date;
   ```

### Automated Fix (Scripts)

Run the diagnostic script:
```bash
npx tsx scripts/diagnose-template-instance.ts
```

This checks all layers and identifies:
- Event types without templates
- Templates without event types
- Event types without calendar events
- Specific bible study configuration

Then run the fix script:
```bash
npx tsx scripts/fix-template-links.ts
```

This:
- Creates missing event types with correct `comm_type`
- Creates placeholder default templates for types without them
- Identifies orphaned composed instances

### Code Improvements (Future)

1. **Add "Discard Draft" button** in dashboard edit sheet
   - Allows users to delete stale composed_instance
   - Forces regeneration from template + calendar

2. **Show draft age indicator**
   - Display "Draft from 3 weeks ago" if instance is old
   - Warn user that template may have been updated

3. **Add template version tracking**
   - Track template `updated_at` in composed_instances
   - Auto-refresh if template was updated after instance creation

4. **Improve error messages**:
   ```typescript
   // Current
   if (!tmplData) {
     toast.error("No template defaults found")
   }
   
   // Better
   if (!tmplData) {
     toast.error(
       `No template found for ${type}. ` +
       `Go to Templates page and save a ${type} template first.`
     )
   }
   ```

5. **Add template link validation**:
   - Check `event_type_id` exists before saving template
   - Check `comm_type` matches expected values
   - Warn if event type has no calendar events

## Testing

After fix, verify:
1. Templates page loads all tabs without errors
2. Each tab shows "Save" button (not "No template found")
3. Dashboard shows all cards with correct data
4. "Reload from template" works without errors
5. Clicking "Edit" on bible study shows correct template defaults

## Related Files

- `/src/app/(dashboard)/dashboard/page.tsx` - Dashboard logic (lines 892-1023, 1194-1295)
- `/src/app/(dashboard)/templates/page.tsx` - Template editor (lines 239-311, 513-576)
- `/src/lib/template-defaults.ts` - Fallback defaults
- `/src/lib/dashboard-types.ts` - comm_type mappings

## Prevention

1. Always use `comm_type` field in `event_types` table
2. Ensure `comm_type` matches dashboard tab names exactly
3. Create default template immediately after creating event type
4. Document the three-layer architecture for future developers
