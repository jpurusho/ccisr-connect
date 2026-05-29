"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  addDays,
  addMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
} from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { getOccurrences, formatTime, parseRecurrenceRule } from "@/lib/recurrence"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Users,
  Cake,
  Heart,
  MapPin,
  UserPlus,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Send,
  ClipboardList,
  Filter,
  Maximize2,
  Minimize2,
} from "lucide-react"
import { canonicalCityName } from "@/lib/city-utils"

type PeriodMode = "week" | "month"

interface EventAgendaItem {
  date: string
  title: string
  time: string | null
  hostFamily: string | null
  location: string | null
  eventTypeId: string
  eventTypeName: string
  color: string
  onBreak: boolean
  breakMessage: string | null
}

interface DispatchSummary {
  templateType: string
  label: string
  sent: number
  queued: number
}

interface SignupActivity {
  formTitle: string
  responseCount: number
  latestResponse: string | null
}

export default function ReportsPage() {
  const router = useRouter()

  // Period state
  const [periodMode, setPeriodMode] = useState<PeriodMode>(() => {
    if (typeof window === "undefined") return "week"
    return (localStorage.getItem("reports:periodMode") as PeriodMode) || "week"
  })
  const [periodOffset, setPeriodOffset] = useState(0)

  // UI state — persisted to localStorage
  const [eventsExpanded, setEventsExpanded] = useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("reports:eventsExpanded") === "true"
  })
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set()
    try {
      const raw = localStorage.getItem("reports:collapsedSections")
      return raw ? new Set(JSON.parse(raw)) : new Set()
    } catch { return new Set() }
  })
  const [hiddenEventTypes, setHiddenEventTypes] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set()
    try {
      const raw = localStorage.getItem("reports:hiddenEventTypes")
      return raw ? new Set(JSON.parse(raw)) : new Set()
    } catch { return new Set() }
  })

  // Persist preferences
  useEffect(() => { localStorage.setItem("reports:periodMode", periodMode) }, [periodMode])
  useEffect(() => { localStorage.setItem("reports:eventsExpanded", String(eventsExpanded)) }, [eventsExpanded])
  useEffect(() => { localStorage.setItem("reports:collapsedSections", JSON.stringify([...collapsedSections])) }, [collapsedSections])
  useEffect(() => { localStorage.setItem("reports:hiddenEventTypes", JSON.stringify([...hiddenEventTypes])) }, [hiddenEventTypes])

  function toggleSection(key: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Membership stats
  const [familyCount, setFamilyCount] = useState<number | null>(null)
  const [memberCount, setMemberCount] = useState<number | null>(null)
  const [childCount, setChildCount] = useState<number | null>(null)
  const [newcomerCount, setNewcomerCount] = useState<number | null>(null)
  const [cityCounts, setCityCounts] = useState<{ city: string; count: number }[] | null>(null)

  // Period-based data
  const [birthdays, setBirthdays] = useState<{ name: string; date: string; day: number }[] | null>(null)
  const [anniversaries, setAnniversaries] = useState<{ names: string; date: string; day: number }[] | null>(null)
  const [agendaItems, setAgendaItems] = useState<EventAgendaItem[] | null>(null)
  const [dispatches, setDispatches] = useState<DispatchSummary[] | null>(null)
  const [signups, setSignups] = useState<SignupActivity[] | null>(null)

  const { rangeStart, rangeEnd, periodLabel } = useMemo(() => {
    const today = new Date()
    if (periodMode === "week") {
      const base = startOfWeek(addDays(today, periodOffset * 7), { weekStartsOn: 0 })
      const end = endOfWeek(base, { weekStartsOn: 0 })
      return {
        rangeStart: base,
        rangeEnd: end,
        periodLabel: `${format(base, "MMM d")} – ${format(end, "MMM d, yyyy")}`,
      }
    } else {
      const base = addMonths(startOfMonth(today), periodOffset)
      const end = endOfMonth(base)
      return {
        rangeStart: base,
        rangeEnd: end,
        periodLabel: format(base, "MMMM yyyy"),
      }
    }
  }, [periodMode, periodOffset])

  // Membership stats (load once)
  useEffect(() => {
    const supabase = createClient()
    async function fetchStats() {
      const { data: newcomerTagRows } = await supabase
        .from("tags").select("id").eq("name", "Newcomer").limit(1).returns<{ id: string }[]>()
      const newcomerTagId = newcomerTagRows?.[0]?.id

      const [famRes, memRes, childRes, newcomerRes, addrRes] = await Promise.all([
        supabase.from("families").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("members").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("members").select("id", { count: "exact", head: true }).eq("is_active", true).eq("role_in_family", "child"),
        newcomerTagId
          ? supabase.from("member_tags").select("id", { count: "exact", head: true }).eq("tag_id", newcomerTagId)
          : Promise.resolve({ count: 0, error: null } as { count: number; error: null }),
        supabase.from("addresses").select("city").eq("is_current", true).returns<{ city: string }[]>(),
      ])

      setFamilyCount(famRes.count ?? 0)
      setMemberCount(memRes.count ?? 0)
      setChildCount(childRes.count ?? 0)
      setNewcomerCount(newcomerRes.count ?? 0)

      if (addrRes.data) {
        const counts: Record<string, number> = {}
        addrRes.data.forEach((a) => {
          const city = canonicalCityName(a.city)
          counts[city] = (counts[city] || 0) + 1
        })
        setCityCounts(
          Object.entries(counts)
            .map(([city, count]) => ({ city, count }))
            .sort((a, b) => b.count - a.count)
        )
      }
    }
    fetchStats()
  }, [])

  // Period-based data
  useEffect(() => {
    const supabase = createClient()
    setBirthdays(null)
    setAnniversaries(null)
    setAgendaItems(null)
    setDispatches(null)
    setSignups(null)

    async function fetchPeriodData() {
      const startStr = format(rangeStart, "yyyy-MM-dd")
      const endStr = format(rangeEnd, "yyyy-MM-dd")

      // Determine which months are in range for birthday/anniversary queries
      const months: number[] = []
      let m = rangeStart.getMonth() + 1
      months.push(m)
      if (rangeEnd.getMonth() + 1 !== m) months.push(rangeEnd.getMonth() + 1)

      const [
        bdayRes,
        annRes,
        eventsRes,
        eventTypesRes,
        instancesRes,
        breaksRes,
        dispatchRes,
        signupFormsRes,
        signupResponsesRes,
        emailTemplatesRes,
      ] = await Promise.all([
        supabase
          .from("members")
          .select("full_name, birth_month, birth_day")
          .eq("is_active", true)
          .in("birth_month", months)
          .order("birth_day")
          .returns<{ full_name: string; birth_month: number; birth_day: number }[]>(),
        supabase
          .from("wedding_anniversaries")
          .select("anniversary_month, anniversary_day, family:families!family_id(is_active), husband:members!husband_member_id(full_name, is_active), wife:members!wife_member_id(full_name, is_active)")
          .in("anniversary_month", months)
          .order("anniversary_day")
          .returns<Record<string, unknown>[]>(),
        supabase.from("events").select("*").eq("is_active", true).returns<{ id: string; event_type_id: string; title: string; recurrence_rule: string | null; default_time: string | null; start_date?: string | null; end_date?: string | null; is_active: boolean }[]>(),
        supabase.from("event_types").select("id, name, comm_type, color_scheme").returns<{ id: string; name: string; comm_type: string | null; color_scheme: { primary: string } | null }[]>(),
        supabase
          .from("event_instances")
          .select("event_id, instance_date, instance_time, host_family_id, location_override, status")
          .gte("instance_date", startStr)
          .lte("instance_date", endStr)
          .returns<{ event_id: string; instance_date: string; instance_time: string | null; host_family_id: string | null; location_override: string | null; status: string }[]>(),
        supabase
          .from("event_breaks")
          .select("event_id, start_date, end_date, message")
          .lte("start_date", endStr)
          .gte("end_date", startStr)
          .returns<{ event_id: string; start_date: string; end_date: string; message: string | null }[]>(),
        supabase
          .from("dispatch_queue")
          .select("template_type, status")
          .not("status", "eq", "cancelled")
          .or(`and(week_start.gte.${startStr},week_start.lte.${endStr}),and(week_start.is.null,created_at.gte.${startStr},created_at.lte.${endStr}T23:59:59)`)
          .returns<{ template_type: string | null; status: string }[]>(),
        supabase.from("signup_forms").select("id, title").eq("is_active", true).returns<{ id: string; title: string }[]>(),
        supabase
          .from("signup_responses")
          .select("form_id, created_at")
          .order("created_at", { ascending: false })
          .returns<{ form_id: string; created_at: string }[]>(),
        supabase
          .from("email_templates")
          .select("id, name")
          .returns<{ id: string; name: string }[]>(),
      ])

      // Birthdays
      if (bdayRes.data) {
        const filtered = bdayRes.data.filter((b) => {
          const d = new Date(rangeStart.getFullYear(), b.birth_month - 1, b.birth_day)
          return d >= rangeStart && d <= rangeEnd
        })
        setBirthdays(filtered.map((b) => ({
          name: b.full_name,
          date: `${b.birth_month}/${b.birth_day}`,
          day: b.birth_day,
        })))
      }

      // Anniversaries
      if (annRes.data) {
        const filtered = annRes.data
          .filter((a: Record<string, unknown>) => {
            const family = a.family as { is_active: boolean } | null
            const husband = a.husband as { full_name: string; is_active: boolean } | null
            const wife = a.wife as { full_name: string; is_active: boolean } | null
            if (family?.is_active === false) return false
            if (husband?.is_active === false && wife?.is_active === false) return false
            const month = a.anniversary_month as number
            const day = a.anniversary_day as number
            const d = new Date(rangeStart.getFullYear(), month - 1, day)
            return d >= rangeStart && d <= rangeEnd
          })
          .map((a: Record<string, unknown>) => {
            const husband = a.husband as { full_name: string } | null
            const wife = a.wife as { full_name: string } | null
            return {
              names: `${husband?.full_name?.split(" ")[0] ?? "?"} & ${wife?.full_name?.split(" ")[0] ?? "?"}`,
              date: `${a.anniversary_month}/${a.anniversary_day}`,
              day: a.anniversary_day as number,
            }
          })
        setAnniversaries(filtered)
      }

      // Events agenda
      const events = eventsRes.data ?? []
      const eventTypes = eventTypesRes.data ?? []
      const instances = instancesRes.data ?? []
      const breaks = breaksRes.data ?? []

      const etMap = new Map(eventTypes.map((et) => [et.id, et]))
      const instanceMap = new Map<string, typeof instances[0]>()
      for (const inst of instances) {
        instanceMap.set(`${inst.event_id}:${inst.instance_date}`, inst)
      }

      const agenda: EventAgendaItem[] = []

      for (const event of events) {
        const et = etMap.get(event.event_type_id)
        if (!et) continue

        // Get occurrences from recurrence
        let dates: Date[] = []
        if (event.recurrence_rule) {
          const parsed = parseRecurrenceRule(event.recurrence_rule)
          if (parsed.until && new Date(parsed.until + "T23:59:59") < rangeStart) continue
          dates = getOccurrences(event.recurrence_rule, rangeStart, rangeEnd)
        } else {
          // Date-range event
          const evtAny = event as typeof event & { start_date?: string | null; end_date?: string | null }
          if (evtAny.start_date) {
            let d = new Date(evtAny.start_date + "T00:00:00")
            const end = evtAny.end_date ? new Date(evtAny.end_date + "T00:00:00") : d
            while (d <= end && d <= rangeEnd) {
              if (d >= rangeStart) dates.push(new Date(d))
              d = addDays(d, 1)
            }
          }
        }

        for (const occ of dates) {
          const dateStr = format(occ, "yyyy-MM-dd")
          const instance = instanceMap.get(`${event.id}:${dateStr}`)

          if (instance?.status === "cancelled") continue

          // Check breaks
          const breakEntry = breaks.find(
            (b) => b.event_id === event.id && b.start_date <= dateStr && b.end_date >= dateStr
          )

          agenda.push({
            date: dateStr,
            title: event.title,
            time: formatTime(instance?.instance_time ?? event.default_time ?? null) || null,
            hostFamily: null,
            location: instance?.location_override ?? null,
            eventTypeId: et.id,
            eventTypeName: et.name,
            color: et.color_scheme?.primary ?? "#6B7280",
            onBreak: !!breakEntry,
            breakMessage: breakEntry?.message ?? null,
          })
        }
      }

      agenda.sort((a, b) => a.date.localeCompare(b.date))
      setAgendaItems(agenda)

      // Dispatches
      if (dispatchRes.data) {
        const dMap: Record<string, { sent: number; queued: number }> = {}
        for (const d of dispatchRes.data) {
          const key = d.template_type || "other"
          if (!dMap[key]) dMap[key] = { sent: 0, queued: 0 }
          if (d.status === "sent") dMap[key].sent++
          else dMap[key].queued++
        }
        const etNames = new Map(eventTypes.map((et) => [et.comm_type ?? et.name, et.name]))
        const templateNames = new Map((emailTemplatesRes.data ?? []).map((t) => [t.id, t.name]))
        setDispatches(
          Object.entries(dMap).map(([key, counts]) => {
            let label = etNames.get(key)
            if (!label && key.startsWith("custom:")) {
              label = templateNames.get(key.slice(7))
            }
            if (!label) {
              label = templateNames.get(key)
            }
            if (!label && (key.startsWith("custom:") || /^[0-9a-f]{8}-/.test(key))) {
              label = "(Deleted template)"
            }
            return {
              templateType: key,
              label: label ?? key,
              ...counts,
            }
          })
        )
      }

      // Signups
      if (signupFormsRes.data && signupResponsesRes.data) {
        const formMap = new Map(signupFormsRes.data.map((f) => [f.id, f.title]))
        const grouped: Record<string, { count: number; latest: string | null }> = {}
        for (const r of signupResponsesRes.data) {
          if (!grouped[r.form_id]) grouped[r.form_id] = { count: 0, latest: null }
          grouped[r.form_id].count++
          if (!grouped[r.form_id].latest) grouped[r.form_id].latest = r.created_at
        }
        setSignups(
          Object.entries(grouped)
            .map(([formId, data]) => ({
              formTitle: formMap.get(formId) ?? "Unknown Form",
              responseCount: data.count,
              latestResponse: data.latest,
            }))
            .sort((a, b) => b.responseCount - a.responseCount)
        )
      } else {
        setSignups([])
      }
    }

    fetchPeriodData()
  }, [rangeStart, rangeEnd])

  // Available event types from agenda
  const eventTypeOptions = useMemo(() => {
    if (!agendaItems) return []
    const seen = new Map<string, { name: string; color: string }>()
    for (const item of agendaItems) {
      if (!seen.has(item.eventTypeId)) {
        seen.set(item.eventTypeId, { name: item.eventTypeName, color: item.color })
      }
    }
    return Array.from(seen.entries()).map(([id, { name, color }]) => ({ id, name, color }))
  }, [agendaItems])

  const filteredAgenda = useMemo(() => {
    if (!agendaItems) return null
    if (hiddenEventTypes.size === 0) return agendaItems
    return agendaItems.filter((item) => !hiddenEventTypes.has(item.eventTypeId))
  }, [agendaItems, hiddenEventTypes])

  function toggleEventType(id: string) {
    setHiddenEventTypes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const monthName = format(rangeStart, "MMMM")

  const statCards = [
    { label: "Active Families", value: familyCount, icon: Users, href: "/members?view=family&filter=active" },
    { label: "Active Members", value: memberCount, icon: Users, href: "/members?filter=active" },
    { label: "Children", value: childCount, icon: Users, href: "/members?filter=active&role=child" },
    { label: "Pending Newcomers", value: newcomerCount, icon: UserPlus, href: "/members?filter=newcomers" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Membership statistics, events, and activity.
        </p>
      </div>

      {/* Period Selector */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border p-0.5">
          <Button
            variant={periodMode === "week" ? "default" : "ghost"}
            size="sm"
            onClick={() => { setPeriodMode("week"); setPeriodOffset(0) }}
            className="h-7 px-3 text-xs"
          >
            Week
          </Button>
          <Button
            variant={periodMode === "month" ? "default" : "ghost"}
            size="sm"
            onClick={() => { setPeriodMode("month"); setPeriodOffset(0) }}
            className="h-7 px-3 text-xs"
          >
            Month
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => setPeriodOffset((p) => p - 1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <button
            onClick={() => setPeriodOffset(0)}
            className="min-w-[140px] text-center text-sm font-medium hover:underline"
          >
            {periodLabel}
          </button>
          <Button variant="ghost" size="icon-sm" onClick={() => setPeriodOffset((p) => p + 1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="transition-colors hover:bg-accent cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardDescription>{stat.label}</CardDescription>
                  <stat.icon className="size-4 text-muted-foreground" />
                </div>
                {stat.value !== null ? (
                  <CardTitle className="text-2xl">{stat.value}</CardTitle>
                ) : (
                  <Skeleton className="h-8 w-16" />
                )}
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {/* Events Agenda */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-5 text-blue-600" />
              Events
            </CardTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setEventsExpanded((p) => !p)}
              title={eventsExpanded ? "Collapse" : "Expand"}
            >
              {eventsExpanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </Button>
          </div>
          {agendaItems && (
            <CardDescription>
              {filteredAgenda?.filter((i) => !i.onBreak).length ?? 0} event{(filteredAgenda?.filter((i) => !i.onBreak).length ?? 0) !== 1 ? "s" : ""} this {periodMode}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {/* Event type filter chips */}
          {eventTypeOptions.length > 1 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {eventTypeOptions.map((et) => {
                const isHidden = hiddenEventTypes.has(et.id)
                return (
                  <button
                    key={et.id}
                    onClick={() => toggleEventType(et.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                      isHidden
                        ? "border-dashed border-muted-foreground/30 text-muted-foreground/50"
                        : "border-transparent text-white"
                    }`}
                    style={!isHidden ? { backgroundColor: et.color } : undefined}
                  >
                    <span
                      className={`size-2 rounded-full ${isHidden ? "border border-muted-foreground/40" : "bg-white/60"}`}
                    />
                    {et.name}
                  </button>
                )
              })}
            </div>
          )}

          {!filteredAgenda ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : filteredAgenda.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events in this period.</p>
          ) : (
            <div className={`space-y-1 overflow-y-auto ${eventsExpanded ? "" : "max-h-80"}`}>
              {filteredAgenda.map((item, i) => {
                const showDateHeader =
                  i === 0 || item.date !== filteredAgenda[i - 1].date
                return (
                  <div key={`${item.date}-${item.title}-${i}`}>
                    {showDateHeader && (
                      <div className="sticky top-0 bg-card pt-1 pb-0.5 text-xs font-semibold text-muted-foreground">
                        {format(new Date(item.date + "T00:00:00"), "EEEE, MMM d")}
                      </div>
                    )}
                    <div
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                        item.onBreak ? "opacity-50 line-through" : ""
                      }`}
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-medium truncate">{item.title}</span>
                      {item.time && (
                        <span className="shrink-0 text-xs text-muted-foreground">{item.time}</span>
                      )}
                      {item.location && (
                        <span className="hidden sm:inline shrink-0 text-xs text-muted-foreground">
                          @ {item.location}
                        </span>
                      )}
                      {item.onBreak && item.breakMessage && (
                        <span className="shrink-0 text-xs text-orange-500">{item.breakMessage}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Birthdays & Anniversaries */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => toggleSection("birthdays")}>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Cake className="size-5 text-purple-600" />
                Birthdays
              </CardTitle>
              <ChevronDown className={`size-4 text-muted-foreground transition-transform ${collapsedSections.has("birthdays") ? "-rotate-90" : ""}`} />
            </div>
            <CardDescription>
              {birthdays ? `${birthdays.length} birthday${birthdays.length !== 1 ? "s" : ""} this ${periodMode}` : "Loading..."}
            </CardDescription>
          </CardHeader>
          {!collapsedSections.has("birthdays") && (
            <CardContent>
              {!birthdays ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
              ) : birthdays.length === 0 ? (
                <p className="text-sm text-muted-foreground">No birthdays this {periodMode}.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {birthdays.map((b, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span>{b.name}</span>
                      <Badge variant="outline" className="text-purple-600">{b.date}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader className="cursor-pointer" onClick={() => toggleSection("anniversaries")}>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Heart className="size-5 text-amber-600" />
                Anniversaries
              </CardTitle>
              <ChevronDown className={`size-4 text-muted-foreground transition-transform ${collapsedSections.has("anniversaries") ? "-rotate-90" : ""}`} />
            </div>
            <CardDescription>
              {anniversaries ? `${anniversaries.length} anniversar${anniversaries.length !== 1 ? "ies" : "y"} this ${periodMode}` : "Loading..."}
            </CardDescription>
          </CardHeader>
          {!collapsedSections.has("anniversaries") && (
            <CardContent>
              {!anniversaries ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
              ) : anniversaries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No anniversaries this {periodMode}.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {anniversaries.map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span>{a.names}</span>
                      <Badge variant="outline" className="text-amber-600">{a.date}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>

      {/* Dispatch & Signup Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => toggleSection("dispatches")}>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Send className="size-5 text-green-600" />
                Dispatch Activity
              </CardTitle>
              <ChevronDown className={`size-4 text-muted-foreground transition-transform ${collapsedSections.has("dispatches") ? "-rotate-90" : ""}`} />
            </div>
            <CardDescription>
              Emails sent and queued this {periodMode}
            </CardDescription>
          </CardHeader>
          {!collapsedSections.has("dispatches") && (
            <CardContent>
              {!dispatches ? (
                <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
              ) : dispatches.length === 0 ? (
                <p className="text-sm text-muted-foreground">No dispatch activity this {periodMode}.</p>
              ) : (
                <div className="space-y-2">
                  {dispatches.map((d) => (
                    <div key={d.templateType} className="flex items-center justify-between text-sm">
                      <span className="truncate">{d.label}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {d.sent > 0 && (
                          <Badge variant="outline" className="text-green-600">
                            {d.sent} sent
                          </Badge>
                        )}
                        {d.queued > 0 && (
                          <Badge variant="outline" className="text-amber-600">
                            {d.queued} queued
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader className="cursor-pointer" onClick={() => toggleSection("signups")}>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="size-5 text-indigo-600" />
                Signup Forms
              </CardTitle>
              <ChevronDown className={`size-4 text-muted-foreground transition-transform ${collapsedSections.has("signups") ? "-rotate-90" : ""}`} />
            </div>
            <CardDescription>
              Total responses per form
            </CardDescription>
          </CardHeader>
          {!collapsedSections.has("signups") && (
            <CardContent>
              {!signups ? (
                <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
              ) : signups.length === 0 ? (
                <p className="text-sm text-muted-foreground">No signup responses yet.</p>
              ) : (
                <div className="space-y-2">
                  {signups.map((s) => (
                    <div key={s.formTitle} className="flex items-center justify-between text-sm">
                      <span className="truncate">{s.formTitle}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-indigo-600">
                          {s.responseCount} response{s.responseCount !== 1 ? "s" : ""}
                        </Badge>
                        {s.latestResponse && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(s.latestResponse), "MMM d")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>

      {/* Families by City */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => toggleSection("cities")}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="size-5" />
              Families by City
            </CardTitle>
            <ChevronDown className={`size-4 text-muted-foreground transition-transform ${collapsedSections.has("cities") ? "-rotate-90" : ""}`} />
          </div>
          <CardDescription>
            Distribution of families across cities — click a city to view members
          </CardDescription>
        </CardHeader>
        {!collapsedSections.has("cities") && (
          <CardContent>
            {!cityCounts ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : cityCounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No address data available.</p>
            ) : (
              <div className="space-y-3">
                {cityCounts.map((c) => {
                  const maxCount = cityCounts[0]?.count || 1
                  const width = Math.max(8, (c.count / maxCount) * 100)
                  return (
                    <div
                      key={c.city}
                      className="space-y-1 cursor-pointer rounded-md p-1.5 -mx-1.5 transition-colors hover:bg-accent"
                      onClick={(e) => { e.stopPropagation(); router.push(`/members?filter=active&city=${encodeURIComponent(c.city)}`) }}
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span>{c.city || "Unknown"}</span>
                        <span className="font-medium">{c.count}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-primary transition-all"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
