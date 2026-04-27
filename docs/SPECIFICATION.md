# CCISR ChurchConnect - Product Specification

**Project:** Church Membership Management & Communication Platform
**Church:** Christ Church of India, San Ramon (CCISR)
**Version:** 1.0
**Date:** 2026-04-23

---

## 1. Project Overview

### 1.1 Purpose

Build a cloud-native web application for CCISR to manage church membership records, automate recurring communications (birthday/anniversary cards, Bible study invitations, prayer meeting notices, weekly bulletin content), and provide a dashboard for church leadership. The system replaces manual Excel-based tracking and ad-hoc email composition.

### 1.2 Key Goals

- Centralized, deduplicated member database replacing the current `CCISR CONTACT.xlsx` spreadsheet (~100+ families, ~1037 rows across sheets)
- Automated weekly/monthly email dispatch for birthdays, anniversaries, Bible study invitations, prayer meetings, and bulletin content
- Beautiful, mobile-friendly email cards with color-coded themes per event type
- Role-based access (Admin / Operator) with Google OAuth
- Zero end-user configuration beyond login
- 100% free-tier cloud hosting (Supabase + Vercel/Cloudflare)

### 1.3 Suggested Names

- **App Name:** ChurchConnect (or "CCISR Connect")
- **Repo Name:** `ccisr-churchconnect`

---

## 2. Existing Data Analysis

### 2.1 Source Files

| File | Description | Key Observations |
|------|-------------|------------------|
| `CCISR CONTACT.xlsx` - "Member details" | Primary member database (~1037 rows, 23 columns) | Each row = one family: husband, wife, up to 4 children, address, phones, emails, birthdates, wedding date |
| `CCISR CONTACT.xlsx` - "Member contact" | Contact info subset (~1038 rows) | Overlaps with "Member details"; needs dedup |
| `CCISR CONTACT.xlsx` - "Sheet6" | Women's names + emails (~1031 rows) | Likely used for women's Bible study mailing list |
| `CCISR CONTACT.xlsx` - "New comer 2026" | Recent newcomers (13 entries) | Has him/her/children but missing birthdates, addresses, wedding dates |
| `CCISR CONTACT.xlsx` - "New comer welcome 2023" | 2023 newcomer tracking | Him/Her names + adult/kid counts |
| `Family Bible Study Hosting for 2026.xlsx` | Monthly hosting schedule | Month, host couple, address, phone; partially filled (Jan-May, July=summer break) |
| `Weekly_BulletinInfo.txt` | Sample weekly bulletin email | Birthdays, anniversaries, communion/snack helpers, Bible study locations |
| `Weekly Prayer Meeting.txt` | Sample Friday Bible study invite | Host, address, phone, time (7:30 PM Fridays) |
| `Monthly_Prayer_Meeting.txt` | Sample monthly prayer meeting invite | Host, address, phone, time, dinner details, signup link |

### 2.2 Data Quality Issues to Address During Migration

1. **Dates stored as full timestamps** (e.g., `2013-12-20 00:00:00`) but the year is placeholder/incorrect for most birthdates — the actual data is month/day only (no birth year in most cases). Wedding dates may have real years.
2. **Inconsistent row numbering** in "Member details" — some rows have numbers (1.0, 2.0...), others don't.
3. **Duplicate data** across "Member details" and "Member contact" sheets — must deduplicate by matching on name + phone/email.
4. **Phone number formats vary** — some are `510-676-2213`, others are `4699014316.0` (numeric without formatting).
5. **Missing data** is common — some members have no email, no birthdate, no spouse, etc.
6. **Newcomer records** are incomplete — need enrichment workflow.
7. **Some rows appear to be blank or header rows** scattered throughout.

---

## 3. Technical Architecture

