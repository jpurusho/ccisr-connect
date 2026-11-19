-- =============================================================================
-- Debugging Queries for San Ramon Bible Study Break Issue
-- Run these in Supabase SQL Editor
-- =============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- QUERY 1: Check how many Bible Study events exist
-- ────────────────────────────────────────────────────────────────────────────
SELECT
  e.id,
  e.title,
  e.recurrence_rule,
  et.name as event_type_name,
  e.created_at,
  COUNT(eb.id) as active_breaks
FROM events e
LEFT JOIN event_types et ON e.event_type_id = et.id
LEFT JOIN event_breaks eb ON eb.event_id = e.id AND eb.end_date >= CURRENT_DATE
WHERE e.title ILIKE '%bible%study%'
   OR et.name ILIKE '%bible%study%'
GROUP BY e.id, e.title, e.recurrence_rule, et.name, e.created_at
ORDER BY e.title;

-- Expected: Should see 2 rows (San Ramon + Mountain House)
-- If you see more, you might have duplicate events

-- ────────────────────────────────────────────────────────────────────────────
-- QUERY 2: Check all breaks for Bible Study events
-- ────────────────────────────────────────────────────────────────────────────
SELECT
  e.title as event_title,
  eb.id as break_id,
  eb.start_date,
  eb.end_date,
  eb.message,
  eb.created_at as break_created,
  CASE
    WHEN eb.end_date < CURRENT_DATE THEN 'Past'
    WHEN eb.start_date <= CURRENT_DATE AND eb.end_date >= CURRENT_DATE THEN 'Active'
    WHEN eb.start_date > CURRENT_DATE THEN 'Future'
  END as status
FROM event_breaks eb
JOIN events e ON eb.event_id = e.id
WHERE e.title ILIKE '%bible%study%'
ORDER BY eb.start_date DESC;

-- Expected: Should see your San Ramon break here
-- If missing, it was deleted

-- ────────────────────────────────────────────────────────────────────────────
-- QUERY 3: Check audit log for recent deletions
-- ────────────────────────────────────────────────────────────────────────────
SELECT
  created_at,
  action,
  table_name,
  entity_id,
  user_id,
  changes
FROM audit_log
WHERE table_name IN ('events', 'event_breaks')
  AND action LIKE '%delet%'
  AND created_at > CURRENT_DATE - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 30;

-- Look for:
-- - action = 'event_deleted' (event was deleted)
-- - action = 'break_deleted' (break was manually deleted)
-- - Check the entity_id to see if it matches your event/break

-- ────────────────────────────────────────────────────────────────────────────
-- QUERY 4: Check specific event (replace with your event ID)
-- ────────────────────────────────────────────────────────────────────────────
-- First, get the event ID for San Ramon Bible Study:
SELECT id, title FROM events WHERE title ILIKE '%san ramon%bible%';

-- Then check its breaks (replace <EVENT_ID> with the actual ID):
-- SELECT * FROM event_breaks WHERE event_id = '<EVENT_ID>';

-- ────────────────────────────────────────────────────────────────────────────
-- QUERY 5: Check for orphaned breaks (breaks without events)
-- ────────────────────────────────────────────────────────────────────────────
SELECT
  eb.id,
  eb.event_id,
  eb.start_date,
  eb.end_date,
  eb.message,
  'ORPHANED - Event deleted' as status
FROM event_breaks eb
LEFT JOIN events e ON eb.event_id = e.id
WHERE e.id IS NULL;

-- If you see rows here, it means breaks were created but the event was deleted
-- This shouldn't happen because of CASCADE DELETE, but worth checking

-- ────────────────────────────────────────────────────────────────────────────
-- QUERY 6: Timeline of events for a specific event
-- ────────────────────────────────────────────────────────────────────────────
-- Replace <EVENT_ID> with your San Ramon Bible Study event ID:
/*
SELECT
  created_at,
  action,
  table_name,
  changes
FROM audit_log
WHERE (entity_id = '<EVENT_ID>' OR changes::text LIKE '%<EVENT_ID>%')
ORDER BY created_at DESC;
*/

-- ────────────────────────────────────────────────────────────────────────────
-- MONITORING QUERY: Run this daily to track break status
-- ────────────────────────────────────────────────────────────────────────────
SELECT
  CURRENT_TIMESTAMP as checked_at,
  e.title as event_title,
  COUNT(eb.id) FILTER (WHERE eb.end_date >= CURRENT_DATE) as active_breaks,
  COUNT(eb.id) FILTER (WHERE eb.end_date < CURRENT_DATE) as past_breaks,
  MAX(eb.end_date) FILTER (WHERE eb.end_date >= CURRENT_DATE) as latest_break_end
FROM events e
LEFT JOIN event_breaks eb ON eb.event_id = e.id
WHERE e.title ILIKE '%bible%study%'
GROUP BY e.id, e.title;

-- ────────────────────────────────────────────────────────────────────────────
-- DIAGNOSTIC: Check CASCADE DELETE is working
-- ────────────────────────────────────────────────────────────────────────────
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'event_breaks'
  AND tc.constraint_type = 'FOREIGN KEY';

-- Should show:
-- - event_id references events(id) with DELETE RULE = 'CASCADE'

-- =============================================================================
-- WHAT TO LOOK FOR:
-- =============================================================================
--
-- 1. Multiple events with same name → Setting break on wrong one
-- 2. Missing breaks in Query 2 → They were deleted
-- 3. 'event_deleted' in audit log → Someone deleted the event (breaks cascade deleted)
-- 4. 'break_deleted' in audit log → Someone manually deleted the break
-- 5. No audit log entries → Break was never saved, or RLS preventing logging
--
-- =============================================================================
