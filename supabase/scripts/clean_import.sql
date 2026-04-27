-- =============================================================================
-- CCISR Connect — Clean Data Import
-- Generated: 2026-04-27T00:06:23.228Z
-- Families: 77
-- =============================================================================
-- WARNING: This script DELETES existing data and re-imports from clean source.
-- Back up your database before running!
-- =============================================================================

BEGIN;

-- ── Clear existing data ──────────────────────────────────────────────────
DELETE FROM member_tags;
DELETE FROM mailing_list_members WHERE member_id IS NOT NULL;
DELETE FROM wedding_anniversaries;
DELETE FROM addresses;
DELETE FROM members;
DELETE FROM families;

-- ── Family 1: Purushotham ──
DO $fam_0$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Purushotham', '(925) 875-9338', true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '2652 Piccadilly Circle', 'San Ramon', 'CA', '94582', '2652 Piccadilly Circle, San Ramon, CA 94582', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Jerome', 'Purushotham', 'Jerome Purushotham', 'husband', '(510) 676-2213', 'jerome.purushotham@gmail.com', 12, 20, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Sunitha', 'Purushotham', 'Sunitha Purushotham', 'wife', '(510) 676-2224', 'sunithajp@gmail.com', 8, 29, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Shirlene', 'Beckmann', 'Shirlene Beckmann', 'child', NULL, NULL, 6, 2, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Sherwin', 'Joshua Jerome', 'Sherwin Joshua Jerome', 'child', NULL, NULL, 10, 20, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 8, 29, NULL);
END;
$fam_0$;

-- ── Family 2: Varadha ──
DO $fam_1$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Varadha', '(925) 931-1926', true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '672 W Tramonto Dr', 'Mountain House', 'CA', '95391', '672 W Tramonto Dr, Mountain House, CA 95391', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Diwakar', 'Varadha', 'Diwakar Varadha', 'husband', '(510) 415-1762', 'diwakarvis@gmail.com', 8, 2, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Rebekah', 'Varadha', 'Rebekah Varadha', 'wife', '(510) 229-7369', 'rebekahdd@gmail.com', 1, 30, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Esther', 'Sushmitha Varadha', 'Esther Sushmitha Varadha', 'child', NULL, NULL, 6, 26, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'James', 'Ravnakh Varadha', 'James Ravnakh Varadha', 'child', NULL, NULL, 5, 10, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 12, 29, NULL);
END;
$fam_1$;

-- ── Family 3: Ponnusamy ──
DO $fam_2$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Ponnusamy', '(925) 230-8473', true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '257 Wimbledon Court', 'San Ramon', 'CA', '94582', '257 Wimbledon Court, San Ramon, CA 94582', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Santhakumar', 'Ponnusamy', 'Santhakumar Ponnusamy', 'husband', '(510) 378-3400', 'psantha@yahoo.com', 10, 12, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Shanthi', 'Santhakumar', 'Shanthi Santhakumar', 'wife', '(510) 378-3401', 'mrshanthi@gmail.com', 10, 15, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Preethika', 'Santhakumar', 'Preethika Santhakumar', 'child', NULL, NULL, 9, 30, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Jessica', 'Santhakumar', 'Jessica Santhakumar', 'child', NULL, NULL, 3, 17, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 12, 7, NULL);
END;
$fam_2$;

-- ── Family 4: Somasundaram ──
DO $fam_3$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Somasundaram', '(925) 736-7818', true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '3125 Griffon St West', 'Danville', 'CA', '94506', '3125 Griffon St West, Danville, CA 94506', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Thilak', 'Somasundaram', 'Thilak Somasundaram', 'husband', '(510) 396-8102', 'thilak_s@yahoo.com', 1, 23, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Ojala', 'Inbadoss', 'Ojala Inbadoss', 'wife', '(925) 872-3982', 'ojalaa@yahoo.com', 8, 28, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Rashmin', 'Thilak', 'Rashmin Thilak', 'child', NULL, NULL, 12, 5, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Rinita', 'Thilak', 'Rinita Thilak', 'child', NULL, NULL, 9, 6, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 9, 10, NULL);
END;
$fam_3$;

-- ── Family 5: Navin Victor ──
DO $fam_4$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Navin Victor', '(925) 964-9458', true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '535 N Umbria Place', 'Mountain House', 'CA', '95391', '535 N Umbria Place, Mountain House, CA 95391', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Navin', 'Victor', 'Navin Victor', 'husband', '(925) 998-4011', 'navin.victor@gmail.com', 11, 26, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Vanitha', 'Daniel', 'Vanitha Daniel', 'wife', '(925) 683-3068', 'vankarpu@gmail.com', 5, 4, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Immanuel', 'Victor', 'Immanuel Victor', 'child', NULL, NULL, 7, 25, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Sheryl', 'Victor', 'Sheryl Victor', 'child', NULL, NULL, 7, 5, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 11, 12, NULL);
END;
$fam_4$;

-- ── Family 6: Kumar ──
DO $fam_5$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Kumar', '(925) 371-0685', true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '6458 Altamar Circle', 'Livermore', 'CA', '94551', '6458 Altamar Circle, Livermore, CA 94551', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Kennedy', 'Kumar', 'Kennedy Kumar', 'husband', '(510) 378-6630', 'kennedykumar@gmail.com', 8, 21, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Binthu', 'Kennedy', 'Binthu Kennedy', 'wife', '(925) 640-3019', 'binthukennedy@gmail.com', 4, 4, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Kevin', 'Clifford', 'Kevin Clifford', 'child', NULL, NULL, 11, 19, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 6, 1, NULL);
END;
$fam_5$;

-- ── Family 7: Alfred ──
DO $fam_6$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Alfred', '(510) 857-5841', true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '2336 Millenium Lane', 'San Ramon', 'CA', '94582', '2336 Millenium Lane, San Ramon, CA 94582', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Abraham', 'Alfred', 'Abraham Alfred', 'husband', '(614) 256-0537', 'abraham.alfred@yahoo.com', 3, 24, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Nisha', 'Alfred', 'Nisha Alfred', 'wife', '(510) 857-5841', 'nisha.cynthia@yahoo.com', 7, 21, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Aaron', 'Abraham', 'Aaron Abraham', 'child', NULL, NULL, 12, 2, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Ethan', 'Abraham', 'Ethan Abraham', 'child', NULL, NULL, 12, 27, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 7, 4, NULL);
END;
$fam_6$;

-- ── Family 8: Prince Victor ──
DO $fam_7$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Prince Victor', '(925) 820-2226', true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '165 Vista Del Diablo', 'Danville', 'CA', '94526', '165 Vista Del Diablo, Danville, CA 94526', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Prince', 'Victor', 'Prince Victor', 'husband', '(925) 212-0865', 'princelvictor@gmail.com', 6, 16, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Beula', 'Victor', 'Beula Victor', 'wife', NULL, NULL, 5, 4, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Dalton', 'Victor', 'Dalton Victor', 'child', NULL, NULL, NULL, NULL, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Andrew', 'Victor', 'Andrew Victor', 'child', NULL, NULL, NULL, NULL, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Allen', 'Victor', 'Allen Victor', 'child', NULL, NULL, NULL, NULL, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 5, 28, NULL);
END;
$fam_7$;

