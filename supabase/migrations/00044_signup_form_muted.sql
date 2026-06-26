-- Add muted field to signup_forms
-- When true, the form is visible but all interactions are disabled (submit, select, delete)

ALTER TABLE signup_forms
ADD COLUMN muted BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN signup_forms.muted IS 'When true, form is visible but all interactions are disabled';
