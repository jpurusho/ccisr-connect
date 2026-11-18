# Architecture Refactor Plan
**Goal:** Separate operational data (what happens) from presentation data (how it looks)

## Current Problems
1. ❌ Drafts store operational data (host, subject) that becomes stale
2. ❌ Subject editable in 3 places with unclear priority
3. ❌ Monthly signup data gets frozen when draft is saved
4. ❌ Unclear which layer owns which data

## Target Architecture

### Data Flow (Always Downward)
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

### Clear Boundaries

#### Instance Layer (Operational - "What happens on this date")
**Table:** `event_instances`
**Owns:**
- Host (host_family_id)
- Time (instance_time, instance_end_time)
- Location (location_override)
- Subject (instance_subject, instance_subject_prefix)
- Status (confirmed/cancelled)

**Edit Location:** Calendar → "Edit Date" dialog

#### Draft Layer (Presentation - "How this week's email looks")
**Table:** `composed_instances`
**Owns:**
- Colors (messageBgColor, footerBgColor, primaryColor)
- Custom content (message, footerVerse)
- Style choices (theme)

**Edit Location:** Dashboard → "Edit" button

**Remove from drafts:**
- ~~hostNames~~ → Get from instance at compose time
- ~~address~~ → Get from instance at compose time
- ~~subject~~ → Get from instance at compose time

---

## Phase 1: Clean Dashboard Draft Loading (DONE ✓)
Already fixed in dashboard/page.tsx:
- Host data now resolved fresh from signup/instance every time
- Draft only loads style fields
- Signup auto-fill works correctly every week

## Phase 2: Remove Subject from Dashboard Editing

### 2.1 Remove Subject Input from Dashboard
**File:** `src/app/(dashboard)/dashboard/page.tsx`

Remove `onSubjectChange` callback:
```typescript
// DELETE this function:
function setSubjectOverride(key: string, value: string) {
  setSubjectOverrides((prev) => ({ ...prev, [key]: value }))
}
```

Remove subject from card props:
```typescript
<WeeklyCommunicationCard
  // ... other props
  // DELETE: onSubjectChange={(v) => setSubjectOverride("bible_study", v)}
  // DELETE: onSubjectPrefixChange={...}
/>
```

### 2.2 Show Subject as Read-Only in Dashboard
**File:** `src/components/dashboard/weekly-communication-card.tsx`

Change subject display to always read-only:
```typescript
{subject !== undefined && (
  <div className="px-4 pl-5 pt-2">
    <label className="text-xs font-medium text-muted-foreground mb-1 block">
      Email Subject
    </label>
    <p className="text-sm font-medium">
      {subjectPrefix && <span className="text-primary">{subjectPrefix}: </span>}
      {subject}
    </p>
    {editing && (
      <p className="text-xs text-muted-foreground mt-1">
        To customize subject, click the date in Calendar → Edit Date
      </p>
    )}
  </div>
)}
```

Remove props:
```typescript
// DELETE from WeeklyCommunicationCard props:
onSubjectChange?: (value: string) => void
onSubjectPrefixChange?: (value: string) => void
```

### 2.3 Update Subject Resolution Logic
**File:** `src/app/(dashboard)/dashboard/page.tsx`

Subject should come from:
1. Instance (instance_subject) - highest priority
2. Subject override state (for reminder prefix logic)
3. Template default

```typescript
// Subject resolution (around line 2200)
const resolvedSubjects: Record<string, string> = {}
for (const et of eventTypes) {
  const tmpl = templates.find((t: { id: string }) => t.id === et.template_id)
  const def = getDefaults(et.comm_type, tmpl)
  resolvedSubjects[et.id] = def.subject
}

// Instance overrides (from instance_subject field)
const instanceSubjectOverrides: Record<string, string> = {}
for (const inst of weekInstances) {
  const evt = activeEvents.find((e: { id: string }) => e.id === inst.event_id)
  if (evt?.event_type_id && inst.instance_subject) {
    instanceSubjectOverrides[evt.event_type_id] = inst.instance_subject
  }
}

// Final merge (instance wins over everything)
setSubjectOverrides({ 
  ...resolvedSubjects, 
  ...customSubjOvr, // reminder prefix logic only
  ...instanceSubjectOverrides // instance always wins
})
```

