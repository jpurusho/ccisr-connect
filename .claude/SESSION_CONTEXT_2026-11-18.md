# Session Context - November 18, 2026

**Save Date:** 2026-11-18  
**Current Version:** 1.90.3  
**Status:** ✅ All Issues Resolved

## What Happened Today

1. **React Query Refactor Failed** - Dashboard broke, rolled back to v1.89.0
2. **Break Bug Fixed** - Templates was deleting breaks, now fixed in v1.90.3
3. **Architecture Documented** - Created ARCHITECTURE.md with clean separation

## Current State (v1.90.3)
- ✅ Dashboard working
- ✅ Breaks persist (templates don't touch them)
- ✅ Architecture documented
- ✅ All bugs fixed

## Key Files
- ARCHITECTURE.md - Complete architecture reference
- BREAK_BUG_FIXED.md - Break bug analysis
- SESSION_SUMMARY_2026-11-18.md - Full day summary
- CARD_VISIBILITY_VS_DATA.md - Visibility explanation

## Architecture (Clean Separation)
Calendar → Operational (schedules, breaks, subjects)
Templates → Presentation (colors, styling)
Dashboard → Composition (week-specific overrides)
Dispatches → History (immutable)

## Critical Rules
- Templates MUST NOT modify event_breaks
- Templates MUST NOT modify event_instances
- Dashboard MUST NOT modify events or templates
- Each system touches ONLY its own tables

## Quick Resume
Read SESSION_SUMMARY_2026-11-18.md for full details.
Current version: v1.90.3 - stable and working.
