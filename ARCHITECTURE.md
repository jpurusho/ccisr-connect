# CCISR Connect - Clean Architecture (v1.90.3)

**Last Updated:** 2026-11-18  
**Status:** ✅ Clean Separation Achieved

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CCISR CONNECT                            │
│                    Email Communication System                     │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   CALENDAR   │  │  TEMPLATES   │  │  DASHBOARD   │  │  DISPATCHES  │
│              │  │              │  │              │  │              │
│ Operational  │  │ Presentation │  │ Week-Specific│  │   History    │
│    Data      │  │   Defaults   │  │   Overrides  │  │  (Immutable) │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

---

## 📋 Responsibility Matrix

| Data Type | Managed By | Stored In | Can Override? | Display Locations |
|-----------|-----------|-----------|---------------|-------------------|
| **Event Schedule** | Calendar | `events.recurrence_rule` | ❌ No | Calendar, Dashboard |
| **Breaks** | Calendar | `event_breaks` | ❌ No | Calendar, Dashboard, Bulletin |
| **Subject** | Calendar | `event_instances.instance_subject` | ❌ No | Calendar, Dashboard (read-only) |
| **Host** | Calendar + Signup | `event_instances.host_family_id` | ❌ No | Dashboard (auto-resolved) |
| **Time** | Calendar | `event_instances.instance_time` | ❌ No | Dashboard (auto-resolved) |
| **Location** | Calendar | `event_instances.location_override` | ❌ No | Dashboard (auto-resolved) |
| **Template Colors** | Templates | `email_templates.style_settings` | ✅ Yes | Dashboard can override |
| **Template Content** | Templates | `email_templates.body_template` | ✅ Yes | Dashboard can override |
| **Week Colors** | Dashboard | `composed_instances.data` | ✅ Yes | This week only |
| **Week Messages** | Dashboard | `composed_instances.data` | ✅ Yes | This week only |
| **Sent Emails** | System | `dispatch_queue.body_html` | ❌ Never | Dispatch history |

---

## 🎯 Clean Separation (Post v1.90.3)

### **1. Calendar Page** (`/calendar`)
**Single Responsibility:** Operational Data

**Manages:**
- ✅ Event schedules (when events occur)
- ✅ Breaks (Christmas break, summer break, etc.)
- ✅ Per-date overrides (host, time, location, subject)
- ✅ Event status (active/cancelled)
- ✅ Instance-level changes

**Database Tables:**
- `events` - Event definitions with recurrence rules
- `event_breaks` - Scheduled break periods
- `event_instances` - Date-specific overrides

**Does NOT Touch:**
- ❌ Email styling/appearance
- ❌ Template defaults
- ❌ Week-specific draft customizations

**UI Actions:**
- Add/edit/delete events
- Schedule breaks
- Override specific dates
- Cancel instances

---

### **2. Templates Page** (`/templates`)
**Single Responsibility:** Presentation Defaults

**Manages:**
- ✅ Email appearance (colors, fonts, gradients)
- ✅ Default message content
- ✅ Template-level style settings
- ✅ Email layout structure

**Database Tables:**
- `email_templates` - Template definitions
- `event_types` - Template associations

**Does NOT Touch:**
- ❌ Event schedules
- ❌ Breaks (FIXED in v1.90.3)
- ❌ Per-date overrides
- ❌ Operational data

**UI Actions:**
- Edit template colors/gradients
- Change default messages
- Modify email structure
- Clone templates

---

### **3. Dashboard Page** (`/dashboard`)
**Single Responsibility:** Week-Specific Composition

**Manages:**
- ✅ Week-specific color overrides
- ✅ Custom messages for this week
- ✅ Email preview for current week
- ✅ Sending/scheduling emails

**Database Tables:**
- `composed_instances` - Week-specific draft data

