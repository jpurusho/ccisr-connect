# CCISR Connect - Comprehensive Refactoring Roadmap

**Version:** 1.88.x  
**Date:** 2026-11-18  
**Priority:** HIGH - Technical debt is impacting velocity and reliability

---

## 🎯 Executive Summary

The application has grown organically from a simple template system to a complex 5-layer architecture (Templates → Events → Instances → Drafts → Dispatches). This complexity has led to:

- **2+ hour debugging sessions** for simple color issues
- **Hidden dependencies** between layers causing unpredictable behavior
- **Fear of changes** - developers avoid refactoring due to cascading breakage
- **Inconsistent state management** - race conditions between sync/async operations
- **Type safety gaps** - empty strings vs null vs undefined causing runtime bugs

**Cost of Inaction:** Continue accumulating technical debt, slower feature velocity, higher bug rate.

**ROI of Refactoring:** 10x faster debugging, confident changes, easier onboarding, foundation for scale.

---

## 🐛 Root Causes Analysis

### 1. Too Many Sources of Truth ❌

**Current State:**
```
Templates (DB) → Events (DB) → Instances (DB) → Drafts (DB) → Preview (Memory) → Dispatches (DB)
     ↓              ↓              ↓                ↓                ↓
  Primary     Fallback #1     Fallback #2       Fallback #3     Frozen State
```

**Problems:**
- 5-level fallback chains (`?? ?? ?? ??`)
- Circular dependencies (Draft reads Instance, Instance reads Event, Event reads Template)
- Unclear precedence (which layer wins?)
- Debugging requires tracing through 5 layers

**Target State:**
```
EventType (single source) → Week-Specific Overrides (optional) → Preview
```

---

### 2. Async State Management Hell ❌

**Current Pattern:**
```typescript
// Component renders with empty state
const [form, setForm] = useState({ primaryColor: "" })

// Preview builds IMMEDIATELY with empty data
useMemo(() => buildPreview(form), [form]) // ← Runs 4x with empty state!

// THEN async effect loads data
useEffect(() => {
  loadFromDB().then(data => setForm(data)) // ← Finally loads real data
}, [])
```

**Why It Breaks:**
- React renders synchronously, data loads asynchronously
- Preview generates before data arrives
- Race conditions everywhere
- Band-aid fix: loading guards (`if (loading) return null`)

**Target Pattern:**
```typescript
// Suspense-based loading
const data = useSuspenseQuery('draft', loadDraft)
// Component doesn't render until data exists
const preview = buildPreview(data) // ← Always has real data
```

---

### 3. Empty String vs Null vs Undefined 💣

**The Landmine:**
```typescript
// JavaScript has 3 "empty" values with different behaviors:
"" ?? "default"   // Returns "" (empty string is truthy for ??)
"" || "default"   // Returns "default" (empty string is falsy for ||)
null ?? "default" // Returns "default"
undefined ?? "default" // Returns "default"
```

**Current Bugs:**
- `primaryColor: ""` saved to DB (empty string)
- `(fd.primaryColor as string) ?? default` returns `""` not `default`
- Preview gets empty string → becomes `undefined` → uses fallback color
- **Fixed in v1.87.2** but pattern exists throughout codebase

**Target:**
```typescript
// Schema validation prevents empty strings
const DraftSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).or(z.undefined())
  // Empty strings rejected at save time
})
```

---

### 4. Spread Operator Order Matters 🔀

**The Problem:**
```typescript
// These look similar but behave differently:
{ ...defaults, ...draft }  // ✅ Draft wins
{ ...draft, ...defaults }  // ❌ Defaults win

// Current code has BOTH patterns!
setBibleStudyForm({
  ...bsCommon,           // ← Sometimes here
  message: fd.message,
  ...bsCommon,           // ← Sometimes here (accidentally)
})
```

**Why It's Dangerous:**
- Order matters but isn't obvious
- Easy to get wrong during refactoring
- No TypeScript warning
- Silent data loss

**Target:**
```typescript
// Explicit field assignment (no spreading)
setBibleStudyForm({
  primaryColor: sanitizeColor(draft.primaryColor) ?? template.primaryColor,
  message: draft.message ?? template.message,
  // ... explicit for every field
})
```

---

### 5. Preview Logic Has Too Many Branches 🌳

**Current:**
```typescript
function getPreview(templateType: string): string | null {
  const d = dispatches[templateType]
  if (d?.body_html && (d.status === "pending" || d.status === "previewed" || ...)) {
    return d.body_html // Old dispatch HTML
  }
  switch (templateType) {
    case "bible_study": return bibleStudyPreview
    case "mountain_house_bible_study": return bibleStudyPreview // ← Shared
    // ... 10 more cases
  }
}
```

**Problems:**
- Complex conditionals around dispatch status
- Preview vs history vs editing modes
- Shared preview for different event types
- Hard to reason about which HTML is shown

**Target:**
```typescript
// Preview is ALWAYS current form state
const preview = buildCard(form) // No conditions

// History is separate
<ViewSentEmail dispatchId={id} /> // Shows frozen dispatch HTML
```

