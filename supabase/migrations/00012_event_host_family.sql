-- Add default host family with expiration to events (generic, any recurring event)
ALTER TABLE events ADD COLUMN IF NOT EXISTS host_family_id uuid REFERENCES families(id) ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS host_until date;
