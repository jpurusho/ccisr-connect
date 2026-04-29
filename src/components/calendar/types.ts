import type { EventInstanceStatus, DispatchStatus } from "@/types/database"

export type CalendarEventKind = "event" | "birthday" | "anniversary" | "dispatch"

export type CalendarEvent = {
  id: string
  kind: CalendarEventKind
  title: string
  date: Date
  color: string
  time?: string | null
  status?: EventInstanceStatus | null
  eventTypeName?: string | null
  description?: string | null
  notes?: string | null
  zoomLink?: string | null
  location?: string | null
  hostFamily?: {
    name: string
    address?: string | null
  } | null
  dispatchStatus?: DispatchStatus | null
  templateType?: string | null
}
