# 0010 — Tabbed views for signup items with field-level grouping

**Status:** accepted  
**Date:** 2026-06-25

## Context

Signup forms with `claim_select` fields (food items, supplies, volunteer tasks) had two issues:

1. **No aggregated view** - Users could only see who signed up (person-by-person), not what items were claimed or what was still needed
2. **Case-sensitive duplicates** - When volunteers added custom items like "Biryani" (capital B) that matched official options "biryani" (lowercase), they appeared as separate entries

For forms with multiple `claim_select` fields (e.g., "Food" and "Setup & Supplies"), mixing all items together in one table made it hard to scan what was needed in each category.

## Decision

Implemented a three-tab interface in the collapsible signup list:

1. **All Signups** - Existing person-by-person view with all details
2. **By Item** - Aggregated table showing:
   - Each item with claimed count and capacity (e.g., `2/5`)
   - Comma-separated list of people who signed up for it
   - Red highlighting for over-capacity items
   - Grouped by `claim_select` field with section headers
3. **Unpicked** - Items from official options that haven't been claimed yet
   - Shows available capacity
   - Also grouped by field

**Key technical decisions:**

- **Case-insensitive matching with trim** - "Biryani", "biryani", " biryani " all map to the same canonical option value and count together
- **Field-level grouping** - Each `claim_select` field gets its own section with a header showing the field label
- **Capacity display logic** - Show `X/Y` for items with capacity < 50, otherwise just show count (for high-capacity items like "Dessert")
- **Theme-aware styling** - All UI elements (tabs, headers, highlighting) use the form's primary color from theme settings

## Consequences

**Positive:**
- Prevents duplicate items from appearing in the custom items section
- Easy to see at a glance what's claimed vs. what's still needed
- Capacity tracking prevents over/under-commitment
- Scales automatically to any number of `claim_select` fields
- No data loss - same responses, different views

**Neutral:**
- Tabs only show when `claim_select` fields exist (graceful degradation)
- Requires manual page refresh to see changes from other users (no real-time sync)

**Negative:**
- None identified yet - user feedback has been positive
