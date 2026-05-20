# CCISR Connect

**Church Membership Management & Communication Platform** for Christ Church of India, San Ramon.

A full-featured church management application built with Next.js, Supabase, and Tailwind CSS. Manage members, families, communications, events, and more — all from a single dashboard.

## Features

### Membership Management
- **Member Directory** — Add, edit, deactivate, or permanently delete members
- **Family Grouping** — Organize members into families with family-level activate/deactivate (cascades to exclude all members from birthday/anniversary cards and bulletin listings)
- **Tags** — Custom color-coded tags (Newcomer, Bible Study, Youth, Volunteer, etc.)
- **City Consolidation** — Smart normalization of city names for filtering
- **Dedup Tool** — Find and resolve duplicate members by name, email, or phone
- **Import/Export** — Import from vCard (.vcf), export filtered lists as styled PDF cards

### Communication Hub (Dashboard)
- **Weekly Cards** — Birthday, Anniversary, Bible Study, Women's Study, Prayer Meeting, Bulletin
- **Week Strip** — Clickable at-a-glance view of events, birthdays, anniversaries, and dispatches
- **Multi-Location Bible Study** — San Ramon + Mountain House with vacation mode
- **Template System** — Base type inheritance (`BaseFormData`/`BaseCardData`), custom sections with emoji/color, reorderable
- **Custom Announcements** — Create one-off or reusable custom templates, appear on dashboard
- **Draft Lifecycle** — Save drafts, cancel (revert to saved), delete, auto-save before dispatch
- **Per-Card Options** — Independent mailing list, SMTP account, and additional recipients per card
- **Week Navigation** — Navigate past and future weeks to compose or review communications
- **Reminders** — Re-send communications with "Reminder:" prefix and count tracking
- **Download** — PDF and PNG (WhatsApp-ready) exports for every card

### Email Dispatch
- **SMTP Sending** — Send emails via configured Gmail/SMTP accounts
- **Dispatch Queue** — Preview, approve, reschedule, or send now
- **Scheduled Sending** — Vercel cron for automatic daily dispatch
- **Mailing Lists** — To/CC/BCC recipients from members or external emails

### Calendar & Event Scheduling
- **Calendar-First Scheduling** — Create/edit/delete events by clicking dates (Google Calendar model)
- **Week/Month Views** — Colored pill-style events, birthdays, anniversaries, dispatches
- **Recurrence** — Weekly, monthly (nth day), exception dates, end dates
- **Per-Occurrence Editing** — Change host, time, location for a specific date without touching the series
- **Host Family Expiration** — Assign a host with an expiration date; auto-clears when expired
- **Event Type Management** — Create/edit/deactivate event types with template associations
- **Dispatch Tracking** — Sent emails shown on calendar with actual sent date and target week label
- **View Sent Email** — Click any sent dispatch to see the exact HTML that was delivered
- **Inline Birthday/Anniversary Editing** — Click any birthday or anniversary event to fix the date directly from the calendar

### Public Signup Forms
- **Form Builder** — Create flexible signup forms with 13 field types (text, email, phone, address, date, month picker, select, multi-select, claim select, number, checkbox, textarea, member lookup)
- **Claim Select** — Capacity-limited item selection (e.g., potluck food signup) with custom free-text entries
- **Public Links** — Share `/signup/[slug]` links via email; no login required to submit
- **Member Auto-Complete** — Type name to auto-fill address/phone from member directory
- **Visual Month Picker** — Color-coded grid showing Open/Taken/Past/Break with host names
- **Show/Hide Responses** — Admin toggle to control whether public users see who signed up
- **Signup → Card Auto-Fill** — Link signup forms to event types; dashboard cards auto-populate from responses
- **Phone Verification** — Server-side verification required to remove a signup
- **Rate Limiting** — Per-form configurable rate limits to prevent abuse
- **Response Viewer** — Admin table with search, sort, CSV export, delete
- **Theming** — Custom colors, emoji, bible verse with pastel background per form

### Template Style Customization
- **Font Family** — Sans-serif, serif, rounded, monospace
- **Font Size Scale** — Compact, default, large
- **Header Variants** — Full color band, top border, side accent
- **Header Gradients** — 7 preset gradients (Sunset, Ocean, Forest, etc.) + custom CSS gradient
- **Section Layouts** — Table, paragraph, or list (per-section override)
- **Custom Pastels** — Create your own background/border color pairs
- **Text Color Pickers** — Per-field text color for header title, subtitle, message body, footer verse
- **Dark Mode** — `@media (prefers-color-scheme: dark)` for Apple Mail/Outlook
- **Custom Footer** — Override default footer text per template
- **Bible Verse Picker** — Look up ESV/KJV/WEB verses inline for footer, subtitle, and custom sections

