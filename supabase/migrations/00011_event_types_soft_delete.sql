-- Add soft delete to event_types so past events retain referential integrity
ALTER TABLE event_types ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
