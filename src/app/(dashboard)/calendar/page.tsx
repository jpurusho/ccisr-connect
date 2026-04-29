"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import {
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
  getMonth,
} from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { WeekView } from "@/components/calendar/week-view"
import { MonthView, DayDetailPanel } from "@/components/calendar/month-view"
import { EventDetailDialog } from "@/components/calendar/event-detail-dialog"
import type { CalendarEvent } from "@/components/calendar/types"
import type {
  EventInstance,
  Event,
  EventType,
  Member,
  WeddingAnniversary,
  Family,
  Address,
  DispatchStatus,
} from "@/types/database"
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Send,
} from "lucide-react"

// Default fallback color for events without a color_scheme
const DEFAULT_EVENT_COLOR = "#0d9488"

export default function CalendarPage() {
  const [view, setView] = useState<"week" | "month">("week")
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  // Compute the visible date range based on view
  const visibleRange = useMemo(() => {
    if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 })
      const end = endOfWeek(currentDate, { weekStartsOn: 0 })
      return { start, end }
    }
    // Month view: include prev/next month days in the grid
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const start = startOfWeek(monthStart, { weekStartsOn: 0 })
    const end = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return { start, end }
  }, [currentDate, view])

  const days = useMemo(
    () => eachDayOfInterval({ start: visibleRange.start, end: visibleRange.end }),
    [visibleRange]
  )

  // Compute which months are visible (for birthday/anniversary queries)
  const visibleMonths = useMemo(() => {
    const months = new Set<number>()
    days.forEach((d) => months.add(getMonth(d) + 1)) // 1-indexed
    return Array.from(months)
  }, [days])

  // Fetch data whenever the visible range changes
  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const startStr = format(visibleRange.start, "yyyy-MM-dd")
    const endStr = format(visibleRange.end, "yyyy-MM-dd")

    // Fire all queries in parallel
    const [
      instancesResult,
      eventsResult,
      eventTypesResult,
      birthdaysResult,
      anniversariesResult,
      dispatchesResult,
    ] = await Promise.all([
      // Event instances in date range
      supabase
        .from("event_instances")
        .select("*")
        .gte("instance_date", startStr)
        .lte("instance_date", endStr)
        .neq("status", "cancelled"),

      // All active events (small table, needed for join data)
      supabase.from("events").select("*").eq("is_active", true),

      // All event types (small table)
      supabase.from("event_types").select("*"),

      // Birthdays: members with birth_month in visible months
      supabase
        .from("members")
        .select("id, full_name, birth_month, birth_day")
        .eq("is_active", true)
        .not("birth_month", "is", null)
        .not("birth_day", "is", null)
        .in("birth_month", visibleMonths),

      // Anniversaries in visible months
      supabase
        .from("wedding_anniversaries")
        .select(
          "id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day"
        )
        .in("anniversary_month", visibleMonths),

      // Dispatches in date range
      supabase
        .from("dispatch_queue")
        .select("id, subject, status, template_type, scheduled_at, created_at")
        .not("status", "eq", "cancelled")
        .gte("created_at", startStr)
        .lte("created_at", endStr + "T23:59:59")
        .order("created_at", { ascending: false })
        .returns<{ id: string; subject: string; status: DispatchStatus; template_type: string | null; scheduled_at: string | null; created_at: string }[]>(),
    ])

    const instances = (instancesResult.data ?? []) as EventInstance[]
    const eventsData = (eventsResult.data ?? []) as Event[]
    const eventTypes = (eventTypesResult.data ?? []) as EventType[]
    const birthdays = (birthdaysResult.data ?? []) as Member[]
    const anniversaries = (anniversariesResult.data ?? []) as WeddingAnniversary[]
    const dispatches = dispatchesResult.data ?? []

    // Build lookup maps
    const eventsMap = new Map(eventsData.map((e) => [e.id, e]))
    const typesMap = new Map(eventTypes.map((t) => [t.id, t]))

    // For instances with host families, fetch family + address info
    const hostFamilyIds = [
      ...new Set(
        instances
          .map((i) => i.host_family_id)
          .filter((id): id is string => id !== null)
      ),
    ]

    let familiesMap = new Map<string, Family>()
    let addressMap = new Map<string, Address>()

    if (hostFamilyIds.length > 0) {
      const [familiesResult, addressesResult] = await Promise.all([
        supabase
          .from("families")
          .select("*")
          .in("id", hostFamilyIds),
        supabase
          .from("addresses")
          .select("*")
          .in("family_id", hostFamilyIds)
          .eq("is_current", true),
      ])
      familiesMap = new Map(
        (familiesResult.data ?? []).map((f: Family) => [f.id, f])
      )
      addressMap = new Map(
        (addressesResult.data ?? []).map((a: Address) => [a.family_id, a])
      )
    }

    // For anniversaries, fetch member names
    const annMemberIds = [
      ...new Set(
        anniversaries.flatMap((a) => [a.husband_member_id, a.wife_member_id])
      ),
    ]
    let annMembersMap = new Map<string, Member>()
    if (annMemberIds.length > 0) {
      const { data: annMembers } = await supabase
        .from("members")
        .select("*")
        .in("id", annMemberIds)
      annMembersMap = new Map(
        (annMembers ?? []).map((m: Member) => [m.id, m])
      )
    }

    // Build CalendarEvents from instances
    const calEvents: CalendarEvent[] = []

    for (const instance of instances) {
      const event = eventsMap.get(instance.event_id)
      if (!event) continue
      const eventType = typesMap.get(event.event_type_id)
      const color = eventType?.color_scheme?.primary ?? DEFAULT_EVENT_COLOR
      const hostFam = instance.host_family_id
        ? familiesMap.get(instance.host_family_id)
        : null
      const hostAddr = instance.host_family_id
        ? addressMap.get(instance.host_family_id)
        : null

      calEvents.push({
        id: instance.id,
        kind: "event",
        title: event.title,
        date: new Date(instance.instance_date + "T00:00:00"),
        color,
        time: instance.instance_time ?? event.default_time ?? null,
        status: instance.status,
        eventTypeName: eventType?.name ?? null,
        description: event.description,
        notes: instance.notes,
        zoomLink: event.zoom_link,
        location: instance.location_override,
        hostFamily: hostFam
          ? {
              name: hostFam.family_name,
              address: hostAddr?.full_address ?? null,
            }
          : null,
      })
    }

    // Build CalendarEvents from birthdays
    const currentYear = currentDate.getFullYear()
    for (const member of birthdays) {
      if (!member.birth_month || !member.birth_day) continue

      // Build the date for this year in the visible range
      // We need to check if this birthday falls within the visible range
      const birthdayDate = new Date(
        currentYear,
        member.birth_month - 1,
        member.birth_day
      )

      // Check the date is actually in range
      if (
        days.some((d) => isSameDay(d, birthdayDate))
      ) {
        calEvents.push({
          id: `birthday-${member.id}`,
          kind: "birthday",
          title: `${member.full_name}'s Birthday`,
          date: birthdayDate,
          color: "#9333ea", // purple-600
        })
      }
    }

    // Build CalendarEvents from anniversaries
    for (const ann of anniversaries) {
      const husband = annMembersMap.get(ann.husband_member_id)
      const wife = annMembersMap.get(ann.wife_member_id)
      if (!husband || !wife) continue

      const annDate = new Date(
        currentYear,
        ann.anniversary_month - 1,
        ann.anniversary_day
      )

      if (days.some((d) => isSameDay(d, annDate))) {
        const husbandFirst = husband.first_name ?? husband.full_name
        const wifeFirst = wife.first_name ?? wife.full_name
        calEvents.push({
          id: `anniversary-${ann.id}`,
          kind: "anniversary",
          title: `${husbandFirst} & ${wifeFirst}'s Anniversary`,
          date: annDate,
          color: "#d97706", // amber-600
        })
      }
    }

    // Build CalendarEvents from dispatches
    const DISPATCH_COLORS: Record<string, string> = {
      birthday: "#7C3AED",
      anniversary: "#D97706",
      bible_study: "#0D9488",
      womens_study: "#DB2777",
      prayer_meeting: "#059669",
      bulletin: "#4F46E5",
    }
    const DISPATCH_LABELS: Record<string, string> = {
      birthday: "Birthday Email",
      anniversary: "Anniversary Email",
      bible_study: "Bible Study Email",
      womens_study: "Women's Study Email",
      prayer_meeting: "Prayer Meeting Email",
      bulletin: "Bulletin Email",
    }

    for (const d of dispatches) {
      const dispatchDate = d.scheduled_at ? new Date(d.scheduled_at) : new Date(d.created_at)
      if (days.some((day) => isSameDay(day, dispatchDate))) {
        const typeLabel = d.template_type ? DISPATCH_LABELS[d.template_type] : null
        calEvents.push({
          id: `dispatch-${d.id}`,
          kind: "dispatch",
          title: typeLabel || d.subject,
          date: dispatchDate,
          color: (d.template_type && DISPATCH_COLORS[d.template_type]) || "#6B7280",
          description: d.subject,
          dispatchStatus: d.status,
          templateType: d.template_type,
        })
      }
    }

    // Sort by date, then time
    calEvents.sort((a, b) => {
      const dateDiff = a.date.getTime() - b.date.getTime()
      if (dateDiff !== 0) return dateDiff
      const kindOrder = { event: 0, dispatch: 1, birthday: 2, anniversary: 3 }
      return kindOrder[a.kind] - kindOrder[b.kind]
    })

    setEvents(calEvents)
    setLoading(false)
  }, [visibleRange, visibleMonths, currentDate, days])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Navigation handlers
  function goToday() {
    setCurrentDate(new Date())
    setSelectedDay(null)
  }

  function goPrev() {
    setSelectedDay(null)
    if (view === "week") {
      setCurrentDate((d) => subWeeks(d, 1))
    } else {
      setCurrentDate((d) => subMonths(d, 1))
    }
  }

  function goNext() {
    setSelectedDay(null)
    if (view === "week") {
      setCurrentDate((d) => addWeeks(d, 1))
    } else {
      setCurrentDate((d) => addMonths(d, 1))
    }
  }

  function handleEventClick(event: CalendarEvent) {
    setSelectedEvent(event)
    setDialogOpen(true)
  }

  function handleDayClick(day: Date) {
    setSelectedDay((prev) => (prev && isSameDay(prev, day) ? null : day))
  }

  // Title for the header
  const headerTitle = useMemo(() => {
    if (view === "week") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 })
      const startMonth = format(weekStart, "MMM")
      const endMonth = format(weekEnd, "MMM")
      const year = format(weekEnd, "yyyy")
      if (startMonth === endMonth) {
        return `${startMonth} ${format(weekStart, "d")} - ${format(weekEnd, "d")}, ${year}`
      }
      return `${startMonth} ${format(weekStart, "d")} - ${endMonth} ${format(weekEnd, "d")}, ${year}`
    }
    return format(currentDate, "MMMM yyyy")
  }, [currentDate, view])

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">
            Events, birthdays, and anniversaries
          </p>
        </div>
      </div>

      {/* Toolbar: nav + view toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <div className="flex items-center">
            <Button variant="ghost" size="icon-sm" onClick={goPrev}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={goNext}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <h2 className="text-lg font-semibold">{headerTitle}</h2>
        </div>

        {/* View toggle */}
        <Tabs
          value={view}
          onValueChange={(val) => {
            setView(val as "week" | "month")
            setSelectedDay(null)
          }}
        >
          <TabsList>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-purple-500" />
          Birthdays
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-amber-500" />
          Anniversaries
        </div>
        <div className="flex items-center gap-1.5">
          <CalendarDays className="size-3 text-muted-foreground" />
          Events
        </div>
        <div className="flex items-center gap-1.5">
          <Send className="size-3 text-muted-foreground" />
          Dispatches
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <CalendarSkeleton view={view} />
      ) : (
        <>
          {/* Week view */}
          {view === "week" && (
            <WeekView
              days={days}
              events={events}
              onEventClick={handleEventClick}
            />
          )}

          {/* Month view */}
          {view === "month" && (
            <>
              <MonthView
                currentDate={currentDate}
                events={events}
                onDayClick={handleDayClick}
                selectedDay={selectedDay}
                onEventClick={handleEventClick}
              />
              {selectedDay && (
                <DayDetailPanel
                  day={selectedDay}
                  events={events}
                  onEventClick={handleEventClick}
                  onClose={() => setSelectedDay(null)}
                />
              )}
            </>
          )}
        </>
      )}

      {/* Event detail dialog */}
      <EventDetailDialog
        event={selectedEvent}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}

/** Loading skeleton for the calendar */
function CalendarSkeleton({ view }: { view: "week" | "month" }) {
  if (view === "week") {
    return (
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-border ring-1 ring-border sm:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex min-h-[180px] flex-col bg-card p-2">
            <div className="mb-3 flex items-center gap-1.5">
              <div className="h-3 w-6 animate-pulse rounded bg-muted" />
              <div className="size-7 animate-pulse rounded-full bg-muted" />
            </div>
            <div className="space-y-1.5">
              <div className="h-7 w-full animate-pulse rounded-md bg-muted" />
              <div className="h-7 w-3/4 animate-pulse rounded-md bg-muted" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-border">
      <div className="grid grid-cols-7 border-b bg-muted/50">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="px-2 py-2 text-center">
            <div className="mx-auto h-3 w-6 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-border">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="flex min-h-[72px] flex-col bg-card p-1.5 sm:min-h-[88px] sm:p-2">
            <div className="size-6 animate-pulse rounded-full bg-muted sm:size-7" />
            <div className="mt-1 space-y-0.5">
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
