# TODO: Complete Gradient Override Fix

## Status
✅ Fixed: Birthday, Anniversary, Bible Study  
⏳ Remaining: Women's Study, Prayer Meeting, Bulletin, Shoebox, Custom

## Pattern to Apply

For each remaining builder, add these 2 lines:

### 1. After `const colors` line, add:
```typescript
const styleForHeader = styleWithoutGradientIfCustomColor(style, !!data.primaryColor);
```

### 2. In headerRow call, change `style` to `styleForHeader`:
```typescript
headerRow(
  ...,
  colors,
  styleForHeader,  // ← Changed from: style
  ...
)
```

## Files to Update
- `/Users/jpurshot/experimental/ccisr-connect/src/lib/email/card-builder.ts`
  - Line ~673: `buildWomensStudyCard`
  - Line ~726: `buildPrayerMeetingCard`
  - Line ~794: `buildBulletinCard`
  - Line ~858: `buildShoeboxMinistryCard`
  - Line ~926: `buildCustomCard`

## Why
When user sets custom primaryColor in dashboard, it should override template gradient.
Without this, CSS `background:` (gradient) beats `background-color:` (custom color).

## Test After Fix
1. Set template to have gradient
2. Set draft custom color
3. Preview should show custom color, not gradient
