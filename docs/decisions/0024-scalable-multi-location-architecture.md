# 0024 — Scalable Multi-Location Architecture

**Status:** accepted  
**Date:** 2026-11-11  
**Version:** 1.84.0

## Context

The dashboard was limited to one card per hardcoded `CommType` (birthday, anniversary, bible_study, etc.). This created a fundamental constraint: **we could only have one event of each type**.

### The Problem

We needed Bible Study at two locations (San Ramon + Mountain House), but the hardcoded architecture made this impossible:

```typescript
// OLD: Hardcoded union type
type CommType = 
  | "birthday" 
  | "anniversary" 
  | "bible_study"  // ❌ Can only have ONE bible study
  | "womens_study" 
  | "prayer_meeting" 
  | "bulletin"

// OLD: Dashboard state keyed by CommType
const [bibleStudyForm, setBibleStudyForm] = useState<BibleStudyFormData>(...)
//     ^^^^^^^^^^^^^^^ Only room for ONE bible study
```

Adding a second Bible Study location would have required:
1. Creating a new type like `bible_study_mountain_house`
2. Duplicating all form component code
3. Duplicating all card builder code
4. Adding it to the hardcoded union
5. Modifying dashboard state management
6. **Result:** Code duplication and maintenance nightmare

## Decision

Replace the hardcoded `CommType` architecture with a scalable system based on:
1. **Numeric IDs as routing keys** (`event_type.id`)
2. **Template types for template selection** (`event_type.template_type`)
3. **Template registry for pluggable components**
4. **Primary system for backward compatibility**

### Key Changes

#### 1. ID-Based Dashboard State

```typescript
// NEW: State keyed by event_type.id (numeric, unique per location)
const dashboardState: Record<number, {
  form: Record<string, unknown>
  subject: string
  prefix: string
  status: DraftStatus
}> = {}

// Example:
// dashboardState[3] = San Ramon Bible Study form data
// dashboardState[15] = Mountain House Bible Study form data
```

#### 2. Template Type String

```typescript
// NEW: Template type identifies which template to use
type TemplateType = string  // Not a union!

// Examples of template_type values:
// - "bible_study" (used by both San Ramon AND Mountain House)
// - "womens_study"
// - "birthday"
// - "custom_template"
```

#### 3. Template Registry

```typescript
// Pluggable system: template_type → form component + card builder
interface TemplateConfig {
  type: TemplateType
  formComponent: ComponentType
  cardBuilder: (data: any) => string
  defaults: Record<string, unknown>
}

// Register once, use many times
templateRegistry.register({
  type: "bible_study",
  formComponent: BibleStudyEditForm,    // ✅ Reused for both locations
  cardBuilder: buildBibleStudyCard,     // ✅ Reused for both locations
  defaults: { ... }
})
```

#### 4. Primary System

```typescript
// One event type is marked as primary per template type
event_types: {
  id: 3,
  name: "Bible Study",
  template_type: "bible_study",
  is_primary: true  // ✅ Primary for backward-compat lookups
}

event_types: {
  id: 15,
  name: "Mountain House Bible Study",
  template_type: "bible_study",
  is_primary: false  // ✅ Non-primary, but fully functional
}
```

### Database Schema

```sql
CREATE TABLE event_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  template_type TEXT,           -- Identifies which template to use
  comm_type TEXT,               -- Backward compat (≈ template_type)
  is_primary BOOLEAN DEFAULT false,  -- Primary per template_type
  show_in_dashboard BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  -- ... other fields
);

-- Example data:
-- San Ramon Bible Study: id=3, template_type='bible_study', is_primary=true
-- Mountain House Bible Study: id=15, template_type='bible_study', is_primary=false
```

## Benefits

### 1. Zero Code Changes to Add Locations

```sql
-- Want a third Bible Study location? Just INSERT:
INSERT INTO event_types (
  name, 
  template_type, 
  is_primary, 
  show_in_dashboard
) VALUES (
  'Tracy Bible Study', 
  'bible_study', 
  false,
  true
);

-- Dashboard automatically shows a new card!
-- - Uses BibleStudyEditForm (from registry)
-- - Uses buildBibleStudyCard (from registry)
-- - Maintains independent state (keyed by id)
```

### 2. No Code Duplication

```typescript
// Before v1.84.0: Would need to duplicate entire component
function BibleStudyEditForm() { /* 200 lines */ }
function MountainHouseBibleStudyEditForm() { /* 200 lines of SAME code */ }

// After v1.84.0: One component, used for all locations
function BibleStudyEditForm({ data, onChange }) {
  // Works for San Ramon, Mountain House, Tracy, etc.
}
```

### 3. Scalable Template System

Add a new template type by:
1. Register in `template-registry.ts`
2. Add migration to insert event_types row
3. Deploy

