-- Migration: Make Mountain House Bible Study a separate template
-- Created: 2026-11-11
-- Description: User wants each location as a separate dashboard card.
--              Mountain House gets its own comm_type and will appear as separate card.

-- Give Mountain House its own template type
UPDATE event_types
SET comm_type = 'mountain_house_bible_study',
    display_order = 45,
    show_in_dashboard = true
WHERE name = 'Mountain House Bible Study';

-- Family Bible Study keeps comm_type='bible_study', display_order=40

-- Verify
DO $$
DECLARE
  family_type TEXT;
  mh_type TEXT;
BEGIN
  SELECT comm_type INTO family_type FROM event_types WHERE name = 'Family Bible Study';
  SELECT comm_type INTO mh_type FROM event_types WHERE name = 'Mountain House Bible Study';

  RAISE NOTICE 'Family Bible Study comm_type: %', family_type;
  RAISE NOTICE 'Mountain House Bible Study comm_type: %', mh_type;
  RAISE NOTICE '✓ Both will appear as separate dashboard cards';
END $$;

-- Future: When adding 3rd location, create with unique comm_type:
-- INSERT INTO event_types (name, comm_type, display_order, show_in_dashboard)
-- VALUES ('Location 3 Bible Study', 'location3_bible_study', 46, true);
-- Then register in template registry with its own form.
