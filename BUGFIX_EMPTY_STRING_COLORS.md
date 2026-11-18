# Bug Fix: Empty String Color Fallback Issue

## Problem
When draft data contained empty strings for color fields, the nullish coalescing operator (`??`) would not fall back to template defaults because empty string is not `null` or `undefined`.

## Root Cause
JavaScript's `??` operator only checks for `null` or `undefined`, treating empty strings as truthy values:
```typescript
const color = "" ?? "#default"  // Returns "" (empty string)
const color = "" || "#default"  // Returns "#default" (correct!)
```

## Impact
- Users would save drafts with custom colors
- On page reload, colors would appear as empty/default
- Preview would show template default colors (green) instead of saved custom colors

## Files Fixed

### 1. Bible Study Form Loading (Lines 1348-1360)
**Before:**
```typescript
primaryColor: (fd.primaryColor as string) ?? bsCommon.primaryColor,
messageBgColor: (fd.messageBgColor as string | undefined) ?? bsCommon.messageBgColor,
```

**After:**
```typescript
primaryColor: (fd.primaryColor as string) || bsCommon.primaryColor,
messageBgColor: (fd.messageBgColor as string | undefined) || bsCommon.messageBgColor,
```

### 2. Custom Event Types (Lines 2000-2008)
**Before:**
```typescript
bodyBgColor: (fd.bodyBgColor as string) ?? (parsed.bodyBgColor as string) ?? undefined,
primaryColor: (fd.primaryColor as string) ?? (parsed.primaryColor as string) ?? "",
```

**After:**
```typescript
bodyBgColor: (fd.bodyBgColor as string) || (parsed.bodyBgColor as string) || undefined,
primaryColor: (fd.primaryColor as string) || (parsed.primaryColor as string) || "",
```

## Pattern Applied
- **Color fields**: Use `||` operator (treats empty string as falsy)
- **Text fields**: Keep `??` operator (allows intentional empty strings)

### Why This Distinction?
- **Colors**: Empty string is invalid (`""` is not a color) → fallback needed
- **Text**: Empty string is valid (user might want blank message) → preserve empty

## Fields Changed to Use `||`
✅ `primaryColor`
✅ `messageBgColor`
✅ `messageTextColor`
✅ `headerTitleColor`
✅ `headerSubtitleColor`
✅ `footerVerseBgColor`
✅ `footerVerseTextColor`
✅ `bodyBgColor`

## Fields Kept with `??`
✅ `message` - Allows intentional blank messages
✅ `headerTitle` - Allows intentional blank titles
✅ `headerSubtitle` - Allows intentional blank subtitles
✅ `footerVerse` - Allows intentional blank verses

## Verification
Already verified in `extractCommonCardData()` function (card-builder.ts:381-395):
- Already using `||` for all fields ✓
- Correctly handles empty strings ✓

## Testing
1. Save draft with custom color (e.g., `#F17D08`)
2. Refresh page
3. Color should persist (not revert to template default)
4. Preview should show saved custom color

## Version
Fixed in: **v1.87.2**

## Related Issues
- Empty string fallback pattern should be used consistently for all "invalid empty" fields
- Consider adding TypeScript validation to prevent empty strings in color fields at save time
