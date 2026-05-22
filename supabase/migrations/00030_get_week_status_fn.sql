-- =============================================================================
-- get_week_status() — single function to answer "what's happening this week?"
-- Replaces 200+ lines of client-side compose logic
-- =============================================================================

CREATE OR REPLACE FUNCTION get_week_status(p_start date, p_end date)
RETURNS TABLE (
    event_id         uuid,
    event_title      text,
    event_topic      text,
    event_type_name  text,
    instance_id      uuid,
    instance_date    date,
    instance_time    time,
    instance_status  text,
    location_id      uuid,
    location_label   text,
    location_sort    int,
    is_on_break      boolean,
    break_message    text,
    host_family_id   uuid,
    host_family_name text,
    host_address     text,
    host_city        text,
    host_phone       text
) LANGUAGE sql STABLE AS $$
    SELECT
        e.id,
        e.title,
        e.topic,
        et.name,
        ei.id,
        ei.instance_date,
        COALESCE(ei.instance_time, e.default_time),
        ei.status::text,
        el.id,
        el.label,
        el.sort_order,
        -- is_on_break: location break OR whole-event break OR cancelled
        (
            EXISTS (
                SELECT 1 FROM event_breaks eb
                WHERE eb.event_id = e.id
                  AND (eb.location_id = el.id OR eb.location_id IS NULL)
                  AND eb.start_date <= ei.instance_date
                  AND eb.end_date >= ei.instance_date
            )
            OR ei.status::text = 'cancelled'
            OR COALESCE(eil.status::text, '') = 'cancelled'
        ),
        -- break_message: prefer location-specific, fall back to event-level
        (
            SELECT eb.message FROM event_breaks eb
            WHERE eb.event_id = e.id
              AND (eb.location_id = el.id OR eb.location_id IS NULL)
              AND eb.start_date <= ei.instance_date
              AND eb.end_date >= ei.instance_date
            ORDER BY eb.location_id NULLS LAST
            LIMIT 1
        ),
        -- host resolution cascade: instance_location → instance → location → event
        COALESCE(eil.host_family_id, ei.host_family_id, el.host_family_id, e.host_family_id),
        f.family_name,
        COALESCE(eil.address_override, a.full_address),
        CONCAT_WS(', ', a.city, a.state, a.zip),
        COALESCE(eil.phone_override, f.home_phone, el.phone, '')
    FROM events e
    JOIN event_types et ON e.event_type_id = et.id
    JOIN event_instances ei ON ei.event_id = e.id
    LEFT JOIN event_locations el ON el.event_id = e.id AND el.is_active = true
    LEFT JOIN event_instance_locations eil
        ON eil.instance_id = ei.id AND eil.location_id = el.id
    LEFT JOIN families f
        ON f.id = COALESCE(eil.host_family_id, ei.host_family_id, el.host_family_id, e.host_family_id)
    LEFT JOIN addresses a
        ON a.family_id = f.id AND a.is_current = true
    WHERE ei.instance_date BETWEEN p_start AND p_end
      AND e.is_active = true
    ORDER BY ei.instance_date, COALESCE(ei.instance_time, e.default_time), el.sort_order;
$$;

COMMENT ON FUNCTION get_week_status IS
    'Returns all events for a date range with break status, host resolution, and location details. Single source of truth for compose and calendar.';
