-- Add date range support for fixed-date events (VBS, picnics, outreach, etc.)
ALTER TABLE events ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_date date;
