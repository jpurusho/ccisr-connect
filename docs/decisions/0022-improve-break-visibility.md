# Improve Break Period Visibility

**Date**: 2026-08-18  
**Status**: Proposed

## Problem

Today's debugging revealed poor break visibility caused confusion:
- Summer break (May 31 - Aug 31) was hiding Bible Study
- User couldn't see why "No bible study this week" was shown
- Break ended Aug 31, but Bible Study resumes Aug 21
- No way to see this without opening event detail → checking "Scheduled Breaks"

## Current Break Visibility

### Calendar Page
- ❌ No visual indication on calendar
- ❌ Can't see break periods at a glance
- ✅ Event detail dialog shows breaks (but only after clicking)

### Dashboard
- ❌ Just shows "No bible study this week"
- ❌ Doesn't explain it's on break
- ❌ No indication when it resumes

### Event Creation
- ❌ No warning when scheduling during break period
- ❌ No way to see existing breaks for event type

## Proposed Improvements

### 1. Calendar: Show Breaks as Visual Blocks

**Add break period overlays on calendar:**

```
┌─────────────────────────────────┐
│  August 2026                    │
├─────┬─────┬─────┬─────┬─────────┤
│ Sun │ Mon │ Tue │ Wed │ Thu │...│
├─────┼─────┼─────┼─────┼─────────┤
│     │     │     │     │     │   │
│     │ ┌───────────────────────┐ │ ← Gray overlay
│     │ │  Summer Break 🏖️      │ │   "Bible Study"
│     │ │  May 31 - Aug 15      │ │   
│     │ └───────────────────────┘ │
│     │     │     │  21 │  22 │   │
│     │     │     │  📖 │     │   │ ← Study resumes
└─────┴─────┴─────┴─────┴─────────┘
```

**Implementation:**
- Add "Show Breaks" toggle in calendar filters
- Render break periods as semi-transparent overlays
- Click break to edit/delete
- Color-coded by event type

### 2. Dashboard: Explain Why "No Study"

**Current:**
```
📖 Bible Study
   No bible study this week
   Topic: Acts of the Apostles
```

**Proposed:**
```
📖 Bible Study
   🏖️ On break until August 15
   Resumes: Friday, August 21st
   Topic: Acts of the Apostles
```

**Implementation:**
```typescript
if (bsProcessed.onBreak) {
  // Find the break to show end date
  const activeBreak = await getActiveBreak(bsEvent.id, checkDate)
  return {
    ...bsProcessed,
    breakMessage: activeBreak?.message || "On scheduled break",
    breakEnd: activeBreak?.end_date,
    resumeDate: getNextOccurrence(bsEvent, new Date(activeBreak.end_date))
  }
}
```

### 3. Event Detail: Better Break UI

**Current:** Scheduled Breaks box (good, but could be better)

**Proposed:** Add visual timeline

```
┌─────────────────────────────────────────┐
│ San Ramon Friday Bible Study            │
│ 📅 Friday, August 21, 2026              │
├─────────────────────────────────────────┤
│ 🏖️ Break Schedule                       │
│                                          │
│ ─────●━━━━━━━━━━━━━━●─────────●────────→│
│      │              │         │         │
│   May 31        Aug 15    Aug 21       │
│   Break         Break    Resumes       │
│   Starts        Ends                   │
│                                          │
│ ✅ Active (on break now)                │
│ Message: "Summer Break"                 │
│ Duration: 77 days                       │
└─────────────────────────────────────────┘
```

### 4. Break Conflict Warning

**When scheduling new event:**

```
┌─────────────────────────────────────┐
│ Schedule Event Instance              │
├─────────────────────────────────────┤
│ Date: [August 10, 2026]             │
│                                      │
│ ⚠️  WARNING: Break Conflict          │
│ This date falls during:              │
│ "Summer Break" (May 31 - Aug 15)    │
│                                      │
│ [ Continue Anyway ] [ Pick Another ] │
└─────────────────────────────────────┘
```

