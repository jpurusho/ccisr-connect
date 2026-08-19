-- Temporary: Add permissive RLS policies for debugging
-- This allows authenticated users to read data temporarily
-- TODO: Remove this migration once RLS issue is resolved

-- Temporarily allow all authenticated users to read event_types
CREATE POLICY event_types_authenticated_select ON event_types
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Temporarily allow all authenticated users to read email_templates
CREATE POLICY email_templates_authenticated_select ON email_templates
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Temporarily allow all authenticated users to read events
CREATE POLICY events_authenticated_select ON events
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Temporarily allow all authenticated users to read event_instances
CREATE POLICY event_instances_authenticated_select ON event_instances
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Note: These are ADDITIVE policies - they don't replace existing ones
-- They just provide an additional path for authenticated users to access data
