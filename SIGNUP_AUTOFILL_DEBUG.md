# Signup Auto-Fill Debug Checklist

## Issue
November Bible Study host should be Thangadas (from signup) but is showing Jerome's default address.

## Root Cause Investigation

### 1. Verify Event Type Linkage
**Check:** Event Types page → "Bible Study" event type

- [ ] **Linked Signup Form ID** is set (not null)
- [ ] **Signup Field Map** contains:
  ```json
  {
    "hostName": "name_of_host_field",
    "address": "name_of_address_field"
  }
  ```

**How to check in DB:**
```sql
SELECT 
  name,
  linked_signup_form_id,
  signup_field_map
FROM event_types
WHERE name ILIKE '%bible%study%' 
  AND comm_type = 'bible_study';
```

---

### 2. Verify Signup Responses Exist
**Check:** Do November signup responses exist?

```sql
SELECT 
  id,
  created_at,
  month_value,
  response_data
FROM signup_responses
WHERE form_id = '<linked_signup_form_id_from_step_1>'
  AND month_value = 11  -- November
  AND year_value = 2024
ORDER BY created_at DESC;
```

**Expected:** At least one response with Thangadas in `response_data`

---

### 3. Test Auto-Fill Logic
**File:** `src/lib/signup/auto-fill.ts`

The function `resolveSignupAutoFill()` should:
1. Find signup responses for the target month
2. Extract host data from `response_data` using `signup_field_map`
3. Return `{ source: "signup", hostName: "...", address: "..." }`

**Debug points:**
- Is the date matching working? (Nov 20 → month_value = 11)
- Is the field mapping correct? (field names in map match response_data keys)
- Is response_data properly structured?

---

### 4. Check Dashboard Auto-Fill Call
**File:** `src/app/(dashboard)/dashboard/page.tsx` around line 1310

```typescript
const bsSignup = etSignupLinks["bible_study"]
if (bsSignup && bsDate) {
  bsAutoFill = await resolveSignupAutoFill(bsSignup.formId, bsSignup.fieldMap, bsDate)
  if (bsAutoFill.source === "signup") {
    bsHostData = {
      hostName: bsAutoFill.hostName ?? "TBD",
      address: bsAutoFill.address ?? "TBD",
      // ...
    }
  }
}
```

**Add console.log to debug:**
```typescript
console.log('DEBUG signup auto-fill:', {
  hasSignup: !!bsSignup,
  formId: bsSignup?.formId,
  fieldMap: bsSignup?.fieldMap,
  date: bsDate,
  result: bsAutoFill
})
```

---

## Quick Tests

### Test 1: Event Type Configuration
```bash
# In psql or Supabase SQL Editor
SELECT 
  et.name,
  et.linked_signup_form_id,
  et.signup_field_map,
  sf.name as form_name
FROM event_types et
LEFT JOIN signup_forms sf ON sf.id = et.linked_signup_form_id
WHERE et.comm_type = 'bible_study';
```

**Expected output:**
- `linked_signup_form_id`: NOT NULL
- `signup_field_map`: Valid JSON with hostName/address keys
- `form_name`: "Bible Study Hosting" (or similar)

---

### Test 2: November Signup Data
```sql
SELECT 
  sr.month_value,
  sr.response_data,
  sf.name as form_name
FROM signup_responses sr
JOIN signup_forms sf ON sf.id = sr.form_id
WHERE sr.form_id IN (
  SELECT linked_signup_form_id 
  FROM event_types 
  WHERE comm_type = 'bible_study'
)
AND sr.month_value = 11
AND sr.year_value = 2024;
```

**Expected output:**
- At least one row
- `response_data` contains fields matching `signup_field_map` keys
- Values include Thangadas name/address

---

## Common Issues & Fixes

### Issue 1: Form Not Linked
**Symptom:** `linked_signup_form_id` is NULL

**Fix:**
1. Go to **Event Types** page
2. Edit "Bible Study" event type
3. Link the signup form
4. Set field mapping

---

### Issue 2: Wrong Field Names in Map
**Symptom:** Form linked but auto-fill returns empty

**Fix:**
1. Check actual field names in signup response data
2. Update `signup_field_map` to match exact field names

Example:
```json
// WRONG - field names don't match response_data
{"hostName": "host_name", "address": "host_address"}

// RIGHT - matches actual response_data keys
{"hostName": "volunteer_name", "address": "volunteer_address"}
```

---

### Issue 3: Date Matching Failure
**Symptom:** Responses exist but not found

**Fix:** Check date parsing in `resolveSignupAutoFill()`
- Does it properly extract month from Date object?
- Are month_value stored as 1-12 or 0-11?

---

## Permanent Solution

Once debugged, the signup auto-fill should work automatically:
1. User fills out signup form for November
2. Response stored in `signup_responses` with `month_value = 11`
3. When composing email for November week, auto-fill extracts host from signup
4. No manual intervention needed

This is the **intended workflow** based on the codebase design.
