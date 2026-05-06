-- Signup forms: flexible public form builder
CREATE TABLE signup_forms (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug                text NOT NULL UNIQUE,
    title               text NOT NULL,
    description         text,

    -- Duration configuration
    duration_type       text NOT NULL DEFAULT 'date_range' CHECK (duration_type IN ('event_date', 'month', 'date_range')),
    event_date          date,
    target_month        int CHECK (target_month BETWEEN 1 AND 12),
    target_year         int,
    start_date          date,
    end_date            date,

    -- Theming
    theme               jsonb NOT NULL DEFAULT '{}',

    -- Field configuration
    fields              jsonb NOT NULL DEFAULT '[]',

    -- Behavior
    status              text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed', 'archived')),
    visibility          text NOT NULL DEFAULT 'admin_only' CHECK (visibility IN ('public_link', 'admin_only')),
    member_autocomplete boolean NOT NULL DEFAULT false,
    max_submissions     int,
    allow_duplicates    boolean NOT NULL DEFAULT false,

    -- Linkage
    event_type_id       uuid REFERENCES event_types(id) ON DELETE SET NULL,
    event_id            uuid REFERENCES events(id) ON DELETE SET NULL,
    mailing_list_id     uuid REFERENCES mailing_lists(id) ON DELETE SET NULL,

    -- Metadata
    created_by          uuid,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    closed_at           timestamptz
);

CREATE TRIGGER trg_signup_forms_updated_at
    BEFORE UPDATE ON signup_forms
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_signup_forms_slug ON signup_forms(slug);
CREATE INDEX idx_signup_forms_status ON signup_forms(status) WHERE status = 'active';

CREATE TABLE signup_responses (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id         uuid NOT NULL REFERENCES signup_forms(id) ON DELETE CASCADE,
    member_id       uuid REFERENCES members(id) ON DELETE SET NULL,
    data            jsonb NOT NULL,
    ip_hash         text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_signup_responses_form_id ON signup_responses(form_id);
CREATE INDEX idx_signup_responses_form_created ON signup_responses(form_id, created_at DESC);

CREATE TABLE signup_rate_limits (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_hash         text NOT NULL,
    form_id         uuid NOT NULL REFERENCES signup_forms(id) ON DELETE CASCADE,
    attempt_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_signup_rate_limits_lookup ON signup_rate_limits(ip_hash, form_id, attempt_at DESC);

-- RLS
ALTER TABLE signup_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE signup_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE signup_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY signup_forms_admin ON signup_forms
    FOR ALL USING (get_user_role() IN ('super_admin', 'admin', 'operator'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin', 'operator'));

CREATE POLICY signup_responses_admin ON signup_responses
    FOR ALL USING (get_user_role() IN ('super_admin', 'admin', 'operator'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin', 'operator'));

CREATE POLICY signup_rate_limits_admin ON signup_rate_limits
    FOR ALL USING (get_user_role() IN ('super_admin', 'admin'))
    WITH CHECK (get_user_role() IN ('super_admin', 'admin'));