**Does NOT Touch:**
- ❌ Event schedules
- ❌ Breaks
- ❌ Template defaults (reads but doesn't change)

**UI Actions:**
- Override colors for this week
- Customize message for this week
- Preview email
- Send/schedule email

---

### **4. Dispatches** (Read-Only)
**Single Responsibility:** Historical Record

**Manages:**
- ✅ Immutable snapshots of sent emails
- ✅ Send history
- ✅ Delivery status

**Database Tables:**
- `dispatch_queue` - Sent email records

**Does NOT Touch:**
- ❌ Nothing (read-only system)

---

## 🔄 Data Flow

### **Composing an Email (Dashboard)**

```
STEP 1: Load Operational Data (from Calendar)
┌──────────────────────────────────────────┐
│ Query: event_instances for this week     │
│ Query: event_breaks for this week        │
│ Query: signup responses for auto-fill    │
│                                          │
│ Result: Host, Time, Location, Subject    │
└──────────────────────────────────────────┘
                    ↓
STEP 2: Load Presentation Defaults (from Templates)
┌──────────────────────────────────────────┐
│ Query: email_templates for event type    │
│                                          │
│ Result: Colors, Fonts, Default Message   │
└──────────────────────────────────────────┘
                    ↓
STEP 3: Load Week Overrides (from Dashboard Drafts)
┌──────────────────────────────────────────┐
│ Query: composed_instances for this week  │
│                                          │
│ Result: Custom Colors, Custom Messages   │
└──────────────────────────────────────────┘
                    ↓
STEP 4: Compose Final Email
┌──────────────────────────────────────────┐
│ Merge with Priority:                     │
│   1. Instance overrides (highest)        │
│   2. Signup auto-fill                    │
│   3. Event defaults                      │
│   4. Template defaults                   │
│                                          │
│ For Styling:                             │
│   1. Draft overrides (highest)           │
│   2. Template defaults                   │
└──────────────────────────────────────────┘
                    ↓
STEP 5: Preview & Send
┌──────────────────────────────────────────┐
│ Show preview to user                     │
│ On send: Save to dispatch_queue          │
│ Send via SMTP                            │
└──────────────────────────────────────────┘
```

---

## 🛡️ Boundary Protection

### **What v1.90.3 Fixed:**

**Before:**
```typescript
// templates/page.tsx - BAD CODE (REMOVED)
await supabase.from("event_breaks").delete().eq("event_id", eventId)
// ↑ Templates page deleting operational data ❌
```

**After:**
```typescript
// templates/page.tsx - FIXED
// Break management removed entirely
// Templates only touch email_templates table ✅
```

**Result:** Clean separation maintained!

---

## 📊 Database Schema Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE TABLES                           │
└─────────────────────────────────────────────────────────────────┘

OPERATIONAL (Calendar owns):
├── events (schedules, recurrence)
├── event_breaks (break periods)
├── event_instances (per-date overrides)
└── signup_responses (auto-fill data)

PRESENTATION (Templates owns):
├── email_templates (styling, defaults)
└── event_types (template associations)

COMPOSITION (Dashboard owns):
└── composed_instances (week-specific drafts)

HISTORY (System owns):
└── dispatch_queue (sent emails - immutable)

SUPPORTING:
├── families (member data)
├── members (contact info)
├── mailing_lists (recipient groups)
└── smtp_configs (email servers)
```

---

## 🎯 Subject Editing - Special Case

**Subject is operational data but has unique rules:**

| Location | Editable? | Display | Stored In |
|----------|-----------|---------|-----------|
| **Calendar → Edit Date** | ✅ Yes | Input field | `event_instances.instance_subject` |
| **Dashboard** | ❌ No | Read-only with helper | Retrieved from instance |
| **Template** | ❌ No | Not shown | Not applicable |

**Helper Text in Dashboard:**
```
Email Subject: San Ramon Bible Study

To customize the subject, click the date in 
Calendar → Edit Date
```

**Why Read-Only in Dashboard?**
- Subject is per-instance (date-specific)
- Dashboard shows per-week (might span multiple instances)
- Prevents confusion about which instance you're editing
- Clear separation: Calendar = dates, Dashboard = composition

---

## ✅ Architecture Principles

### **1. Single Responsibility**
Each system has ONE job:
- Calendar = operational data
- Templates = presentation defaults
- Dashboard = week composition
- Dispatches = history

### **2. Clear Boundaries**
No system modifies another system's data:
- Templates don't touch breaks ✅
- Dashboard doesn't change schedules ✅
- Calendar doesn't modify templates ✅

### **3. Unidirectional Data Flow**
Data flows downward only:
```
Calendar → Templates → Dashboard → Dispatches
   ↓           ↓           ↓           ↓
 (create)   (style)   (override)   (freeze)
```

### **4. Immutability at Edges**
- Dispatches never change ✅
- Event schedules stable ✅
- Templates provide defaults ✅
- Only drafts are mutable ✅

---

## 🧪 Testing the Architecture

### **Test 1: Break Persistence**
1. Add break in Calendar ✅
2. Edit template in Templates
3. Break should still exist ✅

**If break disappears = boundary violation**

### **Test 2: Subject Override**
1. Set subject in Calendar → Edit Date ✅
2. Dashboard shows subject read-only ✅
3. Attempting edit → shows helper text ✅

**If subject editable in Dashboard = boundary violation**

### **Test 3: Color Override**
1. Template has gradient ✅
2. Dashboard sets custom color ✅
3. Custom color shown in preview ✅
4. Next week reverts to gradient ✅

**If color doesn't override = priority chain broken**

---

## 📝 Key Takeaways

### **For Developers:**
✅ Each system touches its own database tables only  
✅ Read from other systems, never write  
✅ Follow the priority chain for composition  
✅ Operational vs Presentation = strict separation  

### **For Users:**
✅ Calendar = schedule and manage events  
✅ Templates = design email appearance  
✅ Dashboard = customize this week's email  
✅ Changes stay in their respective areas  

### **For Operations:**
✅ No more break disappearing bugs  
✅ Subject editing clear and predictable  
✅ Color overrides work correctly  
✅ Data integrity maintained  

---

## 🎉 Architecture Status

**Pre v1.90.3:** ⚠️ Mixed responsibilities (templates managed breaks)  
**Post v1.90.3:** ✅ Clean separation achieved  

**All systems now have clear, non-overlapping responsibilities!**

---

## 📚 Related Documentation

- `CLAUDE.md` - Project instructions and architecture guidelines
- `BREAK_BUG_FIXED.md` - Details on v1.90.3 fix
- `AGENTS.md` - Next.js conventions and data patterns
- `DEBUG_QUERIES.sql` - Monitoring queries for data integrity

---

**Last Updated:** 2026-11-18  
**Architecture Version:** 1.90.3  
**Status:** ✅ Production Ready
