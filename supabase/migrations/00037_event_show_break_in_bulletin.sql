-- Add flag to control whether an event on break appears in the weekly bulletin
ALTER TABLE events ADD COLUMN show_break_in_bulletin boolean NOT NULL DEFAULT true;
