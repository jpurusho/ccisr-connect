# 0015 — "By Person" tab view for signup responses

**Status:** accepted  
**Date:** 2026-06-26

## Context

Public signup form (`/signup/[slug]`) shows tabs to view responses:
- **All Signups** — card view of all responses
- **By Item** — groups by claim_select items (who claimed what)
- **Unpicked** — shows items nobody claimed yet

User requested: "Can we also add a column by Person?"

Use case: See all items a single person signed up for, especially useful when people sign up for multiple things across multiple claim_select fields.

## Decision

Add **"By Person" tab** that:
- Shows table with two columns: Person | Items
- Groups all claimed items by person name
- Sorts alphabetically by person
- If multiple claim_select fields exist, prefixes items with field label (e.g., "Food: Salad • Helpers: Cleanup")
- If only one claim_select field, omits prefix (just "Salad, Cleanup")

**Data source:**
- Person name from first `member_lookup` or `text` field (order = 0)
- Items from all `claim_select` fields in the form

**Display format:**
```
Person          | Items
----------------|---------------------------
Alice Smith     | Food: Potato Salad • Helpers: Setup
Bob Johnson     | Food: Drinks
Charlie Brown   | Helpers: Cleanup, Breakdown
```

## Why a separate tab instead of expanding existing views

**Alternative 1: Add to "All Signups" tab** (rejected)
- All Signups shows full response data (name, email, phone, all fields)
- Adding "items claimed" column would be redundant with claim_select field values
- Clutters the card view

**Alternative 2: Make "By Item" bi-directional** (rejected)
- "By Item" groups by item first (Item → People)
- Inverting would be confusing UX (same tab showing two different groupings)

**Alternative 3: Separate "By Person" tab** (selected)
- Clear purpose: see what each person signed up for
- Complements existing tabs (different grouping dimension)
- Tab structure already established, easy to add 4th tab

## Consequences

**Positive:**
- Easy to answer "What did Alice sign up for?"
- Useful for coordinating: "Call Alice, she's bringing salad and helping with cleanup"
- Works with multiple claim_select fields (e.g., food + volunteer roles)
- Alphabetical sort makes it easy to find someone

**Negative:**
- Only shows people who claimed items (doesn't show people who filled out form but didn't claim anything)
- Only shows claim_select data (not other field responses like phone, email)
- For full person details, must go to admin responses page (`/signups/[id]`)

**When to use each tab:**
- **All Signups** — see every response with full details
- **By Item** — "Who's bringing dessert?" or "Is salad taken?"
- **Unpicked** — "What items still need volunteers?"
- **By Person** — "What did Bob sign up for?" or "Who's helping with multiple things?"

**Tab order reasoning:**
1. All Signups (default/general)
2. By Item (most common: check item availability)
3. Unpicked (secondary: see what's missing)
4. By Person (specific: check individual commitments)

**Implementation note:**
Uses existing response data structure. No database changes needed. Simple map reduction: responses → person → items[].
