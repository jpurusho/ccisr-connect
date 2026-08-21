-- Temporary: Add permissive RLS policies for debugging
-- This allows authenticated users to read data temporarily
-- TODO: Remove this migration once RLS issue is resolved

-- Temporarily allow all authenticated users to read event_types
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'event_types' AND policyname = 'event_types_authenticated_select'
  ) THEN
    CREATE POLICY event_types_authenticated_select ON event_types
        FOR SELECT
        USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Temporarily allow all authenticated users to read email_templates
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'email_templates' AND policyname = 'email_templates_authenticated_select'
  ) THEN
    CREATE POLICY email_templates_authenticated_select ON email_templates
        FOR SELECT
        USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Temporarily allow all authenticated users to read events
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'events_authenticated_select'
  ) THEN
    CREATE POLICY events_authenticated_select ON events
        FOR SELECT
        USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Temporarily allow all authenticated users to read event_instances
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'event_instances' AND policyname = 'event_instances_authenticated_select'
  ) THEN
    CREATE POLICY event_instances_authenticated_select ON event_instances
        FOR SELECT
        USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Note: These are ADDITIVE policies - they don't replace existing ones
-- They just provide an additional path for authenticated users to access data
