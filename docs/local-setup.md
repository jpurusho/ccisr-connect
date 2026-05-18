# Local Development Setup

Run CCISR Connect entirely locally with a full mirror of cloud data.

## Prerequisites

- Docker Desktop (running)
- Supabase CLI: `brew install supabase/tap/supabase`
- Node.js 20+

## 1. Start Local Supabase

```bash
npx supabase start
```

Note the output — you'll need the `API URL`, `anon key`, and `service_role key`.

## 2. Apply Schema

```bash
npx supabase db reset
```

Runs all migrations from `supabase/migrations/`.

## 3. Mirror Data from Cloud

```bash
export SUPABASE_SERVICE_KEY="your-cloud-service-role-key"
python3 scripts/sync-data.py --from cloud --to local
```

## 4. Run the App

```bash
# Create local env
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
EOF

npm install
npm run dev
```

App runs at http://localhost:3000 using local Supabase.

## 5. Push Changes Back to Cloud

```bash
export SUPABASE_SERVICE_KEY="your-cloud-service-role-key"
python3 scripts/sync-data.py --from local --to cloud
```

## 6. Stop

```bash
npx supabase stop
```

Data persists in Docker volumes between restarts.
