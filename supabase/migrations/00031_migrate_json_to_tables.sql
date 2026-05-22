-- =============================================================================
-- Data Migration: JSON blobs → relational tables
-- Extracts operational data from email_templates.body_template into new tables
-- Original body_template preserved for rollback
-- =============================================================================

-- Step 1: Migrate Bible Study locations + breaks
DO $$
DECLARE
    tmpl_rec RECORD;
    loc_data jsonb;
    loc_item jsonb;
    loc_idx int;
    new_loc_id uuid;
    brk_item jsonb;
    event_rec RECORD;
BEGIN
    -- Find the Bible Study event
    SELECT e.id INTO event_rec
    FROM events e
    JOIN event_types et ON e.event_type_id = et.id
    WHERE et.name = 'friday_bible_study'
    LIMIT 1;

    IF event_rec.id IS NULL THEN
        RAISE NOTICE 'No friday_bible_study event found, skipping location migration';
        RETURN;
    END IF;

    -- Get the default template for bible study
    SELECT body_template::jsonb AS data INTO tmpl_rec
    FROM email_templates et
    JOIN event_types evt ON et.event_type_id = evt.id
    WHERE evt.name = 'friday_bible_study' AND et.is_default = true
    LIMIT 1;

    IF tmpl_rec.data IS NULL THEN
        RAISE NOTICE 'No bible study template found';
        RETURN;
    END IF;

    loc_data := tmpl_rec.data->'locations';
    IF loc_data IS NULL OR jsonb_array_length(loc_data) = 0 THEN
        RAISE NOTICE 'No locations in bible study template';
        RETURN;
    END IF;

    loc_idx := 0;
    FOR loc_item IN SELECT * FROM jsonb_array_elements(loc_data)
    LOOP
        INSERT INTO event_locations (event_id, label, sort_order, address, city, phone)
        VALUES (
            event_rec.id,
            COALESCE(loc_item->>'label', 'Location ' || loc_idx),
            loc_idx,
            NULLIF(loc_item->>'address', 'TBD'),
            NULLIF(loc_item->>'city', ''),
            NULLIF(loc_item->>'phone', '')
        )
        RETURNING id INTO new_loc_id;

        -- Migrate breaks for this location
        IF loc_item->'breaks' IS NOT NULL AND jsonb_array_length(loc_item->'breaks') > 0 THEN
            FOR brk_item IN SELECT * FROM jsonb_array_elements(loc_item->'breaks')
            LOOP
                IF brk_item->>'from' != '' AND brk_item->>'to' != '' THEN
                    INSERT INTO event_breaks (event_id, location_id, start_date, end_date, message)
                    VALUES (
                        event_rec.id,
                        new_loc_id,
                        (brk_item->>'from')::date,
                        (brk_item->>'to')::date,
                        NULLIF(brk_item->>'message', '')
                    );
                END IF;
            END LOOP;
        END IF;

        loc_idx := loc_idx + 1;
    END LOOP;

    -- Migrate topic to events table
    IF tmpl_rec.data->>'topic' IS NOT NULL THEN
        UPDATE events SET topic = tmpl_rec.data->>'topic' WHERE id = event_rec.id;
    END IF;
END;
$$;

-- Step 2: Migrate Women's Study virtual config + location
DO $$
DECLARE
    tmpl_rec RECORD;
    event_rec RECORD;
BEGIN
    SELECT e.id INTO event_rec
    FROM events e
    JOIN event_types et ON e.event_type_id = et.id
    WHERE et.name = 'wednesday_womens_study'
    LIMIT 1;

    IF event_rec.id IS NULL THEN RETURN; END IF;

    SELECT body_template::jsonb AS data INTO tmpl_rec
    FROM email_templates et
    JOIN event_types evt ON et.event_type_id = evt.id
    WHERE evt.name = 'wednesday_womens_study' AND et.is_default = true
    LIMIT 1;

    IF tmpl_rec.data IS NULL THEN RETURN; END IF;

    -- Create location row
    INSERT INTO event_locations (event_id, label, sort_order, address)
    VALUES (
        event_rec.id,
        COALESCE(NULLIF(tmpl_rec.data->>'location', ''), 'Virtual'),
        0,
        NULLIF(tmpl_rec.data->>'location', '')
    );

    -- Migrate zoom config
    IF NULLIF(tmpl_rec.data->>'zoomLink', '') IS NOT NULL THEN
        INSERT INTO event_virtual_config (event_id, platform, meeting_link, meeting_id, passcode)
        VALUES (
            event_rec.id,
            'zoom',
            tmpl_rec.data->>'zoomLink',
            NULLIF(tmpl_rec.data->>'zoomMeetingId', ''),
            NULLIF(tmpl_rec.data->>'zoomPasscode', '')
        );
    END IF;

    -- Migrate topic
    IF tmpl_rec.data->>'topic' IS NOT NULL THEN
        UPDATE events SET topic = tmpl_rec.data->>'topic' WHERE id = event_rec.id;
    END IF;

    -- Migrate template-level breaks
    IF tmpl_rec.data->'breaks' IS NOT NULL AND jsonb_array_length(tmpl_rec.data->'breaks') > 0 THEN
        INSERT INTO event_breaks (event_id, location_id, start_date, end_date, message)
        SELECT
            event_rec.id,
            NULL,
            (brk->>'from')::date,
            (brk->>'to')::date,
            NULLIF(brk->>'message', '')
        FROM jsonb_array_elements(tmpl_rec.data->'breaks') AS brk
        WHERE brk->>'from' != '' AND brk->>'to' != '';
    END IF;
