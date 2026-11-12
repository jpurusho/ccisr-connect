-- Migration: Support multiple Bible Study locations
-- Created: 2026-11-11
-- Description: All Bible Study events share comm_type='bible_study' template.
--              Dashboard shows ONE card. When composing, user selects which location/event.

-- Restore comm_type to Mountain House
UPDATE event_types
SET comm_type = 'bible_study'
WHERE name = 'Mountain House Bible Study'
  AND comm_type IS NULL;

-- Set display orders to indicate which is "primary" for dashboard settings
-- (Lowest display_order controls the dashboard card's visibility toggle)
UPDATE event_types SET display_order = 40 WHERE name = 'Family Bible Study';
UPDATE event_types SET display_order = 41 WHERE name = 'Mountain House Bible Study';

-- When user adds 3rd location, just insert with higher display_order:
-- INSERT INTO event_types (name, comm_type, display_order, show_in_dashboard)
-- VALUES ('Location 3 Bible Study', 'bible_study', 42, true);

-- Verify setup
DO $$
DECLARE
  bible_study_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO bible_study_count
  FROM event_types
  WHERE comm_type = 'bible_study';

  RAISE NOTICE '✓ Bible Study event_types: %', bible_study_count;
  RAISE NOTICE 'Dashboard will show ONE "Bible Study" card';
  RAISE NOTICE 'When composing, user selects which location/event to use';
END $$;

-- Update comment to explain the pattern
COMMENT ON COLUMN event_types.comm_type IS
  'Template type for dashboard. Multiple events with same comm_type share one dashboard card. Dashboard shows the template card; when composing email, user selects which specific event (location/schedule) to use.';