### 3.1 Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Database** | Supabase (PostgreSQL) | Free tier: 500MB DB, 1GB file storage, 50K monthly active users, 500K edge function invocations. Relational DB is the right fit — structured member data with clear relationships (family, spouse, children). No need for graph DB. |
| **Auth** | Supabase Auth with Google OAuth provider | Built-in, zero-config for end users. RLS policies enforce access control. |
| **Backend / API** | Supabase Edge Functions (Deno/TypeScript) | Serverless, free tier included. Handles email dispatch, scheduling, template rendering. |
| **Scheduling** | Supabase `pg_cron` extension + Edge Functions | pg_cron (free) triggers edge functions on schedule for automated email dispatch. |
| **Frontend** | Next.js (App Router) on Vercel | Free tier hosting, SSR/SSG, excellent mobile support. |
| **UI Framework** | Tailwind CSS + shadcn/ui | Modern, accessible, themeable components. Multiple theme support via CSS variables. |
| **Email Rendering** | React Email | Build beautiful, responsive HTML emails with React components. |
| **Email Sending** | SMTP (configurable accounts) | Admin configures SMTP accounts; operators select from allowed accounts. Resend.com free tier (100 emails/day) as default option. |
| **File Storage** | Supabase Storage | For email template images, member photos (future). |

### 3.2 Environments

| Environment | Purpose | Supabase Project |
|-------------|---------|-----------------|
| **Production** | Live church use | `ccisr-churchconnect-prod` |
| **Test/Staging** | Testing, demos, UAT | `ccisr-churchconnect-test` |

Both environments share identical schemas. Separate Supabase projects under one organization. Vercel preview deployments point to test; production deployment points to prod.

### 3.3 Architecture Diagram (Textual)

```
                    +------------------+
                    |   Browser/Mobile |
                    |   (Any device)   |
                    +--------+---------+
                             |
                    +--------v---------+
                    |  Next.js on      |
                    |  Vercel (SSR)    |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
    +---------v----------+       +----------v---------+
    | Supabase Auth      |       | Supabase Edge      |
    | (Google OAuth)     |       | Functions           |
    | + RLS policies     |       | - Email dispatch    |
    +--------------------+       | - Template render   |
                                 | - Scheduling logic  |
                                 +----------+----------+
                                            |
                                 +----------v----------+
                                 | Supabase PostgreSQL  |
                                 | - Members            |
                                 | - Families           |
                                 | - Events             |
                                 | - Email templates    |
                                 | - Dispatch history   |
                                 | - SMTP configs       |
                                 | - Audit log          |
                                 | + pg_cron schedules  |
                                 +----------+----------+
                                            |
                                 +----------v----------+
                                 | SMTP Server(s)      |
                                 | (Configurable)      |
                                 +---------------------+
```

---

## 4. Database Schema

### 4.1 Entity Relationship Overview

```
families 1──* members
members 1──* member_dates (birthdays, anniversaries - month/day, optional year)
families 1──1 addresses

events 1──* event_instances (recurring events generate instances)
event_instances 1──* dispatch_queue

email_templates *──* event_types
smtp_configs *──1 users (admin who created)

mailing_lists 1──* mailing_list_members
mailing_list_members *──1 members (or raw email)

dispatch_queue 1──1 dispatch_history (after sent)

users 1──* audit_log
```

### 4.2 Core Tables

#### `families`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| family_name | text | Typically last name, used for grouping |
| home_phone | text | nullable |
| notes | text | nullable |
| is_active | boolean | default true; false = relocated/inactive |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `addresses`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| family_id | uuid FK -> families | |
| street | text | |
| city | text | |
| state | text | |
| zip | text | |
| full_address | text | original unparsed address for reference |
| is_current | boolean | support address history |

#### `members`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| family_id | uuid FK -> families | |
| first_name | text | |
| last_name | text | |
| full_name | text | original name from import |
| role_in_family | enum | `husband`, `wife`, `child` |
| cell_phone | text | nullable |
| email | text | nullable |
| birth_month | int | 1-12, nullable |
| birth_day | int | 1-31, nullable |
| birth_year | int | nullable (often unknown) |
| is_active | boolean | default true |
| is_newcomer | boolean | default false |
| newcomer_acknowledged | boolean | default false |
| newcomer_date | date | when they first visited |
| notes | text | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `wedding_anniversaries`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| family_id | uuid FK -> families | |
| husband_member_id | uuid FK -> members | |
| wife_member_id | uuid FK -> members | |
| anniversary_month | int | 1-12 |
| anniversary_day | int | 1-31 |
| anniversary_year | int | nullable |

#### `event_types`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | e.g., `birthday`, `anniversary`, `friday_bible_study`, `wednesday_womens_study`, `monthly_prayer`, `bulletin` |
| color_scheme | jsonb | `{primary: "#...", secondary: "#...", accent: "#..."}` |
| icon | text | |
| default_template_id | uuid FK -> email_templates | nullable |

