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

-- ESV API key should be set via Settings → Integrations
INSERT INTO app_settings (key, value) VALUES ('esv_api_key', '');
