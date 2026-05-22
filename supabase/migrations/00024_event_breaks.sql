-- =============================================================================
-- Event Breaks — date-range breaks per event or per location
-- Replaces breaks[] JSON arrays in email_templates.body_template
-- =============================================================================

CREATE TABLE event_breaks (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    location_id     uuid REFERENCES event_locations(id) ON DELETE CASCADE,
    start_date      date NOT NULL,
    end_date        date NOT NULL,
    message         text,
    created_at      timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT chk_break_range CHECK (end_date >= start_date)
);

CREATE INDEX idx_event_breaks_range ON event_breaks(event_id, start_date, end_date);
CREATE INDEX idx_event_breaks_location ON event_breaks(location_id) WHERE location_id IS NOT NULL;

ALTER TABLE event_breaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_breaks_admin_all ON event_breaks
    FOR ALL
    USING (get_user_role() IN ('super_admin', 'admin'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin'));

CREATE POLICY event_breaks_operator_select ON event_breaks
    FOR SELECT
    USING (get_user_role() = 'operator');

CREATE POLICY event_breaks_operator_insert ON event_breaks
    FOR INSERT
    WITH CHECK (get_user_role() = 'operator');

CREATE POLICY event_breaks_operator_update ON event_breaks
    FOR UPDATE
    USING (get_user_role() = 'operator')
    WITH CHECK (get_user_role() = 'operator');

CREATE POLICY event_breaks_operator_delete ON event_breaks
    FOR DELETE
    USING (get_user_role() = 'operator');
