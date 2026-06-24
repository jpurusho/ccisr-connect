# Signup Form Data Protection & Recovery Guide

## Protection Layers (✅ Implemented)

### 1. **Custom Items Visibility**
- Custom items now visible in edit form
- Appear in amber-highlighted section
- Can promote to official options with "Add to list" button

### 2. **Smart Warnings Before Save**
When editing a form with existing responses, you'll see warnings if:
- ❌ Removing fields (shows which fields + labels)
- ❌ Removing custom items (shows count)
- ❌ Removing predefined options from claim_select fields

**Example Warning:**
```
⚠️ Warning: This form has 15 existing responses.

The following changes will affect existing data:

• 2 fields will be removed: Phone Number, Emergency Contact
• 3 custom items will no longer be editable
• 1 predefined option removed from "Bring an Item": Dessert

Data in existing responses will be preserved but may become inaccessible.

Continue with update?
```

### 3. **Enhanced Delete Confirmation**
Shows exactly what will be lost:
```
⚠️ Delete "Summer Picnic Signup"?

This will permanently delete:
• 42 responses
• All custom items added by users
• All associated data

This action CANNOT be undone!
```

### 4. **Comprehensive Audit Logging**
Every change is logged with:
- User who made the change
- Timestamp
- Before/after field counts
- Removed/added field details
- Response count at time of change

## Recovery Options

### Option A: View Audit Log (Available Now)
1. Go to Database → `audit_log` table
2. Filter by `entity_type = 'signup_forms'` and `entity_id = <form_id>`
3. Review `changes` JSONB column for details
4. Manual recovery: recreate form based on audit data

**Query Example:**
```sql
SELECT 
  created_at,
  action,
  changes
FROM audit_log
WHERE entity_type = 'signup_forms'
  AND entity_id = 'abc-123-def'
ORDER BY created_at DESC;
```

### Option B: Soft Delete (Future - Recommended)
**Status:** Documented in ADR 0007, not yet implemented

Will add:
- `deleted_at` column to mark forms as deleted
- "Archived Forms" section in UI
- One-click restore with full data recovery
- 30-day grace period before permanent deletion

### Option C: Restore from Database Backup
**Last Resort Only**
1. Contact database admin
2. Identify backup timestamp
3. Extract specific form + responses
4. Manual import into production

**Downtime:** ~30 minutes  
**Data Loss:** Any changes since backup

## Best Practices

### ✅ DO:
- **Preview before saving:** Review warnings carefully
- **Promote custom items:** Make commonly used custom items official before editing
- **Archive instead of delete:** If soft delete is available, use it
- **Check response count:** Be extra careful with high-response forms
- **Test on copy:** For major restructuring, create new form and migrate

### ❌ DON'T:
- **Ignore warnings:** They exist for a reason
- **Delete active forms:** Deactivate first, delete after responses exported
- **Remove fields carelessly:** Check if any responses used that field
- **Rush edits:** Take time to understand impact

## Common Scenarios

### Scenario 1: Need to rename a field
**Safe:** Just change the `label` — field ID stays same, data preserved

### Scenario 2: Need to remove a field
**Check first:**
1. Go to Responses tab
2. Export CSV to see if field has data
3. If yes, consider hiding instead of removing (mark as `hidden: true`)

### Scenario 3: Want to delete custom items
**Don't delete!** Instead:
1. Click "Add to list" to promote to official option
2. Now you can edit/rename/delete as regular option
3. Or leave as custom item and responses will keep working

### Scenario 4: Accidentally deleted a form
**Recovery steps:**
1. Check audit log for form details: `entity_id` of deleted form
2. Note the `changes` JSON which has title, fields, etc.
3. Manually recreate form (responses are gone if cascade delete happened)
4. **Future:** Use soft delete restore when implemented

### Scenario 5: Need to restructure form significantly
**Safe approach:**
1. Export all responses to CSV
2. Create new form with desired structure
3. Deactivate old form (don't delete yet)
4. Import responses if needed via API/manual
5. Delete old form after validation

## When to Contact Support

- Form deleted and backup restore needed
- Audit log shows unexpected changes
- Need to recover deleted form with >100 responses
- Database-level issue preventing form access

## Monitoring

**Weekly:**
- Review `audit_log` for unexpected deletions
- Check forms with declining response counts

**Before Major Edits:**
- Export current responses
- Screenshot current field configuration
- Note custom item counts

## Future Enhancements (Roadmap)

1. **Soft Delete** (Phase 2) - In progress
2. **Field History Viewer** - Shows all changes to specific field
3. **One-Click Restore** - Restore entire form from audit log
4. **Form Templates** - Save form structure for reuse
5. **Response Migration Tool** - Move responses between forms
6. **Automated Backups** - Daily snapshots with 30-day retention

---

**Last Updated:** 2026-06-23  
**Version:** 1.0  
**Related:** ADR 0007 - Signup Form Edit Protection
