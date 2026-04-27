-- =============================================================================
-- Add week awareness + recurrence to composed_instances
-- =============================================================================

-- week_start: the Sunday date this instance targets (NULL = legacy/global)
-- is_recurring: if true, this instance repeats weekly
-- recur_until: last Sunday date for recurrence (NULL = no end)
ALTER TABLE composed_instances
  ADD COLUMN week_start  date,
  ADD COLUMN is_recurring boolean NOT NULL DEFAULT false,
  ADD COLUMN recur_until  date;

CREATE INDEX idx_composed_instances_week ON composed_instances(week_start);
CREATE INDEX idx_composed_instances_recurring ON composed_instances(is_recurring) WHERE is_recurring = true;
