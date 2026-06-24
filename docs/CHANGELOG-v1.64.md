# Changelog v1.64.0 - Comprehensive Signup Protection System

**Release Date:** 2026-06-23  
**Type:** Security Enhancement + Bug Fix

## 🎯 Overview
This release implements comprehensive protection mechanisms for signup forms, addressing both admin-side edit protection and user-facing removal security gaps.

## 🐛 Bug Fixes

### Custom Items Not Visible in Edit Form
**Problem:** When users added custom items to claim_select fields, these items were not visible when editing the form, making them impossible to manage or delete.

**Solution:**
- Custom items now load from existing responses when editing a form
- Displayed in amber-highlighted section with count indicator
- "Add to list" button promotes custom items to official options
- Prevents data loss through ignorance

**Files Changed:**
- `src/app/(dashboard)/signups/page.tsx`

## 🔒 Security Enhancements

### Phase 1: Admin-Side Protection (Form Edits)

#### 1. Smart Warnings Before Destructive Edits
When editing a form with existing responses, detailed warnings now show:
- Fields being removed (with names)
- Custom items that will become inaccessible (with count)
- Predefined options being removed (with field context)
- Impact on existing response data

**Example Warning:**
```
⚠️ Warning: This form has 15 existing responses.

The following changes will affect existing data:

• 2 fields will be removed: Phone Number, Emergency Contact
• 3 custom items will no longer be editable
• 1 predefined option removed from "Bring an Item": Dessert

Continue with update?
```

#### 2. Enhanced Delete Confirmation
Shows exactly what will be permanently lost:
```
⚠️ Delete "Summer Picnic Signup"?

This will permanently delete:
• 42 responses
• All custom items added by users
• All associated data

This action CANNOT be undone!
```

#### 3. Comprehensive Audit Logging
Enhanced audit logs now capture:
- Before/after field counts
- Removed field details (id, label, type)
- Added field details
- Response count at time of change
- User who made change + timestamp

**Files Changed:**
- `src/app/(dashboard)/signups/page.tsx`

### Phase 1: User-Facing Protection (Response Removals)

#### 1. Rate Limiting on Removals
- Maximum 5 removal attempts per hour per IP per form
- Prevents brute-force attacks on phone verification
- 429 error returned when limit exceeded
- Attempts logged for abuse detection

#### 2. Audit Logging for User Removals
Every user-initiated removal now logged with:
- Action: `signup_response_self_removed`
- IP hash (privacy-preserving)
- Verification method used (phone, email, or none)
- Full response data snapshot (for recovery)
- Form context (ID, title)
- Timestamp

#### 3. Failed Attempt Tracking
- All failed verification attempts logged
- Enables detection of malicious removal attempts
- Supports forensic analysis of abuse patterns

**Files Changed:**
- `src/app/api/signup/remove/route.ts`
- `supabase/migrations/00036_signup_remove_protection.sql` (new)

## 📚 Documentation

### New Decision Records
1. **ADR 0007:** Signup Form Edit Protection
   - Architecture analysis
   - Protection mechanisms
   - Recovery strategies
   - Future roadmap (soft delete, form templates)

2. **ADR 0008:** User-Facing Signup Protections
   - Threat scenario analysis
   - Security gap identification
   - Enhancement roadmap
   - Metrics for abuse detection

### New Guides
1. **Signup Form Recovery Guide**
   - Step-by-step recovery procedures
   - Common scenarios & solutions
   - Best practices
   - When to contact support

### New Tools
1. **Recovery Script** (`scripts/recover-signup-form.ts`)
   ```bash
   # List recently deleted forms
   tsx scripts/recover-signup-form.ts --list-deleted
   
   # View recovery info for specific form
   tsx scripts/recover-signup-form.ts <form-id>
   ```

**Files Added:**
- `docs/decisions/0007-signup-form-edit-protection.md`
- `docs/decisions/0008-user-facing-signup-protections.md`
- `docs/guides/signup-form-recovery.md`
- `scripts/recover-signup-form.ts`
- `docs/CHANGELOG-v1.64.md`

## 🗄️ Database Changes

### New Table: `signup_remove_attempts`
Tracks all removal attempts for rate limiting and abuse detection:
- `id` (uuid, primary key)
- `ip_hash` (text, privacy-preserving IP identifier)
- `form_id` (uuid, references signup_forms)
- `success` (boolean, whether removal succeeded)
- `attempted_at` (timestamptz)

**Indexes:**
- `idx_signup_remove_attempts_lookup` - Fast rate limit checks
- `idx_signup_remove_attempts_cleanup` - Efficient old record purging

**RLS:** Admin-only read access

## 📊 Protection Matrix

| Scenario | Before | After |
|----------|--------|-------|
| Edit removes fields | ❌ No warning | ✅ Detailed impact warning |
| Edit removes custom items | ❌ Items invisible | ✅ Shows count + warning |
| Delete form with responses | ⚠️ Generic warning | ✅ Impact breakdown |
| User removes own signup | ✅ Phone verified | ✅ + Rate limited + Audited |
| Malicious removal attempt | ⚠️ Limited by phone only | ✅ Rate limited + Tracked |
| Accidental deletion recovery | ❌ Manual DB restore | ✅ Audit log has full data |

## 🔮 Future Roadmap

### Phase 2: Soft Delete + Recovery (Planned)
- `deleted_at` column for reversible deletes
- "Archived Forms" section with restore button
- 7-day grace period before permanent deletion
- One-click restore from audit log

### Phase 3: Enhanced Verification (Planned)
- Email verification as fallback for non-phone forms
- Magic link removal (requires email field)
- Form validation: require phone OR email for public remove
- Warning UI for forms without verification

### Phase 4: Advanced Features (Future)
- Form templates for reuse
- Response migration tool
- Automated daily backups with 30-day retention
- Field history viewer

## ⚠️ Breaking Changes
None. All changes are backward compatible.

## 🔧 Migration Required
Yes - Run migration `00036_signup_remove_protection.sql` to create rate limiting table.

## 🧪 Testing
- ✅ TypeScript compilation passes
- ✅ Build succeeds
- ✅ Existing functionality preserved
- ✅ Rate limiting tested (5 attempts/hour/IP)
- ✅ Audit logging verified

## 👥 Affected Users
- **Admins:** Will see enhanced warnings and confirmations
- **Form Creators:** Better protection against accidental data loss
- **Public Users:** Rate limited to prevent abuse (not noticeable in normal use)
- **Support Team:** Better audit trail for investigating issues

## 📖 Related Issues
Fixes: Custom items not showing in edit form  
Enhances: Signup form data protection  
Addresses: Security gaps in user-facing removals

## 🙏 Credits
Comprehensive analysis and implementation of multi-layer protection system for signup forms, addressing both admin-side and user-facing security concerns.

---

**Upgrade Priority:** Medium-High (Security Enhancement)  
**Estimated Impact:** Positive - No user-facing disruption, improved data safety
