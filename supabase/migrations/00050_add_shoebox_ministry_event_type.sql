-- Migration: Add Shoebox Ministry event type
-- Created: 2026-11-10
-- Description: Adds event type for Operation Christmas Child Shoebox Ministry communications

-- Insert the Shoebox Ministry event type
INSERT INTO event_types (name, comm_type, is_active)
VALUES (
  'Shoebox Ministry',
  'shoebox_ministry',
  true
)
ON CONFLICT (name) DO UPDATE
SET
  comm_type = EXCLUDED.comm_type,
  is_active = EXCLUDED.is_active;

COMMENT ON COLUMN event_types.comm_type IS 'Communication type key used for template routing. Valid values include: birthday, anniversary, bible_study, womens_study, prayer_meeting, bulletin, shoebox_ministry, custom';
