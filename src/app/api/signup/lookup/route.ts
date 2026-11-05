import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { SignupFieldConfig } from "@/lib/signup/field-registry"
import { rateLimitByIp, getIpHash } from "@/lib/rate-limit"
import { ApiError } from "@/lib/api-response"
import { getPhoneLast4 } from "@/lib/validation-schemas"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

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
  // Rate limiting: 10 requests per hour per IP
  const rateLimit = rateLimitByIp(req, {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000,
    namespace: "signup-lookup",
  })

  if (!rateLimit.allowed) {
    return ApiError.tooManyRequests("Too many lookup attempts. Please try again later.")
  }

  let body: { formId?: string; phoneLast4?: string }
  try {
    body = await req.json()
  } catch {
    return ApiError.badRequest("Invalid JSON")
  }

  const { formId, phoneLast4 } = body
  if (!formId || !phoneLast4) {
    return ApiError.badRequest("formId and phoneLast4 required")
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const ipHash = getIpHash(req)

  // Fetch form to find the phone field
  const { data: form } = await supabase
    .from("signup_forms")
    .select("fields")
    .eq("id", formId)
    .single()

  if (!form) {
    return ApiError.notFound("Form not found")
  }

  const fields = (form.fields ?? []) as SignupFieldConfig[]
  const phoneField = fields.find((f) => f.type === "phone")

  if (!phoneField) {
    return ApiError.badRequest("This form does not have a phone field")
  }

  // Fetch all responses for this form
  const { data: responses } = await supabase
    .from("signup_responses")
    .select("id, data, member_id")
    .eq("form_id", formId)

  if (!responses || responses.length === 0) {
    return ApiError.notFound("No matching response found")
  }

  // Find response with matching phone last 4 digits
  const inputLast4 = getPhoneLast4(phoneLast4)

  for (const response of responses) {
    const storedPhone = ((response.data as Record<string, unknown>)?.[phoneField.id] as string) || ""
    const storedLast4 = getPhoneLast4(storedPhone)

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

  return ApiError.notFound("No matching response found")
}