No changes to dashboard, calendar, or templates pages.

### 4. Backward Compatibility

```typescript
// Old code that looked up by template type still works:
const primaryBibleStudy = eventTypes.find(
  et => et.template_type === "bible_study" && et.is_primary
)
```

## Implementation

### Files Changed

1. **`src/lib/dashboard-types.ts`**
   - Changed `CommType` union to `TemplateType` string
   - Dashboard state now `Record<number, DashboardCard>` (keyed by id)

2. **`src/app/(dashboard)/dashboard/page.tsx`**
   - State management keyed by `event_type.id`
   - Template lookups use `template_type` to query registry
   - Removed all hardcoded type arrays

3. **`src/lib/template-registry.ts`**
   - New file: Template registry implementation
   - Maps template types to form components and card builders

4. **`supabase/migrations/00060_scalable_multi_location_architecture.sql`**
   - Added `template_type` column
   - Added `is_primary` column
   - Backfilled data for existing event types

### Migration Path

```sql
-- Add new columns
ALTER TABLE event_types ADD COLUMN template_type TEXT;
ALTER TABLE event_types ADD COLUMN is_primary BOOLEAN DEFAULT false;

-- Backfill template_type from comm_type
UPDATE event_types SET template_type = comm_type WHERE template_type IS NULL;

-- Mark existing events as primary
UPDATE event_types SET is_primary = true 
WHERE template_type IN ('birthday', 'anniversary', 'bible_study', 'womens_study', 'prayer_meeting', 'bulletin');

-- Add Mountain House as non-primary
INSERT INTO event_types (name, template_type, is_primary, show_in_dashboard)
VALUES ('Mountain House Bible Study', 'bible_study', false, true);
```

## Consequences

### Positive

1. **Unlimited Locations** — Add as many locations as needed with just SQL INSERTs
2. **Zero Code Duplication** — Form components and card builders are reused
3. **Easy to Test** — Template registry can be mocked/stubbed
4. **Clear Separation** — Template concerns (forms/builders) separate from dashboard state
5. **Scalable** — New template types don't require code changes across files

### Negative

1. **More Complex Lookups** — Must distinguish between `id` (unique) and `template_type` (shared)
2. **Migration Effort** — Significant refactoring of dashboard state management
3. **Learning Curve** — Team must understand id vs template_type distinction

### Neutral

1. **Backward Compatibility** — `comm_type` field kept for legacy code
2. **Primary System** — Adds complexity but necessary for 1:1 lookups

## Alternatives Considered

### Alternative 1: Keep Hardcoded CommType, Add Suffixes

```typescript
type CommType = 
  | "bible_study_san_ramon"
  | "bible_study_mountain_house"
  | ...
```

**Rejected because:**
- Still requires code changes to add locations
- Name suffixes are brittle
- Duplicates form components and card builders

### Alternative 2: Location as a Property

```typescript
interface EventType {
  type: CommType
  location: string  // "San Ramon" | "Mountain House"
}
```

**Rejected because:**
- Assumes all events have locations
- Doesn't solve the 1:1 mapping problem
- Dashboard state would still need complex keying

### Alternative 3: Dynamic Template Loading from Database

Store form definitions in JSONB, render dynamically.

**Rejected because:**
- Loses type safety
- Can't use React components
- Complex validation logic

## Related

- [ARCHITECTURE.md](../ARCHITECTURE.md) — Updated with new architecture achievements
- [DYNAMIC_TEMPLATE_SYSTEM.md](../DYNAMIC_TEMPLATE_SYSTEM.md) — Updated with multi-location details
- [0021 - Simplify Dashboard Architecture](0021-simplify-dashboard-architecture.md) — Superseded by this change

## Verification

```bash
# Check that multiple events per template_type work:
SELECT id, name, template_type, is_primary 
FROM event_types 
WHERE template_type = 'bible_study';

# Expected:
# id  | name                        | template_type | is_primary
# ----+-----------------------------+---------------+-----------
# 3   | Bible Study                 | bible_study   | true
# 15  | Mountain House Bible Study  | bible_study   | false

# Both should show independent cards on dashboard
```

## Decision Log

- **2026-11-10 v1.84.0**: Implemented multi-location architecture
- **2026-11-10 v1.84.1**: Fixed Mountain House as independent template
- **2026-11-11**: Documented in ADR

## User Guidance

**For operators:**
- Each location now has its own card on the dashboard
- Changes to one location don't affect others
- Use display_order to control card ordering

**For developers:**
- Always key dashboard state by `event_type.id`
- Use `template_type` to look up form components in registry
- Never assume 1:1 mapping between template_type and event_type
- Use `is_primary` only for backward-compat lookups
