-- App-wide settings (key-value store for API keys, preferences, etc.)
CREATE TABLE app_settings (
    key         text PRIMARY KEY,
    value       text,
    updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_settings_admin ON app_settings
    FOR ALL USING (get_user_role() IN ('super_admin', 'admin'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin'));

-- Seed the ESV API key
INSERT INTO app_settings (key, value) VALUES ('esv_api_key', '268ce61e1bd8de2663e580630ea42225b5d46348');
