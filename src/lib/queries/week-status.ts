import { createClient } from "@/lib/supabase/client"

export interface WeekEventStatus {
  event_id: string
  event_title: string
  event_topic: string | null
  event_type_name: string
  instance_id: string
  instance_date: string
  instance_time: string | null
  instance_status: string
  location_id: string | null
  location_label: string | null
  location_sort: number | null
  is_on_break: boolean
  break_message: string | null
  host_family_id: string | null
  host_family_name: string | null
  host_address: string | null
  host_city: string | null
  host_phone: string | null
}

export async function getWeekStatus(weekStart: string, weekEnd: string): Promise<WeekEventStatus[]> {
  const supabase = createClient()
  const { data, error } = await (supabase.rpc as Function)("get_week_status", {
    p_start: weekStart,
    p_end: weekEnd,
  })

  if (error) {
    console.error("get_week_status error:", error.message)
    return []
  }

  return (data ?? []) as WeekEventStatus[]
}

export interface EventLocationStatus {
  locationId: string
  label: string
  isOnBreak: boolean
  breakMessage: string | null
  hostFamilyName: string | null
  hostAddress: string | null
  hostCity: string | null
  hostPhone: string | null
}

export interface WeekEventSummary {
  eventId: string
  eventTitle: string
  eventTopic: string | null
  eventTypeName: string
  instanceId: string
  instanceDate: string
  instanceTime: string | null
  instanceStatus: string
  allOnBreak: boolean
  locations: EventLocationStatus[]
}

export function summarizeWeekStatus(rows: WeekEventStatus[]): WeekEventSummary[] {
  const grouped = new Map<string, WeekEventStatus[]>()

  for (const row of rows) {
    const key = row.instance_id
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(row)
  }

  const summaries: WeekEventSummary[] = []

  for (const [, instanceRows] of grouped) {
    const first = instanceRows[0]
    const locations: EventLocationStatus[] = instanceRows
      .filter((r) => r.location_id)
      .map((r) => ({
        locationId: r.location_id!,
        label: r.location_label!,
        isOnBreak: r.is_on_break,
        breakMessage: r.break_message,
        hostFamilyName: r.host_family_name,
        hostAddress: r.host_address,
        hostCity: r.host_city,
        hostPhone: r.host_phone,
      }))

    const allOnBreak = locations.length > 0 && locations.every((l) => l.isOnBreak)

    summaries.push({
      eventId: first.event_id,
      eventTitle: first.event_title,
      eventTopic: first.event_topic,
      eventTypeName: first.event_type_name,
      instanceId: first.instance_id,
      instanceDate: first.instance_date,
      instanceTime: first.instance_time,
      instanceStatus: first.instance_status,
      allOnBreak,
      locations,
    })
  }

  return summaries
}
