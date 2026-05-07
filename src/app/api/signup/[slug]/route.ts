import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  if (!slug || slug.length < 4) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const isPreview = req.nextUrl.searchParams.get("preview") === "1"
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data: form } = await supabase
    .from("signup_forms")
    .select("id, title, description, theme, fields, status, visibility, member_autocomplete, duration_type, event_date, target_month, target_year, start_date, end_date, max_submissions")
    .eq("slug", slug)
    .single()

  // Allow preview of draft/closed forms with ?preview=1
  if (!form || (!isPreview && form.status !== "active")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Check expiration
  const now = new Date()
  if (form.duration_type === "event_date" && form.event_date) {
    const eventDay = new Date(form.event_date + "T23:59:59")
    if (now > eventDay) {
      return NextResponse.json({ error: "This signup has ended" }, { status: 410 })
    }
  } else if (form.duration_type === "date_range" && form.end_date) {
    const endDay = new Date(form.end_date + "T23:59:59")
    if (now > endDay) {
      return NextResponse.json({ error: "This signup has ended" }, { status: 410 })
    }
  } else if (form.duration_type === "month" && form.target_month && form.target_year) {
    const endOfMonth = new Date(form.target_year, form.target_month, 0, 23, 59, 59)
    if (now > endOfMonth) {
      return NextResponse.json({ error: "This signup has ended" }, { status: 410 })
    }
  }

  // Fetch responses if visibility is public
  let responses: { id: string; data: Record<string, unknown>; created_at: string }[] = []
  if (form.visibility === "public_link") {
    const { data: resps } = await supabase
      .from("signup_responses")
      .select("id, data, created_at")
      .eq("form_id", form.id)
      .order("created_at", { ascending: true })
      .limit(100)

    responses = (resps ?? []) as typeof responses
  }

  return NextResponse.json({
    form: {
      id: form.id,
      title: form.title,
      description: form.description,
      theme: form.theme,
      fields: form.fields,
      visibility: form.visibility,
      member_autocomplete: form.member_autocomplete,
    },
    responses,
    responseCount: responses.length,
  })
}
