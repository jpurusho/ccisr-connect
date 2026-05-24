-- Add bulletin_detail_template to event_types
-- This allows per-event-type customization of how events appear in the bulletin.
-- Supports interpolation vars: {{date}}, {{time}}, {{topic}}, {{host}}, {{location}}, {{zoom}}
-- Example: "{{topic}} — {{date}} at {{time}} via Zoom"
-- If NULL, defaults to "{{date}} at {{time}}"

ALTER TABLE event_types ADD COLUMN IF NOT EXISTS bulletin_detail_template text;

-- Also add description to the events select (already exists on table, just documenting)
COMMENT ON COLUMN event_types.bulletin_detail_template IS 'Template for bulletin event details. Vars: {{date}}, {{time}}, {{topic}}, {{host}}, {{location}}, {{zoom}}';