#### `events`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| event_type_id | uuid FK -> event_types | |
| title | text | e.g., "San Ramon Friday Bible Study" |
| description | text | |
| recurrence_rule | text | iCal RRULE format (e.g., `FREQ=WEEKLY;BYDAY=FR`) |
| default_time | time | e.g., `19:30` |
| zoom_link | text | nullable, for online events like Wednesday women's study |
| is_active | boolean | |
| created_at | timestamptz | |

#### `event_instances`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| event_id | uuid FK -> events | |
| instance_date | date | |
| instance_time | time | |
| host_family_id | uuid FK -> families | nullable |
| location_override | text | nullable, if different from host's address |
| notes | text | e.g., "Dinner provided by host family" |
| status | enum | `draft`, `confirmed`, `cancelled` |
| created_at | timestamptz | |

#### `email_templates`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | e.g., "Birthday Card - Floral", "Bible Study Invite - Standard" |
| event_type_id | uuid FK -> event_types | nullable |
| subject_template | text | Supports variables: `{{member_name}}`, `{{date}}`, etc. |
| body_template | text | HTML with variables, rendered via React Email |
| signature_template | text | |
| header_image_url | text | nullable |
| is_default | boolean | |
| created_by | uuid FK -> users | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `smtp_configs`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | Display name, e.g., "Church Office Gmail" |
| host | text | |
| port | int | |
| username | text | |
| encrypted_password | text | Encrypted at rest |
| from_name | text | |
| from_email | text | |
| is_admin_only | boolean | If true, only admins can use this config |
| created_by | uuid FK -> users | |
| is_active | boolean | |

#### `mailing_lists`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | e.g., "Bulletin Recipients", "Women's Bible Study", "All Members" |
| description | text | |
| google_group_email | text | nullable, for Google Group integration |
| created_at | timestamptz | |

#### `mailing_list_members`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| mailing_list_id | uuid FK -> mailing_lists | |
| member_id | uuid FK -> members | nullable (if linked to a member) |
| external_email | text | nullable (for non-member recipients) |
| recipient_type | enum | `to`, `cc`, `bcc` |

#### `dispatch_queue`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| event_instance_id | uuid FK -> event_instances | nullable |
| email_template_id | uuid FK -> email_templates | |
| smtp_config_id | uuid FK -> smtp_configs | |
| mailing_list_id | uuid FK -> mailing_lists | |
| subject | text | Rendered subject |
| body_html | text | Rendered HTML body |
| scheduled_at | timestamptz | When to send |
| status | enum | `pending`, `previewed`, `approved`, `sending`, `sent`, `failed`, `cancelled` |
| created_by | uuid FK -> users | |
| approved_by | uuid FK -> users | nullable |
| sent_at | timestamptz | nullable |
| error_message | text | nullable |
| created_at | timestamptz | |

#### `dispatch_recipients`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| dispatch_id | uuid FK -> dispatch_queue | |
| email | text | |
| name | text | |
| recipient_type | enum | `to`, `cc`, `bcc` |
| delivery_status | enum | `pending`, `sent`, `bounced`, `failed` |

#### `dispatch_history`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| dispatch_id | uuid FK -> dispatch_queue | |
| full_snapshot | jsonb | Complete snapshot: subject, body, recipients, template used, smtp config used |
| sent_at | timestamptz | |

#### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | Maps to Supabase auth.users |
| email | text | Google account email |
| display_name | text | |
| role | enum | `super_admin`, `admin`, `operator` |
| is_active | boolean | |
| permissions | jsonb | Granular permissions for operators |
| allowed_smtp_configs | uuid[] | Which SMTP configs this user can use |
| created_by | uuid FK -> users | nullable |
| created_at | timestamptz | |
| last_login | timestamptz | |

#### `audit_log`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK -> users | |
| action | text | e.g., `member.create`, `dispatch.send`, `template.update` |
| entity_type | text | e.g., `member`, `dispatch`, `template` |
| entity_id | uuid | |
| changes | jsonb | Before/after diff |
| ip_address | text | |
| created_at | timestamptz | |

### 4.3 Key Indexes

- `members(birth_month, birth_day)` — fast birthday lookups for upcoming week
- `wedding_anniversaries(anniversary_month, anniversary_day)` — fast anniversary lookups
- `members(family_id)` — family member grouping
- `dispatch_queue(status, scheduled_at)` — pending dispatch processing
- `audit_log(user_id, created_at)` — user activity history
- `members(is_newcomer, newcomer_acknowledged)` — newcomer tracking

