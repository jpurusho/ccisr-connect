-- =============================================================================
-- Event Virtual Config — Zoom/virtual meeting details
-- Replaces zoomLink/zoomMeetingId/zoomPasscode in template JSON
-- =============================================================================

CREATE TABLE event_virtual_config (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        uuid NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
    platform        text NOT NULL DEFAULT 'zoom',
    meeting_link    text NOT NULL,
    meeting_id      text,
    passcode        text,
    is_active       boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_event_virtual_config_updated_at
    BEFORE UPDATE ON event_virtual_config
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE event_virtual_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_virtual_config_admin_all ON event_virtual_config
    FOR ALL
    USING (get_user_role() IN ('super_admin', 'admin'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin'));

CREATE POLICY event_virtual_config_operator_select ON event_virtual_config
    FOR SELECT
    USING (get_user_role() = 'operator');

CREATE POLICY event_virtual_config_operator_update ON event_virtual_config
    FOR UPDATE
    USING (get_user_role() = 'operator')
    WITH CHECK (get_user_role() = 'operator');
