-- Notification settings for signup forms
ALTER TABLE signup_forms
  ADD COLUMN IF NOT EXISTS notify_on_submit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_smtp_config_id uuid REFERENCES smtp_configs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notify_mailing_list_id uuid REFERENCES mailing_lists(id) ON DELETE SET NULL;
