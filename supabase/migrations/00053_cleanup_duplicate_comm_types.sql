-- Migration: Clean up duplicate comm_type entries properly
-- Created: 2026-11-11
-- Description: Removes all duplicate event_types rows, keeping the best one

-- Step 1: Log what we're about to delete
DO $$
DECLARE
  duplicate_record RECORD;
BEGIN
  RAISE NOTICE '=== Duplicate comm_type cleanup ===';
  FOR duplicate_record IN
    WITH ranked AS (
      SELECT
        id,
        comm_type,
        name,
        show_in_dashboard,
        display_order,
        ROW_NUMBER() OVER (PARTITION BY comm_type ORDER BY id::text) as rn
      FROM event_types
      WHERE comm_type IS NOT NULL
    )
    SELECT * FROM ranked WHERE rn > 1
  LOOP
    RAISE NOTICE 'Deleting: id=%, comm_type=%, name=%', duplicate_record.id, duplicate_record.comm_type, duplicate_record.name;
  END LOOP;
END $$;

-- Step 2: Delete duplicates, keeping the first one (by id text sort)
WITH ranked AS (
  SELECT
    id,
    comm_type,
    ROW_NUMBER() OVER (PARTITION BY comm_type ORDER BY id::text) as rn
  FROM event_types
  WHERE comm_type IS NOT NULL
)
DELETE FROM event_types
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);

-- Step 3: Drop existing constraint if it exists (from failed previous migration)
ALTER TABLE event_types DROP CONSTRAINT IF EXISTS event_types_comm_type_unique;

-- Step 4: Add unique constraint
ALTER TABLE event_types ADD CONSTRAINT event_types_comm_type_unique UNIQUE (comm_type);

-- Step 5: Verify no duplicates remain
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT comm_type, COUNT(*) as ct
    FROM event_types
    WHERE comm_type IS NOT NULL
    GROUP BY comm_type
    HAVING COUNT(*) > 1
  ) dupes;

  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Still have % duplicate comm_type values after cleanup!', duplicate_count;
  ELSE
    RAISE NOTICE '✓ Cleanup successful: no duplicates remain';
  END IF;
END $$;
