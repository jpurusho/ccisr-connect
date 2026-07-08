import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createHash } from "crypto"
import nodemailer from "nodemailer"
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

  if (form.muted) {
    return NextResponse.json({ error: "This form is currently in read-only mode" }, { status: 403 })
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

  // Capacity and maxSelections check for claim_select fields
  const claimFields = fields.filter((f) => f.type === "claim_select") as Extract<SignupFieldConfig, { type: "claim_select" }>[]
  for (const cf of claimFields) {
    const selectedItems = sanitized[cf.id]

    // Determine if this is count format (object) or array format
    const isCountFormat = selectedItems && typeof selectedItems === "object" && !Array.isArray(selectedItems)
    const isArrayFormat = Array.isArray(selectedItems)

    if (!isCountFormat && !isArrayFormat) continue
    if (isArrayFormat && (selectedItems as unknown[]).length === 0) continue
    if (isCountFormat && Object.keys(selectedItems as object).length === 0) continue

    // Validate maxSelections
    if (cf.maxSelections) {
      const pickCount = isCountFormat
        ? Object.keys(selectedItems as object).length
        : (selectedItems as unknown[]).length
      if (pickCount > cf.maxSelections) {
        return NextResponse.json(
          { error: `Maximum ${cf.maxSelections} items allowed for "${cf.label}"` },
          { status: 422 }
        )
      }
    }

    // Skip capacity check if admin allows users to increase capacity
    if (cf.allowCapacityIncrease) continue

    const predefinedValues = new Set(cf.options.map((o) => o.value))

    // Get existing claim counts from all responses
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
      } else if (items && typeof items === "object") {
        for (const [item, count] of Object.entries(items)) {
          if (typeof count === "number" && count > 0) {
            claimCounts[item] = (claimCounts[item] || 0) + count
          }
        }
      }
    }

    // Validate capacity for each claimed item
    if (isCountFormat) {
      for (const [item, count] of Object.entries(selectedItems as Record<string, number>)) {
        if (!predefinedValues.has(item)) continue
        const opt = cf.options.find((o) => o.value === item)
        if (opt && typeof count === "number") {
          const currentCapacity = (opt as { current_capacity?: number }).current_capacity ?? opt.capacity
          const existingCount = claimCounts[item] || 0
          if (existingCount + count > currentCapacity) {
            return NextResponse.json(
              { error: `"${opt.label}" only has ${currentCapacity - existingCount} remaining (you requested ${count})` },
              { status: 409 }
            )
          }
        }
      }
    } else {
      for (const item of selectedItems as string[]) {
        if (!predefinedValues.has(item as string)) continue
        const opt = cf.options.find((o) => o.value === item)
        if (opt) {
          const currentCapacity = (opt as { current_capacity?: number }).current_capacity ?? opt.capacity
          if ((claimCounts[item as string] || 0) >= currentCapacity) {
            return NextResponse.json(
              { error: `"${opt.label}" is full (${currentCapacity}/${currentCapacity} claimed)` },
              { status: 409 }
            )
          }
        }
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

  // Notify (best-effort, don't fail the response)
  if (form.notify_on_submit && form.notify_smtp_config_id) {
    notifyAdmin(supabase, form.title || form.slug, sanitized, fields, form.notify_smtp_config_id, form.notify_mailing_list_id).catch(() => {})
  }

  return NextResponse.json({ success: true }, { status: 201 })
}

interface SmtpRow { host: string; port: number; username: string; encrypted_password: string; from_name: string | null; from_email: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function notifyAdmin(
  supabase: any,
  formTitle: string,
  data: Record<string, unknown>,
  fields: SignupFieldConfig[],
  smtpConfigId: string,
  mailingListId: string | null
) {
  const { data: smtpRaw } = await supabase
    .from("smtp_configs")
    .select("*")
    .eq("id", smtpConfigId)
    .single()
  const smtp = smtpRaw as unknown as SmtpRow | null
  if (!smtp) return

  // Get recipients: from mailing list or fallback to admins
  let recipients: string[] = []
  if (mailingListId) {
    const { data: members } = await supabase
      .from("mailing_list_members")
      .select("email")
      .eq("mailing_list_id", mailingListId)
    recipients = (members ?? []).map((m: { email: string }) => m.email).filter(Boolean)
  }
  if (recipients.length === 0) {
    const { data: admins } = await supabase
      .from("app_users")
      .select("email")
      .in("role", ["super_admin", "admin"])
      .limit(5)
    recipients = (admins ?? []).map((a: { email: string }) => a.email).filter(Boolean)
  }
  if (recipients.length === 0) return

  const nameField = fields.find((f) => f.type === "member_lookup" || f.type === "text")
  const submitterName = nameField ? (data[nameField.id] as string) || "Someone" : "Someone"

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.username, pass: smtp.encrypted_password },
  })

  await transporter.sendMail({
    from: smtp.from_name ? `"${smtp.from_name}" <${smtp.from_email}>` : smtp.from_email,
    to: recipients.join(", "),
    subject: `New Signup: ${formTitle}`,
    text: `${submitterName} signed up for "${formTitle}".\n\nView responses in CCISR Connect → Signups.`,
  })
}
