import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  let body: { responseId?: string; formId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { responseId, formId } = body
  if (!responseId || !formId) {
    return NextResponse.json({ error: "responseId and formId required" }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Verify the response belongs to the form and form is active
  const { data: response } = await supabase
    .from("signup_responses")
    .select("id, form_id")
    .eq("id", responseId)
    .eq("form_id", formId)
    .single()

  if (!response) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
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
