-- Migration: Make Mountain House Bible Study independent from template
-- Created: 2026-11-11
-- Description: User wants these as separate independent events, not sharing a template.
--              Mountain House becomes a standalone event (no comm_type = no dashboard card)

-- Remove comm_type from Mountain House Bible Study
UPDATE event_types
SET comm_type = NULL
WHERE name = 'Mountain House Bible Study';

-- Verify the change
DO $$
DECLARE
  mh_comm_type TEXT;
  family_comm_type TEXT;
BEGIN
  SELECT comm_type INTO mh_comm_type
  FROM event_types
  WHERE name = 'Mountain House Bible Study';

  SELECT comm_type INTO family_comm_type
  FROM event_types
  WHERE name = 'Family Bible Study';

  RAISE NOTICE 'Mountain House Bible Study comm_type: %', COALESCE(mh_comm_type, 'NULL');
  RAISE NOTICE 'Family Bible Study comm_type: %', COALESCE(family_comm_type, 'NULL');

  IF mh_comm_type IS NULL AND family_comm_type = 'bible_study' THEN
    RAISE NOTICE '✓ Correct: Mountain House is standalone, Family is the template';
  END IF;
END $$;

-- Comment explaining the design
COMMENT ON COLUMN event_types.comm_type IS
  'Template type for dashboard cards. Multiple events can share the same comm_type to use the same template. Events with comm_type=NULL are standalone (schedule/location only, no dashboard template card).';
