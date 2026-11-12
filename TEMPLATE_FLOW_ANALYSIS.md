# Template & Event Type Flow Analysis

## Current State (v1.85.3)

### What Exists (UI-Driven) ✅

#### 1. Custom Template Creation ✅
**Location:** `/templates` page  
**Flow:**
```
User clicks "Create Custom Template"
  → Fills in: name, emoji, title, body, sections
  → Saves to email_templates table
  → Template appears in dashboard (if is_active=true)
```

**Database:**
```sql
INSERT INTO email_templates (
  name, 
  body_template, 
  is_active, 
  show_in_dashboard
) VALUES (...);
```

#### 2. Calendar Event Creation ✅
**Location:** `/calendar` page  
**Flow:**
```
User clicks a date
  → Opens event form dialog
  → Selects event_type from dropdown (existing event_types only)
  → Sets title, time, recurrence, host family
  → Saves to events table
```

**Database:**
```sql
INSERT INTO events (
  title,
  event_type_id,  -- References existing event_types
  start_date,
  recurrence_rule,
  host_family_id
) VALUES (...);
```

---

### What's Missing (Requires Manual DB) ⚠️

#### 1. Event Type Creation ❌ NO UI
**Current:** Manual database insert required

```sql
-- Required for new event types
INSERT INTO event_types (
  name,
  comm_type,           -- Optional: links to template registry
  show_in_dashboard,
  display_order,
  default_template_id  -- Optional: links to custom template
) VALUES (
  'Youth Group',
  NULL,                -- No built-in template
  true,
  60,
  '<custom-template-id>'  -- Link to custom template
);
```

**Problem:** Users can't create new event types from UI!

#### 2. Linking Custom Template to Event Type ❌ NO UI
**Current:** Manual database update required

```sql
-- After creating custom template AND event type separately
UPDATE event_types 
SET default_template_id = '<custom-template-id>'
WHERE name = 'Youth Group';
```

**Problem:** No UI to associate templates with event types!

---

## Complete User Flow (What User Wants)

### Scenario: "I want to create Youth Group emails"

#### Current Flow (Broken) ❌
```
1. User goes to /templates
2. Creates custom template "Youth Group" ✅
3. User goes to /calendar
4. Tries to create Youth Group event...
5. ❌ "Youth Group" not in event type dropdown!
6. User manually updates database (not acceptable)
7. Creates event with new event_type ✅
8. Goes to dashboard...
9. ❌ No Youth Group card (template not linked!)
10. User manually updates database again (not acceptable)
11. Finally sees Youth Group card ✅
```

#### Desired Flow (Should Be) ✅
```
1. User goes to /templates
2. Creates custom template "Youth Group" ✅
3. Optionally: Links to new or existing event type ✅ (MISSING UI)
4. User goes to /calendar  
5. Creates "Youth Group" event (type auto-created or selected) ✅
6. User goes to dashboard
7. Youth Group card appears automatically ✅
```

---

## Two Approaches to Fix This

### Option A: Event Type Management UI (Recommended)

**Add new page:** `/settings/event-types`

**Features:**
- List all event_types
- Create new event_type with:
  - Name (required)
  - Template association (optional dropdown of custom templates)
  - Show in dashboard toggle
  - Display order
- Edit existing event_types
- Delete event_types (with warnings if events exist)

**Database Operations:**
```sql
-- Create
INSERT INTO event_types (name, default_template_id, show_in_dashboard, display_order)
VALUES ('Youth Group', '<template-id>', true, 60);

-- Update
UPDATE event_types SET default_template_id = '<template-id>' WHERE id = '<id>';

-- Delete
DELETE FROM event_types WHERE id = '<id>';
```

---

### Option B: Inline Event Type Creation (Quick Fix)

**Modify calendar event form:**
- Add "Create new event type" option to dropdown
- When selected, show input for new type name
- Auto-create event_type when saving event

**Modify templates page:**
- Add "Linked Event Type" dropdown when creating/editing custom template
- Show existing event_types + "Create new..." option
- Auto-link when saving

---

## Current Workarounds

### Workaround 1: Use Existing Event Types
```
1. Create custom template for "Youth Group"
2. Use existing generic event type (e.g., "Special Event")
3. Link template manually via DB
4. Create calendar event with that event type
```

### Workaround 2: Manual Database Setup
```sql
-- Step 1: Create event_type
INSERT INTO event_types (name, show_in_dashboard, display_order)
VALUES ('Youth Group', true, 60)
RETURNING id;

-- Step 2: Link to custom template
UPDATE event_types 
SET default_template_id = (
  SELECT id FROM email_templates WHERE name = 'Youth Group'
)
WHERE name = 'Youth Group';

-- Step 3: Create calendar event
INSERT INTO events (title, event_type_id, start_date)
VALUES ('Youth Group Meeting', '<event-type-id>', '2026-11-15');
```

---

## Recommended Solution

**Priority 1: Event Type Management UI**

Create `/settings/event-types` page with full CRUD:

**UI Mockup:**
```
┌─────────────────────────────────────────────────┐
│ Event Types                         [+ New Type]│
├─────────────────────────────────────────────────┤
│                                                  │
│ ☑ San Ramon Bible Study                   [Edit]│
│   Template: Bible Study (built-in)              │
│   Display Order: 40                             │
│                                                  │
│ ☑ Mountain House Bible Study              [Edit]│
│   Template: Bible Study (built-in)              │
│   Display Order: 45                             │
│                                                  │
│ ☑ Youth Group                             [Edit]│
│   Template: Youth Group Newsletter (custom)     │
│   Display Order: 60                             │
│                                                  │
│ ☐ VBS                                     [Edit]│
│   Template: None                                │
│   Display Order: 0                              │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Edit Dialog:**
```
┌─────────────────────────────────────┐
│ Edit Event Type                     │
├─────────────────────────────────────┤
│ Name: [Youth Group____________]     │
│                                     │
│ Template (optional):                │
│ [▼ Youth Group Newsletter    ]      │
│   Options:                          │
│   - None                            │
│   - Birthday (built-in)             │
│   - Bible Study (built-in)          │
│   - Youth Group Newsletter (custom) │
│   - Create new custom template...   │
│                                     │
│ ☑ Show in dashboard                 │
│                                     │
│ Display Order: [60]                 │
│                                     │
│         [Cancel]  [Save]            │
└─────────────────────────────────────┘
```

This provides:
- ✅ No manual DB updates
- ✅ Full control over event types
- ✅ Easy template linking
- ✅ Visibility management
- ✅ Clear UI for non-technical users

---

## Bottom Line

**Current Answer to Your Question:**
> "Do I need to update the db for linking template to event type?"

**YES** ⚠️ - Currently requires manual database updates

**Should You Need To?**

**NO** ❌ - There should be UI for this

**Solution:**
Build Event Type Management UI at `/settings/event-types`
