import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing env vars. Run with: npx tsx --env-file=.env.local scripts/run-migration.ts");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  db: { schema: "public" },
});

async function runSQL(sql: string, label: string) {
  console.log(`Running: ${label}...`);
  const { data, error } = await supabase.rpc("exec_sql", { sql_query: sql });
  if (error) {
    // rpc may not exist — fallback to direct fetch
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ sql_query: sql }),
    });
    if (!res.ok) {
      throw new Error(`${label} failed: ${await res.text()}`);
    }
  }
  console.log(`  Done: ${label}`);
}

async function main() {
  const sqlFile = path.resolve(__dirname, "../supabase/migrations/00001_initial_schema.sql");
  const fullSQL = fs.readFileSync(sqlFile, "utf-8");

  // Use the pg_net or direct SQL approach via the SQL editor API
  // Since we can't run raw SQL via PostgREST, we'll use the management API
  const projectRef = SUPABASE_URL.replace("https://", "").replace(".supabase.co", "");

  console.log(`Project ref: ${projectRef}`);
  console.log(`Running migration against: ${SUPABASE_URL}\n`);

  // Use the Supabase SQL API (requires service role key as the access token)
  const res = await fetch(`${SUPABASE_URL}/pg`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: fullSQL }),
  });

  if (res.ok) {
    const result = await res.json();
    console.log("Migration completed successfully!");
    console.log(JSON.stringify(result, null, 2).slice(0, 500));
    return;
  }

  // Try alternative endpoint
  const res2 = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: "GET",
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  console.log("Schema introspection status:", res2.status);

  console.error("\nCould not run SQL directly via API.");
  console.log("\nPlease run the migration manually:");
  console.log("1. Go to Supabase Dashboard > SQL Editor");
  console.log(`2. Open file: ${sqlFile}`);
  console.log("3. Paste the contents and click 'Run'");
  console.log("\nOr use the Supabase CLI:");
  console.log("  npx supabase db push --db-url postgresql://postgres:[PASSWORD]@db.jllqfhwuwoeuavaeoiie.supabase.co:5432/postgres");
}

main().catch(console.error);
