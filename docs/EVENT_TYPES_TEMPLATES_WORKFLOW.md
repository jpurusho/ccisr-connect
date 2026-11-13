# Event Types, Templates & Calendar Workflow Guide

**Version:** 1.86.0  
**Last Updated:** 2026-11-12

---

## Overview

CCISR Connect has three interconnected concepts that work together to manage church communications:

1. **Event Types** - Categories of church activities
2. **Templates** - Email design and content
3. **Calendar Events** - Specific occurrences on specific dates

Think of it like this:
- **Event Type** = "What kind of event is this?"
- **Template** = "What should the email look like?"
- **Calendar Event** = "When and where is it happening?"

---

## The Three Core Concepts

### 1. Event Types

**What:** Categories or types of church events

**Examples:**
- San Ramon Bible Study
- Mountain House Bible Study
- Youth Group
- Prayer Meeting
- VBS (Vacation Bible School)
- Special Announcement

**Purpose:**
- Organize events by category
- Link to email templates
- Control dashboard visibility
- Group similar events together

**Database:** Stored in `event_types` table

**Key Fields:**
- `name` - Display name (e.g., "Youth Group")
- `comm_type` - Links to built-in template (e.g., "bible_study")
- `default_template_id` - Links to custom template
- `show_in_dashboard` - Shows as dashboard card?
- `display_order` - Order on dashboard

**Created:** Via UI at `/settings/event-types`

---

### 2. Templates

Templates define HOW emails look and what content they contain. There are two types:

#### A. Built-in Templates (Code-Based)

**What:** Pre-coded templates with custom forms and email layouts

**Examples:**
- Birthday (shows list of upcoming birthdays)
- Bible Study (shows date, time, host, address)
- Prayer Meeting (shows location, dinner info)
- Bulletin (shows week overview, birthdays, anniversaries)

**Characteristics:**
- Have custom form fields (date pickers, address fields, etc.)
- Custom email card layouts
- Special logic (e.g., birthday date calculations)
- Registered in code (`src/lib/template-registry.ts`)

**When to Use:**
- When you need specific form fields
- When you need special formatting
- For recurring communications with structured data

**Example:**
```typescript
// Bible Study template has these fields:
- Title
- Date & Time
- Host Family
- Address
- Topic/Study Material
- Signup Link
```

**Linked via:** `event_types.comm_type` = "bible_study"

---

#### B. Custom Templates (User-Created)

**What:** User-designed templates via visual builder

**Examples:**
- Youth Group Newsletter
- Special Announcement
- Fundraiser Campaign
- Mission Trip Update

**Characteristics:**
- Created via UI at `/templates`
- Generic form (title, body, sections)
- Flexible content (emoji, rich text, custom sections)
- No code changes needed

**When to Use:**
- One-off announcements
- Non-recurring communications
- Custom content that doesn't fit built-in templates
- When you want quick self-service template creation

**Example:**
```json
{
  "emoji": "🎉",
  "title": "Youth Group Game Night",
  "body": "Join us for pizza and games...",
  "sections": [
    { "title": "When", "entries": [...] },
    { "title": "Where", "entries": [...] }
  ]
}
```

**Linked via:** `event_types.default_template_id` = UUID

---

### 3. Calendar Events

**What:** Specific occurrences scheduled on the calendar

**Examples:**
- Bible Study on Nov 15, 2026 at John's house
- Prayer Meeting on Nov 22, 2026 at Mary's house
- Youth Group on Nov 10, 2026 at church

**Purpose:**
- Schedule when events happen
- Track host families
- Set recurrence rules
- Plan breaks/cancellations

**Database:** Stored in `events` table

**Key Fields:**
- `title` - Event name (e.g., "Bible Study at John's")
- `event_type_id` - Links to event type
- `start_date` - When it happens
- `recurrence_rule` - Repeat pattern (weekly, monthly, etc.)
- `host_family_id` - Who's hosting
- `end_date` - For date-range events

**Created:** Via calendar UI at `/calendar`

---

## How They Connect