### 4.4 Row-Level Security (RLS) Policies

- All tables protected by RLS.
- `super_admin` and `admin`: full read/write on all tables.
- `operator`: read/write on members, events, dispatch_queue, mailing_lists per their `permissions` JSON. Read-only on audit_log, smtp_configs. No access to admin-only smtp configs.
- Unauthenticated or unregistered users: no access to any table.

---

## 5. Feature Requirements

### 5.1 Authentication & Authorization

| ID | Requirement | Priority |
|----|------------|----------|
| AUTH-1 | Google OAuth login via Supabase Auth. No password-based login. | P0 |
| AUTH-2 | Only pre-registered users (added by admin) can access the app. Unregistered Google accounts see "Unauthorized — contact your church administrator." | P0 |
| AUTH-3 | Three roles: `super_admin` (full control + can promote admins), `admin` (full control), `operator` (configurable subset). | P0 |
| AUTH-4 | Admin can invite new users by email, assign role, set permissions. | P0 |
| AUTH-5 | Operator permissions are granular: can view members, can edit members, can send emails, can manage templates, etc. | P1 |
| AUTH-6 | Session management with automatic token refresh. | P0 |

### 5.2 Member Management

| ID | Requirement | Priority |
|----|------------|----------|
| MEM-1 | Full CRUD on members. Add/edit/delete individual members. | P0 |
| MEM-2 | Family grouping: members are organized into families. View family card showing all members (husband, wife, children), address, contact info. | P0 |
| MEM-3 | Mark members/families as **active** or **inactive** (relocated). Inactive records are retained but hidden from default views. Toggle to show/hide inactive. **Cascade rule:** deactivating a family excludes all its members from birthday cards, anniversary cards, and bulletin listings — even if individual member records are still marked active. A family's active status is the authoritative gate. | P0 |
| MEM-4 | **Newcomer tracking**: flag new members, track acknowledgment status, date joined. Dedicated newcomer view/report. Auto-resolve newcomer flag after acknowledgment. | P1 |
| MEM-5 | Search members by any field: name, phone, email, address, city. Full-text search. | P0 |
| MEM-6 | Filter members by: active/inactive, city, family, has email, has birthday, newcomer status. | P0 |
| MEM-7 | Sort members by: name, family, city, join date. | P0 |
| MEM-8 | Multiple view styles: table/list view, card/grid view, family-grouped view. | P1 |
| MEM-9 | Birthdays: store month/day (year optional). Display age only when year is known. | P0 |
| MEM-10 | Anniversaries: stored per family (husband + wife). Month/day required, year optional. Excluded from cards when the family is inactive. | P0 |
| MEM-11 | Family count dashboard: total families, active families, total individuals, total children. | P0 |
| MEM-12 | Export members to CSV/Excel. | P2 |
| MEM-13 | Inline editing for quick updates (e.g., click phone number to edit). | P1 |
| MEM-14 | Central editing: editing a member from any context (preview card, member list, search result) opens the same edit experience and persists globally. | P0 |

### 5.3 Communication & Email

| ID | Requirement | Priority |
|----|------------|----------|
| COM-1 | **Birthday cards**: auto-generate beautiful, color-coded cards for members with birthdays in the upcoming week. Preview before sending. Members belonging to inactive families are excluded (family active status cascades). | P0 |
| COM-2 | **Anniversary cards**: same as birthday cards but different color scheme/template. Excluded when the family is inactive or the husband member is inactive. | P0 |
| COM-3 | **Friday Bible Study invitation**: weekly email with host family, address, phone, time. Content sourced from event_instances. | P0 |
| COM-4 | **Wednesday Women's Bible Study notice**: weekly email with Zoom link, topic, time. | P0 |
| COM-5 | **Monthly Prayer Meeting invitation**: email with host, address, phone, time, dinner details, signup link. | P0 |
| COM-6 | **Weekly Bulletin content**: aggregated email containing upcoming birthdays, anniversaries, communion/snack helpers, Bible study locations. Matches format of `Weekly_BulletinInfo.txt`. | P0 |
| COM-7 | **Custom/ad-hoc emails**: compose one-off emails to any mailing list using any template. | P1 |
| COM-8 | Email templates: WYSIWYG-ish editor for creating/editing templates. Support variables (`{{member_name}}`, `{{event_date}}`, `{{host_name}}`, `{{address}}`, etc.). | P0 |
| COM-9 | Templates are per event type with color-coded headers: e.g., blue for Bible Study, gold for Anniversaries, pink/purple for Birthdays, green for Prayer Meeting. | P0 |
| COM-10 | Emails must render beautifully on desktop, mobile (iPhone, Android), and web email clients (Gmail, Outlook, Yahoo). | P0 |
| COM-11 | Email signature: configurable per template, can include images and links. | P1 |
| COM-12 | **Preview system**: preview any email/card before sending. Edit content in preview if needed. | P0 |
| COM-13 | **Look-ahead**: calendar widget showing events for the current week and configurable weeks ahead. Preview cards/emails for future weeks. | P0 |
| COM-14 | Recipient management: To, CC, BCC per dispatch. | P0 |

