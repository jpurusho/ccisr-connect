## Description
<!-- Briefly describe what this PR does -->

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Refactoring (no functional changes)
- [ ] Documentation update

## Architecture Boundaries Checklist
<!-- See ARCHITECTURE.md for details -->

- [ ] Does this change touch operational data? (If yes, should it be in Calendar?)
- [ ] Does this change touch presentation defaults? (If yes, should it be in Templates?)
- [ ] Does this change touch week-specific data? (If yes, should it be in Dashboard?)
- [ ] Does this respect system boundaries? (No cross-boundary modifications)

### Boundary Violations (MUST be NO to all):
- [ ] Does Templates modify `event_breaks`? ❌ MUST BE NO
- [ ] Does Templates modify `event_instances`? ❌ MUST BE NO
- [ ] Does Dashboard modify `events`? ❌ MUST BE NO
- [ ] Does Dashboard modify `email_templates`? ❌ MUST BE NO

## Testing
- [ ] Tested locally
- [ ] Manual testing performed
- [ ] Added/updated tests (if applicable)

## Checklist
- [ ] Code follows project conventions (see AGENTS.md)
- [ ] No code duplication (shared logic extracted to utilities)
- [ ] Architecture boundaries respected (see ARCHITECTURE.md)
- [ ] Version bumped in package.json (if applicable)
- [ ] Documentation updated (if applicable)

## Related Issues
<!-- Link related issues: Fixes #123 -->

---

**Co-Authored-By:** Claude Sonnet 4.5 <noreply@anthropic.com>
