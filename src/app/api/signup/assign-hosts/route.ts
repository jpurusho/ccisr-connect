import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface AssignmentRow {
  date: string
  familyId: string
  responseId: string
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { eventId, assignments } = body as { eventId: string; assignments: AssignmentRow[] }

  if (!eventId || !assignments?.length) {
    return NextResponse.json({ error: "eventId and assignments required" }, { status: 400 })
  }

  const results: { created: number; updated: number } = { created: 0, updated: 0 }

  for (const a of assignments) {
    const { data: existing } = await supabase
      .from("event_instances")
      .select("id")
      .eq("event_id", eventId)
      .eq("instance_date", a.date)
      .returns<{ id: string }[]>()
      .single()

    if (existing) {
      await supabase
        .from("event_instances")
        .update({
          host_family_id: a.familyId,
          signup_response_id: a.responseId,
          status: "confirmed",
        } as never)
        .eq("id", existing.id)
      results.updated++
    } else {
      await supabase
        .from("event_instances")
        .insert({
          event_id: eventId,
          instance_date: a.date,
          host_family_id: a.familyId,
          signup_response_id: a.responseId,
          status: "confirmed",
        } as never)
      results.created++
    }

    await supabase
      .from("signup_responses")
      .update({ assigned_at: new Date().toISOString(), assigned_event_id: eventId } as never)
      .eq("id", a.responseId)
  }

  return NextResponse.json({ success: true, ...results })
}
