# CCISR Connect — Architecture

**Version:** 1.43.1
**Date:** 2026-05-07
**Status:** Production (single-church deployment)

---

## End-to-End Stack

CCISR Connect is a 2-tier web application: a React client running on Vercel that talks directly to a Supabase (Postgres) backend. Next.js serverless functions act as a lightweight API gateway for operations that require server trust or secrets.

### Layer 1: Browser (React 19 + Next.js Client Components)

- Renders all UI (dashboard, calendar, forms, settings)
- Holds application state (card form data, navigation, editing)
- Runs business logic (card HTML builders, interpolation, recurrence calculations)
- Talks directly to Supabase for most CRUD (members, families, events, templates)
- Uses Supabase auth session (JWT in cookie)

### Layer 2: Vercel (Next.js 16 on Edge/Serverless)

**a) Static hosting + CDN** — serves built JS/CSS/HTML bundles globally. Pages like `/login`, `/signups`, `/members` are pre-rendered shells that hydrate on the client.

**b) Middleware** (runs at the edge on every request):
- Refreshes the Supabase auth session (cookie → JWT)
- Redirects unauthenticated users away from protected routes
- Allows PUBLIC_ROUTES (`/signup/*`, `/api/signup/*`) through without auth

**c) API Routes** (serverless functions, `/api/*`):

| Route | Purpose |
|-------|---------|
| `/api/signup/submit` | Validates + rate-limits public form submissions (uses service role to bypass RLS) |
| `/api/signup/member-lookup` | Exposes member autocomplete to public forms (masked data) |
| `/api/signup/remove` | Phone verification for self-removal |
| `/api/bible` | Proxies ESV API (keeps the key server-side) |
| `/api/cron/send-scheduled` | Daily cron that fires queued emails via SMTP |

These exist because the client either lacks permission (no service role key in browser) or the logic needs secrets/server trust.

### Layer 3: Supabase (Postgres + Auth)

**Auth** — handles login/signup, issues JWTs, manages sessions. Vercel middleware refreshes these.

**Database (Postgres)** — all persistent state:

| Domain | Tables |
|--------|--------|
| People | `families`, `members`, `addresses` |
| Scheduling | `events`, `event_instances`, `event_types` |
| Email | `email_templates`, `composed_instances`, `dispatch_queue` |
| Signup forms | `signup_forms`, `signup_responses`, `signup_rate_limits` |
| System | `audit_log`, `app_settings`, `mailing_lists`, `smtp_configs` |

**RLS (Row Level Security)** — every table has policies like "only admin/super_admin can read/write". The browser's JWT carries the user role, and Postgres enforces it. The client queries tables directly without needing a backend to gatekeep.

**`get_user_role()` function** — a Postgres function that extracts role from the JWT claims, used in all RLS policies.

### Layer 4: External Services

| Service | Purpose |
|---------|---------|
| SMTP servers (configured in `smtp_configs` table) | Nodemailer sends emails from the cron API route |
| ESV API (api.esv.org) | Bible verse lookup, proxied through `/api/bible` |

### Typical Request Flows

| Action | Flow |
|--------|------|
| Admin loads dashboard | Browser → Supabase (direct, with JWT) |
| Admin sends email | Browser → `/api/dispatch` or cron → SMTP server |
| Public user submits signup | Browser → `/api/signup/submit` → Supabase (service role) |
| Auth check on page load | Browser → Vercel middleware → Supabase Auth (session refresh) |
| Verse lookup | Browser → `/api/bible` → ESV API |

### Key Architectural Consequences

- **Business logic lives in the client** (card builders, compose logic, form validation) rather than in a server layer
- **The DB is mostly a dumb store** with RLS as the security boundary
- **No dedicated backend service** — Next.js edge/serverless functions fill that role only when needed
- **Client bundle carries more weight** since it handles rendering, state, and logic

---

## System Overview

CCISR Connect is a church membership management and communication platform serving Christ Church of India, San Ramon. It manages ~100+ families, automates recurring email communications, and provides event scheduling through a calendar-first interface.

### Core Surfaces

