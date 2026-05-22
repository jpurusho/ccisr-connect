-- =============================================================================
-- Event Locations — first-class multi-location support
-- Replaces locations[] JSON array in email_templates.body_template
-- =============================================================================

CREATE TABLE event_locations (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    label           text NOT NULL,
    sort_order      int NOT NULL DEFAULT 0,
    is_active       boolean NOT NULL DEFAULT true,
    host_family_id  uuid REFERENCES families(id) ON DELETE SET NULL,
    host_until      date,
    address         text,
    city            text,
    phone           text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_event_locations_updated_at
    BEFORE UPDATE ON event_locations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_event_locations_event ON event_locations(event_id, sort_order);

ALTER TABLE event_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_locations_admin_all ON event_locations
    FOR ALL
    USING (get_user_role() IN ('super_admin', 'admin'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin'));

CREATE POLICY event_locations_operator_select ON event_locations
    FOR SELECT
    USING (get_user_role() = 'operator');

CREATE POLICY event_locations_operator_insert ON event_locations
    FOR INSERT
    WITH CHECK (get_user_role() = 'operator');

CREATE POLICY event_locations_operator_update ON event_locations
    FOR UPDATE
    USING (get_user_role() = 'operator')
    WITH CHECK (get_user_role() = 'operator');
