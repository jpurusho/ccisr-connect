-- Add hidden_custom_items field to signup_forms to track dismissed custom items
-- This prevents custom items from reappearing after being explicitly removed by admins

ALTER TABLE signup_forms
ADD COLUMN IF NOT EXISTS hidden_custom_items JSONB DEFAULT '{}';

COMMENT ON COLUMN signup_forms.hidden_custom_items IS 'Map of field_id to array of custom item values that have been explicitly hidden by admins';