-- ── Family 9: Rajkumar ──
DO $fam_8$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Rajkumar', '(512) 255-9479', true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '524 Tylerton Court', 'San Ramon', 'CA', '94582', '524 Tylerton Court, San Ramon, CA 94582', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Vinoth', 'Rajkumar', 'Vinoth Rajkumar', 'husband', '(512) 914-0828', 'rvinoth@gmail.com', 4, 22, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Shalini', 'Rajkumar', 'Shalini Rajkumar', 'wife', '(512) 914-7088', 'shalinirajkumar@gmail.com', 7, 27, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Jessica', 'Rajkumar', 'Jessica Rajkumar', 'child', NULL, NULL, 9, 27, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Joanna', 'Rajkumar', 'Joanna Rajkumar', 'child', NULL, NULL, 2, 6, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 5, 3, NULL);
END;
$fam_8$;

-- ── Family 10: Ranjan Samuel ──
DO $fam_9$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Ranjan Samuel', '(408) 719-8990', true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '3004 Via Del Sol', 'San Jose', 'CA', '95120', '3004 Via Del Sol, San Jose, CA 95120', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Ranjan', 'Samuel', 'Ranjan Samuel', 'husband', '(408) 234-0911', 'pastor@christindia.org', 11, 22, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Usha', 'Samuel', 'Usha Samuel', 'wife', '(408) 314-8878', 'ushasam7@gmail.com', 3, 7, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Joel', 'Ranjan Samuel', 'Joel Ranjan Samuel', 'child', NULL, NULL, 7, 1, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Andrew', 'Prathap Samuel', 'Andrew Prathap Samuel', 'child', NULL, NULL, 12, 24, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 1, 14, NULL);
END;
$fam_9$;

-- ── Family 11: Rajarathnam ──
DO $fam_10$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Rajarathnam', '(925) 459-5652', true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '1521 N Atchinson Stage Road', 'Clayton', 'CA', '94517', '1521 N Atchinson Stage Road, Clayton, CA 94517', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Johnson', 'Rajarathnam', 'Johnson Rajarathnam', 'husband', '(925) 202-5033', 'johnsonjrajaratnam@yahoo.com', 11, 6, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Pamela', 'Johnson', 'Pamela Johnson', 'wife', '(925) 348-7888', 'pearly_dhas@hotmail.com', 8, 1, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Shannon', 'Johnson', 'Shannon Johnson', 'child', NULL, NULL, 1, 14, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Sheryn', 'Johnson', 'Sheryn Johnson', 'child', NULL, NULL, 1, 17, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Suzane', 'Johnson', 'Suzane Johnson', 'child', NULL, NULL, 11, 14, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Ryan', 'Johnson', 'Ryan Johnson', 'child', NULL, NULL, 11, 14, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 8, 30, NULL);
END;
$fam_10$;

-- ── Family 12: Boaz ──
DO $fam_11$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Boaz', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '1799 Wycliffe Ln', 'San Ramon', 'CA', '94582', '1799 Wycliffe Ln, San Ramon, CA 94582', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Prabin', 'Boaz', 'Prabin Boaz', 'husband', '(408) 930-5741', 'prabindivya@yahoo.com', 5, 30, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Divya', 'Boaz', 'Divya Boaz', 'wife', '(408) 930-5742', 'prabindivya@yahoo.com', 11, 24, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Swetha', 'Olivia Boaz', 'Swetha Olivia Boaz', 'child', NULL, NULL, 12, 9, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Nikhil', 'Jonathan Boaz', 'Nikhil Jonathan Boaz', 'child', NULL, NULL, 5, 27, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 4, 27, NULL);
END;
$fam_11$;

-- ── Family 13: Rasiah ──
DO $fam_12$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Rasiah', '(925) 803-6997', true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '2812 Morgan Drive', 'San Ramon', 'CA', '94583', '2812 Morgan Drive, San Ramon, CA 94583', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Mark', 'Rasiah', 'Mark Rasiah', 'husband', '(925) 922-1710', 'markrasiah@hotmail.com', 10, 25, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Tania', 'Rasiah', 'Tania Rasiah', 'wife', '(925) 997-7370', 'taniarasiah@att.net', 12, 16, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Andrew', 'Rasiah', 'Andrew Rasiah', 'child', NULL, NULL, 5, 4, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Jorden', 'Rasiah', 'Jorden Rasiah', 'child', NULL, NULL, 1, 16, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 7, 8, NULL);
END;
$fam_12$;

-- ── Family 14: Mathews ──
DO $fam_13$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Mathews', '(925) 587-5427', true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '3106 Tewksbury Way', 'San Ramon', 'CA', '94582', '3106 Tewksbury Way, San Ramon, CA 94582', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Sam', 'Mathews', 'Sam Mathews', 'husband', '(510) 896-9302', 'samandpriscilla@gmail.com', 2, 21, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Priscilla', 'Mathews', 'Priscilla Mathews', 'wife', '(510) 896-9510', 'pris.mathews@gmail.com', 1, 8, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Philip', 'Mathews', 'Philip Mathews', 'child', NULL, NULL, 12, 21, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Rachel', 'Mathews', 'Rachel Mathews', 'child', NULL, NULL, 1, 11, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 12, 27, NULL);
END;
$fam_13$;

-- ── Family 15: Chellappa ──
DO $fam_14$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Chellappa', '(920) 650-6517', true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Arunkumar', 'Chellappa', 'Arunkumar Chellappa', 'husband', '(920) 650-1853', 'carun-5@yahoo.com', 7, 5, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Eswari', 'Arunkumar', 'Eswari Arunkumar', 'wife', '(920) 650-6517', 'pm_eswari@yahoo.com', 7, 27, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Abigail', 'Christa Arunkumar', 'Abigail Christa Arunkumar', 'child', NULL, NULL, 4, 29, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Nathan', 'Arunkumar', 'Nathan Arunkumar', 'child', NULL, NULL, 3, 4, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 4, 21, NULL);
END;
$fam_14$;

-- ── Family 16: Rani ──
DO $fam_15$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Rani', '(510) 532-2472', true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '2830 International Blvd, #308', 'Oakland', 'CA', '94681', '2830 International Blvd, #308, Oakland, CA 94681', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Vimala', 'Rani', 'Vimala Rani', 'husband', NULL, 'katap786@gmail.com', 5, 22, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Vimalarani', 'Thiyagarajah', 'Vimalarani Thiyagarajah', 'wife', '(510) 712-3716', 'tharmiraj91@gmail.com', 12, 7, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Tharmika', 'Thiyagarajah', 'Tharmika Thiyagarajah', 'child', NULL, NULL, 9, 27, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Kiristika', 'Thiyagarajah', 'Kiristika Thiyagarajah', 'child', NULL, NULL, 5, 27, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Akaliya', 'Rani', 'Akaliya Rani', 'child', NULL, NULL, 1, 8, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Athusana', 'Thiyagarajah', 'Athusana Thiyagarajah', 'child', NULL, NULL, 7, 6, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 3, 27, NULL);
END;
$fam_15$;

-- ── Family 17: Jebin Jacob ──
DO $fam_16$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Jebin Jacob', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '1118 Cedarwood Loop', 'San Ramon', 'CA', '94582', '1118 Cedarwood Loop, San Ramon, CA 94582', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Giftson', 'Jebin Jacob', 'Giftson Jebin Jacob', 'husband', '(860) 772-7409', 'giftsonjebin@yahoo.com', 11, 22, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Sabeena', 'Peter', 'Sabeena Peter', 'wife', '(425) 647-8880', 'sabeenapeter@gmail.com', 8, 30, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Prarthana', 'Abigail', 'Prarthana Abigail', 'child', NULL, NULL, 7, 15, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Jeremy', 'Nathaniel Jacob', 'Jeremy Nathaniel Jacob', 'child', NULL, NULL, 8, 9, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 12, 27, NULL);
END;
$fam_16$;

