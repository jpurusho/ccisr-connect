-- =============================================================================
-- Composed Instances — persisted working copies of email communications
-- =============================================================================

CREATE TABLE composed_instances (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_type         text NOT NULL,
    name                  text NOT NULL,
    subject               text NOT NULL,
    form_data             jsonb NOT NULL,
    mailing_list_id       uuid REFERENCES mailing_lists(id) ON DELETE SET NULL,
    smtp_config_id        uuid REFERENCES smtp_configs(id) ON DELETE SET NULL,
    additional_recipients text,
    is_active             boolean NOT NULL DEFAULT true,
    created_by            uuid,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_composed_instances_updated_at
    BEFORE UPDATE ON composed_instances
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE composed_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY composed_instances_all ON composed_instances
    FOR ALL
    USING (get_user_role() IN ('super_admin', 'admin', 'operator'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin', 'operator'));

CREATE INDEX idx_composed_instances_type ON composed_instances(template_type);