### 5.4 SMTP Configuration

| ID | Requirement | Priority |
|----|------------|----------|
| SMTP-1 | Admin can configure multiple SMTP accounts (host, port, username, password, from name/email). | P0 |
| SMTP-2 | SMTP passwords encrypted at rest. | P0 |
| SMTP-3 | Admin-only SMTP configs: flagged accounts that operators cannot use. | P0 |
| SMTP-4 | Operator sees dropdown of allowed SMTP configs when sending. | P0 |
| SMTP-5 | Test email button to verify SMTP config works. | P1 |

### 5.5 Mailing Lists

| ID | Requirement | Priority |
|----|------------|----------|
| ML-1 | Create/edit/delete mailing lists. | P0 |
| ML-2 | Add members from the member database or add external email addresses. | P0 |
| ML-3 | Support Google Group email addresses as a mailing list entry. | P0 |
| ML-4 | Per-recipient type: To, CC, or BCC. | P0 |
| ML-5 | Pre-built lists: "All Active Members", "All Women" (from Sheet6 data), "Bulletin Recipients". | P1 |

### 5.6 Scheduling & Automation

| ID | Requirement | Priority |
|----|------------|----------|
| SCHED-1 | Schedule email dispatch for a specific date/time. | P0 |
| SCHED-2 | Recurring schedules: e.g., "Send bulletin content every Wednesday at 9 AM", "Send Bible study invite every Thursday at 6 PM". | P1 |
| SCHED-3 | **Pending dispatch queue**: view all scheduled dispatches. Preview, modify, or cancel before they go out. | P0 |
| SCHED-4 | Auto-generate upcoming birthday/anniversary cards each week and queue them for review. | P1 |
| SCHED-5 | pg_cron job checks dispatch_queue every 5 minutes, sends due items. | P0 |

### 5.7 Calendar & Events

| ID | Requirement | Priority |
|----|------------|----------|
| CAL-1 | Calendar view (week/month) showing all upcoming events: Bible studies, prayer meetings, birthdays, anniversaries. | P0 |
| CAL-2 | **Calendar pill/widget** on dashboard: shows this week's events at a glance. | P0 |
| CAL-3 | Manage recurring events: Friday Bible Study (with rotating hosts per `Family Bible Study Hosting for 2026.xlsx`), Wednesday Women's Study, Monthly Prayer Meeting. | P0 |
| CAL-4 | Create one-off events. | P1 |
| CAL-5 | Event instance details: host family, location, time, notes. Editable per instance. | P0 |
| CAL-6 | Assign monthly helpers (communion helper, snack helper) visible on calendar and in bulletin. | P1 |

### 5.8 Dashboard

| ID | Requirement | Priority |
|----|------------|----------|
| DASH-1 | **This Week** widget: upcoming birthdays, anniversaries, events. Clickable to preview/send cards. | P0 |
| DASH-2 | **Pending Dispatches** widget: queued emails awaiting approval or scheduled to go out. | P0 |
| DASH-3 | **Membership Stats**: total families, active/inactive, total members, newcomers pending acknowledgment. | P0 |
| DASH-4 | **Recent Activity**: last 10 actions (emails sent, members added/edited). | P1 |
| DASH-5 | **Database Usage** panel: table row counts, estimated storage usage. Helps monitor free-tier limits. | P2 |
| DASH-6 | Quick actions: "Send This Week's Bulletin", "Preview Birthday Cards", "Send Bible Study Invite". | P1 |

