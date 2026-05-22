-- =============================================================================
-- Event Instance Locations — per-occurrence, per-location overrides
-- Enables: per-location cancellation, host rotation per location per week
-- =============================================================================

CREATE TABLE event_instance_locations (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id     uuid NOT NULL REFERENCES event_instances(id) ON DELETE CASCADE,
    location_id     uuid NOT NULL REFERENCES event_locations(id) ON DELETE CASCADE,
    host_family_id  uuid REFERENCES families(id) ON DELETE SET NULL,
    address_override text,
    phone_override  text,
    notes           text,
    status          event_instance_status NOT NULL DEFAULT 'confirmed',
    created_at      timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_instance_location UNIQUE(instance_id, location_id)
);

CREATE INDEX idx_instance_locations_instance ON event_instance_locations(instance_id);
CREATE INDEX idx_instance_locations_location ON event_instance_locations(location_id);

ALTER TABLE event_instance_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_instance_locations_admin_all ON event_instance_locations
    FOR ALL
    USING (get_user_role() IN ('super_admin', 'admin'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin'));

CREATE POLICY event_instance_locations_operator_select ON event_instance_locations
    FOR SELECT
    USING (get_user_role() = 'operator');

CREATE POLICY event_instance_locations_operator_insert ON event_instance_locations
    FOR INSERT
    WITH CHECK (get_user_role() = 'operator');

CREATE POLICY event_instance_locations_operator_update ON event_instance_locations
    FOR UPDATE
    USING (get_user_role() = 'operator')
    WITH CHECK (get_user_role() = 'operator');

CREATE POLICY event_instance_locations_operator_delete ON event_instance_locations
    FOR DELETE
    USING (get_user_role() = 'operator');