-- ── Family 18: David ──
DO $fam_17$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'David', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '1016 Ginger Court', 'Brentwood', 'CA', '94513', '1016 Ginger Court, Brentwood, CA 94513', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Nirmal', 'David', 'Nirmal David', 'husband', '(650) 766-4957', 'csndavid@yahoo.com', 5, 7, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Roshini', '', 'Roshini', 'wife', '(650) 863-8515', 'roshini.ravichandran@yahoo.com', 7, 29, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Shaun', 'David', 'Shaun David', 'child', NULL, NULL, 1, 19, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 12, 30, NULL);
END;
$fam_17$;

-- ── Family 19: Christuraj Saroja ──
DO $fam_18$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Christuraj Saroja', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '685 W Strauss Drive', 'Mountain House', 'CA', '95391', '685 W Strauss Drive, Mountain House, CA 95391', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Britto', 'Christuraj Saroja', 'Britto Christuraj Saroja', 'husband', '(617) 301-0646', 'brittocs@gmail.com', 5, 19, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Anity', 'Bert Singh', 'Anity Bert Singh', 'wife', '(617) 909-8414', 'anitybs@gmail.com', 9, 23, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Arin', 'Samuel Britto', 'Arin Samuel Britto', 'child', NULL, NULL, 8, 5, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Alice', 'Britto', 'Alice Britto', 'child', NULL, NULL, 5, 30, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 8, 31, NULL);
END;
$fam_18$;

-- ── Family 20: Samuelraj ──
DO $fam_19$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Samuelraj', '(510) 742-1190', true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '9632 Camassia Way', 'San Ramon', 'CA', '94582', '9632 Camassia Way, San Ramon, CA 94582', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Mohan', 'Samuelraj', 'Mohan Samuelraj', 'husband', '(510) 364-4143', 'mohan.samuelraj@outlook.com', 9, 23, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Junitha', 'Mohan', 'Junitha Mohan', 'wife', '(510) 364-4747', 'junitharaj@yahoo.com', 6, 20, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Gracelynne', 'Naomi Mohan', 'Gracelynne Naomi Mohan', 'child', NULL, NULL, 12, 21, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Kristen', 'Seraphina Mohan', 'Kristen Seraphina Mohan', 'child', NULL, NULL, 3, 16, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 2, 3, NULL);
END;
$fam_19$;

-- ── Family 21: Vijai Samuel ──
DO $fam_20$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Vijai Samuel', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '9732 Belladonna Drive', 'San Ramon', 'CA', '94582', '9732 Belladonna Drive, San Ramon, CA 94582', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Vijai', 'Samuel', 'Vijai Samuel', 'husband', '(920) 327-3962', 'vijaisamuel@gmail.com', 2, 7, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Jessi', 'Samuel', 'Jessi Samuel', 'wife', '(408) 893-2978', 'jessivijai@gmail.com', 5, 18, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

END;
$fam_20$;

-- ── Family 22: Reuben ──
DO $fam_21$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Reuben', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '615 West Royce Drive', 'Mountain House', 'CA', '95391', '615 West Royce Drive, Mountain House, CA 95391', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Neil', 'Reuben', 'Neil Reuben', 'husband', '(415) 323-9068', 'neilreuben@gmail.com', 9, 18, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Angelin', '', 'Angelin', 'wife', '(415) 755-0550', 'angelinr@yahoo.com', 9, 10, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Denil', 'Collins Neil', 'Denil Collins Neil', 'child', NULL, NULL, 5, 24, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Caitlin', 'Sandra Neil', 'Caitlin Sandra Neil', 'child', NULL, NULL, 6, 13, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 2, 7, NULL);
END;
$fam_21$;

-- ── Family 23: Kingsly ──
DO $fam_22$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Kingsly', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Edward', 'Kingsly', 'Edward Kingsly', 'husband', '(925) 577-4251', 'm.edwardkingsly@gmail.com', 3, 11, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Priyadharsini', '', 'Priyadharsini', 'wife', '(925) 413-8200', 'pdharsini2@gmail.com', 5, 1, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Ryan', 'Edward', 'Ryan Edward', 'child', NULL, NULL, 9, 26, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Brian', 'Edward', 'Brian Edward', 'child', NULL, NULL, 10, 22, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 12, 14, NULL);
END;
$fam_22$;

-- ── Family 24: Chandar ──
DO $fam_23$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Chandar', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '8439 Apt E, N Lake Dr', 'Dublin', 'CA', '94568', '8439 Apt E, N Lake Dr, Dublin, CA 94568', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Bala', 'Chandar', 'Bala Chandar', 'husband', '(925) 963-7842', 'balachandar.p@gmail.com', 6, 8, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Pushkala', 'Balachandar', 'Pushkala Balachandar', 'wife', '(925) 914-9363', 'mpkala.m@gmail.com', 10, 6, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Santhosh', 'John Bala', 'Santhosh John Bala', 'child', NULL, NULL, 11, 24, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 5, 16, NULL);
END;
$fam_23$;

-- ── Family 25: Amirtha Nayagam ──
DO $fam_24$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Amirtha Nayagam', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '2521 Veneto Court', 'San Ramon', 'CA', '94583', '2521 Veneto Court, San Ramon, CA 94583', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Ravikumar', 'Amirtha Nayagam', 'Ravikumar Amirtha Nayagam', 'husband', '(650) 996-5860', 'ravi_ratnaraj@gmail.com', 9, 26, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Angeline', 'Ravikumar', 'Angeline Ravikumar', 'wife', '(650) 919-4556', 'angeline_ravi@yahoo.co.in', 10, 1, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Catherine', 'Ravikumar', 'Catherine Ravikumar', 'child', NULL, NULL, 5, 12, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Joshua', 'Ravikumar', 'Joshua Ravikumar', 'child', NULL, NULL, 4, 29, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 7, 14, NULL);
END;
$fam_24$;

-- ── Family 26: Prejeeth ──
DO $fam_25$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Prejeeth', '(925) 402-4811', true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '224 Stranahan Circle', 'Clayton', 'CA', '94517', '224 Stranahan Circle, Clayton, CA 94517', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Prejeeth', '', 'Prejeeth', 'husband', '(925) 890-2929', 'prejeetht@gmail.com', 8, 29, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Esther', '', 'Esther', 'wife', '(925) 448-1629', 'beena0602@gmail.com', 2, 6, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Evan', '', 'Evan', 'child', NULL, NULL, 10, 30, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Riaan', 'Paul Prejeeth', 'Riaan Paul Prejeeth', 'child', NULL, NULL, 4, 19, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 2, 11, NULL);
END;
$fam_25$;

-- ── Family 27: Devadasan ──
DO $fam_26$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Devadasan', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '2656 Celaya Circle', 'San Ramon', 'CA', '94583', '2656 Celaya Circle, San Ramon, CA 94583', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Christudass', 'Devadasan', 'Christudass Devadasan', 'husband', '(925) 750-4765', 'christudass@hotmail.com', 11, 13, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Reenie', 'Christudass', 'Reenie Christudass', 'wife', '(925) 750-4766', 'reeniecd@hotmail.com', 2, 28, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Clayton', 'Christudass', 'Clayton Christudass', 'child', NULL, NULL, 3, 17, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Calia', 'Christudass', 'Calia Christudass', 'child', NULL, NULL, 8, 21, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 4, 30, NULL);
END;
$fam_26$;

