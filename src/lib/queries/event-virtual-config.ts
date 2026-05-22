import { createClient } from "@/lib/supabase/client"

export interface EventVirtualConfig {
  id: string
  event_id: string
  platform: string
  meeting_link: string
  meeting_id: string | null
  passcode: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export async function getVirtualConfig(eventId: string): Promise<EventVirtualConfig | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("event_virtual_config")
    .select("*")
    .eq("event_id", eventId)
    .eq("is_active", true)
    .single()
    .returns<EventVirtualConfig>()

  if (error) {
    if (error.code === "PGRST116") return null
    console.error("getVirtualConfig error:", error.message)
    return null
  }
  return data
}

export interface UpsertVirtualConfigInput {
  event_id: string
  platform?: string
  meeting_link: string
  meeting_id?: string | null
  passcode?: string | null
}

export async function upsertVirtualConfig(input: UpsertVirtualConfigInput): Promise<EventVirtualConfig | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("event_virtual_config")
    .upsert(
      { ...input, platform: input.platform ?? "zoom", is_active: true } as never,
      { onConflict: "event_id" }
    )
    .select()
    .single()
    .returns<EventVirtualConfig>()

  if (error) {
    console.error("upsertVirtualConfig error:", error.message)
    return null
  }
  return data
}

export async function deleteVirtualConfig(eventId: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from("event_virtual_config")
    .delete()
    .eq("event_id", eventId)

  if (error) {
    console.error("deleteVirtualConfig error:", error.message)
    return false
  }
  return true
}