---

## 🏗️ Refactoring Plan

### Phase 1: Data Model Consolidation (Week 1-2)

**Goal:** Reduce 5 layers to 2

#### 1.1 Merge Template + Event → EventType
```typescript
// BEFORE: Two tables
templates: { id, body_template, subject_template, style_settings }
events: { id, template_id, recurrence_rule, host_family_id }

// AFTER: One table
event_types: {
  id,
  name,
  recurrence_rule,
  default_host_family_id,
  content: {
    bodyTemplate,
    subjectTemplate,
    defaults: { primaryColor, message, ... }
  },
  style: { gradient, fonts, ... }
}
```

**Migration Strategy:**
1. Create new `event_types` table (keep old tables)
2. Write migration script to merge data
3. Update code to read from `event_types`
4. Dual-write period (2 weeks)
5. Drop old tables

**Benefits:**
- One query instead of two
- No JOIN complexity
- Clear ownership (event type owns everything)

---

#### 1.2 Simplify Instance → DraftOverride Pattern
```typescript
// BEFORE: Separate concerns mixed together
event_instances: {
  // Operational (what/when/where)
  instance_date, host_family_id, instance_time,
  // Presentation (how it looks) ← SHOULDN'T BE HERE
  instance_subject, location_override
}

composed_instances: {
  // Presentation (how it looks)
  form_data: { colors, messages },
  // Operational ← SHOULDN'T BE HERE
  week_start, event_type_id
}

// AFTER: Clear separation
date_overrides: {
  event_type_id,
  instance_date,
  host_family_id,    // Operational only
  time_override,
  location_override,
  status             // confirmed/cancelled
}

week_styles: {
  event_type_id,
  week_start,
  style_overrides: { // Presentation only
    primaryColor,
    customMessage,
    ...
  }
}
```

**Benefits:**
- Clear boundary: date-specific vs week-specific
- No confusion about what goes where
- Easier to reason about precedence

---

### Phase 2: Async State Management (Week 3)

**Goal:** Eliminate race conditions

#### 2.1 Add React Query
```bash
npm install @tanstack/react-query
```

```typescript
// BEFORE: Manual loading state
const [loading, setLoading] = useState(true)
const [data, setData] = useState(null)
useEffect(() => {
  loadData().then(d => { setData(d); setLoading(false) })
}, [])

// AFTER: Declarative data fetching
const { data, isLoading } = useQuery({
  queryKey: ['draft', weekStart],
  queryFn: () => loadDraft(weekStart)
})

if (isLoading) return <Skeleton />
// Component only renders when data exists
```

**Benefits:**
- No race conditions
- Automatic caching
- Automatic refetching
- Loading/error states handled

---

#### 2.2 Add Suspense Boundaries
```typescript
// Wrap async components in Suspense
<Suspense fallback={<DashboardSkeleton />}>
  <DashboardContent /> {/* Can use useSuspenseQuery */}
</Suspense>
```

**Benefits:**
- Component doesn't render until data ready
- No manual loading checks
- Better user experience (skeleton states)

---

### Phase 3: Type Safety & Validation (Week 4)

**Goal:** Catch bugs at compile/runtime, not in production

#### 3.1 Add Zod Schemas
```bash
npm install zod
```

```typescript
import { z } from 'zod'

const ColorSchema = z.string().regex(/^#[0-9A-F]{6}$/i)

const DraftSchema = z.object({
  primaryColor: ColorSchema.or(z.undefined()),  // No empty strings
  message: z.string(),                          // Empty strings OK
  messageBgColor: ColorSchema.or(z.undefined()),
  // ... all fields validated
})

// Validate before save
const draft = DraftSchema.parse(formData) // Throws if invalid
```

**Benefits:**
- Runtime validation
- Clear error messages
- No empty string bugs
- Self-documenting schemas

---

#### 3.2 Enable TypeScript Strict Mode
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**Fix violations systematically:**
1. Run `tsc --noEmit`
2. Fix errors file by file
3. No `// @ts-ignore` - fix properly

---

### Phase 4: Preview Simplification (Week 5)

**Goal:** Preview always shows current form state

#### 4.1 Remove Conditional Preview Logic
```typescript
// BEFORE: Complex branching
function getPreview(type) {
  if (dispatch && status === pending) return dispatchHTML
  if (loading) return null
  switch (type) { /* 10 cases */ }
}

// AFTER: Always current form
function getPreview(type) {
  return buildCard(forms[type])
}
```

#### 4.2 Separate History View
```typescript
// Old sent emails are separate component
<ViewDispatchHistory dispatchId={id} />

// Not mixed with preview
```

---

### Phase 5: Testing Infrastructure (Week 6)

**Goal:** Catch regressions automatically

#### 5.1 Unit Tests for Core Logic
```typescript
describe('colorFallback', () => {
  it('uses draft color over template', () => {
    expect(resolveColor('custom', 'template')).toBe('custom')
  })
  
  it('handles empty string as missing', () => {
    expect(resolveColor('', 'template')).toBe('template')
  })
})
```

