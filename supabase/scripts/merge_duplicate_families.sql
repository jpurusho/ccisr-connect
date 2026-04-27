-- =============================================================================
-- MERGE DUPLICATE FAMILIES
-- =============================================================================
-- This script finds families with the same family_name, picks a "primary" for
-- each group (the one with the most data), and consolidates all members,
-- addresses, and anniversaries into the primary. It also deduplicates members
-- within the same family (same full_name + same family_id).
--
-- Usage:
--   1. Run SECTION 1 (the diagnostic query) by itself to review duplicates.
--   2. Once satisfied, run SECTION 2 (the merge) in the Supabase SQL Editor.
-- =============================================================================


-- =============================================================================
-- SECTION 1: DIAGNOSTIC — Run this first to review
-- =============================================================================
-- This query finds ALL families that share a family_name with at least one
-- other family. For each, it shows member count, address info, and anniversary
-- info so you can see which record has more data.
-- =============================================================================

/*  -- Uncomment this block to run the diagnostic query

SELECT
    f.family_name,
    f.id AS family_id,
    f.home_phone,
    f.is_active,
    f.created_at,
    -- Member summary
    (SELECT count(*) FROM members m WHERE m.family_id = f.id) AS member_count,
    (SELECT string_agg(m.full_name || ' (' || m.role_in_family || ')', ', ' ORDER BY m.role_in_family, m.full_name)
     FROM members m WHERE m.family_id = f.id) AS members_list,
    -- Address summary
    (SELECT count(*) FROM addresses a WHERE a.family_id = f.id) AS address_count,
    (SELECT string_agg(a.full_address, '; ')
     FROM addresses a WHERE a.family_id = f.id AND a.is_current = true) AS current_addresses,
    -- Anniversary summary
    (SELECT count(*) FROM wedding_anniversaries wa WHERE wa.family_id = f.id) AS anniversary_count,
    (SELECT string_agg(
        wa.anniversary_month::text || '/' || wa.anniversary_day::text
        || COALESCE('/' || wa.anniversary_year::text, ''),
        ', '
     )
     FROM wedding_anniversaries wa WHERE wa.family_id = f.id) AS anniversaries,
    -- Event instance hosting (families referenced as hosts)
    (SELECT count(*) FROM event_instances ei WHERE ei.host_family_id = f.id) AS host_count,
    -- Mailing list memberships (via members)
    (SELECT count(*) FROM mailing_list_members mlm
     JOIN members m2 ON m2.id = mlm.member_id
     WHERE m2.family_id = f.id) AS mailing_list_refs
FROM families f
WHERE f.family_name IN (
    SELECT family_name
    FROM families
    GROUP BY family_name
    HAVING count(*) > 1
)
ORDER BY f.family_name, f.created_at;

*/


-- =============================================================================
-- SECTION 2: MERGE — Run this after reviewing the diagnostic output
-- =============================================================================

DO $$
DECLARE
    v_group           RECORD;   -- one row per duplicate family_name
    v_primary_id      uuid;     -- the chosen "keep" family
    v_secondary       RECORD;   -- each family to be merged into primary
    v_member          RECORD;   -- for iterating members during dedup
    v_kept_member_id  uuid;
    v_dup_member      RECORD;
    v_moved_members   int;
    v_moved_addresses int;
    v_moved_anniv     int;
    v_deleted_families int := 0;
    v_deduped_members  int := 0;
    v_total_groups     int := 0;
