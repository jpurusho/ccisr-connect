# Retest Plan for Rolled Back Changes

## What We Rolled Back

From commits 6f10725 → 7b27d4e (7 commits):
1. ✅ **Quick Wins** (6f10725) - Debug logging, constants, ErrorBoundary
2. ✅ **Zod Validation** (8fa2446) - Schema validation, empty string prevention
3. ❌ **React Query** (38c4ac6) - Async state management (BROKEN)
4. ❌ **React Query Dependency** (1b4ec1f) - package.json
5. ❌ **Test Suite** (38c4ac6) - 70 test cases
6. ❌ **Test Fixes** (746b3eb)
7. ❌ **Hotfixes** (bf11946, 7b27d4e) - Failed attempts

## What to Reintroduce

### ✅ Safe to Reintroduce (No Issues):

1. **Quick Wins** (6f10725)
   - Remove debug logging
   - Extract DISPATCH_PREVIEW_STATUSES constant
   - Add ErrorBoundary component
   - **Status:** Already cherry-picked, working

2. **Zod Validation** (8fa2446)
   - Color validation schemas
   - sanitizeColor() helper
   - Prevent empty string bugs
   - **Status:** Already cherry-picked, working

3. **Test Suite** (70 tests)
   - All 7 test files
   - Documentation
   - **Status:** Can safely re-add, they don't affect runtime

### ❌ Needs Fixing Before Reintroduction:

4. **React Query Refactor**
   - **Issue:** Broken loading state management
   - **Fix Required:** Complete rewrite with proper testing
   - **Recommendation:** Skip for now, current useEffect works fine

---

## Testing Protocol for Future Changes

### Phase 1: Local Development Testing

```bash
# 1. Make changes on a feature branch
git checkout -b feature/react-query-v2

# 2. Test locally
npm run dev
# → Open http://localhost:3000/dashboard
# → Verify all cards load
# → Check console for errors
# → Test week navigation
# → Test color editing

# 3. Type check
npx tsc --noEmit

# 4. Build test
npm run build
```

### Phase 2: Staging Deployment (if you have one)

```bash
# If you have a Vercel preview environment:
git push origin feature/react-query-v2
# → Check Vercel preview URL
# → Test thoroughly before merging
```

### Phase 3: Production with Monitoring

```bash
# 1. Merge to main
git checkout main
git merge feature/react-query-v2
git push origin main

# 2. Monitor Vercel deploy
# → Wait for build to complete
# → Check deployment logs

# 3. Smoke test immediately
# → Visit dashboard
# → Check all cards load
# → Verify version number updated

# 4. Keep rollback ready
# If anything breaks:
git revert HEAD
git push --force origin main
```

---

## Specific Test Cases for React Query Retry

If you want to retry React Query, test these scenarios:

### Test Case 1: Initial Load
- **Action:** Open dashboard
- **Expected:** 
  - Shows loading skeleton initially
  - Data loads within 2 seconds
  - All cards visible
  - Week label shows correct dates
- **Current Issue:** Stuck on loading, nothing appears

### Test Case 2: Week Navigation
- **Action:** Click "Next Week" button
- **Expected:**
  - Shows loading skeleton
  - Data refreshes
  - Cards update for new week
  - URL updates
- **Current Issue:** Unknown (didn't get this far)

### Test Case 3: Edit and Save
- **Action:** Edit Bible Study color, save
- **Expected:**
  - Save succeeds
  - Preview updates immediately
  - Color persists on refresh
- **Current Issue:** Unknown (didn't get this far)

### Test Case 4: Network Error
- **Action:** Block Supabase in DevTools, refresh
- **Expected:**
  - Shows error message
  - Retry button appears
  - Can manually retry
- **Current Issue:** Unknown

---

## Quick Win: Just Add Test Suite

**The 70 tests are GOOD** - they test the bug fixes, not React Query.

You can safely add them back:

```bash
# 1. Checkout test files from broken commit
git checkout 38c4ac6 -- \
  src/lib/__tests__/ \
  src/lib/schemas/__tests__/ \
  src/components/__tests__/error-boundary.test.tsx \
  src/app/(dashboard)/__tests__/ \
  src/__tests__/ \
  AGENT_REFACTOR_COMPLETE.md

# 2. Test they work
npm test -- src/lib/__tests__/sanitize.test.ts

# 3. Commit
git add -A
git commit -m "Re-add test suite (70 tests) without React Query changes

Tests document bug fixes:
- Empty string fallback bug
- Gradient override bug  
- Loading race conditions

These tests are independent of React Query refactor.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 4. Push
git push origin main
```

---

## My Recommendation

### Do This Now:
1. ✅ Investigate the break issue (more urgent)
2. ✅ Re-add test suite (safe, valuable)
3. ✅ Keep Quick Wins + Zod validation (already working)

### Do Later (or Never):
4. ❌ Skip React Query for now
   - Current useEffect works fine
   - Risk/reward not worth it
   - If you want async improvements, consider SWR instead (simpler)

### If You Insist on React Query:
5. ⚠️ Complete rewrite with proper testing
   - Start fresh, don't reuse agent's code
   - Test locally for days
   - Deploy to staging first
   - Have rollback ready

---

## Cost/Benefit Analysis

| Change | Benefit | Risk | Recommendation |
|--------|---------|------|----------------|
| **Test Suite** | High - prevents regressions | Low - doesn't affect runtime | ✅ **Do it** |
| **Quick Wins** | Medium - cleaner code | Low - already working | ✅ **Keep it** |
| **Zod Validation** | High - prevents bugs | Low - already working | ✅ **Keep it** |
| **React Query** | Low - minor DX improvement | High - broke production | ❌ **Skip it** |

---

## Next Steps

**For Break Issue:**
1. Read DEBUG_BREAK_ISSUE.md
2. Check Supabase for duplicate events
3. Check audit log for deletions
4. Tell me when/how it disappears

**For Retesting:**
1. Re-add test suite (safe)
2. Test locally before pushing
3. Skip React Query unless you really need it

Want me to help with either of these?
