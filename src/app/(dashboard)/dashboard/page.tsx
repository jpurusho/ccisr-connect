"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
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
  Home,
  Cake,
  Clock,
  CalendarDays,
  Send,
  Mail,
  ArrowRight,
  Heart,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { EventInstanceStatus } from "@/types/database"

// ── Types ──────────────────────────────────────────────────────────────────

interface Stats {
  totalFamilies: number
  activeMembers: number
  upcomingBirthdays: number
  pendingDispatches: number
}

interface BirthdayPerson {
  id: string
  full_name: string
  birth_month: number
  birth_day: number
}

interface AnniversaryCouple {
  id: string
  husband_name: string
  wife_name: string
  anniversary_month: number
  anniversary_day: number
}

interface UpcomingEvent {
  id: string
  instance_date: string
  instance_time: string | null
  status: EventInstanceStatus
  event_title: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

function formatMonthDay(month: number, day: number): string {
  return `${MONTH_NAMES[month]} ${day}`
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number)
  return `${MONTH_NAMES[month]} ${day}, ${year}`
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return ""
  const [h, m] = timeStr.split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`
}

/**
 * Get (month, day) pairs for every date in a range [start, end] inclusive.
 * Handles month boundaries correctly by iterating day-by-day.
 */
function getMonthDayPairsInRange(
  start: Date,
  end: Date
): Array<{ month: number; day: number }> {
  const pairs: Array<{ month: number; day: number }> = []
  const current = new Date(start)
  current.setHours(0, 0, 0, 0)
  const endTime = new Date(end)
  endTime.setHours(23, 59, 59, 999)

  while (current <= endTime) {
    pairs.push({ month: current.getMonth() + 1, day: current.getDate() })
    current.setDate(current.getDate() + 1)
  }
  return pairs
}

/**
 * Get Monday and Sunday of the current week (Mon-Sun) for a given date.
 */
function getCurrentWeekBounds(today: Date): { monday: Date; sunday: Date } {
  const d = new Date(today)
  d.setHours(0, 0, 0, 0)
  const dayOfWeek = d.getDay() // 0=Sun, 1=Mon, ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { monday, sunday }
}

/**
 * Get the date range [today, today+6] for the "next 7 days" birthday count.
 */
function getNext7DaysBounds(today: Date): { start: Date; end: Date } {
  const start = new Date(today)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start, end }
}

// ── Status badge variant mapping ───────────────────────────────────────────

function statusLabel(status: EventInstanceStatus): string {
  switch (status) {
    case "confirmed": return "Scheduled"
    case "draft": return "Tentative"
    case "cancelled": return "Cancelled"
    default: return status
  }
}

function statusBadgeVariant(status: EventInstanceStatus) {
  switch (status) {
    case "confirmed":
      return "default" as const
    case "draft":
      return "secondary" as const
    case "cancelled":
      return "destructive" as const
    default:
      return "outline" as const
  }
}

// ── Skeleton components ────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="size-4" />
        </div>
        <Skeleton className="mt-1 h-8 w-16" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  )
}

function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

function EventsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-10 w-14 rounded-md" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [birthdays, setBirthdays] = useState<BirthdayPerson[] | null>(null)
  const [anniversaries, setAnniversaries] = useState<
    AnniversaryCouple[] | null
  >(null)
  const [events, setEvents] = useState<UpcomingEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [weekLabel, setWeekLabel] = useState("")

  useEffect(() => {
    const supabase = createClient()
    const today = new Date()
    const todayISO = today.toISOString().split("T")[0]

    // Week bounds (Mon-Sun)
    const { monday, sunday } = getCurrentWeekBounds(today)
    setWeekLabel(
      `${MONTH_NAMES[monday.getMonth() + 1]} ${monday.getDate()} – ${MONTH_NAMES[sunday.getMonth() + 1]} ${sunday.getDate()}`
    )
    const weekPairs = getMonthDayPairsInRange(monday, sunday)

    // Next 7 days for stat card
    const { start: next7Start, end: next7End } = getNext7DaysBounds(today)
    const next7Pairs = getMonthDayPairsInRange(next7Start, next7End)

    async function fetchAll() {
      try {
        // ── Stats: Total Families ────────────────────────────────────
        const familiesPromise = supabase
          .from("families")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)

        // ── Stats: Active Members ────────────────────────────────────
        const membersPromise = supabase
          .from("members")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)

        // ── Stats: Pending Dispatches ────────────────────────────────
        const dispatchPromise = supabase
          .from("dispatch_queue")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "previewed", "approved"])

        // ── Upcoming Birthdays (next 7 days) - fetch members then filter
        const birthdayMonths = [...new Set(next7Pairs.map((p) => p.month))]
        const birthdayCountPromise = supabase
          .from("members")
          .select("birth_month, birth_day")
          .eq("is_active", true)
          .not("birth_month", "is", null)
          .not("birth_day", "is", null)
          .in("birth_month", birthdayMonths)
          .returns<Array<{ birth_month: number; birth_day: number }>>()

        // ── This Week Birthdays ──────────────────────────────────────
        const weekBirthdayMonths = [...new Set(weekPairs.map((p) => p.month))]
        const weekBirthdaysPromise = supabase
          .from("members")
          .select("id, full_name, birth_month, birth_day")
          .eq("is_active", true)
          .not("birth_month", "is", null)
          .not("birth_day", "is", null)
          .in("birth_month", weekBirthdayMonths)
          .returns<BirthdayPerson[]>()

        // ── This Week Anniversaries ──────────────────────────────────
        const weekAnniMonths = [...new Set(weekPairs.map((p) => p.month))]
        const weekAnniversariesPromise = supabase
          .from("wedding_anniversaries")
          .select(
            "id, anniversary_month, anniversary_day, husband:members!husband_member_id(full_name), wife:members!wife_member_id(full_name)"
          )
          .in("anniversary_month", weekAnniMonths)
          .returns<Array<{
            id: string
            anniversary_month: number
            anniversary_day: number
            husband: { full_name: string } | null
            wife: { full_name: string } | null
          }>>()

        // ── Upcoming Events ──────────────────────────────────────────
        const eventsPromise = supabase
          .from("event_instances")
          .select("id, instance_date, instance_time, status, event:events(title)")
          .gte("instance_date", todayISO)
          .order("instance_date", { ascending: true })
          .limit(5)
          .returns<Array<{
            id: string
            instance_date: string
            instance_time: string | null
            status: EventInstanceStatus
            event: { title: string } | null
          }>>()

        // Run all queries in parallel
        const [
          familiesRes,
          membersRes,
          dispatchRes,
          birthdayCountRes,
          weekBirthdaysRes,
          weekAnniversariesRes,
          eventsRes,
        ] = await Promise.all([
          familiesPromise,
          membersPromise,
          dispatchPromise,
          birthdayCountPromise,
          weekBirthdaysPromise,
          weekAnniversariesPromise,
          eventsPromise,
        ])

        // Check for errors
        if (familiesRes.error) throw familiesRes.error
        if (membersRes.error) throw membersRes.error
        if (dispatchRes.error) throw dispatchRes.error
        if (birthdayCountRes.error) throw birthdayCountRes.error
        if (weekBirthdaysRes.error) throw weekBirthdaysRes.error
        if (weekAnniversariesRes.error) throw weekAnniversariesRes.error
        if (eventsRes.error) throw eventsRes.error

        // ── Process upcoming birthday count (next 7 days) ────────────
        const next7Set = new Set(
          next7Pairs.map((p) => `${p.month}-${p.day}`)
        )
        const upcomingBirthdayCount = (birthdayCountRes.data ?? []).filter(
          (m) => next7Set.has(`${m.birth_month}-${m.birth_day}`)
        ).length

        // ── Process this week's birthdays ────────────────────────────
        const weekSet = new Set(weekPairs.map((p) => `${p.month}-${p.day}`))
        const filteredBirthdays = (weekBirthdaysRes.data ?? [])
          .filter((m) => weekSet.has(`${m.birth_month}-${m.birth_day}`))
          .sort((a, b) => {
            if (a.birth_month !== b.birth_month)
              return a.birth_month - b.birth_month
            return a.birth_day - b.birth_day
          })

        // ── Process this week's anniversaries ────────────────────────
        const filteredAnniversaries: AnniversaryCouple[] = (weekAnniversariesRes.data ?? [])
          .filter((a) =>
            weekSet.has(`${a.anniversary_month}-${a.anniversary_day}`)
          )
          .sort((a, b) => {
            if (a.anniversary_month !== b.anniversary_month)
              return a.anniversary_month - b.anniversary_month
            return a.anniversary_day - b.anniversary_day
          })
          .map((a) => ({
            id: a.id,
            husband_name: a.husband?.full_name ?? "Unknown",
            wife_name: a.wife?.full_name ?? "Unknown",
            anniversary_month: a.anniversary_month,
            anniversary_day: a.anniversary_day,
          }))

        // ── Process upcoming events ──────────────────────────────────
        const processedEvents: UpcomingEvent[] = (eventsRes.data ?? []).map((e) => ({
          id: e.id,
          instance_date: e.instance_date,
          instance_time: e.instance_time,
          status: e.status,
          event_title: e.event?.title ?? "Untitled Event",
        }))

        // ── Set state ────────────────────────────────────────────────
        setStats({
          totalFamilies: familiesRes.count ?? 0,
          activeMembers: membersRes.count ?? 0,
          upcomingBirthdays: upcomingBirthdayCount,
          pendingDispatches: dispatchRes.count ?? 0,
        })
        setBirthdays(filteredBirthdays)
        setAnniversaries(filteredAnniversaries)
        setEvents(processedEvents)
      } catch (err) {
        console.error("Dashboard fetch error:", err)
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard data"
        )
      }
    }

    fetchAll()
  }, [])

  // ── Stat card config ───────────────────────────────────────────────────

  const statCards = stats
    ? [
        {
          title: "Total Families",
          value: stats.totalFamilies,
          description: "Registered families",
          icon: Home,
          color: "text-blue-600 dark:text-blue-400",
          bg: "bg-blue-100 dark:bg-blue-950/40",
          hex: "#3b82f6",
        },
        {
          title: "Active Members",
          value: stats.activeMembers,
          description: "Currently active",
          icon: Users,
          color: "text-emerald-600 dark:text-emerald-400",
          bg: "bg-emerald-100 dark:bg-emerald-950/40",
          hex: "#10b981",
        },
        {
          title: "Upcoming Birthdays",
          value: stats.upcomingBirthdays,
          description: "In the next 7 days",
          icon: Cake,
          color: "text-purple-600 dark:text-purple-400",
          bg: "bg-purple-100 dark:bg-purple-950/40",
          hex: "#7c3aed",
        },
        {
          title: "Pending Dispatches",
          value: stats.pendingDispatches,
          description: "Awaiting send",
          icon: Clock,
          color: "text-amber-600 dark:text-amber-400",
          bg: "bg-amber-100 dark:bg-amber-950/40",
          hex: "#d97706",
        },
      ]
    : null

  // ── Error state ────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to CCISR Connect
          </h1>
          <p className="text-muted-foreground">
            Church membership management and communication platform.
          </p>
        </div>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-destructive">
              Failed to load dashboard data: {error}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome to CCISR Connect
        </h1>
        <p className="text-muted-foreground">
          Church membership management and communication platform.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards
          ? statCards.map((stat) => (
              <Card key={stat.title} className="relative overflow-hidden">
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ backgroundColor: stat.hex }}
                />
                <CardHeader className="pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">
                        {stat.value.toLocaleString()}
                      </p>
                    </div>
                    <div className={`rounded-xl p-2.5 ${stat.bg}`}>
                      <stat.icon className={`size-5 ${stat.color}`} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))
          : Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
      </div>

      {/* This Week Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Birthdays This Week */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-purple-100 p-1.5 dark:bg-purple-900/40">
                <Cake className="size-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle>Birthdays — Week of {weekLabel}</CardTitle>
                <CardDescription>For upcoming bulletin</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {birthdays === null ? (
              <ListSkeleton rows={3} />
            ) : birthdays.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No birthdays this week.
              </p>
            ) : (
              <div className="space-y-2">
                {birthdays.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-lg bg-purple-50 px-3 py-2 dark:bg-purple-900/20"
                  >
                    <span className="text-sm font-medium">{b.full_name}</span>
                    <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      {formatMonthDay(b.birth_month, b.birth_day)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Anniversaries This Week */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-amber-100 p-1.5 dark:bg-amber-900/40">
                <Heart className="size-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle>Anniversaries — Week of {weekLabel}</CardTitle>
                <CardDescription>For upcoming bulletin</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {anniversaries === null ? (
              <ListSkeleton rows={3} />
            ) : anniversaries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No anniversaries this week.
              </p>
            ) : (
              <div className="space-y-2">
                {anniversaries.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-900/20"
                  >
                    <span className="text-sm font-medium">
                      {a.husband_name} & {a.wife_name}
                    </span>
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      {formatMonthDay(
                        a.anniversary_month,
                        a.anniversary_day
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-muted p-1.5">
              <CalendarDays className="size-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Upcoming Events</CardTitle>
              <CardDescription>Next 5 scheduled events</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {events === null ? (
            <EventsSkeleton />
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No upcoming events.
            </p>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-4 rounded-lg border p-3"
                >
                  <div className="flex min-w-14 flex-col items-center rounded-md bg-muted px-2 py-1.5 text-center">
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                      {MONTH_NAMES[
                        parseInt(event.instance_date.split("-")[1], 10)
                      ]}
                    </span>
                    <span className="text-lg font-bold leading-tight">
                      {parseInt(event.instance_date.split("-")[2], 10)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">
                      {event.event_title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(event.instance_date)}
                      {event.instance_time
                        ? ` at ${formatTime(event.instance_time)}`
                        : ""}
                    </p>
                  </div>
                  <Badge variant={statusBadgeVariant(event.status)}>
                    {statusLabel(event.status)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and navigation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button render={<Link href="/compose" />}>
              <Send className="size-4" data-icon="inline-start" />
              Send Bulletin
              <ArrowRight className="size-3.5 opacity-50" data-icon="inline-end" />
            </Button>
            <Button variant="outline" render={<Link href="/members" />}>
              <Users className="size-4" data-icon="inline-start" />
              View Members
              <ArrowRight className="size-3.5 opacity-50" data-icon="inline-end" />
            </Button>
            <Button variant="outline" render={<Link href="/templates" />}>
              <Mail className="size-4" data-icon="inline-start" />
              Email Templates
              <ArrowRight className="size-3.5 opacity-50" data-icon="inline-end" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