-- ── Family 28: Samuthirapalam ──
DO $fam_27$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Samuthirapalam', '(408) 469-7600', true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '3281 Cydonia Court', 'Dublin', 'CA', '94568', '3281 Cydonia Court, Dublin, CA 94568', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Thangadas', 'Samuthirapalam', 'Thangadas Samuthirapalam', 'husband', '(408) 368-0656', 'thangadas@gmail.com', 11, 25, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Salomi', 'Thangadas', 'Salomi Thangadas', 'wife', '(408) 507-3054', 'salomi.thangadas@gmail.com', 10, 20, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Timothy', 'Ashish', 'Timothy Ashish', 'child', NULL, NULL, 12, 6, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 9, 16, NULL);
END;
$fam_27$;

-- ── Family 29: Ranjan ──
DO $fam_28$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Ranjan', '(925) 500-8071', true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '5194 Top Shamet', 'Dublin', 'CA', '94568', '5194 Top Shamet, Dublin, CA 94568', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Rajan', 'Ranjan', 'Rajan Ranjan', 'husband', '(925) 549-7071', 'ranjan.rajan@gmail.com', 9, 12, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Anita', 'Dora', 'Anita Dora', 'wife', '(925) 963-5025', 'anitadora@gmail.com', 3, 8, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Jason', 'Gabriel', 'Jason Gabriel', 'child', NULL, NULL, 10, 1, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Janice', 'Angela', 'Janice Angela', 'child', NULL, NULL, 10, 1, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 10, 9, NULL);
END;
$fam_28$;

-- ── Family 30: Vimal Jebaraj ──
DO $fam_29$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Vimal Jebaraj', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '1295 South Central Parkway', 'Mountain House', 'CA', '95391', '1295 South Central Parkway, Mountain House, CA 95391', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Vimal', 'Jebaraj', 'Vimal Jebaraj', 'husband', '(650) 267-1291', 'vimal.jebaraj@gmail.com', 8, 22, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Malar', 'Vimal', 'Malar Vimal', 'wife', '(650) 350-9790', 'malar.vimal@gmail.com', 6, 10, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Gia', 'Joanie Vimal', 'Gia Joanie Vimal', 'child', NULL, NULL, 6, 5, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Julia', 'Sabatini Vimal', 'Julia Sabatini Vimal', 'child', NULL, NULL, 12, 21, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 4, 16, NULL);
END;
$fam_29$;

-- ── Family 31: Thalapathi ──
DO $fam_30$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Thalapathi', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '3247, Vittoria Loop', 'Dublin', 'CA', '94568', '3247, Vittoria Loop, Dublin, CA 94568', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Prabhakar', 'Thalapathi', 'Prabhakar Thalapathi', 'husband', '(937) 830-9655', 'prabhakar.thalapathi@gmail.com', 10, 14, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Eileen', 'Nelson', 'Eileen Nelson', 'wife', '(937) 829-2840', 'eileen2eileen@gmail.com', 4, 10, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Joshwyn', 'Thalapathi', 'Joshwyn Thalapathi', 'child', NULL, NULL, 6, 12, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Jayden', 'Thalapathi', 'Jayden Thalapathi', 'child', NULL, NULL, 7, 20, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 5, 9, NULL);
END;
$fam_30$;

-- ── Family 32: Mani ──
DO $fam_31$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Mani', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '1035 S Atwood Ct', 'Mountain House', 'CA', '95391', '1035 S Atwood Ct, Mountain House, CA 95391', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Mani', '', 'Mani', 'husband', '(469) 408-3196', 'dssmani@yahoo.com', 2, 20, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Daisy', '', 'Daisy', 'wife', '(408) 802-7171', 'daisystephen@yahoo.com', 1, 8, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Talya', 'Siv', 'Talya Siv', 'child', NULL, NULL, 2, 4, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Diya', 'Siv', 'Diya Siv', 'child', NULL, NULL, 9, 27, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 8, 20, NULL);
END;
$fam_31$;

-- ── Family 33: Permatigari ──
DO $fam_32$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Permatigari', '(510) 574-7712', true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '213 Candytuff Court', 'San Ramon', 'CA', '94582', '213 Candytuff Court, San Ramon, CA 94582', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Daniel', 'Permatigari', 'Daniel Permatigari', 'husband', '(408) 230-0328', 'daniel_shazer@hotmail.com', 8, 28, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Shirin', 'Permatigari', 'Shirin Permatigari', 'wife', '(408) 393-0441', 'shirin_suma@yahoo.com', 9, 23, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Benita', 'Permatigari', 'Benita Permatigari', 'child', NULL, NULL, 5, 10, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Andrew', 'Permatigari', 'Andrew Permatigari', 'child', NULL, NULL, 3, 21, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 5, 11, NULL);
END;
$fam_32$;

-- ── Family 34: Pulla ──
DO $fam_33$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Pulla', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '842 Bandol Way', 'San Ramon', 'CA', '94582', '842 Bandol Way, San Ramon, CA 94582', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Sudhir', 'Pulla', 'Sudhir Pulla', 'husband', '(510) 209-6606', 'spulla@yahoo.com', 10, 19, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Smitha', 'Korani', 'Smitha Korani', 'wife', '650-868-42778', 'smithakorani@gmail.com', 6, 30, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Tanya', 'Pulla', 'Tanya Pulla', 'child', NULL, NULL, 1, 13, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Raima', 'Pulla', 'Raima Pulla', 'child', NULL, NULL, 2, 3, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 1, 6, NULL);
END;
$fam_33$;

-- ── Family 35: Prabhakar ──
DO $fam_34$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Prabhakar', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '973 Richard Ln', 'Danville', 'CA', '94526', '973 Richard Ln, Danville, CA 94526', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Joseph', 'Prabhakar', 'Joseph Prabhakar', 'husband', '(650) 823-2267', 'jprabhakar@gmail.com', 5, 15, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Padmini', 'Prabhakar', 'Padmini Prabhakar', 'wife', '(510) 551-6670', 'mini001@gmail.com', 2, 4, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Kevin', 'Prabhakar', 'Kevin Prabhakar', 'child', NULL, NULL, 8, 17, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Kenneth', 'Prabhakar', 'Kenneth Prabhakar', 'child', NULL, NULL, 12, 12, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 12, 15, NULL);
END;
$fam_34$;

-- ── Family 36: Gowri Shankar ──
DO $fam_35$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Gowri Shankar', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Vikram', 'Gowri Shankar', 'Vikram Gowri Shankar', 'husband', '(551) 574-8765', 'vg4390@gmail.com', 3, 4, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Nivida', '', 'Nivida', 'wife', NULL, NULL, NULL, NULL, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

END;
$fam_35$;

