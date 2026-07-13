import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createHash } from "crypto"
import { buildFormSchema, type SignupFieldConfig } from "@/lib/signup/field-registry"
import { sanitizeFormData } from "@/lib/signup/sanitize"

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

// Audit log helper
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

// Calculate field-level changes for audit log
function calculateChanges(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>,
  fields: SignupFieldConfig[]
): Record<string, { from: unknown; to: unknown; label: string }> {
  const changes: Record<string, { from: unknown; to: unknown; label: string }> = {}

  for (const field of fields) {
    const oldVal = oldData[field.id]
    const newVal = newData[field.id]

    // Compare values (deep comparison for objects/arrays)
    const oldJson = JSON.stringify(oldVal)
    const newJson = JSON.stringify(newVal)

    if (oldJson !== newJson) {
      changes[field.id] = {
        from: oldVal,
        to: newVal,
        label: field.label,
      }
    }
  }

  return changes
}

export async function POST(req: NextRequest) {
  let body: { responseId?: string; formId?: string; data?: Record<string, unknown>; phoneLast4?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { responseId, formId, data, phoneLast4 } = body
  if (!responseId || !formId || !data) {
    return NextResponse.json({ error: "responseId, formId, and data required" }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const ipHash = hashIp(req)

  // Check rate limiting
  const rateLimit = await checkRateLimit(supabase, ipHash, formId)
  if (!rateLimit.allowed) {
    await logAttempt(supabase, ipHash, formId, false)
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 }
    )
  }

  // Fetch the existing response with its data and member_id
  const { data: response } = await supabase
    .from("signup_responses")
    .select("id, form_id, data, member_id")
    .eq("id", responseId)
    .eq("form_id", formId)
    .single()

  if (!response) {
    return NextResponse.json({ error: "Response not found" }, { status: 404 })
  }

  // Fetch form to find the phone field and check muted status
  const { data: form } = await supabase
    .from("signup_forms")
    .select("fields, muted, title, allow_duplicates")
    .eq("id", formId)
    .single()

  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 })
  }

  // Check if form is muted (read-only mode)
  if (form.muted) {
    await logAttempt(supabase, ipHash, formId, false)
    return NextResponse.json({ error: "This form is currently in read-only mode" }, { status: 403 })
  }

  // Server-side phone verification — match last 4 digits
  let verificationMethod = "none"
  if (phoneLast4) {
    const fields = (form.fields ?? []) as SignupFieldConfig[]
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
  } else {
    // If form has a phone field but no phoneLast4 provided, reject
    const fields = (form.fields ?? []) as SignupFieldConfig[]
    const phoneField = fields.find((f) => f.type === "phone")
    if (phoneField) {
      const storedPhone = ((response.data as Record<string, unknown>)?.[phoneField.id] as string) || ""
      if (storedPhone) {
        await logAttempt(supabase, ipHash, formId, false)
        return NextResponse.json({ error: "Phone verification required" }, { status: 403 })
      }
    }
  }

  // Validate new data against form's field schema
  const fields = form.fields as SignupFieldConfig[]
  const schema = buildFormSchema(fields)
  const sanitized = sanitizeFormData(data)
  const result = schema.safeParse(sanitized)

  if (!result.success) {
    const errors = result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }))
    return NextResponse.json({ error: "Validation failed", errors }, { status: 422 })
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
      return NextResponse.json(
        { error: "Please select at least one item to bring or fill in the notes field" },
        { status: 422 }
      )
    }
  }

  // Capacity and maxSelections check for claim_select fields
  for (const cf of claimFields) {
    const selectedItems = sanitized[cf.id]
    const oldItems = response.data[cf.id]

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

    // Get existing claim counts from all OTHER responses (exclude this one)
    const { data: existingResponses } = await supabase
      .from("signup_responses")
      .select("data")
      .eq("form_id", formId)
      .neq("id", responseId) // Exclude current response
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

  // Duplicate check (only if name changed and allow_duplicates is false)
  if (!form.allow_duplicates) {
    const nameField = fields.find((f) => f.type === "member_lookup" || f.type === "text")
    if (nameField) {
      const oldNameVal = response.data[nameField.id]
      const newNameVal = sanitized[nameField.id]

      // Only check if name changed
      if (oldNameVal !== newNameVal && typeof newNameVal === "string" && newNameVal) {
        const { count: dupCount } = await supabase
          .from("signup_responses")
          .select("*", { count: "exact", head: true })
          .eq("form_id", formId)
          .neq("id", responseId) // Exclude current response
          .contains("data", { [nameField.id]: newNameVal })

        if ((dupCount ?? 0) > 0) {
          return NextResponse.json({ error: "A signup with this name already exists" }, { status: 409 })
        }
      }
    }
  }

  // Calculate field-level changes
  const fieldChanges = calculateChanges(response.data as Record<string, unknown>, sanitized, fields)

  // Log to audit trail BEFORE update
  await logAudit(supabase, "signup_response_updated", "signup_responses", responseId, {
    formId,
    formTitle: form?.title || "Unknown",
    ipHash,
    verificationMethod,
    memberId: response.member_id, // Track if this was a member-linked response
    changes: fieldChanges,
    updatedAt: new Date().toISOString(),
  })

  // Preserve member ID from original response
  const memberId = response.member_id || (sanitized._memberId as string) || null
  const validatedData = { ...result.data, _memberId: memberId ? memberId : undefined }

  // Perform the update (preserve created_at)
  const { error: updateErr } = await supabase
    .from("signup_responses")
    .update({
      data: validatedData,
      member_id: memberId,
    })
    .eq("id", responseId)

  if (updateErr) {
    await logAttempt(supabase, ipHash, formId, false)
    return NextResponse.json({ error: "Failed to update response" }, { status: 500 })
  }

  // Log successful attempt
  await logAttempt(supabase, ipHash, formId, true)

  return NextResponse.json({ success: true })
}
