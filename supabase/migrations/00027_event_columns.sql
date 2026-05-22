-- =============================================================================
-- Add operational columns to events table
-- Fields previously buried in email_templates.body_template JSON
-- =============================================================================

ALTER TABLE events ADD COLUMN IF NOT EXISTS topic text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS dinner_note text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS signup_link text;