END;
$$;

-- Step 3: Migrate Prayer Meeting location
DO $$
DECLARE
    tmpl_rec RECORD;
    event_rec RECORD;
BEGIN
    SELECT e.id INTO event_rec
    FROM events e
    JOIN event_types et ON e.event_type_id = et.id
    WHERE et.name = 'monthly_prayer'
    LIMIT 1;

    IF event_rec.id IS NULL THEN RETURN; END IF;

    SELECT body_template::jsonb AS data INTO tmpl_rec
    FROM email_templates et
    JOIN event_types evt ON et.event_type_id = evt.id
    WHERE evt.name = 'monthly_prayer' AND et.is_default = true
    LIMIT 1;

    IF tmpl_rec.data IS NULL THEN RETURN; END IF;

    INSERT INTO event_locations (event_id, label, sort_order, address, city, phone)
    VALUES (
        event_rec.id,
        'Primary',
        0,
        NULLIF(tmpl_rec.data->>'address', ''),
        NULLIF(tmpl_rec.data->>'city', ''),
        NULLIF(tmpl_rec.data->>'phone', '')
    );

    -- Migrate dinner_note and signup_link
    UPDATE events SET
        dinner_note = NULLIF(tmpl_rec.data->>'dinnerNote', ''),
        signup_link = NULLIF(tmpl_rec.data->>'signupLink', '')
    WHERE id = event_rec.id;

    -- Migrate template-level breaks
    IF tmpl_rec.data->'breaks' IS NOT NULL AND jsonb_array_length(tmpl_rec.data->'breaks') > 0 THEN
        INSERT INTO event_breaks (event_id, location_id, start_date, end_date, message)
        SELECT
            event_rec.id,
            NULL,
            (brk->>'from')::date,
            (brk->>'to')::date,
            NULLIF(brk->>'message', '')
        FROM jsonb_array_elements(tmpl_rec.data->'breaks') AS brk
        WHERE brk->>'from' != '' AND brk->>'to' != '';
    END IF;
END;
$$;

-- Step 4: Create location rows for Birthday and Anniversary events (uniform model)
DO $$
DECLARE
    evt RECORD;
BEGIN
    FOR evt IN
        SELECT e.id, et.name
        FROM events e
        JOIN event_types et ON e.event_type_id = et.id
        WHERE et.name IN ('birthday', 'anniversary', 'bulletin')
          AND e.is_active = true
          AND NOT EXISTS (SELECT 1 FROM event_locations el WHERE el.event_id = e.id)
    LOOP
        INSERT INTO event_locations (event_id, label, sort_order)
        VALUES (evt.id, 'N/A', 0);
    END LOOP;
END;
$$;

-- Step 5: Migrate bulletin template events[] to bulletin_items
DO $$
DECLARE
    tmpl_rec RECORD;
    evt_item jsonb;
    idx int;
BEGIN
    SELECT body_template::jsonb AS data INTO tmpl_rec
    FROM email_templates et
    JOIN event_types evt ON et.event_type_id = evt.id
    WHERE evt.name = 'bulletin' AND et.is_default = true
    LIMIT 1;

    IF tmpl_rec.data IS NULL THEN RETURN; END IF;
    IF tmpl_rec.data->'events' IS NULL THEN RETURN; END IF;

    idx := 0;
    FOR evt_item IN SELECT * FROM jsonb_array_elements(tmpl_rec.data->'events')
    LOOP
        INSERT INTO bulletin_items (title, details, sort_order, is_recurring, is_active)
        VALUES (
            evt_item->>'title',
            NULLIF(evt_item->>'details', ''),
            idx,
            true,
            true
        );
        idx := idx + 1;
    END LOOP;
END;
$$;

-- Step 6: Populate visual_config from body_template (extract visual-only fields)
UPDATE email_templates
SET visual_config = jsonb_build_object(
    'message', COALESCE(body_template::jsonb->>'message', ''),
    'messageBgColor', body_template::jsonb->>'messageBgColor',
    'messageTextColor', body_template::jsonb->>'messageTextColor',
    'headerTitle', body_template::jsonb->>'headerTitle',
    'headerTitleColor', body_template::jsonb->>'headerTitleColor',
    'headerSubtitle', body_template::jsonb->>'headerSubtitle',
    'headerSubtitleColor', body_template::jsonb->>'headerSubtitleColor',
    'headerEmoji', body_template::jsonb->>'headerEmoji',
    'footerVerse', body_template::jsonb->>'footerVerse',
    'footerVerseBgColor', body_template::jsonb->>'footerVerseBgColor',
    'footerVerseTextColor', body_template::jsonb->>'footerVerseTextColor',
    'primaryColor', body_template::jsonb->>'primaryColor',
    'resourceLinks', COALESCE(body_template::jsonb->'resourceLinks', '[]'::jsonb),
    'customSections', COALESCE(body_template::jsonb->'customSections', '[]'::jsonb)
)
WHERE body_template IS NOT NULL
  AND body_template != ''
  AND body_template::jsonb IS NOT NULL;
