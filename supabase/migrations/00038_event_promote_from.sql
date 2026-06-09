-- Add promote_from date to events for bulletin "Upcoming Events" promotion
-- When set, the event appears in weekly bulletins' Upcoming section starting
-- from this date until the event instance passes.
ALTER TABLE events ADD COLUMN promote_from date DEFAULT NULL;

COMMENT ON COLUMN events.promote_from IS 'Date from which this event should appear in bulletin Upcoming Events section. NULL = never promote ahead.';
