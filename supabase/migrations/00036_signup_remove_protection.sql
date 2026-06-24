-- Add rate limiting and audit trail for user-facing signup removals

CREATE TABLE signup_remove_attempts (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_hash         text NOT NULL,
    form_id         uuid NOT NULL REFERENCES signup_forms(id) ON DELETE CASCADE,
    success         boolean NOT NULL DEFAULT false,
    attempted_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_signup_remove_attempts_lookup ON signup_remove_attempts(ip_hash, form_id, attempted_at DESC);
CREATE INDEX idx_signup_remove_attempts_cleanup ON signup_remove_attempts(attempted_at);

-- RLS
ALTER TABLE signup_remove_attempts ENABLE ROW LEVEL SECURITY;

-- Only admins can view rate limit data
CREATE POLICY signup_remove_attempts_admin ON signup_remove_attempts
    FOR SELECT USING (get_user_role() IN ('super_admin', 'admin'));

-- Cleanup policy: auto-delete attempts older than 7 days (will be handled by cron or manual cleanup)
COMMENT ON TABLE signup_remove_attempts IS 'Rate limiting and abuse detection for public signup removals. Records are kept for 7 days for audit purposes.';
