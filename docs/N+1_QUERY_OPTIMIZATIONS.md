# N+1 Query Optimization Documentation

## Overview

This document details the N+1 query patterns identified and fixed in the CCISR Connect codebase to improve database query performance.

## What is an N+1 Query Problem?

An N+1 query problem occurs when:
1. You make 1 query to fetch a list of N items
2. Then make N additional queries (one per item) to fetch related data

This results in N+1 total queries instead of 1-2 batched queries, significantly impacting performance.

## Patterns Identified and Fixed

### 1. Dashboard Host Family Resolution (CRITICAL)

**Location:** `/src/app/(dashboard)/dashboard/page.tsx`

**Problem:**
- `resolveHostFamily()` function was called separately for:
  - Bible Study event instance host
  - Bible Study event default host
  - Prayer Meeting instance host
  - Prayer Meeting event default host
- Each call made 3 separate queries (families, addresses, members)
- Result: Up to 12 queries for just 2 event types

**Solution:**
- Created `batchResolveHostFamilies()` utility in `/src/lib/queries/batch-host-families.ts`
- Collect all host family IDs upfront from both instances and events
- Execute single batched query for all families, addresses, and members
- Use in-memory Map lookups instead of repeated queries

**Query Reduction:** 12+ queries → 3 queries (1 batch round-trip)

**Code Changes:**
```typescript
// Before (N+1 pattern)
const bsHostData = await resolveHostFamily(bsInstance.host_family_id)

// After (batched)
const hostFamiliesMap = await batchResolveHostFamilies([...hostFamilyIds], supabase)
const bsHostData = getHostFamilyInfo(bsInstance.host_family_id)
```

### 2. Dashboard Event Break Checks (CRITICAL)

**Location:** `/src/app/(dashboard)/dashboard/page.tsx` (bulletin section)

**Problem:**
- Inside loop over active events, queried `event_breaks` table individually
- For bulletin generation with 10 events, made 10+ separate break queries
- Each query checked if event was on break for specific dates

**Solution:**
- Created `batchLoadEventBreaks()` utility in `/src/lib/queries/batch-event-breaks.ts`
- Load all event breaks for the week date range in a single query
- Use in-memory Map lookup to check break status
- Helper function `isEventOnBreak()` for instant lookups

**Query Reduction:** 10+ queries → 1 query

**Code Changes:**
```typescript
// Before (N+1 pattern)
for (const evt of activeEvents) {
  const { data: occBreaks } = await supabase
    .from("event_breaks")
    .select("id, message")
    .eq("event_id", evt.id)
    // ... more filters
}

// After (batched)
const breaksMap = await batchLoadEventBreaks(eventIds, startDate, endDate, supabase)
for (const evt of activeEvents) {
  const breakStatus = isEventOnBreak(evt.id, dateStr, breaksMap)
}
```

### 3. Calendar Page Host Family Resolution (MODERATE)

**Location:** `/src/app/(dashboard)/calendar/page.tsx`

**Problem:**
- First batch query for instance-level host families
- Second batch query for event-level host families (recurring events)
- Two separate round-trips to database for the same data type

**Solution:**
- Collect both instance-level AND event-level host family IDs upfront
- Single batched query for all host families
- Eliminated redundant second query

**Query Reduction:** 6 queries (2 batches) → 3 queries (1 batch)

**Code Changes:**
```typescript
// Before (2 batches)
const instanceHostIds = instances.map(i => i.host_family_id).filter(Boolean)
await fetchFamiliesAndAddresses(instanceHostIds) // Batch 1

// Later in code...
const eventHostIds = events.map(e => e.host_family_id).filter(Boolean)
await fetchFamiliesAndAddresses(eventHostIds) // Batch 2

// After (1 batch)
const allHostIds = [...instanceHostIds, ...eventHostIds]
await batchResolveHostFamilies(allHostIds, supabase)
```

## Performance Impact

### Query Count Reduction
- **Dashboard page load:** ~15-25 queries → ~5-7 queries (60-70% reduction)
- **Calendar page load:** ~10-15 queries → ~5-8 queries (40-50% reduction)

### Expected Performance Improvements
- **Faster page loads:** 200-500ms reduction on dashboard
- **Reduced database load:** Fewer connections and queries
- **Better scalability:** Performance improves as data grows
- **Lower latency:** Single round-trip vs multiple sequential queries

## Utilities Created

### 1. `/src/lib/queries/batch-host-families.ts`

**Functions:**
- `batchResolveHostFamilies(familyIds, supabase)` - Batch-resolve host family details
- Returns `Map<familyId, HostFamilyInfo>`

**Benefits:**
- Single database round-trip for multiple families
- Handles missing data gracefully
- Type-safe with proper interfaces

### 2. `/src/lib/queries/batch-event-breaks.ts`

**Functions:**
- `batchLoadEventBreaks(eventIds, startDate, endDate, supabase)` - Batch-load breaks
- `isEventOnBreak(eventId, dateStr, breaksMap)` - In-memory lookup
- Returns break status and message

**Benefits:**
- Eliminates queries inside loops
- Fast O(1) lookups
- Pre-loads all needed break data

## Testing Recommendations

1. **Functional Testing:**
   - Verify dashboard loads correctly with multiple events
   - Check Bible Study and Prayer Meeting host info displays
   - Confirm bulletin events show correct break messages
   - Validate calendar shows host families for all event types

2. **Performance Testing:**
   - Use browser DevTools Network tab to count queries
   - Measure page load times before/after
   - Test with varying numbers of events (5, 10, 20+)
   - Monitor Supabase query logs for query counts

3. **Edge Cases:**
   - Events with no host families
   - Events on break with custom messages
   - Mixed instance and event-level hosts
   - Empty weeks with no events

## Future Optimization Opportunities

1. **Member queries:** Birthday and anniversary member fetches could be optimized further
2. **Mailing list members:** When checking recipient counts, could batch-load
3. **Composed instances:** Could pre-load related templates in batch
4. **Event types:** Already loaded in batch, but could cache client-side

## Monitoring

Track these metrics to measure impact:
- Average database query count per page load
- P50/P95/P99 page load times
- Database connection pool usage
- Query execution times in Supabase logs

---

**Last Updated:** 2026-11-05
**Version:** 1.73.0
