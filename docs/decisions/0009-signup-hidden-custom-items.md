# 0009 — Persistent hidden custom items tracking for signup forms

**Status:** accepted  
**Date:** 2026-06-24

## Context

Signup forms with `claim_select` fields allow users to add custom items (e.g., bringing "Josephine" to a potluck when only "Salad" and "Dessert" are predefined). Admins can promote these to official options or remove them.

Initial implementation allowed removal from the UI state only—custom items would reappear on form reload because they were dynamically derived from response data. Removing an item from the official list caused it to be re-classified as "custom" every time.

## Decision

Add `hidden_custom_items` JSONB field to `signup_forms` table, structured as `{field_id: string[]}`. When an admin removes a custom item (via delete or promote), persist it to this list.

When loading custom items from responses:
- Admin edit form: filter out items in `hidden_custom_items[field_id]`
- Public signup page: same filtering via API response

Custom items are built from responses at runtime, then filtered against the hidden list. This keeps the source of truth (response data) intact while allowing persistent admin control over visibility.

## Consequences

**Positive:**
- Hidden items stay hidden across sessions and page reloads
- Consistent experience between admin interface and public pages
- Admin can correct erroneous custom entries without data loss
- Response data remains unchanged (audit trail preserved)

**Negative:**
- Hidden items still exist in response data—they're just not displayed
- Admin must explicitly hide items; they won't auto-disappear if removed from official list
- Edge case: if a hidden custom item is later promoted, need to remove from hidden list (handled via removal callback on promotion)

**Alternatives considered:**
- Mutate response data to remove custom items: rejected—loses audit trail and risks data corruption
- Block custom items from being saved: rejected—defeats the purpose of allowing user-added items
