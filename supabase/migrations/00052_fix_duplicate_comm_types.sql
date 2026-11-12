-- Migration: Fix duplicate comm_type entries and add unique constraint
-- Created: 2026-11-11
-- Description: Removes duplicate event_types rows and ensures comm_type is unique

-- First, identify and keep only the first occurrence of each comm_type
-- Delete duplicates (keep the first one found, delete the rest)
WITH ranked AS (
  SELECT id, comm_type,
    ROW_NUMBER() OVER (PARTITION BY comm_type ORDER BY id::text) as rn
  FROM event_types
  WHERE comm_type IS NOT NULL
)
DELETE FROM event_types
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE event_types ADD CONSTRAINT event_types_comm_type_unique UNIQUE (comm_type);

-- Log the fix
COMMENT ON CONSTRAINT event_types_comm_type_unique ON event_types IS
  'Ensures each comm_type value appears only once in event_types table';
