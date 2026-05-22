import { createClient } from "@/lib/supabase/client"

export interface EventBreak {
  id: string
  event_id: string
  location_id: string | null
  start_date: string
  end_date: string
  message: string | null
  created_at: string
}

export async function getEventBreaks(eventId: string): Promise<EventBreak[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("event_breaks")
    .select("*")
    .eq("event_id", eventId)
    .order("start_date")
    .returns<EventBreak[]>()

  if (error) {
    console.error("getEventBreaks error:", error.message)
    return []
  }
  return data ?? []
}

export async function getBreaksForLocation(locationId: string): Promise<EventBreak[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("event_breaks")
    .select("*")
    .eq("location_id", locationId)
    .order("start_date")
    .returns<EventBreak[]>()

  if (error) {
    console.error("getBreaksForLocation error:", error.message)
    return []
  }
  return data ?? []
}

export async function getActiveBreaks(eventId: string, date: string): Promise<EventBreak[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("event_breaks")
    .select("*")
    .eq("event_id", eventId)
    .lte("start_date", date)
    .gte("end_date", date)
    .returns<EventBreak[]>()

  if (error) {
    console.error("getActiveBreaks error:", error.message)
    return []
  }
  return data ?? []
}

export interface CreateBreakInput {
  event_id: string
  location_id?: string | null
  start_date: string
  end_date: string
  message?: string | null
}

export async function createEventBreak(input: CreateBreakInput): Promise<EventBreak | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("event_breaks")
    .insert(input as never)
    .select()
    .single()
    .returns<EventBreak>()

  if (error) {
    console.error("createEventBreak error:", error.message)
    return null
  }
  return data
}

export async function updateEventBreak(
  id: string,
  updates: Partial<Omit<EventBreak, "id" | "event_id" | "created_at">>
): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from("event_breaks")
    .update(updates as never)
    .eq("id", id)

  if (error) {
    console.error("updateEventBreak error:", error.message)
    return false
  }
  return true
}

export async function deleteEventBreak(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from("event_breaks")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("deleteEventBreak error:", error.message)
    return false
  }
  return true
}
