-- Migration: Scalable multi-location architecture
-- Created: 2026-11-11
-- Description: True scalability - multiple event_types share the same template.
--              Dashboard keyed by event_type.id, not comm_type.
--              Adding a 3rd location = just INSERT, no code changes needed.

-- Both Bible Study locations use the same template
UPDATE event_types
SET comm_type = 'bible_study'
WHERE name IN ('Family Bible Study', 'Mountain House Bible Study');

-- Verify
DO $$
DECLARE
  bs_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO bs_count
  FROM event_types
  WHERE comm_type = 'bible_study' AND show_in_dashboard = true;

  RAISE NOTICE '✓ Bible Study locations sharing template: %', bs_count;
  RAISE NOTICE 'Dashboard will show % separate cards (one per event_type)', bs_count;
  RAISE NOTICE 'All use the same form/builder from template registry';
END $$;

-- Architecture:
-- ✓ Templates defined once in registry (bible_study, prayer_meeting, etc.)
-- ✓ Multiple event_types reference the same template via comm_type
-- ✓ Dashboard state keyed by event_type.id (unlimited scalability)
-- ✓ Adding locations = database INSERT only, no code changes

-- Example: Add 3rd Bible Study location
-- INSERT INTO event_types (name, comm_type, display_order, show_in_dashboard)
-- VALUES ('Downtown Bible Study', 'bible_study', 42, true);
-- That's it - no code changes needed!
