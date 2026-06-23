# 0002 — Event Types is a top-level page

**Status:** accepted
**Date:** 2026-06-22

## Context

Event Types was accessible in two secondary locations: a popover panel on the Calendar page (`EventTypeManager` component) and a tab within the Templates page. Both felt buried given that Event Types is central to scheduling, bulletins, and signup forms. The user asked whether it should be surfaced higher.

Three options were considered: (1) dedicated top-level page, (2) keep on Calendar with a prominent panel, (3) split across both Calendar and a new page.

## Decision

Option 1 — dedicated `/event-types` route as a top-level nav item (between Calendar and Members). The page renders a color-coded card grid (one card per event type) with a Sheet panel for create/edit. The old `EventTypeManager` popover component is no longer imported anywhere but remains on disk for now.

The duplicate Event Types tab was removed from the Templates page to avoid two places to manage the same data.

## Consequences

- Single authoritative UI for event type CRUD; no split-brain between pages.
- The old `EventTypeManager` component is dead code; can be deleted in a future cleanup.
- Card grid pattern sets a visual precedent for other top-level entity pages (signup forms, etc.).