### 5.9 History & Audit

| ID | Requirement | Priority |
|----|------------|----------|
| HIST-1 | Full history of all dispatched emails: date, recipients, subject, body snapshot, who sent it, which SMTP config. | P0 |
| HIST-2 | Viewable by both admins and operators. | P0 |
| HIST-3 | Search/filter history by date range, event type, recipient. | P1 |
| HIST-4 | Audit log of all user actions: member CRUD, template changes, config changes. | P0 |
| HIST-5 | Audit log shows before/after diffs for edits. | P1 |

### 5.10 Reporting

| ID | Requirement | Priority |
|----|------------|----------|
| RPT-1 | **Birthday/Anniversary Report**: list of upcoming birthdays/anniversaries for any date range. | P0 |
| RPT-2 | **Family Directory**: printable/exportable family contact list. | P1 |
| RPT-3 | **Newcomer Report**: all newcomers, their status, date joined. | P1 |
| RPT-4 | **Communication Report**: emails sent per week/month, by type. | P2 |
| RPT-5 | **Member Report**: filter by city, active status, has email, etc. | P1 |

---

## 6. UI/UX Requirements

### 6.1 General

- **Responsive**: fully functional on desktop, tablet, and mobile (iPhone/Android).
- **Themes**: minimum 3 themes (light, dark, warm/church-themed). User selects from settings; persisted in localStorage.
- **Intuitive navigation**: sidebar on desktop, bottom nav on mobile.
- **Pagination**: all list views paginated (25/50/100 per page) with total count.
- **Error handling**: friendly toast notifications. No raw error messages. Retry options where applicable.
- **Loading states**: skeleton loaders, not spinners.
- **Empty states**: helpful messages with call-to-action when no data exists.

### 6.2 Key Pages

1. **Dashboard** — widgets described in Section 5.8
2. **Members** — list/grid/family views with search, filter, sort
3. **Member Detail / Edit** — full member profile, family context, edit inline
4. **Calendar** — week/month views, event details
5. **Compose / Preview** — email composition with template selection, preview, recipient selection
6. **Dispatch Queue** — pending/scheduled emails, approve/modify/cancel
7. **History** — sent email history, dispatch details
8. **Templates** — manage email templates, preview with sample data
9. **Mailing Lists** — manage lists and members
10. **Settings** (Admin) — SMTP configs, user management, event type colors, system preferences
11. **Reports** — birthday/anniversary, family directory, newcomer, communication

### 6.3 Email Card Design

Each event type has a distinct visual identity in email cards:

| Event Type | Color Palette | Header Style |
|-----------|--------------|-------------|
| Birthday | Purple/Lavender with confetti accents | "Happy Birthday!" with cake icon |
| Anniversary | Gold/Amber with elegant accents | "Happy Anniversary!" with rings icon |
| Bible Study | Blue/Teal | "Bible Study This Friday" with book icon |
| Women's Bible Study | Soft Rose/Mauve | "Women's Bible Study" with dove icon |
| Prayer Meeting | Green/Sage | "Monthly Prayer Meeting" with hands icon |
| Bulletin | Neutral/Church brand | Church header with cross icon |

---

## 7. Data Migration Plan

### 7.1 Steps