| Surface | Purpose | Key File |
|---------|---------|----------|
| **Dashboard** | Email composition hub — compose, preview, dispatch for the selected week | `dashboard/page.tsx` |
| **Calendar** | Event scheduling hub — create/edit events, per-occurrence overrides, dispatch tracking | `calendar/page.tsx` |
| **Members** | Member/family CRUD, tags, import/export, demographics | `members/` |
| **Templates** | Base email template defaults (body, subject, theme) | `templates/page.tsx` |
| **Dispatch** | Read-only outbox — view queued/sent/failed emails | `dispatch/page.tsx` |
| **Signups** | Public form builder for event signups (hosting, volunteering, RSVPs) | `signups/page.tsx` |
| **Settings** | SMTP, users, integrations (ESV API key) | `settings/` |

### Data Flow

```
Templates (base defaults)
    ↓
Dashboard (compose weekly email using template + live data + signup auto-fill)
    ↓
Composed Instances (saved drafts, per-week)
    ↓
Dispatch Queue (sent emails with body_html archive)
    ↓
SMTP delivery via Nodemailer
```

### Event Flow

```
Calendar (create event with recurrence rule)
    ↓
events table (series definition: title, type, recurrence, host, expiration)
    ↓
event_instances table (per-date overrides: host, time, location, notes, status)
    ↓
getOccurrences() resolves dates for any week range
    ↓
Dashboard consumes resolved dates + instance overrides for email composition
```

### Signup → Card Auto-Fill Flow

```
Public signup form (user signs up for a hosting month)
    ↓
signup_responses table (form_id, data JSONB with member/address/month)
    ↓
event_types.linked_signup_form_id + signup_field_map
    ↓
resolveSignupAutoFill() matches current month → extracts host/address
    ↓
Dashboard card auto-populates (with visual "linked form" indicator)
```

---

## What Works Well

### Email Pipeline (Professional Grade)
- **3-stage lifecycle:** Template defaults → Composed instances (drafts) → Dispatch queue (sent)
- **body_html archival:** Exact email content preserved for every dispatch
- **Sent email preview:** Viewable from both dashboard and calendar
- **Dispatch tracking:** Sent date, target week, reminder count, status badges
- **Audit trail:** Every operation logged with user, entity, and timestamp

### Calendar Scheduling
- **Recurrence engine** (`lib/recurrence.ts`): Supports WEEKLY, MONTHLY with nth-day, exception dates, UNTIL
- **Per-occurrence overrides:** Change host/time/location for a specific date without touching the series
- **Cancelled occurrences:** Instance status = cancelled, prevents regeneration
- **Host family expiration:** Event-level host with `host_until` date, auto-clears when expired

### Dashboard Strip
- **Unified week view:** Recurring events, birthdays, anniversaries, dispatches all on one strip
- **Clickable pills:** Events select dashboard card, sent dispatches show email preview
- **Dispatch placement:** Sent emails appear on actual sent date with target week label

### Code Quality
- **Base type inheritance:** `BaseFormData` / `BaseCardData` — add a field once, all 7 types inherit
- **Shared components:** `CommonFieldsEditor`, `CustomSectionsEditor`, `ResourceLinksEditor`
- **Extracted utilities:** `extractCommonCardData()`, `commonTrailingHtml()`, `interpCommon()`

---

## Known Limitations

### 1. One Event Per Event Type (Architectural Constraint)

The dashboard has one card per `CommType` (birthday, anniversary, bible_study, womens_study, prayer_meeting, bulletin). The mapping `COMM_TYPE_TO_ET` hardcodes 6 event types to 6 cards. `findEventByType()` returns the first match.

**Impact:** Cannot have two Bible Study events (e.g., youth + adult) — the dashboard can only compose for one.

**Fix path:** Decouple dashboard cards from event types. Make cards data-driven from events table. Dashboard renders one card per active event, not per hardcoded CommType.

### 2. Custom Recurrence Format (Not RFC 5545)

Our format: `FREQ=WEEKLY;BYDAY=FR;EXCEPT=2026-06-06;UNTIL=2026-12-31`
Standard RFC 5545: `RRULE:FREQ=WEEKLY;BYDAY=FR;UNTIL=20261231T235959Z` + `EXDATE:20260606T000000Z`

**Missing:** INTERVAL (every N weeks), COUNT, BYMONTHDAY, BYSETPOS, timezone in UNTIL.

**Impact:** Google Calendar sync would need a translation layer. One-way export (our → iCal) is feasible. Two-way sync requires significant work.

### 3. No Timezone Support

