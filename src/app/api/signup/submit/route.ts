import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import nodemailer from "nodemailer"
import { buildFormSchema, type SignupFieldConfig } from "@/lib/signup/field-registry"
import { sanitizeFormData } from "@/lib/signup/sanitize"
import { ApiError, successResponse, StatusCode } from "@/lib/api-response"
import { getIpHash } from "@/lib/rate-limit"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  const contentLength = parseInt(req.headers.get("content-length") || "0", 10)
  if (contentLength > 50_000) {
    return ApiError.payloadTooLarge()
  }

  let body: { formId?: string; data?: Record<string, unknown>; honeypot?: string }
  try {
    body = await req.json()
  } catch {
    return ApiError.badRequest("Invalid JSON")
  }

  const { formId, data, honeypot } = body
  if (!formId || !data) {
    return ApiError.badRequest("formId and data are required")
  }

  // Honeypot check — bots fill hidden fields
  if (honeypot) {
    return successResponse({ success: true }, StatusCode.CREATED)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const ipHash = getIpHash(req)

  // Fetch form
  const { data: form, error: formErr } = await supabase
    .from("signup_forms")
    .select("*")
    .eq("id", formId)
    .single()

  if (formErr || !form) {
    return ApiError.notFound("Form not found")
  }

  if (form.status !== "active") {
    return ApiError.gone("This form is no longer accepting responses")
  }

  if (form.muted) {
    return ApiError.forbidden("This form is currently in read-only mode")
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
      return ApiError.tooManyRequests("Too many attempts. Please try again later.")
    }
  } catch { /* proceed if check fails */ }

  // Check max submissions
  if (form.max_submissions) {
    const { count } = await supabase
      .from("signup_responses")
      .select("*", { count: "exact", head: true })
      .eq("form_id", formId)

    if ((count ?? 0) >= form.max_submissions) {
      return ApiError.gone("This form has reached its maximum number of responses")
    }
  }

  // Validate data against form's field schema
  const fields = form.fields as SignupFieldConfig[]
  const schema = buildFormSchema(fields)
  const sanitized = sanitizeFormData(data)
  const result = schema.safeParse(sanitized)

  if (!result.success) {
    const errors = result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }))
    return ApiError.validationFailed("Validation failed", errors)
  }

  // Additional validation: require at least one claim_select item OR notes
  const claimFields = fields.filter((f) => f.type === "claim_select") as Extract<SignupFieldConfig, { type: "claim_select" }>[]
  const notesField = fields.find((f) => f.type === "textarea")

  if (claimFields.length > 0) {
    const hasClaimedItems = claimFields.some((cf) => {
      const val = sanitized[cf.id]
      if (Array.isArray(val) && val.length > 0) return true
      if (val && typeof val === "object" && Object.keys(val).length > 0) return true
      return false
    })

    const hasNotes = notesField && sanitized[notesField.id] && String(sanitized[notesField.id]).trim().length > 0

    if (!hasClaimedItems && !hasNotes) {
      return ApiError.validationFailed("Please select at least one item to bring or fill in the notes field")
    }
  }

  // Capacity and maxSelections check for claim_select fields
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
        return ApiError.validationFailed(`Maximum ${cf.maxSelections} items allowed for "${cf.label}"`)
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
            return ApiError.conflict(`"${opt.label}" only has ${currentCapacity - existingCount} remaining (you requested ${count})`)
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
            return ApiError.conflict(`"${opt.label}" is full (${currentCapacity}/${currentCapacity} claimed)`)
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
          return ApiError.conflict("You have already signed up for this event")
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
    return ApiError.internalError("Failed to save response")
  }

  // Notify (best-effort, don't fail the response)
  if (form.notify_on_submit && form.notify_smtp_config_id) {
    notifyAdmin(supabase, form.title || form.slug, sanitized, fields, form.notify_smtp_config_id, form.notify_mailing_list_id).catch(() => {})
  }

  return successResponse({ success: true }, StatusCode.CREATED)
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