#### 5.2 Integration Tests for Data Flow
```typescript
test('draft saves and loads correctly', async () => {
  await saveDraft({ primaryColor: '#FF0000' })
  const loaded = await loadDraft()
  expect(loaded.primaryColor).toBe('#FF0000')
})
```

---

## 📊 Implementation Timeline

| Phase | Duration | Effort | Risk |
|-------|----------|--------|------|
| Phase 1: Data Model | 2 weeks | High | Medium |
| Phase 2: Async State | 1 week | Medium | Low |
| Phase 3: Type Safety | 1 week | Low | Low |
| Phase 4: Preview | 1 week | Low | Low |
| Phase 5: Testing | 1 week | Medium | Low |
| **Total** | **6 weeks** | | |

**Can be done incrementally** - each phase delivers value independently.

---

## 💰 Cost-Benefit Analysis

### Current State (Technical Debt)
- **Debugging time:** 2+ hours per color bug
- **Feature velocity:** 50% (fear of breaking things)
- **Onboarding:** 2+ weeks (complex architecture)
- **Bug rate:** High (race conditions, empty strings)

### After Refactor
- **Debugging time:** 5-10 minutes (clear data flow)
- **Feature velocity:** 100% (confident changes)
- **Onboarding:** 2-3 days (simple architecture)
- **Bug rate:** Low (type safety, validation)

### ROI
- **6 weeks investment** → **10x productivity gain**
- **Payback period:** ~3 months
- **Long-term:** Foundation for scaling to 1000s of users

---

## 🚀 Quick Wins (Can Do Now)

While planning full refactor, these give immediate value:

### 1. Remove Debug Logging (30 min)
- Strip out all 🔵🟡🔴 console.logs
- Or make conditional: `if (DEBUG) console.log(...)`

### 2. Add JSDoc Comments (2 hours)
```typescript
/**
 * Resolves color with fallback chain.
 * Empty strings are treated as undefined.
 * @param draft - Color from draft (may be empty)
 * @param template - Color from template
 * @returns Resolved color or undefined
 */
function resolveColor(draft: string | undefined, template: string | undefined): string | undefined
```

### 3. Extract Constants (1 hour)
```typescript
// BEFORE: Magic strings everywhere
if (status === "pending" || status === "previewed" || ...)

// AFTER: Named constants
const DISPATCH_PREVIEW_STATUSES = ["pending", "previewed", "approved"] as const
if (DISPATCH_PREVIEW_STATUSES.includes(status))
```

### 4. Add Error Boundaries (2 hours)
```typescript
<ErrorBoundary fallback={<ErrorState />}>
  <DashboardContent />
</ErrorBoundary>
```

---

## 📚 References & Resources

### Recommended Reading
- [Kent C. Dodds - Application State Management with React](https://kentcdodds.com/blog/application-state-management-with-react)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Zod Documentation](https://zod.dev)
- [React Suspense for Data Fetching](https://react.dev/reference/react/Suspense)

### Similar Refactoring Case Studies
- [Airbnb's Migration to TypeScript](https://medium.com/airbnb-engineering/ts-migrate-a-tool-for-migrating-to-typescript-at-scale-cd23bfeb5cc)
- [Stripe's State Management Refactor](https://stripe.com/blog/payment-api-design)

---

## 🎯 Success Metrics

Track these to measure refactor success:

1. **Time to Debug** - Average time to fix a bug
   - Target: < 30 minutes (currently 2+ hours)

2. **Test Coverage** - % of code covered by tests
   - Target: > 70% (currently ~0%)

3. **TypeScript Errors** - Strict mode violations
   - Target: 0 errors

4. **Performance** - Time to Interactive
   - Target: < 2 seconds (measure impact)

5. **Developer Satisfaction** - Team survey
   - Target: "Confident making changes" > 8/10

---

## 🤝 Getting Started

### Option A: Full Refactor (Recommended)
1. Review this document with team
2. Get buy-in from stakeholders
3. Create dedicated 6-week sprint
4. Follow phases sequentially
5. Deploy incrementally

### Option B: Incremental Improvements
1. Start with Quick Wins (this week)
2. Do Phase 3 (Type Safety) next week
3. Schedule Phase 2 (Async) when convenient
4. Defer Phase 1 (Data Model) until next quarter

### Option C: Hybrid
1. Quick Wins immediately
2. Phase 3 + Phase 2 (4 weeks total)
3. Defer Phase 1 for major version bump

**Recommendation:** Option C - Gets most value (90%) in half the time (4 weeks).

---

## 📞 Next Steps

**Decision Needed:** Which option?

Once decided, we can:
1. Create detailed task breakdown
2. Set up project board
3. Begin implementation
4. Track progress weekly

**Questions?** Let's discuss trade-offs and timeline.

---

**Document Version:** 1.0  
**Last Updated:** 2026-11-18  
**Owner:** Development Team  
**Status:** Proposed - Awaiting Approval
