-- Fix November host issue by setting event-level host to Thangadas family
-- This sets the default host for all Bible Study dates

-- First, find the Thangadas family ID
-- Replace 'Thangadas' with the exact family name in your database
-- SELECT id, family_name FROM families WHERE family_name ILIKE '%thangada%';

-- Then set it as the host for San Ramon Bible Study event
-- Replace '<thangadas_family_id>' with the actual ID from above query
UPDATE events
SET
  host_family_id = '<thangadas_family_id>',
  host_until = '2024-12-31'  -- Set expiration date
WHERE title ILIKE '%San Ramon Bible Study%'
  AND event_type_id IN (
    SELECT id FROM event_types WHERE comm_type = 'bible_study'
  );

-- Verify the change
SELECT
  e.title,
  e.host_family_id,
  e.host_until,
  f.family_name
FROM events e
LEFT JOIN families f ON f.id = e.host_family_id
WHERE e.title ILIKE '%San Ramon Bible Study%';