1. **Parse** `CCISR CONTACT.xlsx` "Member details" sheet as the primary source.
2. **Normalize phone numbers** to consistent format (e.g., `510-676-2213`).
3. **Parse dates**: extract month/day from the date fields. For wedding dates, attempt to preserve the year if it looks real (not 2013 placeholder). Birthdates are month/day only.
4. **Create family records**: each row becomes one family. Family name = shared last name (or husband's last name).
5. **Create member records**: husband, wife, and up to 4 children per family row.
6. **Parse addresses**: attempt to split into street/city/state/zip. Store original as `full_address`.
7. **Deduplicate** against "Member contact" sheet — use name + phone/email matching.
8. **Import newcomers** from "New comer 2026" sheet, flagged as `is_newcomer = true`.
9. **Import hosting schedule** from `Family Bible Study Hosting for 2026.xlsx` into `event_instances`.
10. **Create default mailing lists**: "All Members", "Women's Bible Study" (from Sheet6), "Bulletin Recipients".
11. **Validation report**: after migration, generate a report of records with missing critical fields (no email, no phone, ambiguous names) for manual review.

### 7.2 Migration Script

- Written as a standalone TypeScript script that reads the Excel files and inserts into Supabase via the JS client.
- Idempotent: can re-run without creating duplicates (uses upsert with natural keys).
- Produces a detailed log of: records imported, records skipped, data quality warnings.

---

## 8. Security Requirements

| ID | Requirement |
|----|------------|
| SEC-1 | All data access through Supabase RLS — no service-role key on the frontend. |
| SEC-2 | SMTP passwords encrypted using Supabase Vault or pgcrypto. |
| SEC-3 | Google OAuth only — no email/password auth. |
| SEC-4 | Unregistered users blocked at the application level (custom claim check on login). |
| SEC-5 | Edge Functions validate caller identity via Supabase auth JWT. |
| SEC-6 | Audit log captures all mutations with user ID and timestamp. |
| SEC-7 | No PII in browser localStorage beyond session token. |
| SEC-8 | HTTPS enforced (Vercel and Supabase provide this by default). |

---

## 9. Free-Tier Constraints & Monitoring

### Supabase Free Tier Limits (as of 2026)

| Resource | Limit | Expected Usage | Risk |
|----------|-------|---------------|------|
| Database size | 500 MB | ~5-10 MB (small dataset) | Very Low |
| File storage | 1 GB | Minimal (template images) | Very Low |
| Edge function invocations | 500K/month | ~2K/month (email sends + cron) | Very Low |
| Monthly active users | 50K | <10 | Very Low |
| Auth users | Unlimited | <20 | Very Low |
| Realtime connections | 200 concurrent | Not needed initially | N/A |

### Vercel Free Tier Limits

| Resource | Limit | Expected Usage | Risk |
|----------|-------|---------------|------|
| Bandwidth | 100 GB/month | <1 GB | Very Low |
| Serverless function executions | 100K/month | <5K | Very Low |
| Build minutes | 6000/month | <100 | Very Low |

The DASH-5 database stats panel will display current usage against these limits as a safeguard.

---

## 10. Implementation Phases

### Phase 1 — Foundation (Week 1-2)
- Supabase project setup (prod + test)
- Database schema creation with RLS policies
- Google OAuth configuration
- Next.js project scaffolding with Tailwind + shadcn/ui
- User management (admin creates operators)
- Theme system (3 themes)

### Phase 2 — Member Management (Week 2-3)
- Data migration script (Excel -> Supabase)
- Member CRUD with family grouping
- Search, filter, sort, pagination
- Multiple view styles (table, card, family)
- Active/inactive toggle
- Newcomer tracking

### Phase 3 — Communication Engine (Week 3-4)
- Email template system (React Email)
- SMTP configuration management
- Mailing list management
- Email composition and preview
- Birthday/anniversary card generation
- Send email via Edge Function

### Phase 4 — Events & Calendar (Week 4-5)
- Event types and recurring events
- Event instances with host management
- Calendar view (week/month)
- Bible study hosting schedule
- Weekly bulletin generation
- Dashboard calendar pill

### Phase 5 — Scheduling & Automation (Week 5-6)
- Dispatch queue with preview/approve/cancel
- pg_cron scheduled dispatch
- Auto-generate weekly birthday/anniversary cards
- Recurring dispatch schedules

### Phase 6 — Dashboard, History & Reports (Week 6-7)
- Dashboard with all widgets
- Dispatch history with full snapshots
- Audit log
- Reports (birthday, directory, newcomer, communication)
- Database usage monitoring

### Phase 7 — Polish & Deploy (Week 7-8)
- Mobile responsiveness testing
- Email rendering testing across clients
- Error handling and edge cases
- Performance optimization
- Production deployment
- User acceptance testing

---

## 11. Supabase Provisioning Steps (Manual)

The developer must complete these steps before implementation begins:

1. **Create Supabase organization**: e.g., "CCISR"
2. **Create two projects**:
   - `ccisr-churchconnect-prod` (select a region close to users, e.g., `us-west-1`)
   - `ccisr-churchconnect-test` (same region)
3. **Enable Google OAuth provider** in both projects:
   - Go to Authentication > Providers > Google
   - Create a Google Cloud OAuth 2.0 Client ID (via Google Cloud Console)
   - Set authorized redirect URIs to both Supabase project callback URLs
   - Enter Client ID and Client Secret in Supabase
4. **Enable pg_cron extension** in both projects:
   - Go to Database > Extensions > search "pg_cron" > Enable
5. **Enable pgcrypto extension** (for password encryption):
   - Go to Database > Extensions > search "pgcrypto" > Enable
6. **Note down and provide**:
   - Supabase project URL (for both prod and test)
   - Supabase anon key (for both prod and test)
   - Supabase service role key (for migration script only — never in frontend)
   - Google OAuth Client ID and Client Secret
7. **Create a Vercel account** (if not already) and link the GitHub repo.

---

## 12. Developer Handoff Checklist

Provide the following to proceed with implementation:

- [ ] Supabase project URLs (prod + test)
- [ ] Supabase anon keys (prod + test)
- [ ] Supabase service role key (for migration, stored in `.env.local` only)
- [ ] Google OAuth Client ID + Secret
- [ ] GitHub repo created (`ccisr-churchconnect`)
- [ ] Desired initial admin email (your Google account email)
- [ ] SMTP credentials for at least one email account to test with
- [ ] Preferred domain name (if any) for Vercel deployment

---

## 13. Sample Email Formats (From Source Data)

### Weekly Bulletin Email Content

```
Birthday:
Joshua Ravikumar - 4/29
Priyadharsini Kingsly - 5/1
Ramesh Durairaj - 5/1

Anniversary:
Prabin & Divya - 4/27
Christudass & Reenie - 4/30

Communion helper for May - Sheela Thangaraj
Snack helper for May - Tryphena

Women's Bible Study: Building a Relationship with God.
  Wednesdays @ 7:00pm via Zoom

San Ramon Bible study: Studying the Book of Acts.
  Friday at 7:30 pm @ the residence of Ephraim & Josephine.

Mountain House Bible study: Studying the Book of Acts.
  Friday @ 7:30 pm @ the residence of [TBD]
```

### Friday Bible Study Invitation

```
Dear All,

Blessings in Jesus' name.

We invite you to join our weekly Bible Study this Friday
at 7:30 PM at the residence of [Host Names].

Address:
[Street Address]
[City, State ZIP]
[Phone Number]

Regards,
[Host Name]
```

### Monthly Prayer Meeting Invitation

```
Dear All,

As we resume our Monthly Prayer meetings, please join us
for a time of prayer and worship, followed by a fellowship dinner.

Hosted by [Host Names]
Dinner will be provided by the host family.

Time:
[Day], [Date] at [Time]

Address:
[Street Address]
[City, State ZIP]

Contact:
[Phone Numbers]

Please sign up at the link below for planning purposes:
[Signup Link]
```

---

## 14. Open Questions & Decisions

| # | Question | Recommendation |
|---|----------|---------------|
| 1 | SQL (PostgreSQL) vs. Graph DB? | **PostgreSQL.** The data is inherently relational (families have members, events have instances, dispatches have recipients). Graph DB adds complexity with no benefit for this use case. Supabase provides PostgreSQL with excellent tooling. |
| 2 | Text/SMS support? | Defer to Phase 2. Focus on email first. Twilio or similar could be added later via Edge Functions. |
| 3 | Member self-service portal? | Out of scope for v1. Only admin/operator access. |
| 4 | Google Calendar integration? | Nice-to-have for future. Could sync events bidirectionally. |
| 5 | Signup link integration? | For now, prayer meeting signup links are manually entered URLs (e.g., Google Forms). Future: built-in RSVP. |
| 6 | Photo directory? | Defer. Supabase Storage could hold member photos in a future phase. |
| 7 | Multi-church / multi-tenant? | Not needed. Single-church deployment. |

---

## 15. Success Criteria

- [ ] Admin can log in, add members, and see them on the dashboard
- [ ] All existing Excel data migrated with zero data loss and a validation report
- [ ] Birthday/anniversary cards auto-generated for upcoming week and previewable
- [ ] Weekly bulletin email matches the format of `Weekly_BulletinInfo.txt`
- [ ] Bible study and prayer meeting emails can be composed, previewed, and sent
- [ ] Scheduled dispatches fire on time via pg_cron
- [ ] All emails render correctly on Gmail (web + mobile), Outlook, Apple Mail
- [ ] Operators can only access what admins allow
- [ ] Full audit trail of all actions
- [ ] App is responsive and usable on iPhone, Android tablet, and desktop
- [ ] All infrastructure runs within Supabase + Vercel free tiers
