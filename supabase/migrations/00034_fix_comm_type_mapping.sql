-- Fix comm_type values: original migration matched on old names that have since been renamed.
-- Match by pattern instead to catch renamed event types.

UPDATE event_types SET comm_type = 'bible_study'
WHERE comm_type IS NULL
  AND (name ILIKE '%bible study%' AND name NOT ILIKE '%women%');

UPDATE event_types SET comm_type = 'womens_study'
WHERE comm_type IS NULL
  AND (name ILIKE '%women%' AND name ILIKE '%study%');

UPDATE event_types SET comm_type = 'prayer_meeting'
WHERE comm_type IS NULL
  AND name ILIKE '%prayer%';

UPDATE event_types SET comm_type = 'birthday'
WHERE comm_type IS NULL
  AND name ILIKE '%birthday%';

UPDATE event_types SET comm_type = 'anniversary'
WHERE comm_type IS NULL
  AND name ILIKE '%anniversary%';

UPDATE event_types SET comm_type = 'bulletin'
WHERE comm_type IS NULL
  AND name ILIKE '%bulletin%';
