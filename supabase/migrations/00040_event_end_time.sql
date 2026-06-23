-- Add end time support for events and event instances
-- Enables displaying time ranges like "6:00 PM - 8:00 PM" in bulletins

-- Add default_end_time to events table (series-level end time)
ALTER TABLE events ADD COLUMN default_end_time time DEFAULT NULL;

COMMENT ON COLUMN events.default_end_time IS 'Default end time for all occurrences of this event. NULL = no end time specified.';

-- Add instance_end_time to event_instances table (instance-level override)
ALTER TABLE event_instances ADD COLUMN instance_end_time time DEFAULT NULL;

COMMENT ON COLUMN event_instances.instance_end_time IS 'End time for this specific instance. Overrides event default_end_time. NULL = use event default or no end time.';
