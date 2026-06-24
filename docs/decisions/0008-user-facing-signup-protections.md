# ADR 0008: User-Facing Signup Response Protection

**Status:** Partially Implemented (Gaps Identified)  
**Date:** 2026-06-23  
**Context:** Users can remove their own signups and potentially remove others' signups on public forms

## Current Protection Mechanisms

### ✅ What's Already Protected

#### 1. **Phone Verification (Strong Protection)**
**Location:** `/api/signup/remove` route  
**How it works:**
- If form has a phone field AND response has phone data
- User must enter last 4 digits of phone to delete
- Server-side verification (can't be bypassed)
- Prevents malicious removal of others' signups

**Code:**
```typescript
const storedLast4 = storedPhone.replace(/\D/g, "").slice(-4)
const inputLast4 = phoneLast4.replace(/\D/g, "").slice(-4)
if (storedLast4 && inputLast4 !== storedLast4) {
  return NextResponse.json({ error: "Phone verification failed" }, { status: 403 })
}
```

#### 2. **Past Month Protection**
**Location:** Public signup page  
**How it works:**
- For forms with `month_picker` field
- Cannot remove signups for months in the past
- Prevents accidental removal of historical data

**Code:**
```typescript
const month = monthField ? (data[monthField.id] as number) : 0
if (month > 0 && month < currentMonth) return // can't remove past months
```

#### 3. **Admin-Side Audit Logging**
**Location:** Admin dashboard response deletion  
**What's logged:**
- Action: `signup_response_deleted`
- Entity type/id: `signup_responses` + response ID
- Context: form_id
- User who deleted (admin)
- Timestamp

### ❌ **Critical Gaps Identified**

#### Gap 1: No Audit Log for User Self-Removal
**Current:** `/api/signup/remove` does NOT log to audit_log  
**Risk:** No record of who removed what and when  
**Impact:** Cannot recover or investigate deleted signups

#### Gap 2: No Rate Limiting on Removals
**Current:** No throttling on remove API  
**Risk:** Malicious actor could spam remove requests  
**Impact:** Could try to brute-force phone verification

#### Gap 3: No Recovery Path for User Deletions
**Current:** Permanent delete from database  
**Risk:** Accidental removal is irreversible  
**Impact:** User has no "undo" option

#### Gap 4: Weak Protection for Forms Without Phone
**Current:** Any response can be deleted if form has no phone field  
**Risk:** Anyone viewing public signups can remove anyone's entry  
**Impact:** Malicious removals on forms without phone verification

#### Gap 5: No Notification on Removal
**Current:** Silent deletion  
**Risk:** User doesn't know their signup was removed  
**Impact:** May think they're still signed up when they're not

## Threat Scenarios

### Scenario A: Malicious Removal (Phone Forms) ⚠️ Medium Risk
**Attack:**
1. User opens public signup form with visible responses
2. Sees someone signed up with phone (123) 456-7890
3. Tries common last 4 digits: 0000, 1234, 5678, 7890
4. Gets lucky on 4th attempt → removes victim's signup

**Current Protection:** ✅ Phone verification required  
**Gap:** ❌ No rate limiting, ❌ No notification to victim

### Scenario B: Malicious Removal (No Phone) 🚨 High Risk
**Attack:**
1. User opens public signup form without phone field
2. Sees "Who's Signed Up" list
3. Clicks X on competitor's/enemy's signup
4. Instant removal, no verification

**Current Protection:** ❌ None  
**Gap:** 🚨 Critical vulnerability on forms without phone

### Scenario C: Accidental Self-Removal ⚠️ Medium Risk
**Attack:** (Unintentional)
1. User signs up for event
2. Later visits form to check details
3. Accidentally clicks remove button
4. Confirms quickly without reading → signup gone

**Current Protection:** ✅ Confirmation dialog in UI  
**Gap:** ❌ No undo, ❌ No email confirmation

### Scenario D: Coordinator Abuse 😱 High Risk
**Attack:**
1. Event coordinator doesn't like certain attendees
2. Opens form, removes unwanted signups
3. No audit trail for user-facing removals
4. Victims don't know they were removed until event day

**Current Protection:** ❌ None for user-side removals  
**Gap:** 🚨 No audit log, ❌ No notification

## Recommended Enhancements

### Priority 1: Critical Security Fixes 🚨

#### 1.1 Add Audit Logging to User Removals
```typescript
// In /api/signup/remove route.ts
import { logAudit } from "@/lib/audit"

// Before delete:
await logAudit("signup_response_self_removed", "signup_responses", responseId, {
  formId,
  formTitle: form?.title,
  ipHash: hashIp(req),
  verificationMethod: phoneLast4 ? "phone" : "none",
  responseData: response.data, // Full snapshot before deletion
})
```

#### 1.2 Add Alternative Verification for Non-Phone Forms
**Options:**
- **Email verification:** Send confirmation code to email field
- **Name + partial info:** Require entering additional field (e.g., last name + zip code)
- **Magic link:** Email link to remove (requires email field)
- **Admin-only remove:** Disable public remove if no phone/email field

**Recommendation:** Require email OR phone on all forms with public remove enabled

#### 1.3 Add Rate Limiting
```typescript
// In /api/signup/remove route.ts
const ipHash = hashIp(req)
const attempts = await countRecentAttempts(ipHash, formId, "1 hour")
if (attempts > 5) {
  return NextResponse.json(
    { error: "Too many attempts. Try again later." },
    { status: 429 }
  )
}
await logAttempt(ipHash, formId)
```

### Priority 2: User Experience Improvements ✅

#### 2.1 Add Email Notification on Removal (If Email Field Exists)
```typescript
// After successful removal
if (emailField && email) {
  await sendEmail({
    to: email,
    subject: `Signup Removed: ${form.title}`,
    body: `Your signup was removed at ${new Date()}. If this wasn't you, contact the organizer immediately.`,
  })
}
```

#### 2.2 Add Soft Delete with Grace Period
```sql
ALTER TABLE signup_responses ADD COLUMN deleted_at timestamptz;
```
- Don't permanently delete immediately
- Mark as deleted, hide from public view
- Keep for 7 days with "undo" link in confirmation email
- Cron job purges after grace period

#### 2.3 Enhanced UI Warnings
```typescript
// Before showing remove button, check verification method
if (!phoneField && !emailField) {
  // Show warning: "⚠️ No verification required - use caution"
}

