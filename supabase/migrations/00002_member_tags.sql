-- =============================================================================
-- Member Tags System
-- =============================================================================

CREATE TABLE tags (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text NOT NULL UNIQUE,
    color      text NOT NULL DEFAULT '#6B7280',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE member_tags (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id  uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    tag_id     uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(member_id, tag_id)
);

-- RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY tags_all ON tags
    FOR ALL
    USING (get_user_role() IN ('super_admin', 'admin', 'operator'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin', 'operator'));

CREATE POLICY member_tags_all ON member_tags
    FOR ALL
    USING (get_user_role() IN ('super_admin', 'admin', 'operator'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin', 'operator'));

-- Indexes
CREATE INDEX idx_member_tags_member ON member_tags(member_id);
CREATE INDEX idx_member_tags_tag ON member_tags(tag_id);

-- Seed default tags
INSERT INTO tags (name, color) VALUES
    ('Newcomer', '#F59E0B'),
    ('Bible Study', '#0D9488'),
    ('Youth', '#8B5CF6'),
    ('Volunteer', '#059669'),
    ('Choir', '#EC4899'),
    ('Sunday School', '#3B82F6');