-- ── Family 37: Lenin Jebaraj ──
DO $fam_36$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Lenin Jebaraj', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '5653 Jacquilne Way, Apt #43', 'Livermore', 'CA', '94550', '5653 Jacquilne Way, Apt #43, Livermore, CA 94550', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Lenin', 'Jebaraj', 'Lenin Jebaraj', 'husband', NULL, 'leninwaits@gmail.com', 1, 14, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Angeline', 'Lenin', 'Angeline Lenin', 'wife', '(925) 961-7542', 'angelin.r@gmail.com', 3, 8, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Anni', 'Veronica', 'Anni Veronica', 'child', NULL, NULL, 12, 26, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Valentina', 'Jebaraj', 'Valentina Jebaraj', 'child', NULL, NULL, 1, 8, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Evangelin', 'Jebaraj', 'Evangelin Jebaraj', 'child', NULL, NULL, 5, 25, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 6, 21, NULL);
END;
$fam_36$;

-- ── Family 38: Samuel Joselyn ──
DO $fam_37$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Samuel Joselyn', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '199 Scott Creekway', 'Brentwood', 'CA', '94513', '199 Scott Creekway, Brentwood, CA 94513', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Edin', 'Samuel Joselyn', 'Edin Samuel Joselyn', 'husband', '(832) 805-7918', 'edin.joselyn@gmail.com', 7, 14, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Anusha', 'Goldi Davidson', 'Anusha Goldi Davidson', 'wife', '(408) 207-2858', 'goldi_anusha@yahoo.com', 3, 24, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Crischen', 'Samuel', 'Crischen Samuel', 'child', NULL, NULL, 10, 31, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Kezia', 'Samuel', 'Kezia Samuel', 'child', NULL, NULL, 11, 28, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 2, 27, NULL);
END;
$fam_37$;

-- ── Family 39: Prashanth ──
DO $fam_38$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Prashanth', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '1010 Vista Point Circle', 'San Ramon', 'CA', '94582', '1010 Vista Point Circle, San Ramon, CA 94582', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Allan', 'Prashanth', 'Allan Prashanth', 'husband', '(315) 439-4386', 'allanprasanth@gmail.com', 4, 21, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Jennifer', 'Allan', 'Jennifer Allan', 'wife', '(315) 439-4671', 'martin.jenniallan@gmail.com', 10, 5, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Jason', 'Allan', 'Jason Allan', 'child', NULL, NULL, 11, 11, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Nathan', 'Boaz Allan', 'Nathan Boaz Allan', 'child', NULL, NULL, 10, 28, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 8, 11, NULL);
END;
$fam_38$;

-- ── Family 40: Santhosam ──
DO $fam_39$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Santhosam', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '629 Country Brook Loop', 'San Ramon', 'CA', '94583', '629 Country Brook Loop, San Ramon, CA 94583', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Paul', 'Santhosam', 'Paul Santhosam', 'husband', '(925) 364-1472', 'paul.paul249@gmail.com', 8, 29, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Dolly', 'Angel', 'Dolly Angel', 'wife', '(510) 514-1150', 'shobidoll@gmail.com', 7, 4, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Noel', 'Santhosh', 'Noel Santhosh', 'child', NULL, NULL, 3, 27, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Joel', 'Sherwin', 'Joel Sherwin', 'child', NULL, NULL, 12, 5, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 7, 2, NULL);
END;
$fam_39$;

-- ── Family 41: Robert Samuel ──
DO $fam_40$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Robert Samuel', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '1577 S Sherman Street', 'Mountain House', 'CA', '95391', '1577 S Sherman Street, Mountain House, CA 95391', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Robert', 'Samuel', 'Robert Samuel', 'husband', '(530) 744-9411', 'robby.sam@gmail.com', 10, 5, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Nalini', 'Robert', 'Nalini Robert', 'wife', '(669) 261-9006', 'nalinimegan82@gmail.com', 6, 5, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Asterina', 'Samuel', 'Asterina Samuel', 'child', NULL, NULL, 6, 24, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Justin', 'Samuel', 'Justin Samuel', 'child', NULL, NULL, 2, 1, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 7, 14, NULL);
END;
$fam_40$;

-- ── Family 42: Raja ──
DO $fam_41$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Raja', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '330 Jade Ct', 'San Ramon', 'CA', '94582', '330 Jade Ct, San Ramon, CA 94582', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Ramesh', 'Raja', 'Ramesh Raja', 'husband', '(408) 821-3193', 'ramesh.priscy@gmail.com', 5, 1, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Priscilla', 'Palani', 'Priscilla Palani', 'wife', '(650) 713-9638', 'prisci.me1999@gmail.com', 10, 17, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Lydia', 'Carissa Ramesh', 'Lydia Carissa Ramesh', 'child', NULL, NULL, 5, 9, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 1, 3, NULL);
END;
$fam_41$;

-- ── Family 43: Albert Jebaraj ──
DO $fam_42$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Albert Jebaraj', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '4536 Pisano Terrace', 'Dublin', 'CA', '94568', '4536 Pisano Terrace, Dublin, CA 94568', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Albert', 'Jebaraj', 'Albert Jebaraj', 'husband', '408-505-51311', 'albert.jebaraj@gmail.com', 7, 29, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Stella', 'Albert', 'Stella Albert', 'wife', '(510) 709-7525', 'stella.albert27@gmail.com', 8, 16, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Eliana', 'Albert', 'Eliana Albert', 'child', NULL, NULL, 10, 28, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Ivan', 'Albert', 'Ivan Albert', 'child', NULL, NULL, 5, 25, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Isaac', 'Albert', 'Isaac Albert', 'child', NULL, NULL, 12, 16, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 11, 27, NULL);
END;
$fam_42$;

-- ── Family 44: Bharathi Mahalingam ──
DO $fam_43$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Bharathi Mahalingam', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '265 Reflection Dr, Apt 17', 'San Ramon', 'CA', '94583', '265 Reflection Dr, Apt 17, San Ramon, CA 94583', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Kesava', 'Bharathi Mahalingam', 'Kesava Bharathi Mahalingam', 'husband', '(201) 647-3828', 'mkesavabharathi@gmail.com', 11, 25, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Preethi', 'John William', 'Preethi John William', 'wife', '(925) 915-0403', 'preethi.keshav@gmail.com', 3, 21, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Evyn', 'Bharathi Mahalingam', 'Evyn Bharathi Mahalingam', 'child', NULL, NULL, 6, 14, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Davyn', 'Bharathi Mahalingam', 'Davyn Bharathi Mahalingam', 'child', NULL, NULL, 5, 27, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 6, 9, NULL);
END;
$fam_43$;

-- ── Family 45: Stanley ──
DO $fam_44$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Stanley', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '103 Enchanted Way', 'San Ramon', 'CA', '94583', '103 Enchanted Way, San Ramon, CA 94583', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'John', 'Stanley', 'John Stanley', 'husband', NULL, 'johnsstanley@gmail.com', 1, 31, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Suja', 'Stanley', 'Suja Stanley', 'wife', '(408) 858-4861', 'sujaskumar145@gmail.com', 7, 14, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Elijah', 'Stanley', 'Elijah Stanley', 'child', NULL, NULL, 9, 15, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 5, 9, NULL);
END;
$fam_44$;

-- ── Family 46: Kingson ──
DO $fam_45$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Kingson', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '1913 Canyon Village Circle', 'San Ramon', 'CA', '94582', '1913 Canyon Village Circle, San Ramon, CA 94582', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Kingson', '', 'Kingson', 'husband', '(479) 367-5979', 'kingsondaniel@gmail.com', 7, 13, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Nithya', 'Kingson', 'Nithya Kingson', 'wife', '(479) 844-1038', 'nithya.r.esther@gmail.com', 8, 30, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Bryton', 'Jones', 'Bryton Jones', 'child', NULL, NULL, 10, 13, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Bertina', 'Jazlyn', 'Bertina Jazlyn', 'child', NULL, NULL, 1, 5, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 10, 26, NULL);
END;
$fam_45$;

