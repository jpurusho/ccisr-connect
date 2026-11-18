# Version 1.87.0 - Architecture Refactor: Instance/Draft Separation

**Date:** 2026-11-18  
**Type:** Architecture improvement, bug fix, documentation

---

## 🎯 Summary

Complete architectural refactor to separate operational data (instance) from presentation data (draft). This fixes multiple bugs related to stale data, editing conflicts, and unclear ownership of fields.

---

## ✅ What Was Fixed

### 1. Subject Editing Readonly Bug
**Problem:** Subject field in Dashboard showed as text input but cursor wouldn't enter edit mode.

**Root Cause:** Subject was being edited in multiple places (Dashboard + Calendar) with unclear priority.

**Solution:** 
- Removed subject editing from Dashboard entirely
- Subject now read-only in Dashboard with helper text
- Subject ONLY editable in Calendar → Edit Date dialog
- Saves to `event_instances.instance_subject`

### 2. Draft Style Disappearing Bug
**Problem:** Color/style customizations would disappear after saving draft and returning to Dashboard.

**Root Cause:** Template defaults (`...bsCommon`) were being spread AFTER draft data, overwriting saved customizations.

**Solution:**
- Restructured object spread order: defaults first, then draft overrides
- Each style field explicitly loaded from draft

### 3. Monthly Signup Auto-Fill Not Persisting
**Problem:** Monthly signup data would freeze when draft was saved, requiring manual updates every week.

**Root Cause:** Host data was being saved to drafts, freezing it at save time.

**Solution:**
- Host data now resolved fresh from signup forms BEFORE loading draft
- Draft only contains styling, never operational data
- Signup auto-fill works automatically every week

---

## 🏗️ Architectural Changes

### Clear Data Ownership

| Data Type | Owner Table | Edit Location | Scope |
|-----------|-------------|---------------|-------|
| Subject | event_instances | Calendar → Edit Date | Per-date |
| Subject Prefix | event_instances | Calendar → Edit Date | Per-date |
| Host | event_instances + signup auto-fill | Calendar → Edit Date | Per-date |
| Time | event_instances | Calendar → Edit Date | Per-date |
| Location | event_instances | Calendar → Edit Date | Per-date |
| Colors | composed_instances | Dashboard → Edit | Per-week |
| Custom Messages | composed_instances | Dashboard → Edit | Per-week |
| Theme | composed_instances | Dashboard → Edit | Per-week |

### Data Flow Hierarchy

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

### Resolution Priority

**Operational Data (Host, Time, Subject):**
1. Instance override (highest)
2. Signup auto-fill
3. Event default
4. Template default (lowest)

**Presentation Data (Colors, Messages):**
1. Draft customization (highest)
2. Template default (lowest)

---

## 📝 Files Modified

### Components
- **`src/components/dashboard/weekly-communication-card.tsx`**
  - Removed `onSubjectChange` and `onSubjectPrefixChange` props
  - Subject display now always read-only with helper text
  - Added info banner explaining what's editable in Dashboard vs Calendar
  - Removed subject prefix input field

### Pages
- **`src/app/(dashboard)/dashboard/page.tsx`**
  - Removed subject editing callbacks (`setSubjectOverride`, `setSubjectPrefix`)
  - Removed callback props from all `WeeklyCommunicationCard` instances
  - Host resolution already fixed to load fresh from signup before draft

### Database
- **`supabase/migrations/00064_cleanup_draft_architecture.sql`** (NEW)
  - Added table/column comments documenting purpose
  - Marked deprecated fields in `composed_instances.data`
  - Added indexes for faster instance lookups
  - Validates migration 00063 columns exist

### Documentation
- **`AGENTS.md`** - Added comprehensive "Data Architecture: Layers & Boundaries" section
  - Four-layer model (Templates → Events → Instances → Drafts → Dispatches)
  - Resolution priority tables
  - Code examples (correct vs incorrect patterns)
  - Files reference guide
  - Common pitfalls to avoid

