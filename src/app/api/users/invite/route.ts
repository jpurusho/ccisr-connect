import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const token = authHeader.slice(7)

  const adminClient = createClient(supabaseUrl, supabaseServiceKey)

  // Verify caller is super_admin
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

  const { email, display_name, role } = await req.json()
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  const { data: authUser, error: createErr } = await adminClient.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: display_name || email },
  })

  if (createErr || !authUser.user) {
    return NextResponse.json(
      { error: createErr?.message || "Failed to create auth user" },
      { status: 400 }
    )
  }

  const { error: insertErr } = await adminClient.from("app_users").insert({
    id: authUser.user.id,
    email,
    display_name: display_name || null,
    role,
    is_active: true,
  } as never)

  if (insertErr) {
    // Roll back the auth user to avoid orphans
    await adminClient.auth.admin.deleteUser(authUser.user.id)
    return NextResponse.json({ error: insertErr.message }, { status: 400 })
  }

  return NextResponse.json({ id: authUser.user.id })
}
