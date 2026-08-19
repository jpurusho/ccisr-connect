# Dashboard Architecture Simplification

**Date**: 2026-08-18  
**Status**: Proposed

## Current Problems

After debugging template/instance issues, several areas of unnecessary complexity emerged:

### 1. Inconsistent Key Usage (NOW FIXED)
- ✅ Templates were keyed by `comm_type` but looked up by event type name
- ✅ Fixed in v1.75.2-1.75.3

### 2. Massive fetchAll() Function
- **4000+ lines** in a single React component
- 14 parallel queries with complex error handling
- Nested data transformations (event types → templates → instances)
- Break detection, signup auto-fill, host resolution all inline
- Hard to test, hard to debug

### 3. Duplicate Logic Across Event Types
- Bible Study, Women's Study, Prayer Meeting all have nearly identical:
  - Occurrence calculation
  - Break detection  
  - Instance vs template resolution
  - Host data resolution
  - Signup auto-fill
- Copy-pasted 3 times with slight variations

### 4. Complex Priority Chain
```
Composed Instance (draft)
  ↓ if missing
Template Defaults
  ↓ if missing  
Hardcoded Fallbacks
  ↓ overlay with
Calendar Data (date/time/host)
  ↓ overlay with
Signup Auto-fill
```

This works but is hard to reason about and led to bugs like:
- "From Template" overwriting calendar data
- Wrong key lookups
- Stale draft data

## Proposed Simplifications

### 1. Extract Data Fetching Layer

**Create:** `src/lib/dashboard/data-loader.ts`

```typescript
export async function loadDashboardData(weekStart: Date, weekEnd: Date) {
  // All queries in one place
  // Returns typed objects, not raw Supabase results
  // Easy to test independently
}
```

**Benefits:**
- Separate data fetching from rendering
- Can test data layer without React
- Clear input (dates) and output (typed data)

### 2. Create Event Processing Utility

**Create:** `src/lib/dashboard/event-processor.ts`

```typescript
interface EventProcessResult {
  date: string
  time: string
  hostData: HostInfo
  onBreak: boolean
  cancelled: boolean
}

export function processRecurringEvent(
  event: Event,
  weekRange: DateRange,
  instances: EventInstance[],
  breaks: EventBreak[]
): EventProcessResult {
  // Single function that handles:
  // - Occurrence calculation
  // - Break detection
  // - Cancellation check
  // - Instance override logic
}
```

**Benefits:**
- Reuse for Bible Study, Women's Study, Prayer Meeting
- Easy to test with mock data
- Clear separation of concerns

### 3. Simplify Form Initialization

**Current:** Inline ternary hell
```typescript
hasBsDraft ? (
  composedMap["bible_study"].form_data.topic ?? 
  bsDef.topic ?? 
  "Studying the Book of Acts"
) : (
  bsDef.topic ?? "Studying the Book of Acts"
)
```

**Proposed:** Utility function
```typescript
export function buildEventForm<T>(
  template: T,
  calendarData: EventData,
  draft?: T
): T {
  return {
    ...template,           // Start with template defaults
    ...calendarData,       // Overlay calendar data (date/time/host)
    ...(draft || {}),      // Apply draft if exists
  }
}
```

**Benefits:**
- Clear merge order
- Reusable
- Easy to test

### 4. Standardize Template Storage

**Issue:** Multiple state objects for template data
```typescript
const [savedTemplateData, setSavedTemplateData] = useState<Record<string, unknown>>({})
const [savedSubjectTemplates, setSavedSubjectTemplates] = useState<Record<string, string>>({})
const [templateStyles, setTemplateStyles] = useState<Record<string, TemplateStyleSettings>>({})
```

**Proposed:** Single unified structure
```typescript
interface TemplateData {
  subject: string
  fields: Record<string, unknown>
  style: TemplateStyleSettings
}

const [templates, setTemplates] = useState<Record<CommType, TemplateData>>({})
```

**Benefits:**
- One lookup instead of three
- Easier to keep in sync
- Less state management

### 5. Extract Break Detection

**Create:** `src/lib/dashboard/break-checker.ts`

```typescript
export async function isEventOnBreak(
  eventId: string,
  date: Date,
  supabase: SupabaseClient
): Promise<boolean> {
  const dateISO = format(date, 'yyyy-MM-dd')
  const { data } = await supabase
    .from('event_breaks')
    .select('id')
    .eq('event_id', eventId)
    .lte('start_date', dateISO)
    .gte('end_date', dateISO)
    .limit(1)
  
  return (data?.length ?? 0) > 0
}
```

**Benefits:**
- Reusable across components
- Clear function signature
- Easy to test

### 6. Simplify "From Template" Logic

**Current:** Switch with special cases for date/time exclusion

**Proposed:** Generic merge function
```typescript
const CALENDAR_ONLY_FIELDS = ['date', 'time']

function refreshFromTemplate(type: CommType) {
  const template = templates[type]
  if (!template) {
    toast.error(`No template for ${type}`)
    return
  }

  // Filter out calendar-derived fields
  const templateFields = Object.fromEntries(
    Object.entries(template.fields)
      .filter(([key]) => !CALENDAR_ONLY_FIELDS.includes(key))
  )

  // Update form with template fields
  setForm((prev) => ({ ...prev, ...templateFields }))
}
```

**Benefits:**
- No switch statement
- Add to CALENDAR_ONLY_FIELDS instead of modifying code
- Works for all event types

## Implementation Plan

### Phase 1: Extract Utilities (No Behavior Change)
1. Create `event-processor.ts` with `processRecurringEvent()`
2. Create `break-checker.ts` with `isEventOnBreak()`
3. Create `form-builder.ts` with `buildEventForm()`
4. Use in dashboard without changing behavior

### Phase 2: Consolidate Template State
1. Migrate to single `templates` object
2. Update all lookups to use unified structure
3. Remove old state objects

### Phase 3: Extract Data Layer
1. Create `data-loader.ts`
2. Move all Supabase queries there
3. Dashboard just calls `loadDashboardData()`

### Phase 4: Reduce Main Component
- Goal: Under 1000 lines
- Most logic in utilities
- Component focuses on rendering

## Testing Strategy

With extracted utilities, we can test:
```typescript
describe('processRecurringEvent', () => {
  it('returns date when event has occurrence', () => {
    const result = processRecurringEvent(mockEvent, mockRange, [], [])
    expect(result.date).toBe('Friday, August 21st')
  })

  it('returns "No study" when on break', () => {
    const result = processRecurringEvent(mockEvent, mockRange, [], [mockBreak])
    expect(result.onBreak).toBe(true)
  })
})
```

## Benefits Summary

1. **Easier Debugging** - Test each utility in isolation
2. **Less Duplication** - One function handles all recurring events
3. **Clear Data Flow** - loader → processor → form builder → component
4. **Easier Onboarding** - New developers can understand one utility at a time
5. **Future-Proof** - Adding new event types requires less code

## Risks

1. **Migration Effort** - Need to refactor working code
2. **Regression Risk** - Must test thoroughly
3. **Learning Curve** - Team needs to understand new structure

## Decision

- [ ] Accept simplification plan
- [ ] Defer to later
- [ ] Reject (keep current architecture)

If accepted, implement in phases with tests at each step.
