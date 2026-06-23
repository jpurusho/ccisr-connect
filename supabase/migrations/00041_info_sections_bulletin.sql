-- Add bulletin display control for event type info sections
-- and instance-level info section overrides

-- Add checkbox to event_types to control bulletin display
ALTER TABLE event_types ADD COLUMN show_info_in_bulletin boolean DEFAULT false;

COMMENT ON COLUMN event_types.show_info_in_bulletin IS 'Whether to include info_sections in bulletin details. Default false.';

-- Add info_sections to event_instances for overrides
ALTER TABLE event_instances ADD COLUMN info_sections jsonb DEFAULT NULL;

COMMENT ON COLUMN event_instances.info_sections IS 'Override event type info_sections for this specific instance. NULL = use event type default.';