BEGIN

    RAISE NOTICE '=== Starting duplicate family merge ===';

    -- -------------------------------------------------------------------------
    -- STEP 1: Loop through each family_name that appears more than once
    -- -------------------------------------------------------------------------
    FOR v_group IN
        SELECT family_name
        FROM families
        GROUP BY family_name
        HAVING count(*) > 1
        ORDER BY family_name
    LOOP
        v_total_groups := v_total_groups + 1;
        RAISE NOTICE '';
        RAISE NOTICE '--- Processing duplicate group: "%" ---', v_group.family_name;

        -- -----------------------------------------------------------------
        -- STEP 2: Pick the "primary" family — the one with the most data.
        -- Scoring: +10 if it has any address, +10 if it has any anniversary,
        --          +1 per member, +5 if home_phone is set, +2 if notes set.
        -- Ties broken by earliest created_at (oldest record wins).
        -- -----------------------------------------------------------------
        SELECT f.id INTO v_primary_id
        FROM families f
        WHERE f.family_name = v_group.family_name
        ORDER BY
            (
                (SELECT count(*) FROM members m WHERE m.family_id = f.id)
                + CASE WHEN EXISTS (SELECT 1 FROM addresses a WHERE a.family_id = f.id) THEN 10 ELSE 0 END
                + CASE WHEN EXISTS (SELECT 1 FROM wedding_anniversaries wa WHERE wa.family_id = f.id) THEN 10 ELSE 0 END
                + CASE WHEN f.home_phone IS NOT NULL AND f.home_phone <> '' THEN 5 ELSE 0 END
                + CASE WHEN f.notes IS NOT NULL AND f.notes <> '' THEN 2 ELSE 0 END
            ) DESC,
            f.created_at ASC
        LIMIT 1;

        RAISE NOTICE 'Primary family chosen: %', v_primary_id;

        -- -----------------------------------------------------------------
        -- STEP 3: For each secondary family, move its children to primary
        -- -----------------------------------------------------------------
        FOR v_secondary IN
            SELECT f.id
            FROM families f
            WHERE f.family_name = v_group.family_name
              AND f.id <> v_primary_id
            ORDER BY f.created_at ASC
        LOOP
            RAISE NOTICE '  Merging secondary family % into primary %', v_secondary.id, v_primary_id;

            -- 3a. Move members to the primary family
            UPDATE members
            SET family_id = v_primary_id
            WHERE family_id = v_secondary.id;
            GET DIAGNOSTICS v_moved_members = ROW_COUNT;
            RAISE NOTICE '    Moved % member(s)', v_moved_members;

            -- 3b. Move addresses that do not already exist on the primary.
            --     We compare by full_address to avoid true duplicates.
            WITH addrs_to_move AS (
                SELECT a.id
                FROM addresses a
                WHERE a.family_id = v_secondary.id
                  AND NOT EXISTS (
                      SELECT 1 FROM addresses ap
                      WHERE ap.family_id = v_primary_id
                        AND ap.full_address = a.full_address
                  )
            )
            UPDATE addresses
            SET family_id = v_primary_id
            WHERE id IN (SELECT id FROM addrs_to_move);
            GET DIAGNOSTICS v_moved_addresses = ROW_COUNT;
            RAISE NOTICE '    Moved % unique address(es)', v_moved_addresses;

            -- Delete any remaining duplicate addresses on the secondary
            -- (ones that matched an existing address on the primary)
            DELETE FROM addresses WHERE family_id = v_secondary.id;

            -- 3c. Move anniversaries that do not already exist on the primary.
            --     We compare by month + day + year to avoid duplicates.
            WITH anniv_to_move AS (
                SELECT wa.id
                FROM wedding_anniversaries wa
                WHERE wa.family_id = v_secondary.id
                  AND NOT EXISTS (
                      SELECT 1 FROM wedding_anniversaries wap
                      WHERE wap.family_id = v_primary_id
                        AND wap.anniversary_month = wa.anniversary_month
                        AND wap.anniversary_day   = wa.anniversary_day
                        AND (wap.anniversary_year IS NOT DISTINCT FROM wa.anniversary_year)
                  )
            )
            UPDATE wedding_anniversaries
            SET family_id = v_primary_id
            WHERE id IN (SELECT id FROM anniv_to_move);
            GET DIAGNOSTICS v_moved_anniv = ROW_COUNT;
            RAISE NOTICE '    Moved % unique anniversary(ies)', v_moved_anniv;

            -- Delete any remaining duplicate anniversaries on the secondary
            DELETE FROM wedding_anniversaries WHERE family_id = v_secondary.id;

            -- 3d. Update event_instances that reference the secondary as host
            UPDATE event_instances
            SET host_family_id = v_primary_id
            WHERE host_family_id = v_secondary.id;

            -- 3e. Merge family-level fields if primary is missing them
            UPDATE families
            SET
                home_phone = COALESCE(families.home_phone, sec.home_phone),
                notes = CASE
                    WHEN families.notes IS NULL OR families.notes = '' THEN sec.notes
                    WHEN sec.notes IS NOT NULL AND sec.notes <> '' THEN families.notes || E'\n' || sec.notes
                    ELSE families.notes
                END,
                is_active = families.is_active OR sec.is_active
            FROM families sec
            WHERE families.id = v_primary_id
              AND sec.id = v_secondary.id;

            -- 3f. Delete the now-empty secondary family
            --     (CASCADE will clean up any orphaned rows, but we already moved everything)
            DELETE FROM families WHERE id = v_secondary.id;
            v_deleted_families := v_deleted_families + 1;
            RAISE NOTICE '    Deleted secondary family %', v_secondary.id;
        END LOOP;

        -- -----------------------------------------------------------------
        -- STEP 4: Deduplicate members within the primary family.
        --         If multiple members share the same full_name AND family_id,
        --         keep the one with the most data (email, phone, birth info).
        -- -----------------------------------------------------------------
        FOR v_member IN
            SELECT full_name
            FROM members
            WHERE family_id = v_primary_id
            GROUP BY full_name
            HAVING count(*) > 1
        LOOP
            RAISE NOTICE '  Deduplicating member "%"  in family %', v_member.full_name, v_primary_id;

            -- Pick the best member to keep: most filled-in fields, oldest created_at for ties
            SELECT m.id INTO v_kept_member_id
            FROM members m
            WHERE m.family_id = v_primary_id
              AND m.full_name = v_member.full_name
            ORDER BY
                (
                    CASE WHEN m.email IS NOT NULL AND m.email <> '' THEN 1 ELSE 0 END
                    + CASE WHEN m.cell_phone IS NOT NULL AND m.cell_phone <> '' THEN 1 ELSE 0 END
                    + CASE WHEN m.birth_month IS NOT NULL THEN 1 ELSE 0 END
                    + CASE WHEN m.birth_day IS NOT NULL THEN 1 ELSE 0 END
                    + CASE WHEN m.birth_year IS NOT NULL THEN 1 ELSE 0 END
                    + CASE WHEN m.notes IS NOT NULL AND m.notes <> '' THEN 1 ELSE 0 END
                ) DESC,
                m.created_at ASC
            LIMIT 1;

            RAISE NOTICE '    Keeping member %', v_kept_member_id;

            -- For each duplicate to be removed, reassign their references first
            FOR v_dup_member IN
                SELECT m.id
                FROM members m
                WHERE m.family_id = v_primary_id
                  AND m.full_name = v_member.full_name
                  AND m.id <> v_kept_member_id
            LOOP
                -- Move member_tags (skip if tag already exists on kept member)
                INSERT INTO member_tags (member_id, tag_id)
                SELECT v_kept_member_id, mt.tag_id
                FROM member_tags mt
                WHERE mt.member_id = v_dup_member.id
                  AND NOT EXISTS (
                      SELECT 1 FROM member_tags mt2
                      WHERE mt2.member_id = v_kept_member_id
                        AND mt2.tag_id = mt.tag_id
                  )
                ON CONFLICT (member_id, tag_id) DO NOTHING;

                -- Move mailing_list_members references
                UPDATE mailing_list_members
                SET member_id = v_kept_member_id
                WHERE member_id = v_dup_member.id
                  AND NOT EXISTS (
                      SELECT 1 FROM mailing_list_members mlm2
                      WHERE mlm2.member_id = v_kept_member_id
                        AND mlm2.mailing_list_id = mailing_list_members.mailing_list_id
                  );
                -- Delete any remaining dups in mailing_list_members
                DELETE FROM mailing_list_members WHERE member_id = v_dup_member.id;

                -- Update wedding_anniversaries that reference this member
                UPDATE wedding_anniversaries
                SET husband_member_id = v_kept_member_id
                WHERE husband_member_id = v_dup_member.id;

                UPDATE wedding_anniversaries
                SET wife_member_id = v_kept_member_id
                WHERE wife_member_id = v_dup_member.id;

                -- Fill in missing data on the kept member from the duplicate
                UPDATE members
                SET
                    email      = COALESCE(members.email,      dup.email),
                    cell_phone = COALESCE(members.cell_phone,  dup.cell_phone),
                    birth_month = COALESCE(members.birth_month, dup.birth_month),
                    birth_day   = COALESCE(members.birth_day,   dup.birth_day),
                    birth_year  = COALESCE(members.birth_year,  dup.birth_year),
                    notes = CASE
                        WHEN members.notes IS NULL OR members.notes = '' THEN dup.notes
                        WHEN dup.notes IS NOT NULL AND dup.notes <> '' THEN members.notes || E'\n' || dup.notes
                        ELSE members.notes
                    END
                FROM members dup
                WHERE members.id = v_kept_member_id
                  AND dup.id = v_dup_member.id;

                -- Now safe to delete the duplicate member
                DELETE FROM members WHERE id = v_dup_member.id;
                v_deduped_members := v_deduped_members + 1;
                RAISE NOTICE '    Deleted duplicate member %', v_dup_member.id;
            END LOOP;
        END LOOP;

    END LOOP;

    -- -------------------------------------------------------------------------
    -- SUMMARY
    -- -------------------------------------------------------------------------
    RAISE NOTICE '';
    RAISE NOTICE '=== Merge complete ===';
    RAISE NOTICE 'Duplicate family groups processed: %', v_total_groups;
    RAISE NOTICE 'Secondary families deleted: %', v_deleted_families;
    RAISE NOTICE 'Duplicate members removed: %', v_deduped_members;

END $$;
