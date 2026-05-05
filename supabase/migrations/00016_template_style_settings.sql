-- Template style settings: font, header style, section layout, footer, dark mode, custom pastels
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS style_settings jsonb DEFAULT '{}';

-- Per-instance style overrides (e.g. accent color override)
ALTER TABLE composed_instances ADD COLUMN IF NOT EXISTS style_overrides jsonb DEFAULT '{}';
