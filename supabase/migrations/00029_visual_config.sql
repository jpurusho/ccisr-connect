-- =============================================================================
-- Visual Config — visual-only template config column
-- Separates styling (JSONB) from operational data (now in proper tables)
-- body_template preserved for rollback; new code reads visual_config
-- =============================================================================

ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS visual_config jsonb DEFAULT '{}';

COMMENT ON COLUMN email_templates.visual_config IS
    'Visual-only template config: message, colors, emoji, headerTitle, footerVerse, resourceLinks, customSections. No operational data.';

COMMENT ON COLUMN email_templates.body_template IS
    'DEPRECATED: operational data migrated to event_locations, event_breaks, event_virtual_config. Preserved for rollback.';
