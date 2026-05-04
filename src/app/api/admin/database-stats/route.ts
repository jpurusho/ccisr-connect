import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const token = authHeader.slice(7)

  const adminClient = createClient(supabaseUrl, supabaseServiceKey)

  const { data: { user }, error: userErr } = await adminClient.auth.getUser(token)
  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: caller } = await adminClient
    .from("app_users")
    .select("role")
    .eq("id", user.id)
    .single()

  if (caller?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    // Table stats: row counts, sizes, last modification
    const { data: tableStats, error: tableErr } = await adminClient.rpc("get_table_stats")

    if (tableErr) {
      // Fallback: query tables individually if RPC doesn't exist
      const tables = [
        "families", "members", "member_tags", "tags", "addresses",
        "wedding_anniversaries", "event_types", "events", "event_instances",
        "email_templates", "composed_instances", "dispatch_queue",
        "mailing_lists", "mailing_list_members", "smtp_configs",
        "app_users", "audit_log",
      ]

      const stats = []
      for (const table of tables) {
        const { count } = await adminClient
          .from(table)
          .select("*", { count: "exact", head: true })
        stats.push({ table_name: table, row_count: count ?? 0 })
      }

      // Get database size via raw SQL
      const { data: dbSize } = await adminClient
        .rpc("get_db_size")
        .returns<{ size: string }[]>()
        .single()

      return NextResponse.json({
        tables: stats,
        dbSize: (dbSize as { size?: string } | null)?.size ?? null,
        method: "fallback",
      })
    }

    return NextResponse.json({
      tables: tableStats,
      method: "rpc",
    })
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const token = authHeader.slice(7)

  const adminClient = createClient(supabaseUrl, supabaseServiceKey)

  const { data: { user }, error: userErr } = await adminClient.auth.getUser(token)
  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: caller } = await adminClient
    .from("app_users")
    .select("role")
    .eq("id", user.id)
    .single()

  if (caller?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { table } = await req.json()
    if (!table || typeof table !== "string") {
      return NextResponse.json({ error: "Table name required" }, { status: 400 })
    }

    // Get column info from information_schema
    const { data: columns, error } = await adminClient
      .from("information_schema.columns" as never)
      .select("column_name, data_type, is_nullable, column_default, character_maximum_length")
      .eq("table_schema", "public")
      .eq("table_name", table)
      .order("ordinal_position")

    if (error) {
      // Fallback: use raw SQL via RPC
      return NextResponse.json({ columns: [], error: error.message })
    }

    return NextResponse.json({ columns: columns ?? [] })
  } catch {
    return NextResponse.json({ error: "Failed to fetch schema" }, { status: 500 })
  }
}
