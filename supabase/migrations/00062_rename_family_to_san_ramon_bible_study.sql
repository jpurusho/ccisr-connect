-- Migration: Rename Family Bible Study to San Ramon Bible Study
-- Created: 2026-11-12
-- Description: Keep naming consistent - both Bible Study locations named by city

UPDATE event_types
SET name = 'San Ramon Bible Study'
WHERE name = 'Family Bible Study';

-- Verify
DO $$
DECLARE
  sr_name TEXT;
  mh_name TEXT;
BEGIN
  SELECT name INTO sr_name FROM event_types WHERE comm_type = 'bible_study' ORDER BY display_order ASC LIMIT 1;
  SELECT name INTO mh_name FROM event_types WHERE comm_type = 'bible_study' ORDER BY display_order DESC LIMIT 1;

  RAISE NOTICE '✓ Bible Study locations renamed for consistency:';
  RAISE NOTICE '  - %', sr_name;
  RAISE NOTICE '  - %', mh_name;
END $$;
