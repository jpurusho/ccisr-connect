# ROLLBACK TO v1.89.0

The React Query refactor is broken. Dashboard is blank on production.

## Quick Rollback

```bash
git revert --no-commit 7b27d4e..HEAD
git commit -m "Revert to v1.89.0 - React Query refactor broken"
git push origin main
```

## Or Reset Hard

```bash
git reset --hard 98124c0  # v1.89.0 - last known good
git push --force origin main
```

## What Went Wrong

The React Query agent conversion has a fundamental issue:
- React Query starts with isLoading=true
- Component is stuck showing skeleton
- Dashboard never loads

The original code worked fine. The refactor introduced a critical regression.

## Recovery Steps

1. Rollback to 98124c0
2. Keep the test suite (it's good)
3. Keep Zod validation (it's good)
4. Keep quick wins cleanup (it's good)
5. REMOVE React Query changes

## Files to Revert

- src/app/(dashboard)/dashboard/page.tsx (React Query changes)
- src/app/layout.tsx (QueryProvider)
- src/components/providers/query-provider.tsx (delete)
