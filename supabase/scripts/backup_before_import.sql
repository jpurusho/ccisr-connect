-- =============================================================================
-- BACKUP: Export current data as INSERT statements
-- Run this in Supabase SQL Editor BEFORE running clean_import.sql
-- Save the output — it's your rollback script.
-- =============================================================================

-- ── Families ────────────────────────────────────────────────────────────────
SELECT 'INSERT INTO families (id, family_name, home_phone, is_active, notes) VALUES ('
  || quote_literal(id) || ', '
  || quote_literal(family_name) || ', '
  || coalesce(quote_literal(home_phone), 'NULL') || ', '
  || is_active || ', '
  || coalesce(quote_literal(notes), 'NULL')
  || ');' AS sql
FROM families
ORDER BY family_name;

-- ── Addresses ───────────────────────────────────────────────────────────────
SELECT 'INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current) VALUES ('
  || quote_literal(id) || ', '
  || quote_literal(family_id) || ', '
  || coalesce(quote_literal(street), 'NULL') || ', '
  || coalesce(quote_literal(city), 'NULL') || ', '
  || coalesce(quote_literal(state), 'NULL') || ', '
  || coalesce(quote_literal(zip), 'NULL') || ', '
  || coalesce(quote_literal(full_address), 'NULL') || ', '
  || is_current
  || ');' AS sql
FROM addresses;

-- ── Members ─────────────────────────────────────────────────────────────────
SELECT 'INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged, newcomer_date, notes) VALUES ('
  || quote_literal(id) || ', '
  || quote_literal(family_id) || ', '
  || quote_literal(first_name) || ', '
  || quote_literal(last_name) || ', '
  || quote_literal(full_name) || ', '
  || quote_literal(role_in_family) || ', '
  || coalesce(quote_literal(cell_phone), 'NULL') || ', '
  || coalesce(quote_literal(email), 'NULL') || ', '
  || coalesce(birth_month::text, 'NULL') || ', '
  || coalesce(birth_day::text, 'NULL') || ', '
  || coalesce(birth_year::text, 'NULL') || ', '
  || is_active || ', '
  || is_newcomer || ', '
  || newcomer_acknowledged || ', '
  || coalesce(quote_literal(newcomer_date::text), 'NULL') || ', '
  || coalesce(quote_literal(notes), 'NULL')
  || ');' AS sql
FROM members
ORDER BY full_name;

-- ── Wedding Anniversaries ───────────────────────────────────────────────────
SELECT 'INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year) VALUES ('
  || quote_literal(id) || ', '
  || quote_literal(family_id) || ', '
  || quote_literal(husband_member_id) || ', '
  || quote_literal(wife_member_id) || ', '
  || anniversary_month || ', '
  || anniversary_day || ', '
  || coalesce(anniversary_year::text, 'NULL')
  || ');' AS sql
FROM wedding_anniversaries;

-- ── Member Tags ─────────────────────────────────────────────────────────────
SELECT 'INSERT INTO member_tags (member_id, tag_id) VALUES ('
  || quote_literal(member_id) || ', '
  || quote_literal(tag_id)
  || ');' AS sql
FROM member_tags;

-- ── Mailing List Members (member-linked) ────────────────────────────────────
SELECT 'INSERT INTO mailing_list_members (id, mailing_list_id, member_id, external_email, recipient_type) VALUES ('
  || quote_literal(id) || ', '
  || quote_literal(mailing_list_id) || ', '
  || coalesce(quote_literal(member_id), 'NULL') || ', '
  || coalesce(quote_literal(external_email), 'NULL') || ', '
  || quote_literal(recipient_type)
  || ');' AS sql
FROM mailing_list_members;
