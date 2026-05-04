-- RPC functions for the Database Stats panel (super admin only)

-- Get table column schema
CREATE OR REPLACE FUNCTION get_table_schema(p_table_name text)
RETURNS TABLE(
  column_name text,
  data_type text,
  is_nullable text,
  column_default text,
  character_maximum_length integer
) AS $$
  SELECT
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text,
    c.column_default::text,
    c.character_maximum_length::integer
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = p_table_name
  ORDER BY c.ordinal_position;
$$ LANGUAGE sql SECURITY DEFINER;

-- Get database size
CREATE OR REPLACE FUNCTION get_db_size()
RETURNS TABLE(size text) AS $$
  SELECT pg_size_pretty(pg_database_size(current_database())) as size;
$$ LANGUAGE sql SECURITY DEFINER;
