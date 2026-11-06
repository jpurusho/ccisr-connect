import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { requireCsrfToken } from "@/lib/csrf"
import type { UserRole } from "@/types/api"

export async function POST(req: NextRequest) {
  // CSRF protection
  const csrfError = await requireCsrfToken(req)
  if (csrfError) {
    return csrfError
  }

  // Verify the user is authenticated
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Verify caller is admin or super_admin
  const { data: caller, error: roleError } = await supabase
    .from("app_users")
    .select("role, is_active")
    .eq("id", user.id)
    .single()

  if (roleError || !caller) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  if (!caller.is_active) {
    return NextResponse.json({ error: "Account is deactivated" }, { status: 403 })
  }

  if (caller.role !== "super_admin" && caller.role !== "admin") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  }

  // Use admin client for privileged operations
  const adminClient = createAdminClient()

  // Parse and validate request body
  let body: { email?: string; display_name?: string; role?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { email, display_name, role } = body

  if (!email || typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  if (!role || !["super_admin", "admin", "operator"].includes(role)) {
    return NextResponse.json({ error: "Invalid role specified" }, { status: 400 })
  }

  const trimmedEmail = email.trim().toLowerCase()

  // Check if user already exists
  const { data: existingUser } = await adminClient
    .from("app_users")
    .select("id")
    .eq("email", trimmedEmail)
    .single()

  if (existingUser) {
    return NextResponse.json({ error: "User already exists" }, { status: 409 })
  }

  // Create auth user with admin privileges
  const { data: authUser, error: createErr } = await adminClient.auth.admin.createUser({
    email: trimmedEmail,
    email_confirm: true,
    user_metadata: { full_name: display_name?.trim() || trimmedEmail },
  })

  if (createErr || !authUser.user) {
    return NextResponse.json(
      { error: createErr?.message || "Failed to create auth user" },
      { status: 400 }
    )
  }

  // Create app user record
  const { error: insertErr } = await adminClient.from("app_users").insert({
    id: authUser.user.id,
    email: trimmedEmail,
    display_name: display_name?.trim() || null,
    role,
    is_active: true,
  } as never)

  if (insertErr) {
    // Roll back the auth user to avoid orphans
    await adminClient.auth.admin.deleteUser(authUser.user.id)
    return NextResponse.json(
      { error: `Failed to create app user: ${insertErr.message}` },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    user: {
      id: authUser.user.id,
      email: trimmedEmail,
      role,
    }
  })
}
