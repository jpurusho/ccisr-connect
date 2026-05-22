-- =============================================================================
-- Bulletin Items — manual "This Week" entries not tied to calendar events
-- Replaces static events[] JSON array in bulletin template body_template
-- =============================================================================

CREATE TABLE bulletin_items (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title           text NOT NULL,
    details         text,
    sort_order      int NOT NULL DEFAULT 0,
    is_recurring    boolean NOT NULL DEFAULT false,
    week_start      date,
    is_active       boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bulletin_items_week ON bulletin_items(week_start) WHERE week_start IS NOT NULL;
CREATE INDEX idx_bulletin_items_recurring ON bulletin_items(is_recurring) WHERE is_recurring = true;

ALTER TABLE bulletin_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY bulletin_items_admin_all ON bulletin_items
    FOR ALL
    USING (get_user_role() IN ('super_admin', 'admin'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin'));

CREATE POLICY bulletin_items_operator_all ON bulletin_items
    FOR ALL
    USING (get_user_role() = 'operator')
    WITH CHECK (get_user_role() = 'operator');
