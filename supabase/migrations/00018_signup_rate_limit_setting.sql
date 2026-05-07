-- Per-form rate limit (submissions per IP per hour)
ALTER TABLE signup_forms ADD COLUMN IF NOT EXISTS rate_limit_per_hour int DEFAULT 10;
