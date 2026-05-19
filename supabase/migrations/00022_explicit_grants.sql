-- Explicit GRANTs for Data API access (required after Oct 30, 2026)
-- Ensures supabase-js, PostgREST, and GraphQL can access all tables.

-- Service role: full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Authenticated role: access to all tables (RLS enforces per-user restrictions)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.families TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_instances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.composed_instances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mailing_lists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mailing_list_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.smtp_configs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispatch_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispatch_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispatch_recipients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wedding_anniversaries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signup_forms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signup_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signup_rate_limits TO authenticated;

-- Anon role: limited access for public signup forms
GRANT SELECT ON public.signup_forms TO anon;
GRANT SELECT ON public.event_types TO anon;
GRANT INSERT ON public.signup_responses TO anon;
GRANT SELECT, INSERT ON public.signup_rate_limits TO anon;
