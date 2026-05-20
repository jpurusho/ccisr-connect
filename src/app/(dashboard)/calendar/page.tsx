"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import {
  addDays,
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
import { getOccurrences, formatTime, parseRecurrenceRule } from "@/lib/recurrence"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { WeekView } from "@/components/calendar/week-view"
import { MonthView, DayDetailPanel } from "@/components/calendar/month-view"
import { EventDetailDialog } from "@/components/calendar/event-detail-dialog"
import { EventFormDialog } from "@/components/calendar/event-form-dialog"
import { InstanceEditDialog } from "@/components/calendar/instance-edit-dialog"
import { EventTypeManager } from "@/components/calendar/event-type-manager"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
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
import { logAudit } from "@/lib/audit"
import { sanitizeHtml } from "@/lib/sanitize-html"
import { toast } from "sonner"
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Send,
  Plus,
} from "lucide-react"

// Default fallback color for events without a color_scheme
const DEFAULT_EVENT_COLOR = "#0d9488"

export default function CalendarPage() {
  const [view, setView] = useState<"week" | "month" | "agenda">("week")
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  // Event form dialog state
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [formDate, setFormDate] = useState<Date | null>(null)
  const [formEventId, setFormEventId] = useState<string | null>(null)

  // Instance edit dialog state
  const [instanceDialogOpen, setInstanceDialogOpen] = useState(false)
  const [instanceTarget, setInstanceTarget] = useState<{
    eventId: string
    instanceId: string | null
    instanceDate: string
    eventTitle: string
  } | null>(null)

  // Sent email preview state
  const [sentEmailHtml, setSentEmailHtml] = useState<string | null>(null)
  const [sentEmailOpen, setSentEmailOpen] = useState(false)
  const [sentEmailSubject, setSentEmailSubject] = useState("")

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
      customTemplatesResult,
    ] = await Promise.all([
      // Event instances in date range (include cancelled to prevent regeneration)
      supabase
        .from("event_instances")
        .select("*")
        .gte("instance_date", startStr)
        .lte("instance_date", endStr),

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

      // Dispatches: target week in range OR sent during range
      supabase
        .from("dispatch_queue")
        .select("id, subject, status, template_type, scheduled_at, sent_at, created_at, week_start")
        .not("status", "eq", "cancelled")
        .or(`and(week_start.gte.${startStr},week_start.lte.${endStr}),and(sent_at.gte.${startStr},sent_at.lte.${endStr}T23:59:59),and(week_start.is.null,scheduled_at.gte.${startStr},scheduled_at.lte.${endStr}T23:59:59)`)
        .order("created_at", { ascending: false })
        .returns<{ id: string; subject: string; status: DispatchStatus; template_type: string | null; scheduled_at: string | null; sent_at: string | null; created_at: string; week_start: string | null }[]>(),

      // Custom templates (for dispatch label/color mapping)
      supabase
        .from("email_templates")
        .select("id, name, body_template")
        .eq("is_default", false)
        .returns<{ id: string; name: string; body_template: string }[]>(),
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

      // Skip instances past the recurrence UNTIL date
      if (event.recurrence_rule) {
        const parsed = parseRecurrenceRule(event.recurrence_rule)
        if (parsed.until && instance.instance_date > parsed.until) continue
      }

      // Skip cancelled instances from display (but they're still in instanceDates to prevent regeneration)
      if (instance.status === "cancelled") continue

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
        time: formatTime(instance.instance_time ?? event.default_time ?? null) || null,
        status: instance.status,
        eventTypeName: eventType?.name ?? null,
        infoSections: (eventType as EventType & { info_sections?: unknown })?.info_sections as CalendarEvent["infoSections"] ?? undefined,
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
        eventId: event.id,
        eventTypeId: event.event_type_id,
        instanceId: instance.id,
        recurrenceRule: event.recurrence_rule,
        hostFamilyId: instance.host_family_id,
        isRecurrenceGenerated: false,
      })
    }

    // Collect event-level host family IDs for recurrence-generated events
    const eventHostFamilyIds = [
      ...new Set(
        eventsData
          .map((e) => (e as Event & { host_family_id?: string | null }).host_family_id)
          .filter((id): id is string => !!id)
      ),
    ].filter((id) => !familiesMap.has(id))

    if (eventHostFamilyIds.length > 0) {
      const [efRes, eaRes] = await Promise.all([
        supabase.from("families").select("*").in("id", eventHostFamilyIds),
        supabase.from("addresses").select("*").in("family_id", eventHostFamilyIds).eq("is_current", true),
      ])
      for (const f of (efRes.data ?? []) as Family[]) familiesMap.set(f.id, f)
      for (const a of (eaRes.data ?? []) as Address[]) addressMap.set(a.family_id, a)
    }

    // Build CalendarEvents from recurrence rules (for dates without explicit instances)
    const instanceDates = new Set(
      instances.map((i) => `${i.event_id}:${i.instance_date}`)
    )
    const today = new Date()
    for (const event of eventsData) {
      if (!event.recurrence_rule) continue
      const eventType = typesMap.get(event.event_type_id)
      const color = eventType?.color_scheme?.primary ?? DEFAULT_EVENT_COLOR
      const occurrences = getOccurrences(event.recurrence_rule, visibleRange.start, visibleRange.end)

      const evtAny = event as Event & { host_family_id?: string | null; host_until?: string | null }
      const hostExpired = evtAny.host_until ? new Date(evtAny.host_until + "T23:59:59") < today : false
      const hostId = hostExpired ? null : (evtAny.host_family_id ?? null)
      const hostFam = hostId ? familiesMap.get(hostId) : null
      const hostAddr = hostId ? addressMap.get(hostId) : null

      for (const occ of occurrences) {
        const dateStr = format(occ, "yyyy-MM-dd")
        if (instanceDates.has(`${event.id}:${dateStr}`)) continue

        calEvents.push({
          id: `recurring-${event.id}-${dateStr}`,
          kind: "event",
          title: event.title,
          date: occ,
          color,
          time: formatTime(event.default_time) || null,
          status: "confirmed",
          eventTypeName: eventType?.name ?? null,
          infoSections: (eventType as EventType & { info_sections?: unknown })?.info_sections as CalendarEvent["infoSections"] ?? undefined,
          description: event.description,
          hostFamily: hostFam
            ? { name: hostFam.family_name, address: hostAddr?.full_address ?? null }
            : null,
          eventId: event.id,
          eventTypeId: event.event_type_id,
          recurrenceRule: event.recurrence_rule,
          hostFamilyId: hostId,
          hostUntil: evtAny.host_until ?? null,
          isRecurrenceGenerated: true,
        })
      }
    }

    // Build CalendarEvents from date-range events (no recurrence, start_date/end_date set)
    for (const event of eventsData) {
      if (event.recurrence_rule) continue
      const evtAny = event as Event & { start_date?: string | null; end_date?: string | null }
      if (!evtAny.start_date) continue
      const eventType = typesMap.get(event.event_type_id)
      const color = eventType?.color_scheme?.primary ?? DEFAULT_EVENT_COLOR
      const rangeStart = new Date(evtAny.start_date + "T00:00:00")
      const rangeEnd = evtAny.end_date ? new Date(evtAny.end_date + "T00:00:00") : rangeStart
      let d = new Date(rangeStart)
      while (d <= rangeEnd) {
        if (d >= visibleRange.start && d <= visibleRange.end) {
          const dateStr = format(d, "yyyy-MM-dd")
          if (!instanceDates.has(`${event.id}:${dateStr}`)) {
            calEvents.push({
              id: `range-${event.id}-${dateStr}`,
              kind: "event",
              title: event.title,
              date: new Date(d),
              color,
              time: event.default_time ? formatTime(event.default_time) : null,
              status: "confirmed",
              eventTypeName: eventType?.name ?? null,
              infoSections: (eventType as EventType & { info_sections?: unknown })?.info_sections as CalendarEvent["infoSections"] ?? undefined,
              description: event.description,
              eventId: event.id,
              eventTypeId: event.event_type_id,
              isRecurrenceGenerated: true,
            })
          }
        }
        d = addDays(d, 1)
      }
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
          memberId: member.id,
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
          anniversaryId: ann.id,
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
    for (const ct of customTemplatesResult.data ?? []) {
      const ctKey = `custom:${ct.id}`
      let parsed: Record<string, unknown> = {}
      try { parsed = JSON.parse(ct.body_template) } catch { /* ignore */ }
      const linkedEt = eventTypes.find((et) => (et as EventType & { default_template_id?: string }).default_template_id === ct.id)
      DISPATCH_COLORS[ctKey] = (linkedEt?.color_scheme as { primary?: string })?.primary ?? (parsed.primaryColor as string) ?? "#6B7280"
      DISPATCH_LABELS[ctKey] = `${ct.name} Email`
    }

    const seenDispatchIds = new Set<string>()
    for (const d of dispatches) {
      if (seenDispatchIds.has(d.id)) continue
      seenDispatchIds.add(d.id)

      const isSent = d.status === "sent"
      const dispatchDate = isSent && d.sent_at
        ? new Date(d.sent_at)
        : d.week_start ? new Date(d.week_start + "T00:00:00")
        : d.scheduled_at ? new Date(d.scheduled_at)
        : new Date(d.created_at)

      if (days.some((day) => isSameDay(day, dispatchDate))) {
        const typeLabel = d.template_type ? DISPATCH_LABELS[d.template_type] : null
        let title = typeLabel || d.subject
        if (d.week_start) {
          const ws = new Date(d.week_start + "T00:00:00")
          const we = addDays(ws, 6)
          const weekLabel = `${format(ws, "MMM d")}–${format(we, "d")}`
          title = `${title} (${weekLabel})`
        }
        calEvents.push({
          id: `dispatch-${d.id}`,
          kind: "dispatch",
          title,
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

  function openCreateForm(day?: Date) {
    setFormMode("create")
    setFormDate(day ?? null)
    setFormEventId(null)
    setFormOpen(true)
  }

  function handleEditEvent(event: CalendarEvent) {
    if (!event.eventId) return
    setDialogOpen(false)
    setFormMode("edit")
    setFormEventId(event.eventId)
    setFormDate(null)
    setFormOpen(true)
  }

  async function handleDeleteEvent(event: CalendarEvent) {
    if (!event.eventId) return
    if (!confirm(`Delete "${event.title}"? This removes the event and all its instances.`)) return
    const supabase = createClient()
    const { error } = await supabase.from("events").delete().eq("id", event.eventId)
    if (error) { toast.error(`Failed: ${error.message}`); return }
    toast.success(`"${event.title}" deleted`)
    logAudit("event_deleted", "events", event.eventId, { title: event.title })
    setDialogOpen(false)
    fetchData()
  }

  function handleEditInstance(event: CalendarEvent) {
    if (!event.eventId) return
    setDialogOpen(false)
    setInstanceTarget({
      eventId: event.eventId,
      instanceId: event.instanceId ?? null,
      instanceDate: format(event.date, "yyyy-MM-dd"),
      eventTitle: event.title,
    })
    setInstanceDialogOpen(true)
  }

  async function handleViewDispatchEmail(event: CalendarEvent) {
    const dispatchId = event.id.replace("dispatch-", "")
    const supabase = createClient()
    const { data, error } = await supabase
      .from("dispatch_queue")
      .select("subject, body_html")
      .eq("id", dispatchId)
      .returns<{ subject: string; body_html: string }[]>()
      .single()
    if (error || !data?.body_html) {
      toast.error("Could not load email content")
      return
    }
    setSentEmailSubject(data.subject)
    setSentEmailHtml(data.body_html)
    setDialogOpen(false)
    setSentEmailOpen(true)
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

        {/* View toggle + Create button */}
        <div className="flex items-center gap-2">
          <Tabs
            value={view}
            onValueChange={(val) => {
              setView(val as "week" | "month" | "agenda")
              setSelectedDay(null)
            }}
          >
            <TabsList>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="agenda">Agenda</TabsTrigger>
            </TabsList>
          </Tabs>
          <EventTypeManager onTypesChanged={fetchData} />
          <Button size="sm" onClick={() => openCreateForm()}>
            <Plus className="size-3.5" />
            Create Event
          </Button>
        </div>
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
        <CalendarSkeleton view={view === "agenda" ? "week" : view} />
      ) : (
        <>
          {/* Week view */}
          {view === "week" && (
            <WeekView
              days={days}
              events={events}
              onEventClick={handleEventClick}
              onDayClick={(day) => openCreateForm(day)}
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
                  onCreateEvent={(day) => openCreateForm(day)}
                />
              )}
            </>
          )}

          {/* Agenda view */}
          {view === "agenda" && (
            <div className="space-y-1">
              {events
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .map((evt) => (
                  <button
                    key={evt.id}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg border px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => handleEventClick(evt)}
                  >
                    <div className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: evt.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{evt.title}</p>
                      {evt.time && <p className="text-xs text-muted-foreground">{evt.time}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {format(evt.date, "EEE, MMM d")}
                    </span>
                  </button>
                ))}
              {events.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No events in this period.</p>
              )}
            </div>
          )}
        </>
      )}

      {/* Event detail dialog */}
      <EventDetailDialog
        event={selectedEvent}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onEdit={handleEditEvent}
        onEditInstance={handleEditInstance}
        onDelete={handleDeleteEvent}
        onViewDispatchEmail={handleViewDispatchEmail}
        onDateUpdated={() => { setDialogOpen(false); fetchData() }}
      />

      {/* Event create/edit form dialog */}
      <EventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initialDate={formDate}
        eventId={formEventId}
        onSuccess={() => {
          setFormOpen(false)
          fetchData()
        }}
      />

      {/* Instance edit dialog */}
      {instanceTarget && (
        <InstanceEditDialog
          open={instanceDialogOpen}
          onOpenChange={setInstanceDialogOpen}
          eventId={instanceTarget.eventId}
          instanceId={instanceTarget.instanceId}
          instanceDate={instanceTarget.instanceDate}
          eventTitle={instanceTarget.eventTitle}
          onSuccess={() => {
            setInstanceDialogOpen(false)
            setInstanceTarget(null)
            fetchData()
          }}
        />
      )}

      {/* Sent email preview dialog */}
      <Dialog open={sentEmailOpen} onOpenChange={setSentEmailOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg lg:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sent Email</DialogTitle>
            {sentEmailSubject && (
              <DialogDescription>{sentEmailSubject}</DialogDescription>
            )}
          </DialogHeader>
          <div
            className="rounded-lg border bg-white p-4 dark:bg-slate-900"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(sentEmailHtml ?? "") }}
          />
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
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
