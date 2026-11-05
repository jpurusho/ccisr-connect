# 0024 — Force dark text in template editor fields with pastel backgrounds

**Status:** accepted  
**Date:** 2026-10-30

## Context

When editing custom email templates, users can apply pastel background colors to message body and footer verse fields to preview how they'll look in the email. However, when a pastel color was applied to an input field, the text became difficult or impossible to read because:

1. The input inherits system/theme text colors (which might be light in dark mode)
2. Pastel backgrounds are typically light colors
3. Light text on light background creates poor contrast

This affected both the "create new" and "edit existing" custom template forms.

## Decision

Force dark text color (`#1E293B`) in template editor input fields (Textarea and Input components) when a pastel background color is applied. This is applied at editing time only and does not affect the actual email rendering, which respects the user's chosen text colors.

Applied to:
- Message body textarea in new custom template form
- Footer verse input in new custom template form  
- Message body textarea in edit custom template form
- Footer verse input in edit custom template form

The fix preserves the background color preview (so users can see the pastel effect) while ensuring text remains readable during editing.

## Consequences

**Positive:**
- Text is now always readable when editing templates with pastel backgrounds
- Users can still preview the background color effect
- No impact on actual email rendering
- Consistent editing experience across all pastel color choices

**Negative:**
- During editing, users can't preview custom text colors they've chosen (text is always dark)
- If we extend pastel backgrounds to other form fields, we'll need to apply the same pattern

**Future consideration:**
If users need to preview custom text colors during editing, we could add a separate "Preview" mode that shows exact colors, while keeping the editor mode optimized for readability.
