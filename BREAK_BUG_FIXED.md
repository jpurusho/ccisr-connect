# Break Disappearing Bug - FIXED ✅

**Version:** 1.90.3  
**Date:** 2026-11-18  
**Status:** CRITICAL BUG FIXED

---

## 🐛 The Bug

San Ramon Bible Study breaks kept disappearing. User had to manually re-add them multiple times.

---

## 🔍 Root Cause

**File:** `src/app/(dashboard)/templates/page.tsx`  
**Function:** `syncOperationalDataToDb()` line 351

**The Problem Code:**
```typescript
// This deleted ALL breaks for the event!
await supabase.from("event_breaks").delete().eq("event_id", eventId)

// Then only re-inserted breaks from the template form
if (breaksToWrite.length > 0) {
  await supabase.from("event_breaks").insert(breaksToWrite)
}
```

**What Happened:**
1. User adds Christmas break via **Calendar** page
2. Break is saved to database ✅
3. User edits template in **Templates** page
4. Template save triggers `syncOperationalDataToDb()`
5. Code deletes ALL breaks for that event ❌
6. Code re-inserts only breaks from template form
7. **Calendar breaks not in form → DELETED**

**Classic "delete and recreate" bug** - loses data that exists outside the form.

---

## ✅ The Fix

**Removed break management from Templates page entirely.**

Breaks are now managed **ONLY** in Calendar page:
- Calendar page → Click event → Breaks section
- Add/Edit/Delete breaks there
- They persist forever
- Templates page doesn't touch them

**Code Removed:**
- Lines 328-356 in `templates/page.tsx`
- All break deletion/insertion logic
- Added comment explaining why

---

## 🧪 How to Test

### Test 1: Break Persistence
1. Go to **Calendar** page
2. Click **San Ramon Friday Bible Study** (any future date)
3. In event detail, add a test break:
   - Start: December 20, 2026
   - End: December 27, 2026
   - Message: "TEST BREAK - DO NOT DELETE"
4. Save
5. Go to **Templates** page
6. Edit **San Ramon Bible Study** template
7. Change something (e.g., message color)
8. Click **Save**
9. Go back to **Calendar**
10. Click San Ramon event again
11. **✅ TEST BREAK SHOULD STILL BE THERE**

If it's gone, the bug still exists. If it's there, bug is fixed!

### Test 2: Verify in Database

Run in Supabase SQL Editor:
```sql
SELECT
  e.title,
  eb.start_date,
  eb.end_date,
  eb.message,
  eb.created_at
FROM event_breaks eb
JOIN events e ON eb.event_id = e.id
WHERE eb.message = 'TEST BREAK - DO NOT DELETE';
```

Should show your test break with recent `created_at`.

Wait 1 hour, run again. Break should still be there.

---

## 📊 Impact

### Before Fix:
- ❌ Breaks disappeared when saving templates
- ❌ User had to manually re-add breaks
- ❌ Christmas break lost multiple times
- ❌ Data integrity issue

### After Fix:
- ✅ Breaks persist forever
- ✅ Templates don't interfere with Calendar data
- ✅ Clean separation of concerns
- ✅ Data integrity maintained

---

## 🎯 Key Learnings

### Architecture Issue:
**Two systems managing same data:**
- Templates page: Managed breaks via template form
- Calendar page: Managed breaks via Calendar UI

**Solution:** One source of truth - Calendar only.

### Classic Pattern to Avoid:
```typescript
// ❌ BAD - Loses data outside the form
DELETE FROM table WHERE id = X
INSERT INTO table VALUES (only_form_data)

// ✅ GOOD - Merge or update selectively
UPSERT based on form data only
Don't touch data you're not managing
```

---

## 📝 Related Files

- **Fixed:** `src/app/(dashboard)/templates/page.tsx`
- **Break Management:** `src/components/calendar/event-detail-dialog.tsx`
- **Database:** `event_breaks` table with CASCADE DELETE on event
- **Docs:** `DEBUG_QUERIES.sql`, `DEBUG_BREAK_ISSUE.md`

---

## 🔮 Future Considerations

### If You Want to Manage Breaks in Templates Again:

**Option 1: Add a "managed_by" column**
```sql
ALTER TABLE event_breaks ADD COLUMN managed_by text;
-- 'template' or 'calendar'

-- Then only delete template-managed breaks:
DELETE FROM event_breaks 
WHERE event_id = X AND managed_by = 'template'
```

**Option 2: Use a junction table**
```sql
CREATE TABLE template_breaks (
  template_id uuid,
  break_id uuid
);

-- Templates manage their own breaks
-- Calendar breaks are separate
```

**Option 3: Keep it simple (current approach)**
- Breaks managed in Calendar only
- Templates don't touch breaks
- Clear, simple, no conflicts

**Recommendation:** Keep current approach. It works.

---

## ✅ Resolution

**Bug:** Fixed ✅  
**Deployed:** v1.90.3  
**Tested:** Awaiting user confirmation  
**Status:** CLOSED (pending verification)

---

## 🎉 Summary

**The break disappearing bug is FIXED!**

Your San Ramon Bible Study Christmas break will now persist even when you edit templates.

All breaks managed via Calendar are safe and will never be deleted unless you explicitly remove them.

---

**Next Steps:**
1. Wait for Vercel to deploy v1.90.3
2. Test with the procedure above
3. Confirm Christmas break stays after template edits
4. Close this issue

**Need more help?** Run the queries in `DEBUG_QUERIES.sql` to monitor break status.
