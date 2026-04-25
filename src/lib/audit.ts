import { createClient } from "@/lib/supabase/client"

export async function logAudit(
  action: string,
  entityType: string,
  entityId?: string | null,
  changes?: Record<string, unknown> | null
) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    await supabase.from("audit_log").insert({
      user_id: user?.id ?? null,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      changes: changes ?? null,
    } as never)
  } catch {
    console.error("Failed to write audit log:", action, entityType)
  }
}
