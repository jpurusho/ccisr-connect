-- Migration: Restore comm_type and add priority system for templates
-- Created: 2026-11-11
-- Description: Multiple event_types can share the same comm_type (template).
--              Use display_order or default_template_id to determine which one controls visibility.

-- Drop the unique constraint that was incorrectly added
-- (Multiple events can use the same template type)
ALTER TABLE event_types DROP CONSTRAINT IF EXISTS event_types_comm_type_unique;

-- Restore comm_type to Mountain House Bible Study
UPDATE event_types
SET comm_type = 'bible_study'
WHERE name = 'Mountain House Bible Study'
  AND comm_type IS NULL;

-- Set display orders so Family Bible Study is the "primary" template
-- (lower display_order = primary when multiple share comm_type)
UPDATE event_types
SET display_order = 41
WHERE name = 'Mountain House Bible Study'
  AND comm_type = 'bible_study';

-- Family Bible Study remains at display_order = 40 (primary)

-- Verify the setup
DO $$
DECLARE
  bible_study_count INTEGER;
  primary_name TEXT;
BEGIN
  SELECT COUNT(*) INTO bible_study_count
  FROM event_types
  WHERE comm_type = 'bible_study';

  SELECT name INTO primary_name
  FROM event_types
  WHERE comm_type = 'bible_study'
  ORDER BY display_order NULLS LAST
  LIMIT 1;

  RAISE NOTICE 'Bible Study event_types: %', bible_study_count;
  RAISE NOTICE 'Primary (controls dashboard visibility): %', primary_name;

  IF bible_study_count >= 2 AND primary_name = 'Family Bible Study' THEN
    RAISE NOTICE '✓ Correct setup: Multiple bible studies with Family as primary';
  END IF;
END $$;

-- Add comment explaining the pattern
COMMENT ON COLUMN event_types.display_order IS
  'Sort order on dashboard. When multiple event_types share the same comm_type, the one with lowest display_order is the "primary" that controls dashboard visibility.';
