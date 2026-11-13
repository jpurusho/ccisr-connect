# 25. Self-Service Event Type Management

Date: 2026-11-13

## Status

Accepted

## Context

After implementing the scalable multi-location architecture (ADR 0024), users could create unlimited event types and templates through the database. However, this required:

1. Manual SQL commands to create event types
2. Manual SQL to link templates to event types
3. Technical knowledge to understand foreign keys and relationships
4. Direct database access (security concern)

This created a bottleneck: while the architecture was scalable, operations weren't. Users reported: "I don't want to manually update db for creating and using a template for any calendar event."

## Decision

Build a complete Event Type Management UI (`/settings/event-types`) that provides:

1. **Create event types** - Form-based creation with validation
2. **Edit event types** - Update name, template, visibility, display order
3. **Delete event types** - With safety checks (prevent deletion if events exist)
4. **Template association** - Dropdown selection of built-in or custom templates
5. **Visibility control** - Toggle dashboard visibility per event type

The UI mirrors the Template Visibility controls (`/settings/templates`) for consistency.

## Consequences

### Positive

**Self-Service Operations:**
- Users create event types without database access
- Template linking via dropdown (no foreign key knowledge needed)
- Immediate feedback (see event count, upcoming events)
- Safety validation (can't delete if events exist)

**Removes Bottlenecks:**
- No waiting for admin/developer to run SQL
- Rapid experimentation with new event types
- Non-technical users can operate independently

**Improved Visibility:**
- Shows which event types have upcoming events
- Displays template associations clearly
- Validates before destructive operations

**Security:**
- Reduces need for direct database access
- Proper permission checks in API layer
- Audit trail via application logs

### Negative

**Maintenance:**
- Another UI to maintain
- Form validation logic to keep in sync with DB schema
- Additional test surface area

**Migration Path:**
- Existing setups may have event types created manually
- Documentation needs to explain both methods during transition
- Users need to learn where the UI is

### Technical Details

**Implementation:**
- Single-page app at `/settings/event-types`
- CRUD operations via Supabase client
- Real-time validation
- Modal dialogs for create/edit
- Confirmation for delete

**UI Components:**
- Card-based list view
- Dropdown selectors for templates
- Toggle switches for visibility
- Event count badges
- Safe delete with warnings

**Data Model:**
```sql
event_types
  - id (UUID)
  - name (text)
  - comm_type (text, nullable) → links to built-in template
  - default_template_id (UUID, nullable) → links to custom template
  - show_in_dashboard (boolean)
  - display_order (integer)
```

## Alternatives Considered

### 1. Keep Manual Database Access
**Rejected:** Creates operational bottleneck, requires technical expertise

### 2. API-Only (No UI)
**Rejected:** Still requires technical knowledge to make API calls

### 3. Inline Creation (Create During Calendar Event)
**Considered:** Would work but mixes concerns (scheduling vs configuration)
**Decision:** Keep configuration separate, cleaner UX

### 4. Settings Tab Integration
**Considered:** Add as tab in main `/settings` page
**Decision:** Standalone page provides more space, linked from dashboard

## Related Decisions

- **ADR 0024:** Scalable Multi-Location Architecture - provided the technical foundation
- **ADR 0021:** (Superseded) - original dashboard architecture

## Verification

Users can now:
1. Create "Youth Group" event type
2. Link to custom "Youth Newsletter" template
3. Set display order and visibility
4. See result on dashboard immediately
5. All without database access

**Complete flow:** Template creation → Event Type creation → Calendar scheduling → Email composition → All via UI

## Notes

This completes the "self-service vision" for CCISR Connect. Users can now:
- Create templates (`/templates`)
- Manage event types (`/settings/event-types`)  
- Schedule events (`/calendar`)
- Send emails (`/dashboard`)

All operations are UI-driven with no manual database access required.
