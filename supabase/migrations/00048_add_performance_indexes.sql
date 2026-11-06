-- Migration: Add performance indexes for frequently queried columns
-- Created: 2026-11-05
-- Description: Adds indexes to optimize common query patterns across the application

-- Index: families by is_active
-- Pattern: Filtering active families in member lookups and family lists
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_families_is_active
ON families(is_active)
WHERE is_active = true;

-- Index: members by family_id (for family member lookups)
-- Pattern: Loading all members for a given family
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_members_family_id
ON members(family_id);

-- Index: members by is_active
-- Pattern: Filtering active members in directory and signup flows
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_members_is_active
ON members(is_active)
WHERE is_active = true;

-- Composite index: members by family_id and is_active
-- Pattern: Loading active members for a specific family
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_members_family_active
ON members(family_id, is_active)
WHERE is_active = true;

-- Index: events by event_type_id
-- Pattern: Loading all events for a given event type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_event_type_id
ON events(event_type_id);

-- Index: events by is_active
-- Pattern: Filtering active events in calendar and scheduling views
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_is_active
ON events(is_active)
WHERE is_active = true;

-- Index: events by start_date
-- Pattern: Chronological ordering and date range queries in calendar
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_start_date
ON events(start_date);

-- Composite index: events by event_type_id and is_active
-- Pattern: Loading active events for a specific type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_type_active
ON events(event_type_id, is_active)
WHERE is_active = true;

-- Composite index: events by is_active and start_date
-- Pattern: Calendar views showing active events sorted by date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_active_start_date
ON events(is_active, start_date)
WHERE is_active = true;

-- Index: event_instances by event_id
-- Pattern: Loading all instances for a given event
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_instances_event_id
ON event_instances(event_id);

-- Index: event_instances by date
-- Pattern: Date range queries for calendar views
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_instances_date
ON event_instances(date);

-- Composite index: event_instances by event_id and date
-- Pattern: Loading instances for a specific event in date order
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_instances_event_date
ON event_instances(event_id, date);

-- Index: composed_instances by week_start
-- Pattern: Loading drafts for a specific week in dashboard calendar
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_composed_instances_week_start
ON composed_instances(week_start);

-- Index: composed_instances by template_type
-- Pattern: Filtering drafts by communication type (email, SMS, etc.)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_composed_instances_template_type
ON composed_instances(template_type);

-- Index: composed_instances by is_active
-- Pattern: Filtering active/archived drafts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_composed_instances_is_active
ON composed_instances(is_active)
WHERE is_active = true;

-- Composite index: composed_instances by week_start and template_type
-- Pattern: Dashboard calendar loading drafts for a week filtered by type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_composed_instances_week_type
ON composed_instances(week_start, template_type);

-- Composite index: composed_instances by template_type and is_active
-- Pattern: Loading active drafts for a specific communication type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_composed_instances_type_active
ON composed_instances(template_type, is_active)
WHERE is_active = true;

-- Index: signup_responses by form_id
-- Pattern: Loading all responses for a given signup form
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_signup_responses_form_id
ON signup_responses(form_id);

-- Index: signup_responses by member_id
-- Pattern: Looking up signups by a specific member
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_signup_responses_member_id
ON signup_responses(member_id);

-- Index: signup_responses by created_at
-- Pattern: Chronological ordering and recent signup queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_signup_responses_created_at
ON signup_responses(created_at DESC);

-- Composite index: signup_responses by form_id and created_at
-- Pattern: Loading form responses in chronological order
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_signup_responses_form_created
ON signup_responses(form_id, created_at DESC);

-- Index: dispatch_queue by status
-- Pattern: Filtering pending/sent/failed messages
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dispatch_queue_status
ON dispatch_queue(status);

-- Index: dispatch_queue by scheduled_at
-- Pattern: Chronological processing and date range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dispatch_queue_scheduled_at
ON dispatch_queue(scheduled_at);

-- Composite index: dispatch_queue by status and scheduled_at
-- Pattern: Processing pending messages in chronological order
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dispatch_queue_status_scheduled
ON dispatch_queue(status, scheduled_at)
WHERE status = 'pending';

-- Index: email_templates by is_active
-- Pattern: Loading available templates for composition
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_templates_is_active
ON email_templates(is_active)
WHERE is_active = true;

-- Index: event_types by is_active
-- Pattern: Loading active event types for scheduling
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_types_is_active
ON event_types(is_active)
WHERE is_active = true;

-- Index: signup_forms by is_active
-- Pattern: Loading available signup forms
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_signup_forms_is_active
ON signup_forms(is_active)
WHERE is_active = true;

-- Index: audit_logs by table_name and created_at
-- Pattern: Loading audit history for specific entities
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_table_created
ON audit_logs(table_name, created_at DESC);

-- Index: audit_logs by user_id
-- Pattern: Loading actions by a specific user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_id
ON audit_logs(user_id);
