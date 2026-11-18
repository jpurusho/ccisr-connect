-- Migration: Add subject override fields to event_instances
-- Allows per-instance email subject customization without affecting the event series

ALTER TABLE event_instances
  ADD COLUMN instance_subject text,
  ADD COLUMN instance_subject_prefix text;

COMMENT ON COLUMN event_instances.instance_subject IS
  'Optional subject override for this specific instance. If set, overrides the template subject for emails about this occurrence.';

COMMENT ON COLUMN event_instances.instance_subject_prefix IS
  'Optional subject prefix override (e.g., "REMINDER", "FINAL NOTICE") for this instance.';