-- ── Family 47: Franklin ──
DO $fam_46$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Franklin', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '1959 Shasta Lane', 'Hercules', 'CA', '94547', '1959 Shasta Lane, Hercules, CA 94547', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Prashanth', 'Franklin', 'Prashanth Franklin', 'husband', '(415) 297-4862', 'prashant.isaac@gmail.com', 1, 20, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Nancy', '', 'Nancy', 'wife', '(415) 867-6005', 'nancy.beni21@gmail.com', 3, 21, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Natanya', 'Franklin', 'Natanya Franklin', 'child', NULL, NULL, 7, 19, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Gianna', 'Franklin', 'Gianna Franklin', 'child', NULL, NULL, 11, 19, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 12, 29, NULL);
END;
$fam_46$;

-- ── Family 48: Sam Durairaj ──
DO $fam_47$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Sam Durairaj', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '2720 Mountain Ash Ln', 'San Ramon', 'CA', '94582', '2720 Mountain Ash Ln, San Ramon, CA 94582', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Immanuel', 'Sam Durairaj', 'Immanuel Sam Durairaj', 'husband', '(408) 505-5807', 'samrules111@gmail.com', 6, 6, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Uma', 'Immanuel Sam', 'Uma Immanuel Sam', 'wife', '(669) 234-6477', 'uma932016@gmail.com', 9, 25, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Jayden', 'Raj Immanuel', 'Jayden Raj Immanuel', 'child', NULL, NULL, 1, 12, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Jefita', 'Serah Immanuel', 'Jefita Serah Immanuel', 'child', NULL, NULL, 10, 1, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 4, 4, NULL);
END;
$fam_47$;

-- ── Family 49: Jeyaraj ──
DO $fam_48$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Jeyaraj', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '3607 Mccormick Court', 'Dublin', 'CA', '94568', '3607 Mccormick Court, Dublin, CA 94568', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'John', 'Jeyaraj', 'John Jeyaraj', 'husband', '(650) 766-4668', 'johngjeyaraj@gmail.com', 8, 10, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Anita', 'Jebaraj', 'Anita Jebaraj', 'wife', '(650) 954-0132', 'anita.tvl@gmail.com', 5, 11, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Jiana', 'Ashlyn John', 'Jiana Ashlyn John', 'child', NULL, NULL, 12, 14, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 7, 9, NULL);
END;
$fam_48$;

-- ── Family 50: Patrick ──
DO $fam_49$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Patrick', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '187 Scott Creek Way', 'Brentwood', 'CA', '94513', '187 Scott Creek Way, Brentwood, CA 94513', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Manoj', 'Patrick', 'Manoj Patrick', 'husband', '(224) 300-8812', 'manojpatrick.j@gmail.com', 3, 30, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Jerin', 'Sharmili', 'Jerin Sharmili', 'wife', '(650) 445-1109', 'jerin.dgl@gmail.com', 12, 3, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Megna', 'Patrick', 'Megna Patrick', 'child', NULL, NULL, 6, 21, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Zara', 'Partick', 'Zara Partick', 'child', NULL, NULL, 11, 15, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Zayne', 'Patrick', 'Zayne Patrick', 'child', NULL, NULL, 9, 19, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 10, 19, NULL);
END;
$fam_49$;

-- ── Family 51: Selvaraj ──
DO $fam_50$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Selvaraj', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '6449 Almaden Way', 'Livermore', 'CA', '94551', '6449 Almaden Way, Livermore, CA 94551', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Anthony', 'Selvaraj', 'Anthony Selvaraj', 'husband', '(408) 718-5584', 'anthonyraj.s@icloud.com', 11, 14, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Minu', 'Anthony', 'Minu Anthony', 'wife', '(408) 368-2514', 'minu.princy@gmail.com', 10, 19, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Nathan', 'Anthony', 'Nathan Anthony', 'child', NULL, NULL, 10, 13, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 12, 2, NULL);
END;
$fam_50$;

-- ── Family 52: Devadoss ──
DO $fam_51$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Devadoss', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '151 Chestnut Drive', 'Hercules', 'CA', '94547', '151 Chestnut Drive, Hercules, CA 94547', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Madhan', 'Devadoss', 'Madhan Devadoss', 'husband', '(707) 673-7317', 'madhan.devadoss@gmail.com', 7, 2, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Pratheepa', 'Rajasingh', 'Pratheepa Rajasingh', 'wife', '(510) 306-8977', 'pratheepasingh@gmail.com', 10, 20, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Sathya', 'Devadoss', 'Sathya Devadoss', 'child', NULL, NULL, 9, 27, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Soorya', 'Devadoss', 'Soorya Devadoss', 'child', NULL, NULL, 1, 23, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 7, 1, NULL);
END;
$fam_51$;

-- ── Family 53: Stephen ──
DO $fam_52$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Stephen', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '9762 Tareyton Ave', 'San Ramon', 'CA', '94583', '9762 Tareyton Ave, San Ramon, CA 94583', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Wilson', 'Stephen', 'Wilson Stephen', 'husband', '(408) 799-7099', 'wilson2u@gmail.com', 11, 2, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Lydia', 'Wilson', 'Lydia Wilson', 'wife', '(408) 550-3453', 'connectlydia25@gmail.com', 8, 30, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Riya', 'Wilson', 'Riya Wilson', 'child', NULL, NULL, 5, 26, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Ethan', 'Wilson', 'Ethan Wilson', 'child', NULL, NULL, 2, 12, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 5, 25, NULL);
END;
$fam_52$;

-- ── Family 54: Balasingh ──
DO $fam_53$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Balasingh', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '4332 Valley Ave, Apt C', 'Pleasanton', 'CA', '94566', '4332 Valley Ave, Apt C, Pleasanton, CA 94566', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Bowas', 'Balasingh', 'Bowas Balasingh', 'husband', '(669) 677-2558', 'bowasvibin@gmail.com', 4, 18, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Jenifer', 'Nisha Bowas', 'Jenifer Nisha Bowas', 'wife', '(669) 677-2559', 'jeni.vib@gmail.com', 5, 8, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Annshea', 'Rihana Bowas', 'Annshea Rihana Bowas', 'child', NULL, NULL, 9, 25, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Alfrid', 'Ryaan', 'Alfrid Ryaan', 'child', NULL, NULL, 1, 22, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 5, 5, NULL);
END;
$fam_53$;

-- ── Family 55: Hayward ──
DO $fam_54$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Hayward', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '932 Winsford Court', 'San Ramon', 'CA', '94583', '932 Winsford Court, San Ramon, CA 94583', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Shiva', '', 'Shiva', 'husband', NULL, NULL, NULL, NULL, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Charmaine', 'Hayward', 'Charmaine Hayward', 'wife', '(408) 931-1567', 'charmnar@gmail.com', 1, 20, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Agalya', 'Hayward', 'Agalya Hayward', 'child', NULL, NULL, NULL, NULL, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Ameya', 'Hayward', 'Ameya Hayward', 'child', NULL, NULL, NULL, NULL, NULL, true, false, false);
END;
$fam_54$;