### Reports & History
- **Demographics** — Clickable stat cards linking to filtered member views
- **City Distribution** — Bar chart with click-through to city-filtered members
- **Activity Log** — Field-level diffs, expandable rows, detailed before/after values
- **Dispatch History** — Search, filter by status/date, preview sent cards

## Architecture

```mermaid
graph TB
    subgraph Client["Browser — Next.js App"]
        Dashboard[Communication Hub]
        Calendar[Calendar & Scheduling]
        Members[Member Management]
        Templates[Email Templates]
        Dispatch[Dispatch Queue]
        Settings[Settings & Config]
    end

    subgraph API["Next.js API Routes"]
        SendAPI["/api/dispatch/send"]
        CronAPI["/api/dispatch/cron"]
        PreviewAPI["/api/cards/preview"]
        SignupAPI["/api/signup/*"]
    end

    subgraph Public["Public Pages"]
        SignupPage["/signup/[slug]"]
    end

    subgraph Supabase["Supabase — PostgreSQL + Auth"]
        Auth[Google OAuth]
        DB[(Database)]
    end

    subgraph External["External Services"]
        SMTP[Gmail SMTP]
        Vercel[Vercel Cron]
    end

    Dashboard --> DB
    Calendar --> DB
    Members --> DB
    Templates --> DB
    Dispatch --> SendAPI
    SendAPI --> SMTP
    SendAPI --> DB
    Vercel --> CronAPI
    CronAPI --> SendAPI
    SignupPage --> SignupAPI
    SignupAPI --> DB
    Client --> Auth
```

### Data Model

```mermaid
erDiagram
    FAMILIES ||--o{ MEMBERS : contains
    FAMILIES ||--o{ ADDRESSES : has
    MEMBERS ||--o{ MEMBER_TAGS : tagged_with
    TAGS ||--o{ MEMBER_TAGS : applied_to
    MEMBERS ||--o{ WEDDING_ANNIVERSARIES : celebrates
    EVENT_TYPES ||--o{ EVENTS : categorizes
    EVENTS ||--o{ EVENT_INSTANCES : scheduled_as
    EVENT_TYPES ||--o{ EMAIL_TEMPLATES : defaults_for
    MAILING_LISTS ||--o{ MAILING_LIST_MEMBERS : contains
    SMTP_CONFIGS ||--o{ DISPATCH_QUEUE : sends_via
    MAILING_LISTS ||--o{ DISPATCH_QUEUE : targets
    DISPATCH_QUEUE ||--o{ DISPATCH_HISTORY : records
    APP_USERS ||--o{ AUDIT_LOG : performs
    SIGNUP_FORMS ||--o{ SIGNUP_RESPONSES : collects
    SIGNUP_FORMS }o--|| EVENT_TYPES : linked_to
    SIGNUP_FORMS }o--|| MAILING_LISTS : auto_adds
```

### Communication Flow

```mermaid
flowchart LR
    T[Template Defaults] --> D[Dashboard]
    C[Calendar] -->|Event dates & hosts| D
    D --> E{Edit & Preview}
    E --> Q[Dispatch Queue]
    Q -->|Send Now| S[SMTP Send]
    Q -->|Schedule| CR[Vercel Cron]
    CR --> S
    S --> H[Email Delivered]
    S --> A[Audit Log]
    D --> P[Download PNG/PDF]
```

### Event Lifecycle

```mermaid
flowchart TB
    C[Calendar: Create Event] --> EV[events table]
    EV -->|Recurrence rule| OCC[getOccurrences resolves dates]
    EV -->|Per-date override| EI[event_instances table]
    OCC --> DASH[Dashboard: compose email]
    EI --> DASH
    DASH --> CI[composed_instances: draft]
    CI --> DQ[dispatch_queue: sent]
    DQ -->|Shown on sent_at date| C
```

### Signup Form Flow