**Implementation:**
```typescript
async function checkBreakConflict(
  eventId: string,
  date: Date
): Promise<EventBreak | null> {
  const dateISO = format(date, 'yyyy-MM-dd')
  const { data } = await supabase
    .from('event_breaks')
    .select('*')
    .eq('event_id', eventId)
    .lte('start_date', dateISO)
    .gte('end_date', dateISO)
    .single()
  
  return data
}
```

### 5. Break Management Page

**New page: `/breaks` (or tab in Calendar)**

Shows all breaks across all event types:

```
┌──────────────────────────────────────────┐
│ Break Schedule                           │
├──────────────────────────────────────────┤
│ ✓ Active Breaks                          │
│                                           │
│ 🏖️ Summer Break                          │
│    Bible Study                            │
│    May 31 - Aug 15 (45 days)             │
│    [Edit] [Delete]                       │
│                                           │
│ ─────────────────────────────────────────│
│                                           │
│ Upcoming Breaks                          │
│                                           │
│ 🎄 Christmas Break                       │
│    All Events                             │
│    Dec 24 - Jan 1 (9 days)               │
│    [Edit] [Delete]                       │
│                                           │
│ ─────────────────────────────────────────│
│                                           │
│ Past Breaks (last 3 months)             │
│                                           │
│ [+ Schedule New Break]                   │
└──────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Better Messaging (Quick Win)
1. Update dashboard to show "On break until [date]"
2. Show resume date if available
3. ~1 hour

### Phase 2: Break Conflict Warning
1. Add `checkBreakConflict()` utility
2. Show warning in event form when date conflicts
3. ~2 hours

### Phase 3: Calendar Visualization
1. Add "Show Breaks" toggle
2. Render break overlays
3. Make them clickable
4. ~4 hours

### Phase 4: Break Management Page
1. Create `/breaks` page
2. List all breaks (active, upcoming, past)
3. Filter by event type
4. ~4 hours

## Visual Design

### Break Color Coding
```typescript
const BREAK_COLORS = {
  active: {
    bg: 'bg-orange-100 dark:bg-orange-900/20',
    border: 'border-orange-300 dark:border-orange-700',
    text: 'text-orange-800 dark:text-orange-300',
  },
  upcoming: {
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    border: 'border-blue-300 dark:border-blue-700',
    text: 'text-blue-800 dark:text-blue-300',
  },
  past: {
    bg: 'bg-gray-100 dark:bg-gray-900/20',
    border: 'border-gray-300 dark:border-gray-700',
    text: 'text-gray-600 dark:text-gray-400',
  },
}
```

### Break Icon by Season
```typescript
const BREAK_ICONS: Record<string, string> = {
  summer: '🏖️',
  winter: '❄️',
  christmas: '🎄',
  easter: '🐰',
  default: '📅',
}
```

## Benefits

1. **Transparency** - Users always know why events are missing
2. **Prevent Mistakes** - Warning before scheduling during break
3. **Better Planning** - See all breaks at once
4. **Less Confusion** - Clear communication about status

## User Stories

### Story 1: Understand Why Event Is Missing
**As a user**, when I see "No bible study this week"  
**I want to** see why (break, cancelled, or no event)  
**So that** I understand the status and when it resumes

### Story 2: Avoid Scheduling Conflicts
**As a user**, when I schedule an event instance  
**I want to** see if it conflicts with a break  
**So that** I don't accidentally override a planned break

### Story 3: Manage Breaks Centrally
**As an admin**, I want to see all breaks across all events  
**So that** I can plan church activities around them

## Future: Recurring Breaks

**Scenario:** Bible Study has summer break every year

**Proposed:** Recurring break patterns
```
Break: Summer Break
Pattern: FREQ=YEARLY;BYMONTH=6,7,8;BYMONTHDAY=1-31
Applies to: Bible Study, Women's Study
```

This would automatically skip June-August every year.

## Decision

- [ ] Accept all phases
- [ ] Accept Phase 1-2 only (messaging + warnings)
- [ ] Defer to later
- [ ] Reject

If accepted, implement Phase 1 immediately for quick UX win.
