-- Add is_active flag to email_templates for seasonal card visibility
-- Inactive templates won't appear as dashboard cards.
ALTER TABLE email_templates ADD COLUMN is_active boolean NOT NULL DEFAULT true;
