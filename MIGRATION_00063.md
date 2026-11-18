# Migration 00063: Instance Subject Override

## Overview
Adds `instance_subject` and `instance_subject_prefix` columns to `event_instances` table, allowing per-instance email subject customization.

## To Apply

### Option 1: Via Supabase CLI (Recommended)
```bash
npx supabase db reset --local  # For local development
# OR
npx supabase migration up      # For production
```

### Option 2: Direct SQL (if Docker not available)
Run this SQL in your Supabase SQL Editor:

```sql
ALTER TABLE event_instances
  ADD COLUMN IF NOT EXISTS instance_subject text,
  ADD COLUMN IF NOT EXISTS instance_subject_prefix text;

COMMENT ON COLUMN event_instances.instance_subject IS
  'Optional subject override for this specific instance. If set, overrides the template subject for emails about this occurrence.';

COMMENT ON COLUMN event_instances.instance_subject_prefix IS
  'Optional subject prefix override (e.g., "REMINDER", "FINAL NOTICE") for this instance.';
```

## After Migration
1. Restart your dev server (`npm run dev`)
2. Edit any event occurrence from the calendar
3. You'll now see "Subject Prefix" and "Email Subject Override" fields
4. Any subject set at the instance level will override the template default when composing emails

## Rollback
```sql
ALTER TABLE event_instances
  DROP COLUMN IF EXISTS instance_subject,
  DROP COLUMN IF EXISTS instance_subject_prefix;
```

## Files Modified
- `supabase/migrations/00063_add_instance_subject_override.sql`
- `src/types/database.ts`
- `src/components/calendar/instance-edit-dialog.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`
