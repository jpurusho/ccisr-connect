-- Add info sections (custom metadata) to event types
-- Stores CustomSection[] JSON: [{title, emoji, color?, entries: [{label, name}]}]
ALTER TABLE event_types ADD COLUMN IF NOT EXISTS info_sections jsonb;
