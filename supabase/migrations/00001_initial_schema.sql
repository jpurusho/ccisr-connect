-- =============================================================================
-- CCISR ChurchConnect - Initial Schema Migration
-- =============================================================================
-- Description: Creates all tables, enums, indexes, RLS policies, triggers,
--              and seed data for the ChurchConnect membership and communication
--              platform.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. ENUM TYPES
-- =============================================================================

CREATE TYPE family_role AS ENUM ('husband', 'wife', 'child');

CREATE TYPE event_instance_status AS ENUM ('draft', 'confirmed', 'cancelled');

CREATE TYPE dispatch_status AS ENUM (
    'pending', 'previewed', 'approved', 'sending', 'sent', 'failed', 'cancelled'
);

CREATE TYPE recipient_type AS ENUM ('to', 'cc', 'bcc');

CREATE TYPE delivery_status AS ENUM ('pending', 'sent', 'bounced', 'failed');

CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'operator');

-- =============================================================================
-- 2. HELPER FUNCTION: updated_at trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 3. HELPER FUNCTION: get_user_role()
--    Returns the role of the currently authenticated user from app_users.
--    Returns NULL if the user is not found or inactive.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
DECLARE
    v_role user_role;
BEGIN
    SELECT role INTO v_role
    FROM app_users
    WHERE id = auth.uid()
      AND is_active = true;
    RETURN v_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- 4. TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 4.1 families
