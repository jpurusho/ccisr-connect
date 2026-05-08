-- Toggle visibility of signed-up responses on the public form
ALTER TABLE signup_forms ADD COLUMN IF NOT EXISTS show_responses boolean NOT NULL DEFAULT true;