All times stored as bare `time` fields, dates as `date`. Comparisons use browser-local time. No TZID metadata.

**Impact:** Works for single-congregation in one timezone. Breaks for: Google Calendar sync (requires DTSTART with timezone), multi-site deployments, members in different timezones.

### 4. Dashboard Monolith (~2800 lines)

`dashboard/page.tsx` manages all form state for 6+ communication types in one component. Every change risks regressions across types.

**Fix path:** Extract per-type card controllers into separate files. Move form state management into a custom hook or context.

### 5. Hardcoded Event Type → Card Mapping

Adding a new recurring event type (e.g., Youth Group) requires code changes in:
- `COMM_TYPE_TO_ET` mapping
- `BUILTIN_TEMPLATES` array
- Form state declarations
- Preview builder functions
- fetchAll processing

**Fix path:** Make event types fully data-driven. Dashboard dynamically renders cards from `event_types` + `email_templates` tables.

---

## Google Calendar Sync Readiness

| Requirement | Current State | Gap |
|---|---|---|
| RFC 5545 RRULE | Custom subset | Need translation layer |
| Timezones (TZID) | None | Need timezone on all dates/times |
| Event UIDs | No external ID field | Need `google_calendar_id` column on events |
| Two-way sync | No webhook/polling | Need sync engine + OAuth |
| Multiple events per type | Blocked by 1:1 constraint | Need to decouple from dashboard cards |
| EXDATE format | Custom EXCEPT clause | Need RFC 5545 EXDATE conversion |
| Attendees/RSVP | Not applicable | Not needed for basic sync |

**Estimate:** One-way export (our events → .ics file) is ~2 days of work. Two-way sync with Google Calendar API is ~2-3 weeks including OAuth, webhook, conflict resolution.

---

## Database Schema (Key Tables)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `events` | Series definitions | recurrence_rule, host_family_id, host_until, default_time |
| `event_instances` | Per-occurrence overrides | instance_date, host_family_id, instance_time, location_override, status |
| `event_types` | Categories with template links | name, color_scheme, default_template_id, is_active |
| `email_templates` | Base email content | template_type, subject_template, body_template (JSON) |
| `composed_instances` | Weekly drafts | template_type, week_start, form_data (JSON), is_recurring |
| `dispatch_queue` | Sent/queued emails | body_html, status, sent_at, week_start, template_type |
| `families` | Family units | family_name, is_active |
| `members` | Individuals | birth_month/day, role_in_family, is_active |

### Migrations (in order)

1. `00001_initial_schema.sql` — Core tables, RLS, seed data (6 event types)
2. `00002_member_tags.sql` — Tags system
3. `00003_migrate_newcomers_to_tags.sql` — Newcomer flag → tag migration
4. `00004_composed_instances.sql` — Draft storage
5. `00005_composed_instances_weekly.sql` — week_start, is_recurring columns
6. `00006-00010` — Dispatch/template enhancements
7. `00011_event_types_soft_delete.sql` — is_active on event_types
8. `00012_event_host_family.sql` — host_family_id + host_until on events

---

## Future Roadmap

### Near-term
- **Multiple events per type:** Decouple dashboard cards from hardcoded CommType mapping
- **iCal export:** Generate .ics files for Google Calendar import
- **Dashboard decomposition:** Extract per-type controllers from the monolith

### Medium-term
- **RFC 5545 recurrence:** Adopt standard RRULE + EXDATE format
- **Timezone support:** TZID on events, aware date comparisons
- **Google Calendar one-way sync:** OAuth + Calendar API push

### Long-term
- **Two-way Google Calendar sync:** Webhooks, conflict resolution
- **Multi-site support:** Multiple congregations, shared member DB
- **Mobile app:** React Native or PWA

---

## Rating

| Dimension | Score | Notes |
|-----------|-------|-------|
| Single-church internal tool | **8/10** | Email workflow is strong, calendar works, UX is intuitive |
| Multi-tenant SaaS product | **5/10** | Hardcoded types, monolith dashboard, no timezone |
| Google Calendar sync ready | **6/10** | Schema is close but format gaps + missing fields |
| Code quality | **7/10** | Good extraction patterns, but dashboard monolith is fragile |
| UX/Accessibility | **7/10** | Clean dark theme, keyboard support, but some mobile gaps |
