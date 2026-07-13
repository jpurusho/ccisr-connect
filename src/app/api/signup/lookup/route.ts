import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createHash } from "crypto"
import type { SignupFieldConfig } from "@/lib/signup/field-registry"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Hash IP address for rate limiting
function hashIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0] : req.headers.get("x-real-ip") || "unknown"
  return createHash("sha256").update(ip + process.env.IP_SALT || "default-salt").digest("hex").slice(0, 16)
}

// Check rate limiting: max 10 lookup attempts per hour per IP per form
async function checkRateLimit(supabase: any, ipHash: string, formId: string): Promise<{ allowed: boolean }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from("signup_remove_attempts")
    .select("id")
    .eq("ip_hash", ipHash)
    .eq("form_id", formId)
    .gte("attempted_at", oneHourAgo)

  const attempts = data?.length || 0
  return { allowed: attempts < 10 }
}

// Log lookup attempt (reuse same table as remove attempts)
async function logAttempt(supabase: any, ipHash: string, formId: string) {
  await supabase.from("signup_remove_attempts").insert({
    ip_hash: ipHash,
    form_id: formId,
    success: true,
    attempted_at: new Date().toISOString(),
  } as never)
}

export async function POST(req: NextRequest) {
  let body: { formId?: string; phoneLast4?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { formId, phoneLast4 } = body
  if (!formId || !phoneLast4) {
    return NextResponse.json({ error: "formId and phoneLast4 required" }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const ipHash = hashIp(req)

  // Check rate limiting
  const rateLimit = await checkRateLimit(supabase, ipHash, formId)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many lookup attempts. Please try again later." },
      { status: 429 }
    )
  }

  // Fetch form to find the phone field
  const { data: form } = await supabase
    .from("signup_forms")
    .select("fields")
    .eq("id", formId)
    .single()

  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 })
  }

  const fields = (form.fields ?? []) as SignupFieldConfig[]
  const phoneField = fields.find((f) => f.type === "phone")

  if (!phoneField) {
    return NextResponse.json({ error: "This form does not have a phone field" }, { status: 400 })
  }

  // Fetch all responses for this form
  const { data: responses } = await supabase
    .from("signup_responses")
    .select("id, data, member_id")
    .eq("form_id", formId)

  if (!responses || responses.length === 0) {
    return NextResponse.json({ error: "No matching response found" }, { status: 404 })
  }

  // Find response with matching phone last 4 digits
  const inputLast4 = phoneLast4.replace(/\D/g, "").slice(-4)

  for (const response of responses) {
    const storedPhone = ((response.data as Record<string, unknown>)?.[phoneField.id] as string) || ""
    const storedLast4 = storedPhone.replace(/\D/g, "").slice(-4)

    if (storedLast4 === inputLast4) {
      // Log successful lookup
      await logAttempt(supabase, ipHash, formId)

      // Return response data (sanitized - don't send full phone number back)
      return NextResponse.json({
        responseId: response.id,
        data: response.data,
        memberId: response.member_id,
      })
    }
  }

  return NextResponse.json({ error: "No matching response found" }, { status: 404 })
}