-- ── Family 56: Sheela ──
DO $fam_55$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Sheela', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '3819 Junefiels Street', 'Tracy', 'CA', '95377', '3819 Junefiels Street, Tracy, CA 95377', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Thangaraj', '', 'Thangaraj', 'husband', '(469) 901-4316', 'mails2thangaraj@gmail.com', 2, 17, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Jeya', 'Sheela', 'Jeya Sheela', 'wife', '(626) 991-5328', 'jay.sheel02@gmail.com', 2, 27, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Jake', 'Dawson', 'Jake Dawson', 'child', NULL, NULL, 3, 5, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Jade', 'Liya', 'Jade Liya', 'child', NULL, NULL, 6, 18, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 5, 9, NULL);
END;
$fam_55$;

-- ── Family 57: Sudarsan ──
DO $fam_56$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Sudarsan', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '2895 Ski Beach Streer', 'Manteca', 'CA', '95337', '2895 Ski Beach Streer, Manteca, CA 95337', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Balaji', 'Sudarsan', 'Balaji Sudarsan', 'husband', '(510) 362-9954', 'sbalaji1120@gmail.com', 5, 31, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Shaloam', 'Pearlin Devarajan', 'Shaloam Pearlin Devarajan', 'wife', '(510) 362-1560', 'shaloam.pearlin@gmail.com', 8, 31, NULL, true, false, false)
  RETURNING id INTO v_wife_id;


  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 7, 12, NULL);
END;
$fam_56$;

-- ── Family 58: Christopher ──
DO $fam_57$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Christopher', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '255 Coggins Drive, Apt A1', 'Pleasant Hill', 'CA', '94523', '255 Coggins Drive, Apt A1, Pleasant Hill, CA 94523', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Obadiah', 'Christopher', 'Obadiah Christopher', 'husband', '(925) 744-9600', 'informaniac@gmail.com', 12, 25, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Meenakshi', 'Naidu', 'Meenakshi Naidu', 'wife', '(925) 765-2407', 'meenakshi.naiduu@gmail.com', 1, 28, NULL, true, false, false)
  RETURNING id INTO v_wife_id;


  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 1, 21, NULL);
END;
$fam_57$;

-- ── Family 59: Jayaseelan ──
DO $fam_58$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Jayaseelan', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '707 W Questa Trail', 'Mountain House', 'CA', '95391', '707 W Questa Trail, Mountain House, CA 95391', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Gopi', '', 'Gopi', 'husband', '(732) 771-1410', 'krish.s.gopi@gmail.com', 4, 21, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Madhu', 'Jayaseelan', 'Madhu Jayaseelan', 'wife', '(510) 931-9343', 'madhuj@gmail.com', 7, 30, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Yuvan', 'Jayaseelan', 'Yuvan Jayaseelan', 'child', NULL, NULL, 7, 31, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Nilavan', 'Jayaseelan', 'Nilavan Jayaseelan', 'child', NULL, NULL, 8, 1, NULL, true, false, false);
END;
$fam_58$;

-- ── Family 60: Finlayson ──
DO $fam_59$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Finlayson', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '7515 San Sabana Rd', 'Dublin', 'CA', '94568', '7515 San Sabana Rd, Dublin, CA 94568', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Daniel', 'Finlayson', 'Daniel Finlayson', 'husband', '(818) 915-2414', 'daniel.finlayson@gmail.com', 7, 23, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Neysa', 'Finlayson', 'Neysa Finlayson', 'wife', '(415) 316-8442', 'neysa.renita@gmail.com', 3, 16, NULL, true, false, false)
  RETURNING id INTO v_wife_id;


  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 12, 8, NULL);
END;
$fam_59$;

-- ── Family 61: Sigamala ──
DO $fam_60$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Sigamala', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '6400 Christie Ave', 'Emeryville', 'CA', '94608', '6400 Christie Ave, Emeryville, CA 94608', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Sigamala', '', 'Sigamala', 'husband', NULL, NULL, NULL, NULL, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Rachel', 'Sigamala', 'Rachel Sigamala', 'wife', '(512) 348-5222', 'rsigamala@gmail.com', 10, 29, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

END;
$fam_60$;

-- ── Family 62: Chadalavada ──
DO $fam_61$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Chadalavada', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '3076 Leeds Land.', 'Tracy', 'CA', '95376', '3076 Leeds Land., Tracy, CA 95376', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Sunny', 'Chadalavada', 'Sunny Chadalavada', 'husband', '(650) 796-6778', NULL, 11, 17, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Anitha', 'Chadalavada', 'Anitha Chadalavada', 'wife', '(408) 973-9794', 'aneetha.ch@gmail.com', 11, 18, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Rini', 'Chadalavada', 'Rini Chadalavada', 'child', NULL, NULL, 4, 10, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Ron', 'Chadalavada', 'Ron Chadalavada', 'child', NULL, NULL, 1, 31, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 5, 8, NULL);
END;
$fam_61$;

-- ── Family 63: Elisha Prabhakar ──
DO $fam_62$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Elisha Prabhakar', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '4064 Cristobal Way', 'Pleasanton', 'CA', '94566', '4064 Cristobal Way, Pleasanton, CA 94566', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Stephen', 'Elisha Prabhakar', 'Stephen Elisha Prabhakar', 'husband', '(408) 772-1662', 'pastorelisha@christindia.org', 9, 19, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Shyla', 'Stephen Prabhakar', 'Shyla Stephen Prabhakar', 'wife', '(469) 826-2594', NULL, 5, 4, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Eric', 'Prince Stephen Prabhakar', 'Eric Prince Stephen Prabhakar', 'child', NULL, NULL, 9, 24, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Enrique', 'Chris Stephen Prabhakar', 'Enrique Chris Stephen Prabhakar', 'child', NULL, NULL, 9, 21, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 1, 7, NULL);
END;
$fam_62$;

-- ── Family 64: Raja Samuel Selvin ──
DO $fam_63$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Raja Samuel Selvin', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '452 Bixby Dr', 'Milpitas', 'CA', '95035', '452 Bixby Dr, Milpitas, CA 95035', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Vikash', 'Raja Samuel Selvin', 'Vikash Raja Samuel Selvin', 'husband', '(408) 416-7074', 'trifysam@gmail.com', 1, 7, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Tryphena', 'Pasupathy', 'Tryphena Pasupathy', 'wife', '(669) 247-8443', 'trifysam@gmail.com', 12, 13, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Shiphrah', 'Samuel-tryphena', 'Shiphrah Samuel-tryphena', 'child', NULL, NULL, 4, 2, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Japheth', 'Samuel-tryphena', 'Japheth Samuel-tryphena', 'child', NULL, NULL, 10, 28, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 12, 21, NULL);
END;
$fam_63$;

-- ── Family 65: Ravindran ──
DO $fam_64$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Ravindran', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '3470 Andrews Drive, Apt 103', 'Pleasanton', 'CA', '94588', '3470 Andrews Drive, Apt 103, Pleasanton, CA 94588', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Rajive', 'Ravindran', 'Rajive Ravindran', 'husband', '(925) 568-6335', 'rajiveravindran@gmail.com', 10, 17, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Deepika', 'Jeyasingh', 'Deepika Jeyasingh', 'wife', '(925) 860-9725', 'deepikajeyasingh@gmail.com', 8, 10, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Randeep', 'Moses Rajive', 'Randeep Moses Rajive', 'child', NULL, NULL, 2, 15, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 1, 21, NULL);
END;
$fam_64$;

