# Supabase Provisioning Guide

Follow these steps to set up the cloud infrastructure for CCISR Connect.

## Important: Account Setup

We are using a **separate email account** (not your main GitHub-linked account) for Supabase,
because the GitHub-linked account's 2 free project slots are used by OTS.

This has **no impact** on development or deployment:
- **GitHub** — code stays in your main GitHub account
- **Vercel** — linked to your main GitHub, deploys from pushes
- **Supabase** — accessed via URL + API keys only (env vars) — no GitHub integration needed

---

## Step 1: Create a New Supabase Account

1. Open a **private/incognito** browser window (to avoid session conflicts)
2. Go to [supabase.com](https://supabase.com)
3. Click **Start your project** → **Sign Up**
4. Sign up with your **new/secondary email** (e.g., a dedicated Gmail for church infra)
   - You can sign up with email/password — you do NOT need to use GitHub sign-in
5. Verify the email
6. Create an **Organization**: name it `CCISR`

---

## Step 2: Create Two Projects

Create both projects under the `CCISR` org:

| Project Name | Purpose |
|---|---|
| `ccisr-connect-test` | Development & testing |
| `ccisr-connect-prod` | Production (live church use) |

For each project:
- **Region:** West US (North California) — `us-west-1`
- **Database password:** Choose a strong password and save it securely (you won't share this)
- **Plan:** Free tier

Wait for both projects to finish provisioning (~2 minutes each).

---

## Step 3: Enable Database Extensions

For **each** project (test and prod):

1. In the Supabase dashboard, go to **Database > Extensions**
2. Search for and enable:
   - **`pg_cron`** — for scheduled email dispatch
   - **`pgcrypto`** — for SMTP password encryption

---

## Step 4: Set Up Google OAuth

### 4a. Google Cloud Console Setup

You can use your **main Google account** for this (the Cloud Console project is separate from Supabase).

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project: **"CCISR Connect"** (or use an existing one)
3. Navigate to **APIs & Services > OAuth consent screen**
   - User type: **External**
   - App name: `CCISR Connect`
   - Support email: your main email
   - Authorized domains: `supabase.co`
   - Click **Save and Continue** through all steps
   - **Publish** the app (move from Testing to Production) — or add test users initially
4. Navigate to **APIs & Services > Credentials**
   - Click **Create Credentials > OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Name: `CCISR Connect`
   - Under **Authorized redirect URIs**, add these two URLs:

```
https://<TEST-PROJECT-REF>.supabase.co/auth/v1/callback
https://<PROD-PROJECT-REF>.supabase.co/auth/v1/callback
```

> **Where to find the project ref:** In the Supabase dashboard URL for each project, it's the
> string after `https://supabase.com/dashboard/project/` — something like `abcdefghijklmnop`.
> The redirect URI becomes `https://abcdefghijklmnop.supabase.co/auth/v1/callback`

5. Click **Create** and copy:
   - **Client ID** (looks like `123456789-abc.apps.googleusercontent.com`)
   - **Client Secret** (looks like `GOCSPX-abc123...`)

### 4b. Configure Google Auth in Supabase

For **each** project (test and prod), in the **new Supabase account**:

1. Go to **Authentication > Providers > Google**
2. Toggle **Enable**
3. Paste the **Client ID** and **Client Secret** from step 4a
4. Click **Save**

---

## Step 5: Collect the Values I Need

### From Supabase Dashboard (start with the **test** project)

Go to **Settings > API** and copy:

| Value | Where to Find | Example |
|---|---|---|
| **Project URL** | Under "Project URL" | `https://abcdefgh.supabase.co` |
| **Anon Key** | Under "Project API keys" → `anon` `public` | `eyJhbGciOiJI...` (long JWT) |
| **Service Role Key** | Under "Project API keys" → `service_role` `secret` | `eyJhbGciOiJI...` (long JWT) |

> **Important:** The Service Role Key is a secret — never commit it to git or share publicly.
> It's only used for the data migration script and admin operations.

### Your Info

| Value | What I Need |
|---|---|
| **Your Google email** | The email you'll use to **sign into the app** (this is your main Gmail — the app uses Google OAuth for login, which is separate from the Supabase account) |

---

## Step 6: Give Me the Values

Once you have everything, provide me with:

```
# Test Environment
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Your admin email (your main Google account — used to sign into the app)
ADMIN_EMAIL=your.email@gmail.com
```

I will then:
1. Create the `.env.local` file (git-ignored, stays local only)
2. Run the SQL migration to create all 16 tables
3. Insert you as the first super_admin user
4. Run the data migration to import your Excel data
5. Start the app locally with `npm run dev`

---

## Deployment (Later)

When ready to deploy:
- **Vercel** — linked to your **main GitHub account**, deploys from pushes
- Vercel environment variables point to the prod Supabase (URL + keys from prod project)
- Preview deployments point to the test Supabase
- Supabase account ownership is irrelevant to this — Vercel just needs the URL + keys

---

## Summary: Which Account Does What

| Service | Account | Purpose |
|---|---|---|
| **GitHub** | Main account | Code repository, CI/CD |
| **Vercel** | Main account (linked to GitHub) | Hosting, deployment |
| **Supabase** | New/secondary email | Database, auth, edge functions |
| **Google Cloud Console** | Main account | OAuth credentials for app login |
| **App login (Google OAuth)** | Main account | You sign into the app with your main Gmail |

There is no hard coupling between these services. They communicate via API keys and environment variables.

---

## Estimated Time

| Step | Time |
|---|---|
| Create new Supabase account + 2 projects | 5 min |
| Enable extensions | 2 min |
| Google OAuth setup | 10 min |
| Collect & share values | 2 min |
| **Total** | **~20 min** |
