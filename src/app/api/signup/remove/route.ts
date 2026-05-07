import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

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
  if (form && phoneLast4) {
    const fields = (form.fields ?? []) as { id: string; type: string }[]
    const phoneField = fields.find((f) => f.type === "phone")
    if (phoneField) {
      const storedPhone = ((response.data as Record<string, unknown>)?.[phoneField.id] as string) || ""
      const storedLast4 = storedPhone.replace(/\D/g, "").slice(-4)
      const inputLast4 = phoneLast4.replace(/\D/g, "").slice(-4)
      if (storedLast4 && inputLast4 !== storedLast4) {
        return NextResponse.json({ error: "Phone verification failed" }, { status: 403 })
      }
    }
  } else if (form) {
    // If form has a phone field but no phoneLast4 provided, reject
    const fields = (form.fields ?? []) as { id: string; type: string }[]
    const phoneField = fields.find((f) => f.type === "phone")
    if (phoneField) {
      const storedPhone = ((response.data as Record<string, unknown>)?.[phoneField.id] as string) || ""
      if (storedPhone) {
        return NextResponse.json({ error: "Phone verification required" }, { status: 403 })
      }
    }
  }

  const { error } = await supabase
    .from("signup_responses")
    .delete()
    .eq("id", responseId)

  if (error) {
    return NextResponse.json({ error: "Failed to remove" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
