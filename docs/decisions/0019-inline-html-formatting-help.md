# 0019 — Inline HTML formatting help in template editors

**Status:** accepted  
**Date:** 2026-07-31

## Context

Template message fields (Birthday wishes, Bible Study invites, Footer verses, etc.) accept HTML for formatting (bold, italic, colors, etc.), but users had no easy way to reference what HTML tags were available or how to use them. Users would either:
- Not know HTML was supported
- Have to search external documentation
- Make syntax mistakes and wonder why formatting didn't work

Initial implementation added formatting help only to the Visual Template Builder. User feedback showed:
1. Help was missing from default template forms (Birthday, Anniversary, etc.)
2. Help was missing from custom template forms
3. Text was too faint/low-contrast to read (light blue on gray)

We needed a consistent, visible, accessible way to show HTML formatting examples wherever users edit text.

## Decision

Implement inline, collapsible HTML formatting help as a shared component with these characteristics:

**Pattern:**
- Collapsible panel appearing below every text input that accepts HTML
- Collapsed by default to avoid clutter
- Expands to show 7 common examples with copy-to-clipboard buttons
- Shared component (`src/components/shared/formatting-help.tsx`) imported everywhere

**Styling (high-contrast for visibility):**
- Thick 2px blue border to stand out
- Dark, bold text (font-semibold, text-gray-900) for all labels
- High-contrast code blocks (dark text on white background)
- "Copy" button with text label, not just icon
- Highlighted tip section with background color

**Coverage:**
- All default template message fields (Birthday, Anniversary, Bible Study, Women's Study, Prayer Meeting, Bulletin)
- Custom template Message Body and Footer Verse
- Visual Template Builder (Message, Quote, Footer sections)
- Style Editor (Footer text)

**Examples provided:**
- Bold: `<b>text</b>` and `<strong>text</strong>`
- Italic: `<i>text</i>` and `<em>text</em>`
- Underline: `<u>text</u>`
- Line breaks: `<br/>`
- Colored text: `<span style="color: #...;">text</span>`
- Highlighted text: `<span style="background-color: #...;">text</span>`
- Combinations: `<strong style="color: #...;">text</strong>`

## Consequences

**Positive:**
- Users can discover HTML formatting without leaving the form
- Copy-to-clipboard reduces syntax errors
- Consistent experience across all template types
- Shared component means one place to maintain/update examples
- High-contrast styling ensures visibility on all screens

**Negative:**
- Adds visual weight below every text field (mitigated by collapsed-by-default)
- Users might assume these are the ONLY tags supported (we sanitize with DOMPurify which allows more)
- No progressive disclosure (beginner vs. advanced examples)

**Future considerations:**
- Could add "Advanced" section with more complex examples (tables, divs, etc.)
- Could show preview of what the HTML renders as
- Could auto-detect when user types HTML and auto-expand the help
- Could make collapsed/expanded state persistent per user
