import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { formId, fieldId, itemValue, newCapacity } = body

  if (!formId || !fieldId || !itemValue || typeof newCapacity !== "number") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  if (newCapacity < 1) {
    return NextResponse.json({ error: "Capacity must be at least 1" }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Fetch form
  const { data: form, error: formErr } = await supabase
    .from("signup_forms")
    .select("id, fields, muted")
    .eq("id", formId)
    .single()

  if (formErr || !form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 })
  }

  if (form.muted) {
    return NextResponse.json({ error: "Form is in read-only mode" }, { status: 403 })
  }

  // Get current claimed count for this item
  const { data: responses } = await supabase
    .from("signup_responses")
    .select("data")
    .eq("form_id", formId)

  let claimedCount = 0
  for (const r of responses ?? []) {
    const items = r.data[fieldId]
    if (Array.isArray(items)) {
      claimedCount += items.filter((i) => i === itemValue).length
    } else if (items && typeof items === "object") {
      const count = (items as Record<string, number>)[itemValue]
      if (typeof count === "number") claimedCount += count
    }
  }

  // Cannot decrease below claimed count
  if (newCapacity < claimedCount) {
    return NextResponse.json(
      { error: `Cannot set capacity below ${claimedCount} (already claimed)` },
      { status: 400 }
    )
  }

  // Update the field's options with new current_capacity
  const fields = form.fields as Array<{
    id: string
    type: string
    options?: Array<{ value: string; label: string; capacity: number; current_capacity?: number }>
  }>

  const field = fields.find((f) => f.id === fieldId)
  if (!field || field.type !== "claim_select" || !field.options) {
    return NextResponse.json({ error: "Field not found or invalid type" }, { status: 404 })
  }

  const option = field.options.find((o) => o.value === itemValue)
  if (!option) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 })
  }

  // Update current_capacity
  option.current_capacity = newCapacity

  // Save updated fields back to form
  const { error: updateErr } = await supabase
    .from("signup_forms")
    .update({ fields })
    .eq("id", formId)

  if (updateErr) {
    return NextResponse.json({ error: "Failed to update capacity" }, { status: 500 })
  }

  return NextResponse.json({ success: true, newCapacity, claimedCount })
}
