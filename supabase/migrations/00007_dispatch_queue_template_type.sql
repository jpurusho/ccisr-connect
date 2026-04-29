-- Add template_type column to dispatch_queue for reliable tracking
-- instead of relying on subject-line regex matching.
-- Values: birthday, anniversary, bible_study, womens_study, bulletin, prayer_meeting, custom, etc.
ALTER TABLE dispatch_queue ADD COLUMN IF NOT EXISTS template_type text;

-- Index for efficient filtering by template type
CREATE INDEX IF NOT EXISTS idx_dispatch_queue_template_type ON dispatch_queue (template_type) WHERE template_type IS NOT NULL;
