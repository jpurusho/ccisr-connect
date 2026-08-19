# Dashboard Simplification: Before & After

## Example: Bible Study Processing

### BEFORE (Current - ~80 lines per event type)

```typescript
// ---- Process Bible Study ----
const hasBsDraft = !!composedMap["bible_study"]
const bsEvent = findEventByType("bible_study")
const bsOccurrences = bsEvent ? getOccurrences(bsEvent.recurrence_rule, wkSun, wkSat) : []
let bsRawDate = bsOccurrences.length > 0 ? bsOccurrences[0] : null
if (!bsRawDate && bsEvent && !bsEvent.recurrence_rule) {
  const evtAny = bsEvent as typeof bsEvent & { start_date?: string | null }
  if (evtAny.start_date) {
    const sd = new Date(evtAny.start_date + "T00:00:00")
    if (sd >= wkSun && sd <= wkSat) bsRawDate = sd
  }
}
const bsInstance = bsRawDate && bsEvent ? findInstance(bsEvent.id, format(bsRawDate, "yyyy-MM-dd")) : null
const bsCancelled = bsInstance?.status === "cancelled"
const bsDate = bsCancelled ? null : bsRawDate

const bsCommon = extractCommonFields(bsDef)
if (bsCommon.resourceLinks.length === 0) {
  const def = bsDef as Record<string, unknown>
  const url = (def.resourceLinkUrl as string) ?? ""
  if (url) bsCommon.resourceLinks = [{ label: (def.resourceLinkLabel as string) || "View Resources", url }]
}

const bsDateStr = bsDate ? format(bsDate, "EEEE, MMMM do") : "No bible study this week"
const bsTimeStr = bsInstance?.instance_time ? formatTime(bsInstance.instance_time) : null

// Break detection: query event_breaks for this event+date
const bsBreakCheckDate = bsRawDate ? format(bsRawDate, "yyyy-MM-dd") : format(wkSun, "yyyy-MM-dd")
let bsOnBreak = bsCancelled
if (!bsOnBreak && bsEvent) {
  const { data: breakRows } = await supabase
    .from("event_breaks")
    .select("id")
    .eq("event_id", bsEvent.id)
    .lte("start_date", bsBreakCheckDate)
    .gte("end_date", bsBreakCheckDate)
    .limit(1)
  if (breakRows && breakRows.length > 0) bsOnBreak = true
}

// ... then 50 more lines for host resolution, signup auto-fill, etc.
// ... then DUPLICATE all of this for Women's Study
// ... then DUPLICATE again for Prayer Meeting
```

### AFTER (Proposed - ~10 lines per event type)

```typescript
// Process all recurring events with one utility
const bsEvent = findEventByType("bible_study")
const bsProcessed = await processRecurringEvent(
  bsEvent,
  wkSun,
  wkSat,
  weekInstances,
  supabase
)

const bsDateStr = bsProcessed.date || "No bible study this week"
const bsTimeStr = bsProcessed.time ? formatTime(bsProcessed.time) : null
const bsOnBreak = bsProcessed.onBreak

// Same for Women's Study - just change the event type
const wsEvent = findEventByType("womens_study")
const wsProcessed = await processRecurringEvent(wsEvent, wkSun, wkSat, weekInstances, supabase)

// Same for Prayer Meeting
const pmEvent = findEventByType("prayer_meeting")  
const pmProcessed = await processRecurringEvent(pmEvent, wkSun, wkSat, weekInstances, supabase)
```

**Result:** 
- 240 lines → 30 lines (87% reduction)
- No duplication
- Easy to test
- Clear what's happening

---

## Impact Summary

### Code Reduction
| Area | Before | After | Reduction |
|------|--------|-------|-----------|
| Event processing | 240 lines | 30 lines | **87%** |
| Template lookups | 3 states | 1 state | **67%** |
| Form refresh | 25 lines | 8 lines | **68%** |
| **Total component** | **4051 lines** | **~800 lines** | **80%** |

### Complexity Reduction
- ✅ No more copy-paste for new event types
- ✅ Test utilities in isolation
- ✅ Clear data flow (load → process → render)
- ✅ Easier onboarding for new developers

### Bug Prevention
Today's issues would have been caught earlier:
- ✅ Key lookup bugs → utilities are typed
- ✅ Date overwrite bug → form builder makes merge order explicit
- ✅ Break detection → tested utility with mock data
