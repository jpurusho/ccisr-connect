# Dynamic Template System - Test Checklist

## Database Setup Verification

- [ ] Migration `00051_add_template_visibility_fields.sql` applied successfully
- [ ] `event_types` table has new columns:
  - `show_in_dashboard` (boolean, default true)
  - `display_order` (integer, default 0)
  - `icon_name` (text, default 'Calendar')
  - `card_color` (text, default '#4F46E5')
- [ ] Existing templates have correct initial values (bulletin=10, birthday=20, etc.)

## Dashboard Dynamic Loading

### Initial Load
- [ ] Navigate to `/dashboard`
- [ ] All templates with `show_in_dashboard=true` appear as cards
- [ ] Templates are sorted by `display_order` (bulletin first, then birthday, etc.)
- [ ] Shoebox Ministry template appears with Gift icon

### Template Visibility
- [ ] Go to `/templates` and toggle "Show in Dashboard" OFF for birthday template
- [ ] Save the template
- [ ] Return to `/dashboard`
- [ ] Verify birthday template card is hidden
- [ ] Re-enable it and verify it reappears

### Display Order
- [ ] Go to `/templates` > Shoebox Ministry tab
- [ ] Change "Display Order" from 70 to 5
- [ ] Save the template
- [ ] Return to `/dashboard`
- [ ] Verify Shoebox Ministry now appears near the top (after bulletin)

## Templates Page UI

### Dashboard Settings Section
- [ ] Each template tab shows "Dashboard Settings" section
- [ ] "Show in Dashboard" toggle reflects current state
- [ ] "Display Order" input shows correct number
- [ ] Changes persist after clicking "Save Defaults"

### Save Functionality
- [ ] Edit template content and dashboard settings together
- [ ] Click "Save Defaults"
- [ ] Verify both template content and dashboard settings are saved
- [ ] Refresh page and verify settings persist

## Template Registry

### Registry Loading
- [ ] All 7 built-in templates registered on app start
- [ ] Registry provides form components, card builders, defaults for each type
- [ ] Dashboard successfully looks up templates from registry

### New Template Addition
- [ ] To add a new template type, only need to:
  1. Add entry to template registry
  2. Insert row in `event_types` with `comm_type` value
  3. No code changes in dashboard or other files required

## Shoebox Ministry Template

### Email Functionality
- [ ] Go to Dashboard > Shoebox Ministry card
- [ ] Fill out the form (due date, online link, PDF link)
- [ ] PDF link field accepts Google Drive URLs
- [ ] Click "Compose Email"
- [ ] Preview shows clickable PDF link
- [ ] Send test email
- [ ] Verify PDF link is clickable in received email

### Template Defaults
- [ ] Go to `/templates` > Shoebox Ministry tab
- [ ] Edit default values
- [ ] Save template
- [ ] Return to dashboard
- [ ] Verify Shoebox Ministry card auto-populates with saved defaults

## Edge Cases

- [ ] Hidden templates (`show_in_dashboard=false`) don't appear in dashboard
- [ ] Templates with `display_order=999` appear at the end
- [ ] Multiple templates with same `display_order` are sorted alphabetically
- [ ] Registry handles missing templates gracefully (returns null instead of throwing)
- [ ] Dashboard handles empty `loadedTemplates` array without errors

## Regression Testing

- [ ] Existing templates (birthday, anniversary, etc.) still work correctly
- [ ] Email sending still works for all template types
- [ ] Template editing and preview still work
- [ ] Mailing lists and SMTP configs still work
- [ ] Calendar events still sync correctly

## Performance

- [ ] Dashboard loads within 2 seconds
- [ ] No console errors or warnings
- [ ] No unnecessary re-renders when switching between template cards
- [ ] Database queries use indexes efficiently

## Documentation

- [ ] README or docs explain how to add new templates
- [ ] Migration files are documented
- [ ] Template registry pattern is documented
- [ ] Dashboard loading logic is clear in comments

---

## Test Results Summary

Date: _____________  
Tester: _____________  
Build: _____________  

**Pass/Fail:** _____________  
**Notes:** _____________________________________________
