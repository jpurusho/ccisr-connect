-- Temporary: Add permissive RLS policies for debugging
-- Run this with: psql connection-string -f scripts/add-temp-rls-policies.sql
-- Or via Supabase dashboard SQL editor

-- Drop existing if they exist (in case running multiple times)
DROP POLICY IF EXISTS event_types_authenticated_select ON event_types;
DROP POLICY IF EXISTS email_templates_authenticated_select ON email_templates;
DROP POLICY IF EXISTS events_authenticated_select ON events;
DROP POLICY IF EXISTS event_instances_authenticated_select ON event_instances;

-- Create temporary permissive policies
CREATE POLICY event_types_authenticated_select ON event_types
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY email_templates_authenticated_select ON email_templates
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY events_authenticated_select ON events
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY event_instances_authenticated_select ON event_instances
    FOR SELECT
    TO authenticated
    USING (true);

-- Verify policies were created
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('event_types', 'email_templates', 'events', 'event_instances')
  AND policyname LIKE '%authenticated%'
ORDER BY tablename, policyname;
