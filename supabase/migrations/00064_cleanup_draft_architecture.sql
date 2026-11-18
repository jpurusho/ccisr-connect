-- Migration: Clean up draft/instance architecture separation
-- Date: 2026-11-18
-- Purpose: Mark deprecated fields and optimize instance subject lookups

-- Add documentation to tables clarifying purpose
COMMENT ON TABLE composed_instances IS
  'Week-specific presentation customizations (colors, styling, custom messages).
   Operational data (host, time, subject) should come from event_instances, not here.
   Draft data is ephemeral and week-bound, operational data is persistent and date-bound.';

COMMENT ON TABLE event_instances IS
  'Date-specific operational overrides (host, time, location, subject).
   This is the source of truth for what happens on a specific date.
   Editable via Calendar Edit Date dialog.';

-- Mark deprecated fields in composed_instances.data JSONB
-- These fields should no longer be written by the application:
--   - hostNames (use instance.host_family_id + signup auto-fill instead)
--   - address (resolve from host_family_id)
--   - subject (use instance.instance_subject instead)
--
-- We're NOT dropping them yet for backwards compatibility,
-- but future code should not write these fields.

COMMENT ON COLUMN composed_instances.data IS
  'Week-specific presentation data.

   VALID FIELDS (actively used):
   - messageBgColor, footerBgColor, primaryColor, cardColor
   - message, footerVerse, footerMessage
   - theme, templateVariant
   - Any custom content/styling

   DEPRECATED FIELDS (should not be written):
   - hostNames → Use event_instances.host_family_id + signup auto-fill
   - address → Resolve from host_family_id at compose time
   - subject → Use event_instances.instance_subject

   Dashboard "Edit" mode should ONLY save presentation fields.
   Operational data should be saved via Calendar "Edit Date" to event_instances.';

-- Add index for faster instance subject lookups
-- This optimizes the Dashboard loading when resolving subjects from instances
CREATE INDEX IF NOT EXISTS idx_event_instances_subject_lookup
  ON event_instances(event_id, instance_date)
  WHERE instance_subject IS NOT NULL;

-- Add index for instance operational data lookups
CREATE INDEX IF NOT EXISTS idx_event_instances_operational
  ON event_instances(event_id, instance_date, host_family_id);

-- Verify the instance subject columns exist (should from migration 00063)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'event_instances'
    AND column_name = 'instance_subject'
  ) THEN
    RAISE EXCEPTION 'instance_subject column missing - run migration 00063 first';
  END IF;
END $$;
