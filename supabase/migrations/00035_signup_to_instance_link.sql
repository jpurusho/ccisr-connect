-- Link signup responses to event instances they generated
ALTER TABLE event_instances
  ADD COLUMN IF NOT EXISTS signup_response_id uuid REFERENCES signup_responses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_event_instances_signup_response
  ON event_instances(signup_response_id) WHERE signup_response_id IS NOT NULL;

-- Track assignment status on signup responses
ALTER TABLE signup_responses
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS assigned_event_id uuid REFERENCES events(id) ON DELETE SET NULL;
