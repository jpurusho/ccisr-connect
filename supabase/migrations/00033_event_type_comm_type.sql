-- Add comm_type column to event_types
-- This is the internal routing key that maps an event type to its dashboard card.
-- Decouples the display name from the code path — renaming event types is now safe.
-- Only built-in types get a comm_type; custom types use their template link instead.

ALTER TABLE event_types ADD COLUMN IF NOT EXISTS comm_type text;

-- Populate built-in mappings (based on current name conventions)
UPDATE event_types SET comm_type = 'birthday' WHERE name = 'birthday';
UPDATE event_types SET comm_type = 'anniversary' WHERE name = 'anniversary';
UPDATE event_types SET comm_type = 'bible_study' WHERE name = 'friday_bible_study';
UPDATE event_types SET comm_type = 'womens_study' WHERE name = 'wednesday_womens_study';
UPDATE event_types SET comm_type = 'prayer_meeting' WHERE name = 'monthly_prayer';
UPDATE event_types SET comm_type = 'bulletin' WHERE name = 'bulletin';

COMMENT ON COLUMN event_types.comm_type IS 'Internal routing key for dashboard cards. NULL for custom event types (they use default_template_id instead).';
