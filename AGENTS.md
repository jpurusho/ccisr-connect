<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# No code duplication
Shared logic (interpolation, var builders, type helpers, etc.) must live in a common utility file. Never copy the same logic into multiple pages or components — extract it first, then import it everywhere.

# Data Architecture: Layers & Boundaries

## Core Principle: Separation of Concerns
Operational data (what happens) lives separately from presentation data (how it looks). Never mix them.

## The Four Layers

### 1. Templates (Stateless Definitions)
- **Table:** `email_templates`
- **Purpose:** Content structure and defaults
- **Examples:** Message template, verse, default subject, default colors
- **Owned by:** Template builder
- **Never contains:** Schedules, specific dates, breaks, or operational state

### 2. Events (Recurring Patterns)
- **Tables:** `event_types`, `events`
- **Purpose:** Recurrence rules and event-level defaults
- **Examples:** "Every Friday at 7pm", default host (with expiration), default location
- **Owned by:** Event Type Management UI
- **Signup Integration:** Events can link to signup forms for auto-fill

### 3. Instances (Date-Specific Operations)
- **Table:** `event_instances`
- **Purpose:** Operational overrides for a SPECIFIC DATE
- **Contains:**
  - `host_family_id` - Who's hosting
  - `instance_time` / `instance_end_time` - When
  - `location_override` - Where
  - `instance_subject` / `instance_subject_prefix` - Email subject
  - `status` - confirmed/cancelled/draft
  - `notes` - Internal notes
- **Edit Location:** Calendar → Click date → "Edit Date" dialog
- **Priority:** Instance overrides > Signup auto-fill > Event defaults > Template defaults

### 4. Drafts/Compositions (Week-Specific Presentation)
- **Table:** `composed_instances`
- **Purpose:** Presentation customizations for a SPECIFIC WEEK
- **Contains:**
  - Color overrides (messageBgColor, footerBgColor, primaryColor)
  - Custom content (message, footerVerse)
  - Theme/style choices
- **Edit Location:** Dashboard → "Edit" button
- **Key:** `week_start` field (ISO Monday date)

**CRITICAL:** Drafts should NEVER store operational data:
- ❌ Don't save `hostNames` or `address` to drafts (use instance + signup auto-fill)
- ❌ Don't save `subject` to drafts (use instance.instance_subject)
- ✅ Only save colors, custom messages, and styling

### 5. Dispatches (Immutable History)
- **Table:** `email_dispatches`
- **Purpose:** Historical record of sent emails
- **Contains:** Snapshot of what was actually sent
- **Read-only** - never modified after sending

## Data Flow (Always Downward)

```
Template Defaults
    ↓
Event Recurrence + Signup Auto-Fill
    ↓
Instance Overrides (date-specific operational)
    ↓
Draft Styling (week-specific presentation)
    ↓
Final Composition → Dispatch
```

## Resolution Priority (Highest to Lowest)

### For Operational Data (Host, Time, Location, Subject):
1. **Instance override** (event_instances table) - highest priority
2. **Signup auto-fill** (monthly signup responses)
3. **Event-level default** (events table, with expiration check)
4. **Template default** (email_templates table) - lowest priority

### For Presentation Data (Colors, Custom Messages):
1. **Draft customization** (composed_instances table) - highest priority
2. **Template default** (email_templates table) - lowest priority

## Where to Edit What

| Data Type | Edit Location | Saves To | Scope |
|-----------|---------------|----------|-------|
| **Subject** | Calendar → Edit Date | event_instances.instance_subject | Single date |
| **Host** | Calendar → Edit Date | event_instances.host_family_id | Single date |
| **Time** | Calendar → Edit Date | event_instances.instance_time | Single date |
| **Location** | Calendar → Edit Date | event_instances.location_override | Single date |
| **Colors** | Dashboard → Edit | composed_instances.data | Week |
| **Custom Message** | Dashboard → Edit | composed_instances.data.message | Week |
| **Theme** | Dashboard → Edit | composed_instances.data | Week |

## Key Implementation Rules

### When Loading Dashboard (Composition Time):
```typescript
// ✅ CORRECT: Load operational data fresh every time
const hostData = await resolveHost(instanceId, eventId, date)  // Fresh from instance + signup
const draftStyles = await loadDraft(weekStart)  // Styling only

const finalComposition = {
  ...templateDefaults,
  ...draftStyles,  // Colors, custom messages
  hostName: hostData.name,  // ✅ Fresh, not from draft
  address: hostData.address,  // ✅ Fresh, not from draft
  subject: await resolveSubject(instanceId, eventId),  // ✅ From instance, not draft
}
```

```typescript
// ❌ WRONG: Don't freeze operational data in drafts
const draft = await loadDraft(weekStart)
const composition = {
  ...templateDefaults,
  ...draft,  // ❌ This includes stale hostName/address from last week
}
```

### When Saving Dashboard Draft:
```typescript
// ✅ CORRECT: Only save presentation data
await saveDraft({
  week_start: mondayDate,
  data: {
    messageBgColor: form.messageBgColor,
    footerBgColor: form.footerBgColor,
    message: form.message,
    footerVerse: form.footerVerse,
    // No hostNames, address, or subject
  }
})
```

### When Saving Calendar Instance:
```typescript
// ✅ CORRECT: Only save operational data
await saveInstance({
  instance_date: date,
  host_family_id: selectedFamily,
  instance_time: time,
  instance_subject: subject,
  // No colors or styling
})
```

## Signup Auto-Fill Integration

Monthly signup forms provide host assignments that refresh automatically:
1. Event type links to signup form via `event_type_signup_forms` table
2. At compose time, query signup responses for current date
3. If response found, use that family as host
4. Instance override always takes precedence over signup

**Key Benefit:** Host data updates every week automatically without manual intervention.

## Common Pitfalls to Avoid

1. **Don't save operational data to drafts**
   - Causes: Stale data, signup auto-fill breaks
   - Fix: Only save colors/styling to drafts

2. **Don't spread draft data last**
   - Causes: Draft colors overwritten by template defaults
   - Fix: Spread template defaults first, then draft overrides

3. **Don't allow subject editing in Dashboard**
   - Causes: Conflicts with Calendar instance subject
   - Fix: Subject read-only in Dashboard, editable only in Calendar

4. **Don't freeze signup data when saving draft**
   - Causes: Monthly signups don't update weekly
   - Fix: Always resolve host fresh from signup, never save to draft

## Files Reference

- **Instance Edit Dialog:** `src/components/calendar/instance-edit-dialog.tsx`
- **Dashboard Composition:** `src/app/(dashboard)/dashboard/page.tsx`
- **Draft Save Logic:** Search for `handleSaveInstance` in dashboard/page.tsx
- **Host Resolution:** Search for `resolveSignupAutoFill` in dashboard/page.tsx
- **Database Schema:** `src/types/database.ts`
- **Migrations:** `supabase/migrations/`
