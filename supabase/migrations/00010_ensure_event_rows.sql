-- Ensure an events row exists for each event type that needs recurrence
-- Only inserts if no active event exists for that type

INSERT INTO events (event_type_id, title, recurrence_rule, default_time, is_active)
SELECT et.id, 'Wednesday Women''s Bible Study', 'FREQ=WEEKLY;BYDAY=WE', '19:00', true
FROM event_types et
WHERE et.name = 'wednesday_womens_study'
  AND NOT EXISTS (SELECT 1 FROM events e WHERE e.event_type_id = et.id AND e.is_active = true);

INSERT INTO events (event_type_id, title, recurrence_rule, default_time, is_active)
SELECT et.id, 'Monthly Prayer Meeting', 'FREQ=MONTHLY;BYDAY=1SA', '18:00', true
FROM event_types et
WHERE et.name = 'monthly_prayer'
  AND NOT EXISTS (SELECT 1 FROM events e WHERE e.event_type_id = et.id AND e.is_active = true);

-- Also ensure bible study has recurrence_rule if it was missed
UPDATE events
SET recurrence_rule = 'FREQ=WEEKLY;BYDAY=FR'
WHERE recurrence_rule IS NULL
  AND event_type_id IN (SELECT id FROM event_types WHERE name = 'friday_bible_study');
