-- Link event types to signup forms for auto-filling card data at compose time
ALTER TABLE event_types
  ADD COLUMN IF NOT EXISTS linked_signup_form_id uuid REFERENCES signup_forms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS signup_field_map jsonb;

-- signup_field_map schema:
-- {
--   "match_field": "<signup_field_id for month_picker or date field>",
--   "location_index": 0,  -- which location slot (for multi-location cards like Bible Study)
--   "mappings": [
--     { "signup_field": "<field_id>", "card_field": "host_name" },
--     { "signup_field": "<field_id>", "card_field": "host_address" }
--   ]
-- }
-- card_field values: "host_name", "host_address", "host_city", "host_phone"
