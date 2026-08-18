-- Check and display RLS policies for key tables

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('event_types', 'email_templates', 'events', 'composed_instances')
ORDER BY tablename, policyname;

-- Check if RLS is enabled
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('event_types', 'email_templates', 'events', 'composed_instances');