// In remove confirmation
if (!phoneField) {
  alert("⚠️ You are about to remove this signup with no verification. " +
        "Make sure this is YOUR signup. Removing others' signups is prohibited.")
}
```

### Priority 3: Admin Controls 🛠️

#### 3.1 Form-Level Remove Control
Add to signup_forms table:
```sql
ALTER TABLE signup_forms ADD COLUMN allow_public_remove boolean DEFAULT true;
```

Allows admins to disable self-removal for certain forms.

#### 3.2 Admin Dashboard for Removed Responses
- New section: "Recently Removed" (shows soft-deleted responses)
- Admin can restore or permanently delete
- Shows who removed it (IP hash, verification method)

#### 3.3 Notification to Form Owner on Removals
```typescript
if (form.notify_on_remove && form.notify_mailing_list_id) {
  await sendNotification({
    listId: form.notify_mailing_list_id,
    subject: `Signup Removed: ${form.title}`,
    body: `A signup was removed at ${new Date()}. View audit log for details.`,
  })
}
```

## Implementation Roadmap

### Phase 1: Critical Fixes (This Week) 🚨
1. ✅ Add audit logging to `/api/signup/remove`
2. ✅ Add rate limiting (5 attempts per hour per IP)
3. ✅ Add IP hash to audit log
4. ✅ Store full response data in audit log (for recovery)

### Phase 2: Enhanced Verification (Next Sprint) 🔐
1. Add form validation: require phone OR email for public-remove forms
2. Add email verification flow (send code, verify code, then remove)
3. Add warning UI for unverified removes
4. Migration: audit existing forms for verification gaps

### Phase 3: Soft Delete & Recovery (Future) ♻️
1. Add `deleted_at` column
2. Implement 7-day grace period
3. Add "undo" functionality
4. Email notifications with undo link
5. Admin restore UI

### Phase 4: Admin Controls (Future) 🛠️
1. Per-form remove toggle
2. "Recently Removed" dashboard
3. Owner notifications
4. Bulk restore capability

## Security Considerations

### Current Security Posture
- ✅ Phone verification when available
- ✅ Past month protection
- ✅ Server-side validation
- ❌ No rate limiting
- ❌ No audit trail
- ❌ Weak protection without phone

### After Phase 1 (Critical Fixes)
- ✅ Full audit trail
- ✅ Rate limiting prevents brute force
- ✅ IP tracking for abuse detection
- ✅ Recovery possible from audit log
- ⚠️ Still vulnerable on forms without phone/email

### After Phase 2 (Enhanced Verification)
- ✅ All forms have verification
- ✅ Email fallback for non-phone forms
- ✅ Clear warnings for users
- ✅ Malicious removal much harder

### After Phase 3 (Soft Delete)
- ✅ Accidental removals recoverable
- ✅ 7-day grace period
- ✅ Email notifications
- ✅ Users can undo mistakes

## Metrics to Track

**Security Metrics:**
- Rate limit hits per day (detection of attacks)
- Remove attempts with wrong phone verification
- Forms without verification mechanism (audit gap)

**User Experience Metrics:**
- Self-remove success rate
- Undo usage (after Phase 3)
- Support requests about missing signups

**Abuse Detection:**
- IPs with multiple failed verifications
- Multiple removes from same IP
- Removes immediately after signup (suspicious pattern)

## Related ADRs
- ADR 0007: Signup Form Edit Protection (admin-side)
- ADR 0006: Signup Attendance Statistics

## Approval & Timeline
- **Phase 1 (Critical):** Implement immediately
- **Phase 2:** Review after Phase 1 deployed
- **Phase 3:** Long-term enhancement
