import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createHash } from "crypto"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Hash IP address for privacy-preserving audit logs
function hashIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0] : req.headers.get("x-real-ip") || "unknown"
  return createHash("sha256").update(ip + process.env.IP_SALT || "default-salt").digest("hex").slice(0, 16)
}

// Check rate limiting: max 5 attempts per hour per IP per form
async function checkRateLimit(supabase: any, ipHash: string, formId: string): Promise<{ allowed: boolean; attempts: number }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from("signup_remove_attempts")
    .select("id")
    .eq("ip_hash", ipHash)
    .eq("form_id", formId)
    .gte("attempted_at", oneHourAgo)

  const attempts = data?.length || 0
  return { allowed: attempts < 5, attempts }
}

// Log attempt for rate limiting
async function logAttempt(supabase: any, ipHash: string, formId: string, success: boolean) {
  await supabase.from("signup_remove_attempts").insert({
    ip_hash: ipHash,
    form_id: formId,
    success,
    attempted_at: new Date().toISOString(),
  } as never)
}

// Audit log helper (client-compatible version)
async function logAudit(
  supabase: any,
  action: string,
  entityType: string,
  entityId: string | null,
  changes: Record<string, unknown> | null
) {
  try {
    await supabase.from("audit_log").insert({
      user_id: null, // User-facing action, no authenticated user
      action,
      entity_type: entityType,
      entity_id: entityId,
      changes: changes || null,
    } as never)
  } catch (err) {
    console.error("Failed to write audit log:", action, entityType, err)
  }
}

export async function POST(req: NextRequest) {
  let body: { responseId?: string; formId?: string; phoneLast4?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { responseId, formId, phoneLast4 } = body
  if (!responseId || !formId) {
    return NextResponse.json({ error: "responseId and formId required" }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const ipHash = hashIp(req)

  // Check rate limiting
  const rateLimit = await checkRateLimit(supabase, ipHash, formId)
  if (!rateLimit.allowed) {
    await logAttempt(supabase, ipHash, formId, false)
    return NextResponse.json(
      { error: "Too many removal attempts. Please try again later." },
      { status: 429 }
    )
  }

  // Fetch the response with its data
  const { data: response } = await supabase
    .from("signup_responses")
    .select("id, form_id, data")
    .eq("id", responseId)
    .eq("form_id", formId)
    .single()

  if (!response) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Fetch form to find the phone field
  const { data: form } = await supabase
    .from("signup_forms")
    .select("fields")
    .eq("id", formId)
    .single()

  // Server-side phone verification — match last 4 digits
  let verificationMethod = "none"
  if (form && phoneLast4) {
    const fields = (form.fields ?? []) as { id: string; type: string }[]
    const phoneField = fields.find((f) => f.type === "phone")
    if (phoneField) {
      const storedPhone = ((response.data as Record<string, unknown>)?.[phoneField.id] as string) || ""
      const storedLast4 = storedPhone.replace(/\D/g, "").slice(-4)
      const inputLast4 = phoneLast4.replace(/\D/g, "").slice(-4)
      if (storedLast4 && inputLast4 !== storedLast4) {
        await logAttempt(supabase, ipHash, formId, false)
        return NextResponse.json({ error: "Phone verification failed" }, { status: 403 })
      }
      verificationMethod = "phone"
    }
  } else if (form) {
    // If form has a phone field but no phoneLast4 provided, reject
    const fields = (form.fields ?? []) as { id: string; type: string }[]
    const phoneField = fields.find((f) => f.type === "phone")
    if (phoneField) {
      const storedPhone = ((response.data as Record<string, unknown>)?.[phoneField.id] as string) || ""
      if (storedPhone) {
        await logAttempt(supabase, ipHash, formId, false)
        return NextResponse.json({ error: "Phone verification required" }, { status: 403 })
      }
    }
  }

  // Log to audit trail BEFORE deletion (includes full response data for recovery)
  await logAudit(supabase, "signup_response_self_removed", "signup_responses", responseId, {
    formId,
    formTitle: (form as any)?.title || "Unknown",
    ipHash,
    verificationMethod,
    responseData: response.data, // Full snapshot for recovery
    removedAt: new Date().toISOString(),
  })

  // Perform the deletion
  const { error } = await supabase
    .from("signup_responses")
    .delete()
    .eq("id", responseId)

  if (error) {
    await logAttempt(supabase, ipHash, formId, false)
    return NextResponse.json({ error: "Failed to remove" }, { status: 500 })
  }

  // Log successful attempt
  await logAttempt(supabase, ipHash, formId, true)

  return NextResponse.json({ success: true })
}