- **`ARCHITECTURE_REFACTOR.md`** (NEW)
  - Complete refactoring plan with phases
  - Current problems documentation
  - Target architecture
  - Implementation order
  - Testing checklist

### Memory
- **`memory/feedback_subject_edit_location.md`** (NEW)
  - Documents subject editing location rule
  - Why/how to apply
  - Links to related memories

- **`memory/MEMORY.md`** - Added entry for subject edit location

---

## 🔧 Technical Details

### Database Schema Changes

**New Indexes:**
```sql
-- Faster instance subject lookups
CREATE INDEX idx_event_instances_subject_lookup
  ON event_instances(event_id, instance_date)
  WHERE instance_subject IS NOT NULL;

-- Faster operational data lookups  
CREATE INDEX idx_event_instances_operational
  ON event_instances(event_id, instance_date, host_family_id);
```

**Deprecated Fields (marked, not dropped):**
- `composed_instances.data.hostNames` → Use `event_instances.host_family_id`
- `composed_instances.data.address` → Resolve from host_family_id
- `composed_instances.data.subject` → Use `event_instances.instance_subject`

### Code Pattern Changes

**Before (Incorrect):**
```typescript
// Drafts contained operational data
const draft = { 
  messageBgColor: "#fff",
  hostName: "Jerome",  // ❌ Frozen at save time
  subject: "Bible Study"  // ❌ Can conflict with instance
}
```

**After (Correct):**
```typescript
// Drafts only contain presentation
const draft = {
  messageBgColor: "#fff",
  message: "Custom message"
}

// Operational data loaded fresh
const host = await resolveHost(instanceId, signupFormId, date)
const subject = await resolveSubject(instanceId, eventId)
```

---

## 🎨 UI/UX Improvements

### Dashboard Edit Mode
- Added blue info banner explaining scope: "Editing Presentation (This Week Only)"
- Clear guidance: operational details → Calendar
- Subject shows read-only with helper text pointing to Calendar

### Calendar Edit Date
- Already had subject fields (from migration 00063)
- Now THE authoritative place for subject editing
- Family dropdown shows member names for easier search

---

## ✅ Benefits

1. **No More Editing Conflicts**
   - One place to edit each type of data
   - Clear mental model

2. **Signup Auto-Fill Works Forever**
   - Monthly signups update automatically every week
   - No manual intervention needed

3. **Styles Persist Correctly**
   - Draft customizations no longer overwritten
   - Colors/messages save and load properly

4. **Cleaner Architecture**
   - Separation of concerns
   - Easier to understand and maintain
   - Less code complexity

5. **Better Performance**
   - Optimized indexes
   - No redundant data copies

---

## 🧪 Testing Checklist

- [x] Subject editable in Calendar → Edit Date
- [x] Subject read-only in Dashboard with helper text
- [x] Draft saves only styling, not operational data
- [x] Colors persist after saving draft
- [x] Monthly signup data updates correctly every week
- [x] TypeScript compiles without errors
- [x] No console errors
- [x] Migration validates dependencies

---

## 📚 Documentation

All architectural decisions documented in:
- `AGENTS.md` - Primary reference for future development
- `ARCHITECTURE_REFACTOR.md` - Detailed refactoring plan
- `memory/feedback_subject_edit_location.md` - Memory for AI assistant
- Migration comments - Database-level documentation

---

## 🚀 Deployment Notes

1. Run migration 00064 (safe - only adds comments and indexes)
2. No data migration needed
3. Existing drafts will continue to work
4. Deprecated fields will be ignored by new code
5. Can drop deprecated fields in future version after validation

---

## 🔮 Future Improvements

Optional enhancements documented in `ARCHITECTURE_REFACTOR.md`:
- Add quick-nav button from Dashboard to Calendar for specific date
- Visual indicators showing which fields come from signup vs instance
- Bulk instance editing for recurring changes
- Draft templates for recurring customizations

---

## 👤 Contributors

- Architecture design & implementation
- Bug fixes
- Documentation

**Co-Authored-By:** Claude Sonnet 4.5 <noreply@anthropic.com>
