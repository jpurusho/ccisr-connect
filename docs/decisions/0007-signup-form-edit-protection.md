# ADR 0007: Signup Form Edit Protection & Recovery

**Status:** Proposed  
**Date:** 2026-06-23  
**Context:** Users can accidentally delete signup forms or lose custom items when editing forms with existing responses.

## Current Protection Mechanisms

### 1. **Audit Log (✅ Already Implemented)**
- All changes tracked in `audit_log` table
- Tracks: form creation, updates, deletion, status changes
- Records: user_id, timestamp, entity details, changes JSON
- **Limitation:** Doesn't capture full field-level diffs for forms

### 2. **Cascade Delete (✅ Already Implemented)**
```sql
signup_responses.form_id REFERENCES signup_forms(id) ON DELETE CASCADE
```
- When form deleted → all responses deleted
- Intentional to prevent orphan data
- **Warning shown:** "Delete 'X'? This will also delete all responses."

### 3. **Custom Items Visibility (✅ Just Implemented)**
- Custom items now visible in edit UI
- Can be promoted to official options
- Prevents accidental loss through ignorance

## Proposed Enhancements

### Option A: Soft Delete + Archive (Recommended)
**Pros:** Simple, reversible, minimal code change  
**Cons:** Clutters UI if not cleaned periodically

**Implementation:**
1. Add `deleted_at` column to `signup_forms`
2. Change delete to set `deleted_at = now()`
3. Filter out deleted forms in queries
4. Add "Archived Forms" section with restore option
5. Keep `ON DELETE CASCADE` as-is (responses cascade when form permanently deleted)

### Option B: Snapshot Before Update
**Pros:** Full version history, detailed audit trail  
**Cons:** Storage overhead, complex restore UI

**Implementation:**
1. Create `signup_forms_history` table
2. Before each update, copy full row to history
3. Store old `fields` JSONB to track custom item removal
4. Add "View History" → "Restore Version" UI

### Option C: Confirmation on Destructive Edits
**Pros:** Minimal overhead, prevents accidents  
**Cons:** Can be annoying, doesn't provide recovery

**Implementation:**
1. Detect if edit removes custom items or predefined options
2. Detect if responses exist (count > 0)
3. Show enhanced confirmation dialog with impact summary
4. Log detailed before/after in audit

### Option D: Field-Level Immutability
**Pros:** Guarantees no data loss  
**Cons:** Too restrictive, blocks legitimate edits

**Implementation:**
1. If responses exist → prevent field deletion
2. Only allow appending new fields or hiding existing
3. **Rejected:** Too rigid for real-world use

## Recommendation: Hybrid Approach

Combine **Option A** (Soft Delete) + **Option C** (Smart Confirmations)

### Phase 1: Enhanced Confirmation (Quick Win)
```typescript
async function handleSave() {
  if (isEdit && existingResponses > 0) {
    const removedFields = detectRemovedFields(editForm.fields, fields)
    const removedCustomItems = detectRemovedCustomItems(customItemsByField, fields)
    
    if (removedFields.length > 0 || removedCustomItems.size > 0) {
      const confirmed = await showDestructiveEditDialog({
        responseCount: existingResponses,
        removedFields,
        removedCustomItems,
      })
      if (!confirmed) return
    }
  }
  // ... proceed with save
}
```

### Phase 2: Soft Delete (Medium Effort)
1. Migration: `ALTER TABLE signup_forms ADD COLUMN deleted_at timestamptz`
2. Change delete handler to soft delete
3. Add filter to list query: `.is("deleted_at", null)`
4. Add "Restore" button in archived section

### Phase 3: Enhanced Audit (Future)
1. Capture full before/after state in `audit_log.changes`
2. Build admin UI to view detailed diffs
3. Add "Restore from Audit" for super_admin

## Impact on Custom Items

With these changes:
- ✅ Custom items visible during edit (already done)
- ✅ Warning shown if removing fields with custom items
- ✅ Soft delete prevents accidental permanent loss
- ✅ Audit log provides recovery path
- ✅ Promoted custom items become part of form definition

## Migration Path

1. **Today:** Deploy custom items visibility fix (✅ done)
2. **This week:** Add smart confirmations for destructive edits
3. **Next sprint:** Add soft delete + restore UI
4. **Later:** Enhanced audit trail with full diff capture

## Security Considerations

- Soft delete respects RLS policies
- Restore limited to admin+ roles
- Audit log immutable (no delete permission)
- Deleted forms not accessible via public slug