```mermaid
flowchart LR
    A[Admin: Create Form] --> F[signup_forms]
    F -->|Generate slug| L["/signup/slug" Link]
    L -->|Share via email| U[User opens link]
    U --> PF[Public Form Page]
    PF -->|Member lookup| ML["/api/signup/member-lookup"]
    ML -->|Auto-fill| PF
    PF -->|Submit| S["/api/signup/submit"]
    S -->|Rate limit check| S
    S -->|Validate + sanitize| R[signup_responses]
    R -->|Admin views| RV[Response Viewer]
    RV -->|Export| CSV[CSV Download]
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Google OAuth) |
| UI | Tailwind CSS, shadcn/ui |
| Email | Nodemailer (Gmail SMTP) |
| Fonts | Inter, JetBrains Mono |
| Hosting | Vercel |
| Cron | Vercel Cron Jobs |

## Project Structure

```
ccisr-connect/
├── docs/                        # Documentation
│   ├── SPECIFICATION.md         # Full app specification
│   ├── PROVISIONING.md          # Supabase setup guide
│   └── previews/                # Email card HTML previews
├── scripts/                     # Data migration scripts
├── src/
│   ├── app/
│   │   ├── (auth)/              # Login, unauthorized pages
│   │   ├── (dashboard)/         # All dashboard pages
│   │   │   ├── dashboard/       # Communication Hub
│   │   │   ├── members/         # Member management
│   │   │   ├── calendar/        # Calendar views
│   │   │   ├── signups/         # Signup form builder & responses
│   │   │   ├── templates/       # Email template editor
│   │   │   ├── dispatch/        # Dispatch queue
│   │   │   ├── history/         # Dispatch & activity history
│   │   │   ├── mailing-lists/   # Recipient management
│   │   │   ├── reports/         # Demographics & stats
│   │   │   └── settings/        # Config, SMTP, tags, database
│   │   ├── signup/[slug]/       # Public signup form page
│   │   └── api/
│   │       ├── dispatch/        # Send & cron endpoints
│   │       ├── signup/          # Submit, member-lookup, remove APIs
│   │       ├── cards/           # Card preview API
│   │       └── auth/            # OAuth callback
│   ├── components/
│   │   ├── dashboard/           # Communication cards, edit forms, card export
│   │   ├── calendar/            # Week/month views, event form, instance editor, event types
│   │   ├── members/             # Table, cards, family, export, import, dedup
│   │   ├── settings/            # SMTP, users, tags, themes
│   │   ├── layout/              # Sidebar, user nav
│   │   └── ui/                  # shadcn/ui primitives (Base UI + react-day-picker)
│   ├── lib/
│   │   ├── email/               # Card builder (HTML email generation)
│   │   ├── signup/              # Field registry, sanitization, slug, theme
│   │   ├── supabase/            # Client & middleware
│   │   ├── audit.ts             # Audit logging helper
│   │   ├── city-utils.ts        # City name normalization
│   │   ├── date-utils.ts        # Bulletin week, date helpers
│   │   ├── recurrence.ts        # Recurrence engine + UI helpers (parse/build/describe)
│   │   ├── template-defaults.ts # Template type definitions & fallbacks
│   │   └── utils.ts             # Phone formatting, cn()
│   └── types/
│       └── database.ts          # Full TypeScript types
├── supabase/
│   └── migrations/              # SQL schema & seed data
│       ├── 00001_initial_schema.sql
│       ├── 00002_member_tags.sql
│       └── 00003_migrate_newcomers_to_tags.sql
└── vercel.json                  # Cron job configuration
```

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project with Google OAuth configured
- Gmail account with App Password for SMTP

### Local Setup

```bash
# Clone
git clone git@github-jerome:jpurusho/ccisr-connect.git
cd ccisr-connect

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your Supabase and SMTP credentials

# Run database migrations
# Paste contents of each file in supabase/migrations/ into Supabase SQL Editor

# Start dev server
npm run dev
```

### Environment Variables

| Variable | Description | Required |
|----------|------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side) | Yes |
| `CRON_SECRET` | Secret for cron endpoint authentication | Optional |

### Deployment

Connected to Vercel via GitHub integration. Every push to `main` triggers auto-deployment.

**Vercel Settings:**
- Framework: Next.js (auto-detected)
- Root Directory: `./`
- Environment variables set in Vercel project settings
- Cron: Daily at 6 AM UTC for scheduled dispatch sending

## Database Migrations

Run these in order via Supabase SQL Editor:

1. `00001_initial_schema.sql` — Core tables, RLS policies, seed data (6 event types)
2. `00002_member_tags.sql` — Tags system (tags + member_tags tables)
3. `00003_migrate_newcomers_to_tags.sql` — Migrate is_newcomer flags to tags
4. `00004_composed_instances.sql` — Draft storage for weekly compositions
5. `00005_composed_instances_weekly.sql` — week_start, is_recurring columns
6. `00006` through `00010` — Dispatch and template enhancements
7. `00011_event_types_soft_delete.sql` — Soft delete (is_active) on event_types
8. `00012_event_host_family.sql` — Host family with expiration on events table

## License

Private — Christ Church of India, San Ramon
