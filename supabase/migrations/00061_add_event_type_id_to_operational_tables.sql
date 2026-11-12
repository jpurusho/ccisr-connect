-- Migration: Add event_type_id to operational tables
-- Created: 2026-11-11
-- Description: Complete the scalable architecture by adding event_type_id references.
--              Templates are keyed by template_type (reusable), operations track specific event_type_id.

-- 1. Add event_type_id to dispatch_queue
ALTER TABLE dispatch_queue
ADD COLUMN IF NOT EXISTS event_type_id UUID REFERENCES event_types(id) ON DELETE SET NULL;

-- 2. Add event_type_id to composed_instances
ALTER TABLE composed_instances
ADD COLUMN IF NOT EXISTS event_type_id UUID REFERENCES event_types(id) ON DELETE CASCADE;

-- 3. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_dispatch_queue_event_type_id ON dispatch_queue(event_type_id);
CREATE INDEX IF NOT EXISTS idx_composed_instances_event_type_id ON composed_instances(event_type_id);

-- 4. Migrate existing data where possible
-- For dispatches/instances with template_type matching single event_type comm_type, set event_type_id
UPDATE dispatch_queue dq
SET event_type_id = et.id
FROM event_types et
WHERE dq.template_type = et.comm_type
  AND dq.event_type_id IS NULL
  -- Only update if there's exactly ONE event_type for this template_type
  AND (
    SELECT COUNT(*)
    FROM event_types et2
    WHERE et2.comm_type = dq.template_type
  ) = 1;

UPDATE composed_instances ci
SET event_type_id = et.id
FROM event_types et
WHERE ci.template_type = et.comm_type
  AND ci.event_type_id IS NULL
  -- Only update if there's exactly ONE event_type for this template_type
  AND (
    SELECT COUNT(*)
    FROM event_types et2
    WHERE et2.comm_type = ci.template_type
  ) = 1;

-- 5. For Bible Study dispatches, assign to Family Bible Study (primary/lowest display_order)
-- Manual assignment because we can't distinguish historical data
UPDATE dispatch_queue dq
SET event_type_id = (
  SELECT id FROM event_types
  WHERE comm_type = 'bible_study'
  ORDER BY display_order ASC
  LIMIT 1
)
WHERE dq.template_type = 'bible_study'
  AND dq.event_type_id IS NULL;

UPDATE composed_instances ci
SET event_type_id = (
  SELECT id FROM event_types
  WHERE comm_type = 'bible_study'
  ORDER BY display_order ASC
  LIMIT 1
)
WHERE ci.template_type = 'bible_study'
  AND ci.event_type_id IS NULL;

-- 6. Verify migration
DO $$
DECLARE
  dq_count INTEGER;
  ci_count INTEGER;
  dq_null_count INTEGER;
  ci_null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dq_count FROM dispatch_queue;
  SELECT COUNT(*) INTO ci_count FROM composed_instances WHERE is_active = true;
  SELECT COUNT(*) INTO dq_null_count FROM dispatch_queue WHERE event_type_id IS NULL;
  SELECT COUNT(*) INTO ci_null_count FROM composed_instances WHERE event_type_id IS NULL AND is_active = true;

  RAISE NOTICE '✓ dispatch_queue: % total, % without event_type_id', dq_count, dq_null_count;
  RAISE NOTICE '✓ composed_instances: % active, % without event_type_id', ci_count, ci_null_count;

  IF dq_null_count > 0 OR ci_null_count > 0 THEN
    RAISE WARNING 'Some records still have NULL event_type_id - these may be for deleted event_types';
  END IF;
END $$;

-- 7. Architecture notes
COMMENT ON COLUMN dispatch_queue.event_type_id IS
  'Links dispatch to specific event_type (e.g., Family Bible Study vs Mountain House Bible Study). Required for multi-location architecture.';
COMMENT ON COLUMN dispatch_queue.template_type IS
  'Legacy: template identifier. New code should use event_type_id to look up event_types.comm_type for template reference.';
COMMENT ON COLUMN composed_instances.event_type_id IS
  'Links composed instance to specific event_type. Multiple locations share template but have separate instances.';
