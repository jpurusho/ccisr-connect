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

  // Rate limiting: per-form configurable limit
  const rateLimit = (form.rate_limit_per_hour as number) || 10
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: recentSubmissions } = await supabase
      .from("signup_responses")
      .select("*", { count: "exact", head: true })
      .eq("form_id", formId)
      .eq("ip_hash", ipHash)
      .gte("created_at", oneHourAgo)

    if ((recentSubmissions ?? 0) >= rateLimit) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 })
    }
  } catch { /* proceed if check fails */ }

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

  // Capacity check for claim_select fields
  const claimFields = fields.filter((f) => f.type === "claim_select") as Extract<SignupFieldConfig, { type: "claim_select" }>[]
  for (const cf of claimFields) {
    const selectedItems = sanitized[cf.id]
    if (!Array.isArray(selectedItems) || selectedItems.length === 0) continue

    const predefinedValues = cf.options.map((o) => o.value)
    const predefinedSelected = selectedItems.filter((item) => predefinedValues.includes(item as string))
    if (predefinedSelected.length === 0) continue

    const { data: existingResponses } = await supabase
      .from("signup_responses")
      .select("data")
      .eq("form_id", formId)
      .returns<{ data: Record<string, unknown> }[]>()

    const claimCounts: Record<string, number> = {}
    for (const r of existingResponses ?? []) {
      const items = r.data[cf.id]
      if (Array.isArray(items)) {
        for (const item of items) {
          if (typeof item === "string") claimCounts[item] = (claimCounts[item] || 0) + 1
        }
      }
    }

    for (const item of predefinedSelected) {
      const opt = cf.options.find((o) => o.value === item)
      if (opt && (claimCounts[item as string] || 0) >= opt.capacity) {
        return NextResponse.json(
          { error: `"${opt.label}" is full (${opt.capacity}/${opt.capacity} claimed)` },
          { status: 409 }
        )
      }
    }
  }

  // Duplicate check
  if (!form.allow_duplicates) {
    const nameField = fields.find((f) => f.type === "member_lookup" || f.type === "text")
    if (nameField) {
      const nameVal = sanitized[nameField.id]
      if (typeof nameVal === "string" && nameVal) {
        const { count: dupCount } = await supabase
          .from("signup_responses")
          .select("*", { count: "exact", head: true })
          .eq("form_id", formId)
          .contains("data", { [nameField.id]: nameVal })

        if ((dupCount ?? 0) > 0) {
          return NextResponse.json({ error: "You have already signed up for this event" }, { status: 409 })
        }
      }
    }
  }

  // Insert response — use validated data + preserve member ID
  const memberId = (sanitized._memberId as string) || null
  const validatedData = { ...result.data, _memberId: memberId ? memberId : undefined }
  const { error: insertErr } = await supabase
    .from("signup_responses")
    .insert({
      form_id: formId,
      member_id: memberId,
      data: validatedData,
      ip_hash: ipHash,
    })

  if (insertErr) {
    return NextResponse.json({ error: "Failed to save response" }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
