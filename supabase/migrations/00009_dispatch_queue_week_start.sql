-- Track which week a dispatch belongs to (the week of the content, not when it was created)
ALTER TABLE dispatch_queue ADD COLUMN IF NOT EXISTS week_start date;
CREATE INDEX IF NOT EXISTS idx_dispatch_queue_week_start ON dispatch_queue (week_start) WHERE week_start IS NOT NULL;