-- ── Family 66: Jothi ──
DO $fam_65$
DECLARE
  v_family_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Jothi', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '5200 Ironhorse Pkwy, Apt 125', 'Dublin', 'CA', '94568', '5200 Ironhorse Pkwy, Apt 125, Dublin, CA 94568', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Shilpa', 'Jothi', 'Shilpa Jothi', 'wife', '(415) 713-6081', 'shilpajacq@gmail.com', 12, 3, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Tyler', 'James Persall', 'Tyler James Persall', 'child', NULL, NULL, 6, 13, NULL, true, false, false);
END;
$fam_65$;

-- ── Family 67: Nirmal ──
DO $fam_66$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Nirmal', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '4930 Owens Drive, Apt 1021', 'Pleasanton', 'CA', '94588', '4930 Owens Drive, Apt 1021, Pleasanton, CA 94588', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Nathaniel', 'Nirmal', 'Nathaniel Nirmal', 'husband', '(914) 879-9016', 'nathanielat@gmail.com', 4, 16, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

END;
$fam_66$;

-- ── Family 68: Rajendran ──
DO $fam_67$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Rajendran', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '3911 Fairlands Drive', 'Pleasanton', 'CA', '94588', '3911 Fairlands Drive, Pleasanton, CA 94588', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Joshua', 'Rajendran', 'Joshua Rajendran', 'husband', '(612) 413-6600', 'joshuaemerson.r@gmail.com', 11, 30, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Karunya', 'Joshua', 'Karunya Joshua', 'wife', '(925) 750-3676', 'rkarunya@gmail.com', 11, 3, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Ronell', 'Joshua', 'Ronell Joshua', 'child', NULL, NULL, 5, 15, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Immanuel', 'Joshua', 'Immanuel Joshua', 'child', NULL, NULL, 4, 2, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 5, 25, NULL);
END;
$fam_67$;

-- ── Family 69: John ──
DO $fam_68$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'John', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '4327 Fitzwilliam St', 'Dublin', 'CA', '94568', '4327 Fitzwilliam St, Dublin, CA 94568', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Ephraim', 'John', 'Ephraim John', 'husband', '(804) 290-3657', 'ephraimraja77@gmail.com', 10, 15, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Josephine', '', 'Josephine', 'wife', '(804) 290-3392', 'josephineraj.m@gmail.com', 11, 20, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Chris', 'Jason', 'Chris Jason', 'child', NULL, NULL, 2, 15, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 2, 23, NULL);
END;
$fam_68$;

-- ── Family 70: Chandrashaker ──
DO $fam_69$
DECLARE
  v_family_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Chandrashaker', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '232 Via Encanto', 'San Ramon', 'CA', '94583', '232 Via Encanto, San Ramon, CA 94583', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Bharathi', 'Chandrashaker', 'Bharathi Chandrashaker', 'wife', '(612) 704-6455', 'vbharathic@gmail.com', NULL, NULL, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

END;
$fam_69$;

-- ── Family 71: Anitha ──
DO $fam_70$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Anitha', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Anitha', '', 'Anitha', 'husband', '(925) 931-2296', 'anirich@yahoo.com', NULL, NULL, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

END;
$fam_70$;

-- ── Family 72: Joel ──
DO $fam_71$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Joel', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Moses', 'Joel', 'Moses Joel', 'husband', NULL, NULL, 3, 14, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Cynthia', '', 'Cynthia', 'wife', '(925) 202-9561', NULL, 6, 30, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Joshna', 'Adline', 'Joshna Adline', 'child', NULL, NULL, 3, 11, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 3, 3, NULL);
END;
$fam_71$;

-- ── Family 73: Gundi ──
DO $fam_72$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Gundi', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Sheila', 'Gundi', 'Sheila Gundi', 'husband', NULL, NULL, NULL, NULL, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

END;
$fam_72$;

-- ── Family 74: Siluvainathan ──
DO $fam_73$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Siluvainathan', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '108 Moundhaven Court', 'San Jose', 'CA', '95120', '108 Moundhaven Court, San Jose, CA 95120', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Melky', 'Siluvainathan', 'Melky Siluvainathan', 'husband', '(408) 444-1853', 'melky.raj@gmail.com', 7, 31, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Hephzi', 'Melky', 'Hephzi Melky', 'wife', '(408) 620-7546', 'hephzimelky@gmail.com', 5, 22, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Sarah', 'Melky', 'Sarah Melky', 'child', NULL, NULL, 6, 1, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Sarumathi', 'Melky', 'Sarumathi Melky', 'child', NULL, NULL, 2, 1, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 10, 27, NULL);
END;
$fam_73$;

-- ── Family 75: Sam ──
DO $fam_74$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Sam', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Charles', 'Sam', 'Charles Sam', 'husband', '(510) 737-3663', 'charlesmanovasam@gmail.com', 9, 8, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Shirlin', 'Charles', 'Shirlin Charles', 'wife', '91 89394 25348', 'shirlin0302@gmail.com', 2, 3, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Natanya', 'Charles', 'Natanya Charles', 'child', NULL, NULL, 1, 9, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 8, 23, NULL);
END;
$fam_74$;

-- ── Family 76: Bollipo ──
DO $fam_75$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Bollipo', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '313 Adelaide Hills Ct.', 'San Ramon', 'CA', '94582', '313 Adelaide Hills Ct., San Ramon, CA 94582', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Sundeep', 'Bollipo', 'Sundeep Bollipo', 'husband', '(415) 279-0102', 'sunnymailbox101@gmail.com', 10, 5, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Aditi', 'Bollipo', 'Aditi Bollipo', 'wife', '(415) 629-4076', 'aditi.bollipo@gmail.com', 8, 25, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'David', 'Bollipo', 'David Bollipo', 'child', NULL, NULL, 5, 21, NULL, true, false, false);
  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Joshua', 'Bollipo', 'Joshua Bollipo', 'child', NULL, NULL, 6, 9, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 12, 15, NULL);
END;
$fam_75$;

-- ── Family 77: Joseph ──
DO $fam_76$
DECLARE
  v_family_id uuid;
  v_husband_id uuid;
  v_wife_id uuid;
BEGIN
  INSERT INTO families (id, family_name, home_phone, is_active, notes)
  VALUES (gen_random_uuid(), 'Joseph', NULL, true, NULL)
  RETURNING id INTO v_family_id;

  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)
  VALUES (gen_random_uuid(), v_family_id, '6314 Bray Ct', 'Dublin', 'CA', '94568', '6314 Bray Ct, Dublin, CA 94568', true);

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Alwin', 'Joseph', 'Alwin Joseph', 'husband', '(669) 253-9376', 'alwinjosh@gmail.com', 12, 2, NULL, true, false, false)
  RETURNING id INTO v_husband_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Priya', '', 'Priya', 'wife', '(669) 600-9873', 'priyafran@gmail.com', 3, 29, NULL, true, false, false)
  RETURNING id INTO v_wife_id;

  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)
  VALUES (gen_random_uuid(), v_family_id, 'Dheera', 'Sharon', 'Dheera Sharon', 'child', NULL, NULL, 2, 22, NULL, true, false, false);

  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)
  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, 2, 22, NULL);
END;
$fam_76$;

COMMIT;

-- Verify counts:
SELECT 'families' AS entity, count(*) FROM families
UNION ALL SELECT 'members', count(*) FROM members
UNION ALL SELECT 'addresses', count(*) FROM addresses
UNION ALL SELECT 'anniversaries', count(*) FROM wedding_anniversaries;