```
┌─────────────────┐
│   Event Type    │  ← Category/classification
│  "Youth Group"  │
└────────┬────────┘
         │
         ├─────────────────────┐
         │                     │
         ▼                     ▼
┌─────────────────┐   ┌─────────────────┐
│  Built-in       │   │    Custom       │
│  Template       │   │   Template      │
│  (code-based)   │   │ (user-created)  │
└─────────────────┘   └─────────────────┘
         │                     │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  Calendar Event(s)  │ ← Specific occurrences
         │  - Nov 15 @ 7:30 PM │
         │  - Nov 22 @ 7:30 PM │
         │  - Nov 29 @ 7:30 PM │
         └─────────────────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  Email Composition  │ ← Dashboard card
         │  - Preview email    │
         │  - Edit content     │
         │  - Send/Schedule    │
         └─────────────────────┘
```

**Key Relationships:**

1. **Event Type → Template** (one-to-one or none)
   - Each event type can link to ONE template (or none)
   - Multiple event types can share the same template
   - Example: Both "San Ramon Bible Study" and "Mountain House Bible Study" use the "bible_study" template

2. **Event Type → Calendar Events** (one-to-many)
   - Each event type can have MANY calendar events
   - Example: "Youth Group" event type → 20 scheduled Youth Group meetings

3. **Calendar Event → Dashboard** (indirect via event type)
   - Calendar events don't directly create dashboard cards
   - Dashboard cards are created by event types (if show_in_dashboard=true)
   - The card shows the NEXT UPCOMING event for that event type

---

## Complete Workflow Examples

### Example 1: Setting Up Bible Study Emails

**Scenario:** You want to send weekly emails for Bible Study at two locations

#### Step 1: Templates Already Exist
```
Built-in template "bible_study" exists in code
- Has form fields for: date, time, host, address, topic
- Generates formatted email card
- No action needed ✅
```

#### Step 2: Create Event Types
```
Go to: /settings/event-types
Click: "New Event Type"

Event Type 1:
- Name: "San Ramon Bible Study"
- Template: Built-in → Bible Study
- Show in dashboard: ON
- Display order: 40
[Create]

Event Type 2:
- Name: "Mountain House Bible Study"
- Template: Built-in → Bible Study
- Show in dashboard: ON
- Display order: 45
[Create]
```

**Result:** Dashboard now shows TWO separate cards

#### Step 3: Schedule Calendar Events
```
Go to: /calendar
Click on Friday, Nov 15

Event 1:
- Title: "Bible Study"
- Type: San Ramon Bible Study
- Time: 7:30 PM
- Recurrence: Weekly on Friday
- Host: John Smith
[Save]

Click on Friday, Nov 15 again

Event 2:
- Title: "Bible Study"
- Type: Mountain House Bible Study
- Time: 7:30 PM
- Recurrence: Weekly on Friday
- Host: Jane Doe
[Save]
```

**Result:** Calendar shows both Bible Studies every Friday

#### Step 4: Compose & Send Emails
```
Go to: /dashboard
See: Two separate cards

Card 1: San Ramon Bible Study
- Shows next occurrence (Nov 15)
- Auto-fills: date, time, host (John Smith), address
- Edit content, preview
- Send or schedule

Card 2: Mountain House Bible Study  
- Shows next occurrence (Nov 15)
- Auto-fills: date, time, host (Jane Doe), address
- Edit content, preview
- Send or schedule
```

**Result:** Two independent email campaigns, each with its own:
- Send history
- Recipient list
- Content customization
- Dispatch tracking

---

### Example 2: Creating Youth Group Newsletter

