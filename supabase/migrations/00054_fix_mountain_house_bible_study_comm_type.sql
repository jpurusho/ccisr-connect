-- Migration: Remove comm_type from Mountain House Bible Study
-- Created: 2026-11-11
-- Description: Mountain House Bible Study is a specific event, not a template type.
--              Only "Family Bible Study" should have comm_type='bible_study'

-- Update Mountain House Bible Study to remove comm_type
UPDATE event_types
SET comm_type = NULL
WHERE name = 'Mountain House Bible Study'
  AND comm_type = 'bible_study';

-- Log what we did
DO $$
DECLARE
  affected_rows INTEGER;
BEGIN
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows > 0 THEN
    RAISE NOTICE 'Removed comm_type from Mountain House Bible Study';
  ELSE
    RAISE NOTICE 'No changes needed (Mountain House Bible Study already has comm_type=NULL)';
  END IF;
END $$;

-- Verify: Should now have only ONE bible_study template
DO $$
DECLARE
  bible_study_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO bible_study_count
  FROM event_types
  WHERE comm_type = 'bible_study';

  IF bible_study_count = 1 THEN
    RAISE NOTICE '✓ Correct: exactly 1 event_type has comm_type=bible_study';
  ELSIF bible_study_count = 0 THEN
    RAISE WARNING '⚠ No event_type has comm_type=bible_study';
  ELSE
    RAISE EXCEPTION '❌ Still have % event_types with comm_type=bible_study', bible_study_count;
  END IF;
END $$;
