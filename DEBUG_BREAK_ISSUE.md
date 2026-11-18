# San Ramon Bible Study Break Issue Investigation

## Problem
San Ramon Bible Study scheduled break keeps getting dropped. User has to manually set it back multiple times.

## Architecture
```sql
CREATE TABLE event_breaks (
    id              uuid PRIMARY KEY,
    event_id        uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    location_id     uuid REFERENCES event_locations(id) ON DELETE CASCADE,
    start_date      date NOT NULL,
    end_date        date NOT NULL,
    message         text,
    ...
);
```

**KEY:** `ON DELETE CASCADE` means if the parent event is deleted, all breaks are deleted.

## Potential Causes

### 1. Event Being Deleted Accidentally
- Calendar page has `handleDeleteEvent()` at line 631
- Deletes event: `await supabase.from("events").delete().eq("id", event.eventId)`
- This CASCADE deletes all breaks for that event

**Check:** Are you accidentally clicking "Delete Event" instead of something else?

### 2. Multiple Events for Bible Study
- There might be separate events for:
  - San Ramon Bible Study
  - Mountain House Bible Study
- Setting break on wrong event would not affect the other

**Check:** Do you have 2 separate Bible Study events in /settings/event-types?

### 3. Event Type vs Event Confusion
- `event_types` table (template types like "bible_study")
- `events` table (specific recurring instances with locations)
- Break is attached to `events.id`, not event_type

**Check:** Are breaks being added to event_type instead of event?

### 4. Migration or Code Issue
- No code found that automatically deletes/recreates events
- No scheduled jobs that clean up breaks
- Breaks should persist unless:
  - Event is deleted
  - Break is manually deleted
  - Database rollback/restore

## Debugging Steps

### Step 1: Check Current State
```sql
-- In Supabase SQL Editor:

-- 1. Find San Ramon Bible Study event
SELECT id, event_type_id, name, recurrence_rule 
FROM events 
WHERE name ILIKE '%san ramon%' OR name ILIKE '%bible study%';

-- 2. Check if breaks exist for that event
SELECT eb.*, e.name as event_name
FROM event_breaks eb
JOIN events e ON eb.event_id = e.id
WHERE e.name ILIKE '%san ramon%' OR e.name ILIKE '%bible study%';

-- 3. Check audit log for deletions
SELECT * FROM audit_log 
WHERE table_name IN ('events', 'event_breaks')
  AND action IN ('event_deleted', 'break_deleted')
ORDER BY created_at DESC
LIMIT 20;
```

### Step 2: Test Break Persistence
1. Add break to San Ramon Bible Study in Calendar
2. Note the break ID and event ID
3. Wait 5 minutes
4. Check if break still exists:
   ```sql
   SELECT * FROM event_breaks WHERE id = '<break-id>';
   ```
5. Check audit log for any deletions:
   ```sql
   SELECT * FROM audit_log WHERE entity_id = '<break-id>' OR entity_id = '<event-id>';
   ```

### Step 3: Check for Duplicate Events
```sql
-- Find all Bible Study events
SELECT 
  e.id,
  e.name,
  et.name as event_type_name,
  COUNT(eb.id) as break_count
FROM events e
LEFT JOIN event_types et ON e.event_type_id = et.id
LEFT JOIN event_breaks eb ON eb.event_id = e.id
WHERE et.name ILIKE '%bible%' OR e.name ILIKE '%bible%'
GROUP BY e.id, e.name, et.name;
```

## Quick Fix Workaround

Until we find root cause, you can:

1. **Set break in Calendar page** (not dashboard)
2. **Double-check event name** matches exactly
3. **Take screenshot** of break settings for reference
4. **Check audit log** after it disappears to see what deleted it

## Monitoring

Add this query to check break status:
```sql
-- Run this daily
SELECT 
  e.name as event_name,
  eb.start_date,
  eb.end_date,
  eb.message,
  eb.created_at
FROM event_breaks eb
JOIN events e ON eb.event_id = e.id
WHERE e.name ILIKE '%san ramon%'
  AND eb.end_date >= CURRENT_DATE
ORDER BY eb.start_date;
```

## Next Steps for User

1. Check Settings → Event Types - how many Bible Study event types exist?
2. Check Calendar - how many "Bible Study" events appear?
3. After setting break, note the exact time
4. Check back in 1 hour - is it still there?
5. If gone, check audit log for what happened

I'll investigate the code more deeply, but need to know:
- **When** does the break disappear? (immediately? next day? after refresh?)
- **How** are you setting the break? (Calendar page? Edit Date dialog?)
- **What** happens when you refresh - does it come back or stay gone?
