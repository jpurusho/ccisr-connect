-- Populate recurrence_rule on existing events
-- Bible Study: every Friday (with summer break June-August as example)
UPDATE events
SET recurrence_rule = 'FREQ=WEEKLY;BYDAY=FR'
WHERE title ILIKE '%bible study%'
  AND recurrence_rule IS NULL;

-- Women's Study: every Wednesday
UPDATE events
SET recurrence_rule = 'FREQ=WEEKLY;BYDAY=WE'
WHERE title ILIKE '%women%study%'
  AND recurrence_rule IS NULL;

-- Prayer Meeting: first Saturday of each month
UPDATE events
SET recurrence_rule = 'FREQ=MONTHLY;BYDAY=1SA'
WHERE title ILIKE '%prayer%'
  AND recurrence_rule IS NULL;
