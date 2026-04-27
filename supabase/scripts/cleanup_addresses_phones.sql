-- =============================================================================
-- CLEANUP: Addresses and Phone Numbers
-- =============================================================================
-- Normalizes address and phone data across the database:
--   1. Title-case city names (san ramon → San Ramon)
--   2. Uppercase state abbreviations (ca → CA)
--   3. Trim and clean zip codes
--   4. Title-case street addresses
--   5. Rebuild full_address from cleaned components
--   6. Format phone numbers to (XXX) XXX-XXXX
--
-- Run in Supabase SQL Editor. Safe to run multiple times (idempotent).
-- =============================================================================

-- ── Helper: Title Case ──────────────────────────────────────────────────────
-- Capitalizes the first letter of each word.
CREATE OR REPLACE FUNCTION pg_temp.title_case(input text)
RETURNS text AS $$
  SELECT string_agg(
    upper(left(word, 1)) || lower(substring(word from 2)),
    ' '
  )
  FROM unnest(string_to_array(trim(input), ' ')) AS word
  WHERE word != ''
$$ LANGUAGE sql IMMUTABLE;

-- ── Helper: Format US Phone ─────────────────────────────────────────────────
-- Strips non-digits, formats 10-digit as (XXX) XXX-XXXX.
-- 11-digit starting with 1 strips the leading 1 first.
-- Returns cleaned digits if not 10-digit (international, etc).
CREATE OR REPLACE FUNCTION pg_temp.format_phone(input text)
RETURNS text AS $$
DECLARE
  digits text;
BEGIN
  IF input IS NULL OR trim(input) = '' THEN
    RETURN input;
  END IF;

  digits := regexp_replace(input, '[^0-9]', '', 'g');

  -- Strip leading country code 1
  IF length(digits) = 11 AND left(digits, 1) = '1' THEN
    digits := substring(digits from 2);
  END IF;

  IF length(digits) = 10 THEN
    RETURN '(' || substring(digits from 1 for 3) || ') '
        || substring(digits from 4 for 3) || '-'
        || substring(digits from 7 for 4);
  END IF;

  -- Return as-is if not standard US number
  RETURN input;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- =============================================================================
-- SECTION 1: DIAGNOSTIC — Preview changes (run this first)
-- =============================================================================

-- Preview address changes
SELECT
  a.id,
  f.family_name,
  a.street   AS old_street,
  pg_temp.title_case(a.street)  AS new_street,
  a.city     AS old_city,
  pg_temp.title_case(a.city)    AS new_city,
  a.state    AS old_state,
  upper(trim(a.state))          AS new_state,
  a.zip      AS old_zip,
  trim(a.zip)                   AS new_zip
FROM addresses a
JOIN families f ON f.id = a.family_id
WHERE a.is_current = true
ORDER BY f.family_name;

-- Preview phone changes
SELECT
  'family' AS source,
  f.family_name AS name,
  f.home_phone AS old_phone,
  pg_temp.format_phone(f.home_phone) AS new_phone
FROM families f
WHERE f.home_phone IS NOT NULL AND f.home_phone != ''
UNION ALL
SELECT
  'member' AS source,
  m.full_name AS name,
  m.cell_phone AS old_phone,
  pg_temp.format_phone(m.cell_phone) AS new_phone
FROM members m
WHERE m.cell_phone IS NOT NULL AND m.cell_phone != ''
ORDER BY source, name;


-- =============================================================================
-- SECTION 2: APPLY — Uncomment and run after reviewing diagnostics
-- =============================================================================

-- BEGIN;

-- ── Step 1: Clean address components ────────────────────────────────────────
-- UPDATE addresses SET
--   street       = pg_temp.title_case(street),
--   city         = pg_temp.title_case(city),
--   state        = upper(trim(state)),
--   zip          = trim(zip)
-- WHERE street IS NOT NULL OR city IS NOT NULL;

-- ── Step 2: Rebuild full_address from cleaned components ────────────────────
-- UPDATE addresses SET
--   full_address = concat_ws(', ',
--     nullif(trim(street), ''),
--     nullif(trim(city), ''),
--     nullif(
--       concat_ws(' ', nullif(trim(state), ''), nullif(trim(zip), '')),
--       ''
--     )
--   )
-- WHERE street IS NOT NULL OR city IS NOT NULL;

-- ── Step 3: Format family home phones ───────────────────────────────────────
-- UPDATE families SET
--   home_phone = pg_temp.format_phone(home_phone)
-- WHERE home_phone IS NOT NULL AND home_phone != '';

-- ── Step 4: Format member cell phones ───────────────────────────────────────
-- UPDATE members SET
--   cell_phone = pg_temp.format_phone(cell_phone)
-- WHERE cell_phone IS NOT NULL AND cell_phone != '';

-- COMMIT;

-- After running, verify:
-- SELECT id, street, city, state, zip, full_address FROM addresses WHERE is_current = true;
-- SELECT full_name, cell_phone FROM members WHERE cell_phone IS NOT NULL LIMIT 20;
-- SELECT family_name, home_phone FROM families WHERE home_phone IS NOT NULL LIMIT 20;