-- -----------------------------------------------------------------------------
CREATE TABLE families (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_name text NOT NULL,
    home_phone  text,
    notes       text,
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_families_updated_at
    BEFORE UPDATE ON families
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- 4.2 addresses
-- -----------------------------------------------------------------------------
CREATE TABLE addresses (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id    uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    street       text NOT NULL,
    city         text NOT NULL,
    state        text NOT NULL,
    zip          text NOT NULL,
    full_address text NOT NULL,
    is_current   boolean NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4.3 members
-- -----------------------------------------------------------------------------
CREATE TABLE members (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id               uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    first_name              text NOT NULL,
    last_name               text NOT NULL,
    full_name               text NOT NULL,
    role_in_family          family_role NOT NULL,
    cell_phone              text,
    email                   text,
    birth_month             int CHECK (birth_month BETWEEN 1 AND 12),
    birth_day               int CHECK (birth_day BETWEEN 1 AND 31),
    birth_year              int,
    is_active               boolean NOT NULL DEFAULT true,
    is_newcomer             boolean NOT NULL DEFAULT false,
    newcomer_acknowledged   boolean NOT NULL DEFAULT false,
    newcomer_date           date,
    notes                   text,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- 4.4 wedding_anniversaries
-- -----------------------------------------------------------------------------
CREATE TABLE wedding_anniversaries (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id         uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    husband_member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    wife_member_id    uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    anniversary_month int NOT NULL CHECK (anniversary_month BETWEEN 1 AND 12),
    anniversary_day   int NOT NULL CHECK (anniversary_day BETWEEN 1 AND 31),
    anniversary_year  int,
    created_at        timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4.5 event_types
--     NOTE: default_template_id FK is added later via ALTER TABLE after
--           email_templates is created.
-- -----------------------------------------------------------------------------
CREATE TABLE event_types (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                text NOT NULL UNIQUE,
    color_scheme        jsonb,
    icon                text,
    default_template_id uuid,
    created_at          timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4.6 events
-- -----------------------------------------------------------------------------
CREATE TABLE events (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type_id   uuid NOT NULL REFERENCES event_types(id) ON DELETE RESTRICT,
    title           text NOT NULL,
    description     text,
    recurrence_rule text,
    default_time    time,
    zoom_link       text,
    is_active       boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- 4.7 event_instances
-- -----------------------------------------------------------------------------
CREATE TABLE event_instances (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id          uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    instance_date     date NOT NULL,
    instance_time     time,
    host_family_id    uuid REFERENCES families(id) ON DELETE SET NULL,
    location_override text,
    notes             text,
    status            event_instance_status NOT NULL DEFAULT 'draft',
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_event_instances_updated_at
    BEFORE UPDATE ON event_instances
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- 4.8 email_templates
-- -----------------------------------------------------------------------------
CREATE TABLE email_templates (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name              text NOT NULL,
    event_type_id     uuid REFERENCES event_types(id) ON DELETE SET NULL,
    subject_template  text NOT NULL,
    body_template     text NOT NULL,
    signature_template text,
    header_image_url  text,
    is_default        boolean NOT NULL DEFAULT false,
    created_by        uuid,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- 4.9 smtp_configs
-- -----------------------------------------------------------------------------
CREATE TABLE smtp_configs (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name               text NOT NULL,
    host               text NOT NULL,
    port               int NOT NULL,
    username           text NOT NULL,
    encrypted_password text NOT NULL,
    from_name          text NOT NULL,
    from_email         text NOT NULL,
    is_admin_only      boolean NOT NULL DEFAULT false,
    created_by         uuid,
    is_active          boolean NOT NULL DEFAULT true,
    created_at         timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4.10 mailing_lists
-- -----------------------------------------------------------------------------
CREATE TABLE mailing_lists (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name               text NOT NULL,
    description        text,
    google_group_email text,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_mailing_lists_updated_at
    BEFORE UPDATE ON mailing_lists
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- 4.11 mailing_list_members
-- -----------------------------------------------------------------------------
CREATE TABLE mailing_list_members (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mailing_list_id uuid NOT NULL REFERENCES mailing_lists(id) ON DELETE CASCADE,
    member_id       uuid REFERENCES members(id) ON DELETE CASCADE,
    external_email  text,
    recipient_type  recipient_type NOT NULL DEFAULT 'to',
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_member_or_email CHECK (
        member_id IS NOT NULL OR external_email IS NOT NULL
    )
);

-- -----------------------------------------------------------------------------
-- 4.12 dispatch_queue
-- -----------------------------------------------------------------------------
CREATE TABLE dispatch_queue (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_instance_id uuid REFERENCES event_instances(id) ON DELETE SET NULL,
    email_template_id uuid REFERENCES email_templates(id) ON DELETE SET NULL,
    smtp_config_id    uuid REFERENCES smtp_configs(id) ON DELETE SET NULL,
    mailing_list_id   uuid REFERENCES mailing_lists(id) ON DELETE SET NULL,
    subject           text NOT NULL,
    body_html         text NOT NULL,
    scheduled_at      timestamptz NOT NULL,
    status            dispatch_status NOT NULL DEFAULT 'pending',
    created_by        uuid,
    approved_by       uuid,
    sent_at           timestamptz,
    error_message     text,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_dispatch_queue_updated_at
    BEFORE UPDATE ON dispatch_queue
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- 4.13 dispatch_recipients
-- -----------------------------------------------------------------------------
CREATE TABLE dispatch_recipients (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_id     uuid NOT NULL REFERENCES dispatch_queue(id) ON DELETE CASCADE,
    email           text NOT NULL,
    name            text,
    recipient_type  recipient_type NOT NULL DEFAULT 'to',
    delivery_status delivery_status NOT NULL DEFAULT 'pending'
);

-- -----------------------------------------------------------------------------
-- 4.14 dispatch_history
-- -----------------------------------------------------------------------------
CREATE TABLE dispatch_history (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_id   uuid NOT NULL REFERENCES dispatch_queue(id) ON DELETE CASCADE,
    full_snapshot jsonb NOT NULL,
    sent_at       timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4.15 app_users
-- -----------------------------------------------------------------------------
CREATE TABLE app_users (
    id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email               text NOT NULL,
    display_name        text,
    role                user_role NOT NULL DEFAULT 'operator',
    is_active           boolean NOT NULL DEFAULT true,
    permissions         jsonb NOT NULL DEFAULT '{}',
    allowed_smtp_configs uuid[] NOT NULL DEFAULT '{}',
    created_by          uuid,
    created_at          timestamptz NOT NULL DEFAULT now(),
    last_login          timestamptz
);

-- -----------------------------------------------------------------------------
-- 4.16 audit_log
-- -----------------------------------------------------------------------------
CREATE TABLE audit_log (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid,
    action      text NOT NULL,
    entity_type text NOT NULL,
    entity_id   uuid,
    changes     jsonb,
    ip_address  text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 5. DEFERRED FOREIGN KEY: event_types.default_template_id -> email_templates
-- =============================================================================

ALTER TABLE event_types
    ADD CONSTRAINT fk_event_types_default_template
    FOREIGN KEY (default_template_id) REFERENCES email_templates(id) ON DELETE SET NULL;

-- =============================================================================
-- 6. INDEXES
-- =============================================================================

CREATE INDEX idx_members_birthday ON members (birth_month, birth_day);
CREATE INDEX idx_wedding_anniversaries_date ON wedding_anniversaries (anniversary_month, anniversary_day);
CREATE INDEX idx_members_family_id ON members (family_id);
CREATE INDEX idx_dispatch_queue_status_scheduled ON dispatch_queue (status, scheduled_at);
CREATE INDEX idx_audit_log_user_created ON audit_log (user_id, created_at);
CREATE INDEX idx_members_newcomer ON members (is_newcomer, newcomer_acknowledged)
    WHERE is_newcomer = true;

-- =============================================================================
-- 7. ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on every table
ALTER TABLE families              ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE members               ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_anniversaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_types           ENABLE ROW LEVEL SECURITY;
ALTER TABLE events                ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_instances       ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE smtp_configs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE mailing_lists         ENABLE ROW LEVEL SECURITY;
ALTER TABLE mailing_list_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_queue        ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_recipients   ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_history      ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log             ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Helper: reusable boolean expressions
--   is_admin  = super_admin OR admin
--   is_active = user exists in app_users and is active
-- ---------------------------------------------------------------------------

-- =============================================
-- 7.1 families
-- =============================================
-- Admin full access
CREATE POLICY families_admin_all ON families
    FOR ALL
    USING (get_user_role() IN ('super_admin', 'admin'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin'));

-- Operator read/write
CREATE POLICY families_operator_select ON families
    FOR SELECT
    USING (get_user_role() = 'operator');

CREATE POLICY families_operator_insert ON families
    FOR INSERT
    WITH CHECK (get_user_role() = 'operator');

CREATE POLICY families_operator_update ON families
    FOR UPDATE
    USING (get_user_role() = 'operator')
    WITH CHECK (get_user_role() = 'operator');

CREATE POLICY families_operator_delete ON families
    FOR DELETE
    USING (get_user_role() = 'operator');

-- =============================================
-- 7.2 addresses
-- =============================================
CREATE POLICY addresses_admin_all ON addresses
    FOR ALL
    USING (get_user_role() IN ('super_admin', 'admin'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin'));

CREATE POLICY addresses_operator_select ON addresses
    FOR SELECT
    USING (get_user_role() = 'operator');

CREATE POLICY addresses_operator_insert ON addresses
    FOR INSERT
    WITH CHECK (get_user_role() = 'operator');

CREATE POLICY addresses_operator_update ON addresses
    FOR UPDATE
    USING (get_user_role() = 'operator')
    WITH CHECK (get_user_role() = 'operator');

CREATE POLICY addresses_operator_delete ON addresses
    FOR DELETE
    USING (get_user_role() = 'operator');

-- =============================================
-- 7.3 members
-- =============================================
CREATE POLICY members_admin_all ON members
    FOR ALL
    USING (get_user_role() IN ('super_admin', 'admin'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin'));

CREATE POLICY members_operator_select ON members
    FOR SELECT
    USING (get_user_role() = 'operator');

CREATE POLICY members_operator_insert ON members
    FOR INSERT
    WITH CHECK (get_user_role() = 'operator');

CREATE POLICY members_operator_update ON members
    FOR UPDATE
    USING (get_user_role() = 'operator')
    WITH CHECK (get_user_role() = 'operator');

CREATE POLICY members_operator_delete ON members
    FOR DELETE
    USING (get_user_role() = 'operator');

-- =============================================
-- 7.4 wedding_anniversaries
-- =============================================
CREATE POLICY wedding_anniversaries_admin_all ON wedding_anniversaries
    FOR ALL
    USING (get_user_role() IN ('super_admin', 'admin'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin'));

CREATE POLICY wedding_anniversaries_operator_select ON wedding_anniversaries
    FOR SELECT
    USING (get_user_role() = 'operator');

CREATE POLICY wedding_anniversaries_operator_insert ON wedding_anniversaries
    FOR INSERT
    WITH CHECK (get_user_role() = 'operator');

CREATE POLICY wedding_anniversaries_operator_update ON wedding_anniversaries
    FOR UPDATE
    USING (get_user_role() = 'operator')
    WITH CHECK (get_user_role() = 'operator');

CREATE POLICY wedding_anniversaries_operator_delete ON wedding_anniversaries
    FOR DELETE
    USING (get_user_role() = 'operator');

-- =============================================
-- 7.5 event_types (operator: read-only)
-- =============================================
CREATE POLICY event_types_admin_all ON event_types
    FOR ALL
    USING (get_user_role() IN ('super_admin', 'admin'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin'));

CREATE POLICY event_types_operator_select ON event_types
    FOR SELECT
    USING (get_user_role() = 'operator');

-- =============================================
-- 7.6 events
-- =============================================
CREATE POLICY events_admin_all ON events
    FOR ALL
    USING (get_user_role() IN ('super_admin', 'admin'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin'));

CREATE POLICY events_operator_select ON events
    FOR SELECT
    USING (get_user_role() = 'operator');

CREATE POLICY events_operator_insert ON events
    FOR INSERT
    WITH CHECK (get_user_role() = 'operator');

CREATE POLICY events_operator_update ON events
    FOR UPDATE
    USING (get_user_role() = 'operator')
    WITH CHECK (get_user_role() = 'operator');

CREATE POLICY events_operator_delete ON events
    FOR DELETE
    USING (get_user_role() = 'operator');

-- =============================================
-- 7.7 event_instances
-- =============================================
CREATE POLICY event_instances_admin_all ON event_instances
    FOR ALL
    USING (get_user_role() IN ('super_admin', 'admin'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin'));

CREATE POLICY event_instances_operator_select ON event_instances
    FOR SELECT
    USING (get_user_role() = 'operator');

CREATE POLICY event_instances_operator_insert ON event_instances
    FOR INSERT
    WITH CHECK (get_user_role() = 'operator');

CREATE POLICY event_instances_operator_update ON event_instances
    FOR UPDATE
    USING (get_user_role() = 'operator')
    WITH CHECK (get_user_role() = 'operator');

CREATE POLICY event_instances_operator_delete ON event_instances
    FOR DELETE
    USING (get_user_role() = 'operator');

-- =============================================
-- 7.8 email_templates
-- =============================================
CREATE POLICY email_templates_admin_all ON email_templates
    FOR ALL
    USING (get_user_role() IN ('super_admin', 'admin'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin'));

CREATE POLICY email_templates_operator_select ON email_templates
    FOR SELECT
    USING (get_user_role() = 'operator');

CREATE POLICY email_templates_operator_insert ON email_templates
    FOR INSERT
    WITH CHECK (get_user_role() = 'operator');

CREATE POLICY email_templates_operator_update ON email_templates
    FOR UPDATE
    USING (get_user_role() = 'operator')
    WITH CHECK (get_user_role() = 'operator');

CREATE POLICY email_templates_operator_delete ON email_templates
    FOR DELETE
    USING (get_user_role() = 'operator');

-- =============================================
-- 7.9 smtp_configs (operator: read-only, non-admin-only configs)
-- =============================================
CREATE POLICY smtp_configs_admin_all ON smtp_configs
    FOR ALL
    USING (get_user_role() IN ('super_admin', 'admin'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin'));

CREATE POLICY smtp_configs_operator_select ON smtp_configs
    FOR SELECT
    USING (
        get_user_role() = 'operator'
        AND NOT is_admin_only
    );

-- =============================================
-- 7.10 mailing_lists
-- =============================================
CREATE POLICY mailing_lists_admin_all ON mailing_lists
    FOR ALL
    USING (get_user_role() IN ('super_admin', 'admin'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin'));

CREATE POLICY mailing_lists_operator_select ON mailing_lists
    FOR SELECT
    USING (get_user_role() = 'operator');

CREATE POLICY mailing_lists_operator_insert ON mailing_lists
    FOR INSERT
    WITH CHECK (get_user_role() = 'operator');

CREATE POLICY mailing_lists_operator_update ON mailing_lists
    FOR UPDATE
    USING (get_user_role() = 'operator')
    WITH CHECK (get_user_role() = 'operator');

CREATE POLICY mailing_lists_operator_delete ON mailing_lists
    FOR DELETE
    USING (get_user_role() = 'operator');

-- =============================================
-- 7.11 mailing_list_members
-- =============================================
CREATE POLICY mailing_list_members_admin_all ON mailing_list_members
    FOR ALL
    USING (get_user_role() IN ('super_admin', 'admin'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin'));

CREATE POLICY mailing_list_members_operator_select ON mailing_list_members
    FOR SELECT
    USING (get_user_role() = 'operator');

CREATE POLICY mailing_list_members_operator_insert ON mailing_list_members
    FOR INSERT
    WITH CHECK (get_user_role() = 'operator');

CREATE POLICY mailing_list_members_operator_update ON mailing_list_members
    FOR UPDATE
    USING (get_user_role() = 'operator')
    WITH CHECK (get_user_role() = 'operator');

CREATE POLICY mailing_list_members_operator_delete ON mailing_list_members
    FOR DELETE
    USING (get_user_role() = 'operator');

-- =============================================
-- 7.12 dispatch_queue
-- =============================================
CREATE POLICY dispatch_queue_admin_all ON dispatch_queue
    FOR ALL
    USING (get_user_role() IN ('super_admin', 'admin'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin'));

CREATE POLICY dispatch_queue_operator_select ON dispatch_queue
    FOR SELECT
    USING (get_user_role() = 'operator');

CREATE POLICY dispatch_queue_operator_insert ON dispatch_queue
    FOR INSERT
    WITH CHECK (get_user_role() = 'operator');

CREATE POLICY dispatch_queue_operator_update ON dispatch_queue
    FOR UPDATE
    USING (get_user_role() = 'operator')
    WITH CHECK (get_user_role() = 'operator');

CREATE POLICY dispatch_queue_operator_delete ON dispatch_queue
    FOR DELETE
    USING (get_user_role() = 'operator');

-- =============================================
-- 7.13 dispatch_recipients
-- =============================================
CREATE POLICY dispatch_recipients_admin_all ON dispatch_recipients
    FOR ALL
    USING (get_user_role() IN ('super_admin', 'admin'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin'));

CREATE POLICY dispatch_recipients_operator_select ON dispatch_recipients
    FOR SELECT
    USING (get_user_role() = 'operator');

CREATE POLICY dispatch_recipients_operator_insert ON dispatch_recipients
    FOR INSERT
    WITH CHECK (get_user_role() = 'operator');

CREATE POLICY dispatch_recipients_operator_update ON dispatch_recipients
    FOR UPDATE
    USING (get_user_role() = 'operator')
    WITH CHECK (get_user_role() = 'operator');

CREATE POLICY dispatch_recipients_operator_delete ON dispatch_recipients
    FOR DELETE
    USING (get_user_role() = 'operator');

-- =============================================
-- 7.14 dispatch_history (operator: read-only)
-- =============================================
CREATE POLICY dispatch_history_admin_all ON dispatch_history
    FOR ALL
    USING (get_user_role() IN ('super_admin', 'admin'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin'));

CREATE POLICY dispatch_history_operator_select ON dispatch_history
    FOR SELECT
    USING (get_user_role() = 'operator');

-- =============================================
-- 7.15 app_users (admin-only full access; operators cannot see this table)
-- =============================================
CREATE POLICY app_users_admin_all ON app_users
    FOR ALL
    USING (get_user_role() IN ('super_admin', 'admin'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin'));

-- Allow any active user to read their own record (needed for role checks)
CREATE POLICY app_users_self_select ON app_users
    FOR SELECT
    USING (id = auth.uid() AND is_active = true);

-- =============================================
-- 7.16 audit_log (operator: read-only)
-- =============================================
CREATE POLICY audit_log_admin_all ON audit_log
    FOR ALL
    USING (get_user_role() IN ('super_admin', 'admin'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin'));

CREATE POLICY audit_log_operator_select ON audit_log
    FOR SELECT
    USING (get_user_role() = 'operator');

-- =============================================================================
-- 8. SEED DATA: event_types
-- =============================================================================

INSERT INTO event_types (name, color_scheme, icon) VALUES
    (
        'birthday',
        '{"primary": "#7C3AED", "label": "purple"}'::jsonb,
        'cake'
    ),
    (
        'anniversary',
        '{"primary": "#D97706", "label": "gold"}'::jsonb,
        'heart'
    ),
    (
        'friday_bible_study',
        '{"primary": "#0D9488", "label": "blue"}'::jsonb,
        'book-open'
    ),
    (
        'wednesday_womens_study',
        '{"primary": "#DB2777", "label": "rose"}'::jsonb,
        'users'
    ),
    (
        'monthly_prayer',
        '{"primary": "#059669", "label": "green"}'::jsonb,
        'hands-praying'
    ),
    (
        'bulletin',
        '{"primary": "#6B7280", "label": "neutral"}'::jsonb,
        'newspaper'
    );

COMMIT;
