import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createHash } from "crypto"
import { buildFormSchema, type SignupFieldConfig } from "@/lib/signup/field-registry"
import { sanitizeFormData } from "@/lib/signup/sanitize"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const IP_SALT = process.env.SIGNUP_IP_SALT || "ccisr-signup-default-salt"

function hashIp(ip: string): string {
  return createHash("sha256").update(ip + IP_SALT).digest("hex").slice(0, 16)
}

export async function POST(req: NextRequest) {
  const contentLength = parseInt(req.headers.get("content-length") || "0", 10)
  if (contentLength > 50_000) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 })
  }

  let body: { formId?: string; data?: Record<string, unknown>; honeypot?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { formId, data, honeypot } = body
  if (!formId || !data) {
    return NextResponse.json({ error: "formId and data are required" }, { status: 400 })
  }

  // Honeypot check — bots fill hidden fields
  if (honeypot) {
    return NextResponse.json({ success: true }, { status: 201 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const ipHash = hashIp(ip)

  // Rate limiting: max 5 per form per hour, max 20 total per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count: formAttempts } = await supabase
    .from("signup_rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .eq("form_id", formId)
    .gte("attempt_at", oneHourAgo)

  if ((formAttempts ?? 0) >= 5) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 })
  }

  const { count: totalAttempts } = await supabase
    .from("signup_rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("attempt_at", oneHourAgo)

  if ((totalAttempts ?? 0) >= 20) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 })
  }

  // Record attempt
  await supabase.from("signup_rate_limits").insert({ ip_hash: ipHash, form_id: formId })

  // Fetch form
  const { data: form, error: formErr } = await supabase
    .from("signup_forms")
    .select("*")
    .eq("id", formId)
    .single()

  if (formErr || !form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 })
  }

  if (form.status !== "active") {
    return NextResponse.json({ error: "This form is no longer accepting responses" }, { status: 410 })
  }

  // Check max submissions
  if (form.max_submissions) {
    const { count } = await supabase
      .from("signup_responses")
      .select("*", { count: "exact", head: true })
      .eq("form_id", formId)

    if ((count ?? 0) >= form.max_submissions) {
      return NextResponse.json({ error: "This form has reached its maximum number of responses" }, { status: 410 })
    }
  }

  // Validate data against form's field schema
  const fields = form.fields as SignupFieldConfig[]
  const schema = buildFormSchema(fields)
  const sanitized = sanitizeFormData(data)
  const result = schema.safeParse(sanitized)

  if (!result.success) {
    const errors = result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }))
    return NextResponse.json({ error: "Validation failed", errors }, { status: 422 })
  }

  // Duplicate check
  if (!form.allow_duplicates) {
    const nameField = fields.find((f) => f.type === "member_lookup" || f.type === "text")
    if (nameField) {
      const nameVal = sanitized[nameField.id]
      if (typeof nameVal === "string" && nameVal) {
        const { data: existing } = await supabase
          .from("signup_responses")
          .select("id")
          .eq("form_id", formId)
          .limit(1)

        const isDup = (existing ?? []).some((r) => {
          const rData = r as unknown as { id: string }
          return rData.id
        })

        // Check by querying with the name hash in data
        const { count: dupCount } = await supabase
          .from("signup_responses")
          .select("*", { count: "exact", head: true })
          .eq("form_id", formId)
          .contains("data", { [nameField.id]: nameVal })

        if ((dupCount ?? 0) > 0 && !isDup) {
          return NextResponse.json({ error: "You have already signed up for this event" }, { status: 409 })
        }
      }
    }
  }

  // Insert response
  const { error: insertErr } = await supabase
    .from("signup_responses")
    .insert({
      form_id: formId,
      member_id: (sanitized._memberId as string) || null,
      data: sanitized,
      ip_hash: ipHash,
    })

  if (insertErr) {
    return NextResponse.json({ error: "Failed to save response" }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
