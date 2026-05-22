import { createClient } from "@/lib/supabase/client"

export interface EventLocation {
  id: string
  event_id: string
  label: string
  sort_order: number
  is_active: boolean
  host_family_id: string | null
  host_until: string | null
  address: string | null
  city: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

export async function getEventLocations(eventId: string): Promise<EventLocation[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("event_locations")
    .select("*")
    .eq("event_id", eventId)
    .eq("is_active", true)
    .order("sort_order")
    .returns<EventLocation[]>()

  if (error) {
    console.error("getEventLocations error:", error.message)
    return []
  }
  return data ?? []
}

export async function getLocationsByEventType(eventTypeName: string): Promise<EventLocation[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("event_locations")
    .select("*, events!inner(event_type_id, event_types!inner(name))")
    .eq("events.event_types.name", eventTypeName)
    .eq("is_active", true)
    .order("sort_order")
    .returns<EventLocation[]>()

  if (error) {
    console.error("getLocationsByEventType error:", error.message)
    return []
  }
  return data ?? []
}

export interface CreateLocationInput {
  event_id: string
  label: string
  sort_order?: number
  host_family_id?: string | null
  host_until?: string | null
  address?: string | null
  city?: string | null
  phone?: string | null
}

export async function createEventLocation(input: CreateLocationInput): Promise<EventLocation | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("event_locations")
    .insert(input as never)
    .select()
    .single()
    .returns<EventLocation>()

  if (error) {
    console.error("createEventLocation error:", error.message)
    return null
  }
  return data
}

export async function updateEventLocation(
  id: string,
  updates: Partial<Omit<EventLocation, "id" | "event_id" | "created_at" | "updated_at">>
): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from("event_locations")
    .update(updates as never)
    .eq("id", id)

  if (error) {
    console.error("updateEventLocation error:", error.message)
    return false
  }
  return true
}

export async function deleteEventLocation(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from("event_locations")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("deleteEventLocation error:", error.message)
    return false
  }
  return true
}
