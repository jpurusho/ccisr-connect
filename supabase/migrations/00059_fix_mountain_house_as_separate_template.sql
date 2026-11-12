-- Migration: Re-apply Mountain House as separate template
-- Created: 2026-11-11
-- Description: Migration 00057 was reverted by a duplicate 00058. Re-applying the correct approach.
--              User chose Option B: each location as separate independent card.

-- Give Mountain House its own template type (re-applying 00057's change)
UPDATE event_types
SET comm_type = 'mountain_house_bible_study',
    display_order = 45,
    show_in_dashboard = true
WHERE name = 'Mountain House Bible Study';

-- Family Bible Study keeps comm_type='bible_study'
UPDATE event_types
SET comm_type = 'bible_study',
    display_order = 40,
    show_in_dashboard = true
WHERE name = 'Family Bible Study';

-- Verify
DO $$
DECLARE
  family_ct TEXT;
  mh_ct TEXT;
BEGIN
  SELECT comm_type INTO family_ct FROM event_types WHERE name = 'Family Bible Study';
  SELECT comm_type INTO mh_ct FROM event_types WHERE name = 'Mountain House Bible Study';

  RAISE NOTICE 'Family Bible Study: %', family_ct;
  RAISE NOTICE 'Mountain House Bible Study: %', mh_ct;

  IF family_ct = 'bible_study' AND mh_ct = 'mountain_house_bible_study' THEN
    RAISE NOTICE '✓ Both locations appear as separate dashboard cards';
  END IF;
END $$;

-- Architecture note:
-- This pattern works for ANY template type with multiple locations:
--   - prayer_meeting → location2_prayer_meeting, location3_prayer_meeting
--   - womens_study → location2_womens_study
--   - birthday → kids_birthday, adults_birthday
-- Each reuses the same form/builder/defaults but appears as independent card.
