# Card Visibility vs Event Data

**Question:** Does hiding a card on Dashboard affect event data or Bulletin content?

**Answer:** NO. Card visibility is UI-only. Events remain active and appear in Bulletin.

---

## ✅ How It Works

### **Card Visibility = UI Filter Only**

```typescript
// Dashboard filters DISPLAY based on visibleTemplates
const visibleTemplates: LoadedTemplate[] = []
for (const et of eventTypesRes.data ?? []) {
  if (et.show_on_dashboard) {  // ← UI filter only
    visibleTemplates.push({ ... })
  }
}

// This ONLY affects which cards show on dashboard
// Does NOT affect event data or bulletin content
```

### **Bulletin Uses ALL Active Events**

```typescript
// Bulletin queries ALL active events, ignoring visibility
const bulletinAutoEvents: { title: string; details: string }[] = []

for (const evt of activeEvents) {  // ← ALL events, not visibleTemplates
  // Process event for bulletin
  if (occDate && !instCancelled && !isOnBreak) {
    bulletinAutoEvents.push({ title: evt.title, details })
  }
}

// Bulletin gets data from activeEvents, not from dashboard visibility
const liveEvents = [...bulletinAutoEvents, ...manualBulletinItems]
setBulletinForm({ events: liveEvents, ... })
```

---

## 📊 Comparison

| Aspect | Dashboard Cards | Bulletin Content |
|--------|----------------|------------------|
| **Data Source** | `event_types.show_on_dashboard` | `events` table (all active) |
| **Filtering** | UI visibility filter | No UI filtering |
| **Affected By** | Template visibility setting | Event active status only |
| **Shows Breaks** | Only for visible cards | For ALL events (even hidden) |
| **User Control** | Settings → Template visibility | Calendar → Event active/inactive |

---

## 🎯 Example Scenario

### **User Action:**
1. Hide "Bible Study" card from Dashboard
2. Bible Study event still has Christmas break scheduled

### **What Happens:**

**Dashboard:**
```
✅ Birthday Card (visible)
✅ Anniversary Card (visible)
❌ Bible Study Card (HIDDEN by user setting)
✅ Women's Study Card (visible)
✅ Prayer Meeting Card (visible)
✅ Bulletin Card (visible)
```

**Bulletin Content:**
```
📰 Bulletin includes:

🎂 Birthdays
- John Doe (Dec 5)

❤️ Anniversaries  
- None this week

📅 Events This Week
- Women's Study: Wednesday at 9:00 AM
- 🏖️ Bible Study: Christmas Break until Jan 8 ← STILL SHOWS!
- Prayer Meeting: Thursday at 7:00 PM
```

**Result:** 
- ✅ Bible Study card hidden from Dashboard UI
- ✅ Bible Study break STILL shows in Bulletin
- ✅ Event data unchanged
- ✅ Email recipients see the break notice

---

## 🔍 Why This Design?

### **Separation of Concerns:**

1. **Dashboard UI** = What YOU see when composing
   - Customizable per user preference
   - Reduces clutter for events you don't manage
   - Improves workflow efficiency

2. **Bulletin Content** = What RECIPIENTS see
   - Shows ALL church activities
   - Includes breaks for ALL events
   - Complete community calendar
   - Not affected by your UI preferences

### **Use Case:**
- You might not manage Bible Study emails
- So you hide that card to reduce dashboard clutter
- BUT recipients still need to know Bible Study is on break
- Bulletin automatically includes it!

---

## ✅ Data Integrity

**What Visibility Controls:**
- ❌ Does NOT control: Event existence
- ❌ Does NOT control: Event scheduling
- ❌ Does NOT control: Break status
- ❌ Does NOT control: Bulletin content
- ❌ Does NOT control: Email sending
- ✅ ONLY controls: Which cards appear in YOUR dashboard view

**What Controls Bulletin Content:**
1. Event active status (`events.is_active`)
2. Break schedules (`event_breaks` table)
3. Instance cancellations (`event_instances.status`)
4. Event occurrences (recurrence rules)

**Hidden cards still respect:**
- ✅ Scheduled breaks
- ✅ Cancelled instances
- ✅ Event active/inactive status

---

## 🧪 Testing This

### **Test 1: Hide Card, Check Bulletin**
1. Go to Settings → Template Visibility (or wherever visibility is controlled)
2. Hide "Bible Study" card from Dashboard
3. Go back to Dashboard
4. **Expected:** Bible Study card NOT shown
5. Open Bulletin preview
6. **Expected:** Bible Study break STILL shown in Bulletin events section

### **Test 2: Break Appears in Bulletin**
1. Add Christmas break to Bible Study in Calendar
2. Hide Bible Study card from Dashboard
3. Compose Bulletin email
4. **Expected:** Bulletin includes "🏖️ Bible Study: Christmas Break until Jan 8"

### **Test 3: Visibility is UI-Only**
1. Query database: `SELECT * FROM events WHERE title ILIKE '%bible%'`
2. Hide Bible Study card from Dashboard
3. Query database again
4. **Expected:** Event record unchanged, still active

---

## 📝 Where Visibility is Stored

### **Option 1: User Preferences** (Recommended)
```sql
-- Per-user dashboard customization
CREATE TABLE user_dashboard_preferences (
  user_id uuid,
  hidden_event_types uuid[],
  ...
);
```

### **Option 2: Event Type Setting**
```sql
-- Global setting per event type
ALTER TABLE event_types 
ADD COLUMN show_on_dashboard boolean DEFAULT true;
```

### **Current Implementation:**
Check `event_types` table for `show_on_dashboard` column or similar visibility flag.

---

## 🎯 Summary

**Question:** "Hiding of card visibility on dashboard should not affect events, right?"

**Answer:** ✅ **CORRECT!**

- Card visibility = UI preference only
- Events remain active
- Breaks still respected
- Bulletin shows ALL events (including hidden ones)
- Recipients see complete information

**Bulletin includes breaks for ALL active events, regardless of dashboard visibility.**

---

## 🔗 Related Documentation

- `ARCHITECTURE.md` - System boundaries
- `AGENTS.md` - Data layer separation
- `BREAK_BUG_FIXED.md` - Break persistence

---

**Last Updated:** 2026-11-18  
**Architecture Version:** 1.90.3  
**Status:** ✅ Working as designed
