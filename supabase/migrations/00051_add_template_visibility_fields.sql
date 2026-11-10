-- Migration: Add template visibility and display control fields
-- Created: 2026-11-10
-- Description: Adds fields to control which templates appear on dashboard and their display properties

-- Add fields to event_types table
ALTER TABLE event_types ADD COLUMN IF NOT EXISTS show_in_dashboard boolean DEFAULT true;
ALTER TABLE event_types ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;
ALTER TABLE event_types ADD COLUMN IF NOT EXISTS icon_name text DEFAULT 'Calendar';
ALTER TABLE event_types ADD COLUMN IF NOT EXISTS card_color text DEFAULT '#4F46E5';

-- Add fields to email_templates table
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS show_in_dashboard boolean DEFAULT true;
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS icon_name text DEFAULT 'Mail';

-- Set display order for existing built-in types (order matters for dashboard display)
UPDATE event_types SET display_order = 10, icon_name = 'Newspaper', card_color = '#4F46E5' WHERE comm_type = 'bulletin';
UPDATE event_types SET display_order = 20, icon_name = 'Cake', card_color = '#7C3AED' WHERE comm_type = 'birthday';
UPDATE event_types SET display_order = 30, icon_name = 'Heart', card_color = '#D97706' WHERE comm_type = 'anniversary';
UPDATE event_types SET display_order = 40, icon_name = 'BookOpen', card_color = '#0D9488' WHERE comm_type = 'bible_study';
UPDATE event_types SET display_order = 50, icon_name = 'Users', card_color = '#DB2777' WHERE comm_type = 'womens_study';
UPDATE event_types SET display_order = 60, icon_name = 'HandHelping', card_color = '#059669' WHERE comm_type = 'prayer_meeting';
UPDATE event_types SET display_order = 70, icon_name = 'Gift', card_color = '#DC2626' WHERE comm_type = 'shoebox_ministry';

-- Add comments
COMMENT ON COLUMN event_types.show_in_dashboard IS 'Whether this template appears as a card on the dashboard';
COMMENT ON COLUMN event_types.display_order IS 'Sort order on dashboard (lower numbers appear first)';
COMMENT ON COLUMN event_types.icon_name IS 'Lucide icon name for the template card';
COMMENT ON COLUMN event_types.card_color IS 'Hex color code for the template card';

COMMENT ON COLUMN email_templates.show_in_dashboard IS 'Whether this custom template appears on the dashboard';
COMMENT ON COLUMN email_templates.display_order IS 'Sort order on dashboard (lower numbers appear first)';
COMMENT ON COLUMN email_templates.icon_name IS 'Lucide icon name for the template card';
