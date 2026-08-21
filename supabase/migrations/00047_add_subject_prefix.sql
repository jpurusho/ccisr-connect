-- Add subject_prefix column to composed_instances
-- This persists the prefix (e.g., "Reminder", "Final Notice") separately from base subject

ALTER TABLE composed_instances
ADD COLUMN subject_prefix text NULL;

COMMENT ON COLUMN composed_instances.subject_prefix IS 'Optional prefix for email subject (e.g., Reminder, Final Notice). Layered at send time: finalSubject = prefix + subject';
