# 0003 — Event time changes propagate to future instances only

**Status:** accepted
**Date:** 2026-06-22

## Context

When a user changes `default_time` or `default_end_time` on an event, existing event instances retain their original `instance_time`/`instance_end_time`. This caused confusion when a bulletin showed stale times even after an event update.

The question was whether to update all instances or only future ones.

## Decision

When the event form detects a time change on save, it prompts the user and updates only instances with `instance_date >= today`. Past instances are considered immutable — they represent what actually happened and changing them after the fact has no operational value.

## Consequences

- Users get the expected behavior: future bulletins reflect updated times.
- Historical data stays accurate for audit/reporting.
- The pattern applies to both `instance_time` and `instance_end_time` equally.
- If a per-instance override was manually set, it gets overwritten; this is acceptable because the user explicitly confirmed "update future instances."