---

## Phase 3: Remove Draft Fields from Database

### 3.1 Create Migration
**File:** `supabase/migrations/00064_remove_operational_from_drafts.sql`

```sql
-- Remove operational fields from composed_instances
-- These should come from instances, not drafts

COMMENT ON TABLE composed_instances IS 
  'Week-specific presentation customizations (colors, styling, custom messages). 
   Operational data (host, time, subject) comes from event_instances, not here.';

-- Mark deprecated fields (don't drop yet, for backwards compat)
-- Will drop in a future migration after confirming nothing breaks

-- For now, just add comments to clarify intent
COMMENT ON COLUMN composed_instances.data IS 
  'DEPRECATED FIELDS IN THIS JSONB: 
   - hostNames (use instance.host_family_id instead)
   - address (resolve from host_family_id)
   - subject (use instance.instance_subject instead)
   
   VALID FIELDS:
   - messageBgColor, footerBgColor, primaryColor
   - message, footerVerse
   - theme choices';
```

### 3.2 Create Instance Subject Index
```sql
-- Speed up subject lookups
CREATE INDEX IF NOT EXISTS idx_event_instances_subject 
  ON event_instances(event_id, instance_date) 
  WHERE instance_subject IS NOT NULL;
```

---

## Phase 4: Update Documentation

### 4.1 Update CLAUDE.md
Add architecture section:
```markdown
## Data Architecture: Layers

### Instance (Operational - What Happens)
- Host, time, location, subject for a SPECIFIC DATE
- Edited via Calendar → "Edit Date"
- Table: event_instances

### Draft (Presentation - How It Looks)  
- Colors, custom messages for a SPECIFIC WEEK
- Edited via Dashboard → "Edit"
- Table: composed_instances
- Does NOT store operational data (host/subject/time)

### Resolution Order
1. Instance override (highest priority)
2. Signup auto-fill (for host)
3. Event defaults
4. Template defaults (lowest priority)
```

### 4.2 Add Memory Entry
Document this architectural decision so it's not forgotten.

---

## Phase 5: Add UI Improvements

### 5.1 Calendar "Edit Date" - Make Subject More Prominent
Since this is now THE ONLY place to edit subject, make it more discoverable.

### 5.2 Dashboard - Add "Customize This Date" Link
In dashboard cards, add a link to jump to Calendar edit:
```tsx
{editing && (
  <p className="text-xs text-muted-foreground">
    To change host, time, or subject for this specific date,{" "}
    <button 
      onClick={() => {/* Open calendar to this date */}}
      className="text-primary underline"
    >
      edit the occurrence in Calendar
    </button>
  </p>
)}
```

---

## Benefits After Refactor

✅ **No More Conflicts**
- One place to edit each type of data
- Clear mental model

✅ **Signup Auto-Fill Works Forever**  
- Host data never frozen in drafts
- Fresh data every week

✅ **Easier to Understand**
- Dashboard = Styling
- Calendar = Operations
- No overlap

✅ **Less Code**
- Remove complex subject override merging
- Remove stale data handling

✅ **Better Performance**
- Drafts only store minimal styling data
- No redundant operational data copies

---

## Implementation Order

1. ✅ **DONE:** Dashboard loads host data fresh (not from draft)
2. **NEXT:** Remove subject editing from Dashboard (Phase 2)
3. Remove subject props from WeeklyCommunicationCard
4. Update documentation (ARCHITECTURE.md, memory)
5. Create migration marking deprecated fields
6. Add UI links from Dashboard → Calendar for operational edits

---

## Testing Checklist

After each phase:
- [ ] Signup auto-fill still works
- [ ] Subject shows correctly in Dashboard preview
- [ ] Subject editable in Calendar → Edit Date
- [ ] Draft save only saves colors/styling
- [ ] Subject persists after draft save
- [ ] Monthly signups update correctly every week
