-- Signup form enhancements for count selection and explicit close control

-- 1. Add auto_close_date field for explicit control over form closure
ALTER TABLE signup_forms
ADD COLUMN auto_close_date date;

COMMENT ON COLUMN signup_forms.auto_close_date IS 'Optional date to automatically close the form. If NULL, form stays open until manually closed.';

-- 2. Add allow_count_selection field to enable users to select multiple counts of items
ALTER TABLE signup_forms
ADD COLUMN allow_count_selection boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN signup_forms.allow_count_selection IS 'When true, users can claim multiple counts of a single item (e.g., bringing 4 out of 5 available)';

-- 3. Add count data to responses for tracking multi-count claims
-- This will be stored in the data JSONB column with structure: { fieldId: { itemValue: count } }
-- No schema change needed, just documenting the expected structure

COMMENT ON COLUMN signup_responses.data IS 'Form field responses. For claim_select fields with count selection enabled, stores { fieldId: { itemValue: count } } where count is number claimed.';
