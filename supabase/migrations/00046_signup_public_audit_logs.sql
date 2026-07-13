-- Add toggle to control whether audit logs (Recent Changes) are visible to public

ALTER TABLE signup_forms
ADD COLUMN show_audit_logs_public boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN signup_forms.show_audit_logs_public IS 'If true, the "Recent Changes" section (removals/edits) is visible on public responses page. If false, only admins can see it.';