**Scenario:** You want to create a custom Youth Group newsletter (doesn't fit existing templates)

#### Step 1: Create Custom Template
```
Go to: /templates
Click: "Create Custom Template"

Template:
- Name: "Youth Group Newsletter"
- Emoji: 🎉
- Title: "Youth Group Update"
- Body: "What's happening in youth ministry..."
- Sections:
  - "This Month's Events"
  - "Sign Up for Mission Trip"
  - "Parent Resources"
[Save]
```

**Result:** Custom template created in database

#### Step 2: Create Event Type
```
Go to: /settings/event-types
Click: "New Event Type"

Event Type:
- Name: "Youth Group"
- Template: Custom → Youth Group Newsletter
- Show in dashboard: ON
- Display order: 60
[Create]
```

**Result:** Event type linked to your custom template

#### Step 3: Schedule Calendar Events (Optional)
```
If youth group has regular meetings:

Go to: /calendar
Click on: Nov 20

Event:
- Title: "Youth Group Game Night"
- Type: Youth Group
- Time: 6:30 PM
- Recurrence: None (one-time event)
[Save]
```

**Result:** Shows in calendar, helps track schedule

#### Step 4: Compose & Send
```
Go to: /dashboard
See: Youth Group card

- Form shows custom template fields
- Edit title, body, sections
- Add emoji, customize content
- Preview email
- Send or schedule
```

**Result:** Custom-designed email sent to youth group mailing list

---

### Example 3: One-Time Special Announcement

**Scenario:** You need to send a one-time announcement (no recurring schedule)

#### Option A: Use Existing Event Type
```
Go to: /settings/event-types
Find: "Special Announcement" (if it exists)

If exists:
- Just use it
- No need to create new type

If doesn't exist:
- Create new event type
- Choose template: None (calendar only)
- Show in dashboard: OFF (one-time only)
```

#### Option B: Create Ad-Hoc Email
```
Go to: /dashboard
Click: Custom template area
Select: Existing custom template OR create new one
Compose: Your announcement
Send: Immediately or scheduled
```

**No calendar event needed** for one-time announcements!

---

## Dashboard Card Behavior

**How Dashboard Cards Work:**

1. **Card appears when:**
   - Event type has `show_in_dashboard = true`
   - Event type has a template (built-in or custom)

2. **Card shows:**
   - Next upcoming calendar event (if any)
   - Auto-filled data from event details
   - Send history (previous dispatches)
   - Status: Draft, Sent, Scheduled

3. **Multiple locations:**
   - Each event type = separate card
   - San Ramon Bible Study = Card 1
   - Mountain House Bible Study = Card 2
   - Fully independent tracking

4. **No template:**
   - Event types without templates don't show as cards
   - Still appear in calendar
   - Used for tracking only (e.g., "VBS Planning Meeting")

---

## Calendar Behavior

**What Calendar Shows:**

- All calendar events for all event types
- Color-coded by event type (coming soon)
- Recurring events shown on each occurrence
- Break periods shown as X or strikethrough
- Host family names displayed

**Creating Recurrence:**

```
Recurrence options:
- None: One-time event
- Weekly: Every week on same day
- Monthly: Same date each month OR same nth weekday

Examples:
- "Weekly on Friday" = every Friday
- "Monthly on 15th" = 15th of each month
- "Monthly 2nd Friday" = second Friday of each month
```

**Managing Breaks:**

```
When event can't happen (vacation, holiday):

Option 1: Create Break
- Select date range
- Mark as "Don't send emails"
- Event shows with X on calendar
- No email sent for that week

Option 2: Delete Single Occurrence
- Right-click event
- Delete this occurrence
- Doesn't affect future occurrences
```

---

## Common Patterns

### Pattern 1: Shared Template, Multiple Locations

**Use Case:** Same type of event, different locations

```
Event Types:
- San Ramon Bible Study → template: bible_study
- Mountain House Bible Study → template: bible_study
- Downtown Bible Study → template: bible_study

Benefits:
- Reuse same form/layout
- Each location has own card
- Independent scheduling
- Separate send history
```

### Pattern 2: Unique Template Per Event

**Use Case:** Each event is completely different

```
Event Types:
- Bulletin → template: bulletin (built-in)
- Birthday → template: birthday (built-in)
- Youth Group → template: youth_newsletter (custom)
- Fundraiser → template: fundraiser_campaign (custom)

Benefits:
- Custom forms for each type
- Tailored email layouts
- Specific content requirements
```

### Pattern 3: Generic Events (No Template)

**Use Case:** Tracking/scheduling only, no emails

```
Event Types:
- Staff Meeting → no template
- Building Maintenance → no template
- VBS Planning → no template

Benefits:
- Shows in calendar
- Tracks schedule
- No dashboard clutter
- Calendar-only functionality
```

---

## Data Flow Summary

```
1. USER CREATES EVENT TYPE
   ↓
   event_types table
   - name: "Youth Group"
   - comm_type: NULL
   - default_template_id: "abc123" (custom template)
   - show_in_dashboard: true

2. USER SCHEDULES CALENDAR EVENT
   ↓
   events table
   - title: "Youth Group Game Night"
   - event_type_id: "xyz789" (Youth Group)
   - start_date: "2026-11-15"
   - recurrence_rule: "FREQ=WEEKLY"

3. DASHBOARD LOADS
   ↓
   Query: event_types WHERE show_in_dashboard = true
   ↓
   For each event_type:
   - Fetch template (built-in or custom)
   - Find next calendar event
   - Load previous dispatches
   - Show card with form

4. USER COMPOSES EMAIL
   ↓
   composed_instances table
   - event_type_id: "xyz789"
   - template_type: "custom"
   - form_data: { title, body, sections }
   - subject: "Youth Group This Week"

5. USER SENDS/SCHEDULES
   ↓
   dispatch_queue table
   - event_type_id: "xyz789"
   - subject: "Youth Group This Week"
   - body_html: "<html>..."
   - status: "pending" or "sent"
   - sent_at: timestamp
```

---

## Key Takeaways

1. **Event Types are Categories**
   - Organize your church activities
   - Control what appears where
   - Link to email designs

2. **Templates are Email Designs**
   - Built-in for common patterns
   - Custom for unique needs
   - Reusable across event types

3. **Calendar Events are Occurrences**
   - Specific dates and times
   - Who's hosting, where it is
   - Repeat patterns

4. **Dashboard is Email Hub**
   - One card per event type (if visible)
   - Auto-fills from calendar
   - Tracks send history
   - Compose and send

5. **Full Flexibility**
   - Multiple locations → multiple event types → same template
   - Unique events → unique event types → custom templates
   - Calendar-only → event type with no template
   - One-time emails → custom template, no event type needed

---

## Quick Reference

| I Want To... | Steps |
|--------------|-------|
| **Send weekly Bible Study emails** | 1. Create event type<br>2. Link to bible_study template<br>3. Schedule recurring calendar event<br>4. Compose on dashboard weekly |
| **Send birthday emails** | 1. Event type "Birthday" already exists<br>2. System auto-detects birthdays<br>3. Compose on dashboard weekly |
| **Create custom newsletter** | 1. Design template at /templates<br>2. Create event type, link template<br>3. Schedule if recurring<br>4. Compose on dashboard |
| **Send one-time announcement** | 1. Create custom template (or reuse)<br>2. Compose directly on dashboard<br>3. Send (no calendar event needed) |
| **Add new location for existing event** | 1. Create new event type (e.g., "Location 3 Bible Study")<br>2. Link to same template as others<br>3. Schedule calendar events<br>4. Get separate dashboard card |
| **Track event without emails** | 1. Create event type<br>2. Don't link template<br>3. Set show_in_dashboard = false<br>4. Schedule calendar events |
| **Change template for event type** | 1. Go to /settings/event-types<br>2. Edit event type<br>3. Change template selection<br>4. Save |

---

## Architecture Benefits

✅ **Scalability:** Add unlimited locations, event types, templates  
✅ **Flexibility:** Mix built-in and custom templates as needed  
✅ **Independence:** Each event type tracks separately  
✅ **Self-Service:** No code changes or DB access needed  
✅ **Visibility Control:** Show/hide what matters  
✅ **Organized:** Clear separation of concerns  
✅ **Trackable:** Full dispatch history per event type  

---

*For technical architecture details, see: ARCHITECTURE.md*  
*For template creation guide, see: DYNAMIC_TEMPLATE_SYSTEM.md*  
*For API reference, see: template-registry.ts*
