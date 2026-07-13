import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = await createClient()

  // Fetch the form to get its ID
  const { data: form } = await supabase
    .from("signup_forms")
    .select("id, title")
    .eq("slug", slug)
    .single()

  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 })
  }

  // Fetch audit logs for removals AND updates related to this form
  const { data: auditLogs } = await supabase
    .from("audit_log")
    .select("id, action, entity_id, changes, created_at")
    .in("action", ["signup_response_self_removed", "signup_response_updated"])
    .eq("entity_type", "signup_responses")
    .order("created_at", { ascending: false })
    .limit(100)

  // Filter by formId in the changes JSONB field
  const relevantLogs = (auditLogs || []).filter(
    (log) => log.changes && (log.changes as any).formId === form.id
  )

  return NextResponse.json({ logs: relevantLogs })
}
