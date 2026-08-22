# Verification Steps

## Issue
Subject prefix is not persisting to database even after type regeneration.

## Root Cause Suspects
1. **Browser cache** - Old JavaScript bundle cached
2. **Supabase PostgREST cache** - API doesn't know about new column
3. **Type mismatch still exists** - Despite regeneration

## Steps to Verify

### 1. Hard Refresh Browser
Press `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows/Linux) to clear browser cache and reload.

### 2. Check Network Tab
1. Open DevTools → Network tab
2. Reload page
3. Look for the main JavaScript bundle
4. Check if it's loading from cache or fresh

### 3. Verify Vercel Deployment
Check that Vercel deployed commit `5d4bc33` with the updated types.

### 4. Manual DB Test
Run this in Supabase SQL Editor:

```sql
UPDATE composed_instances 
SET subject_prefix = 'Manual Test'
WHERE id = '620e13a9-18c6-4a13-942a-1046f216f7d2';

SELECT id, subject, subject_prefix 
FROM composed_instances 
WHERE id = '620e13a9-18c6-4a13-942a-1046f216f7d2';
```

If this works, the column is fine and it's an app code issue.
If this fails, there's a database/permissions issue.

