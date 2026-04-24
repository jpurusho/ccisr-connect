"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Users,
  Home,
  Cake,
  Clock,
  BookOpen,
  Heart,
  Newspaper,
  CalendarDays,
  Mail,
  History,
  ArrowRight,
  Loader2,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  buildBirthdayCard,
  buildAnniversaryCard,
  buildBibleStudyCard,
  buildWomensStudyCard,
  buildBulletinCard,
  type BirthdayEntry,
  type AnniversaryEntry,
} from "@/lib/email/card-builder"
import { toast } from "sonner"
import {
  startOfWeek,
  endOfWeek,
  format,
  addDays,
  nextFriday,
  isFriday,
} from "date-fns"

import {
  WeeklyCommunicationCard,
  type CommunicationStatus,
} from "@/components/dashboard/weekly-communication-card"
import {
  BirthdayEditForm,
  AnniversaryEditForm,
  BibleStudyEditForm,
  WomensStudyEditForm,
  BulletinEditForm,
  type BirthdayFormData,
  type AnniversaryFormData,
  type BibleStudyFormData,
  type WomensStudyFormData,
  type BulletinFormData,
} from "@/components/dashboard/communication-edit-forms"

// ── Types ──────────────────────────────────────────────────────────────────

interface Stats {
  totalFamilies: number
  activeMembers: number
  upcomingBirthdays: number
  pendingDispatches: number
}

interface DispatchRecord {
  id: string
  subject: string
  status: string
  scheduled_at: string | null
  created_at: string
}

interface MailingListOption {
  id: string
  name: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`
}

function getWeekDays(monday: Date, sunday: Date) {
  const days: { month: number; day: number }[] = []
  for (let d = new Date(monday); d <= sunday; d = addDays(d, 1)) {
    days.push({ month: d.getMonth() + 1, day: d.getDate() })
  }
  return days
}

/** Map a dispatch_queue status to our card status */
function mapDispatchStatus(dbStatus: string): CommunicationStatus {
  switch (dbStatus) {
    case "sent":
      return "sent"
    case "failed":
      return "failed"
    case "sending":
    case "pending":
    case "previewed":
    case "approved":
      return "scheduled"
    case "cancelled":
      return "draft"
    default:
      return "draft"
  }
}

// Communication type keys we track dispatches for
type CommType =
  | "birthday"
  | "anniversary"
  | "bible_study"
  | "womens_study"
  | "bulletin"

// Subject-based matching to find existing dispatches for each type
const DISPATCH_MATCHERS: Record<CommType, (subject: string) => boolean> = {
  birthday: (s) => /birthday/i.test(s),
  anniversary: (s) => /anniversary/i.test(s),
  bible_study: (s) => /bible study this friday/i.test(s),
  womens_study: (s) => /women.*bible study/i.test(s),
  bulletin: (s) => /weekly bulletin/i.test(s),
}

// ── Stat card config type ─────────────────────────────────────────────────

interface StatCardConfig {
  title: string
  value: number
  icon: typeof Home
  color: string
  bg: string
}

// ── Skeleton ──────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-1 bg-muted" />
      <div className="space-y-3 p-4 pl-5">
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="ml-auto h-5 w-16 rounded-full" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-64" />
          <Skeleton className="h-3.5 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-16 rounded-md" />
          <Skeleton className="h-7 w-20 rounded-md" />
          <Skeleton className="h-7 w-20 rounded-md" />
          <Skeleton className="h-7 w-20 rounded-md" />
        </div>
      </div>
    </Card>
  )
}

// ── Main Component ────────────────────────────────────────────────────────

export default function DashboardPage() {
  // ---- Global state ----
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [weekLabel, setWeekLabel] = useState("")
  const [dispatches, setDispatches] = useState<
    Record<CommType, DispatchRecord | null>
  >({
    birthday: null,
    anniversary: null,
    bible_study: null,
    womens_study: null,
    bulletin: null,
  })

  // ---- Form state for each communication ----
  const [birthdayForm, setBirthdayForm] = useState<BirthdayFormData>({
    weekLabel: "",
    birthdays: [],
    message: "",
  })
  const [anniversaryForm, setAnniversaryForm] = useState<AnniversaryFormData>({
    weekLabel: "",
    anniversaries: [],
    message: "",
  })
  const [bibleStudyForm, setBibleStudyForm] = useState<BibleStudyFormData>({
    hostNames: "TBD",
    address: "TBD",
    city: "",
    phone: "",
    date: "",
    time: "7:30 PM",
    topic: "Studying the Book of Acts",
    message: "",
  })
  const [womensStudyForm, setWomensStudyForm] = useState<WomensStudyFormData>({
    topic: "Building a Relationship with God",
    date: "",
    time: "7:00 PM",
    zoomLink: "",
    message: "",
  })
  const [bulletinForm, setBulletinForm] = useState<BulletinFormData>({
    weekLabel: "",
    birthdays: [],
    anniversaries: [],
    helpers: [],
    events: [],
  })

  // ---- Custom subject overrides ----
  const [customSubjects, setCustomSubjects] = useState<Partial<Record<CommType, string>>>({})

  // ---- Mailing list state ----
  const [mailingLists, setMailingLists] = useState<MailingListOption[]>([])
  const [selectedMailingList, setSelectedMailingList] = useState("")

  // ---- Schedule dialog state ----
  const [scheduleDialog, setScheduleDialog] = useState<{
    open: boolean
    commType: CommType | null
    dateTime: string
  }>({ open: false, commType: null, dateTime: "" })
  const [sendingType, setSendingType] = useState<CommType | null>(null)

  // ---- Data fetch ----
  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const today = new Date()
      const monday = startOfWeek(today, { weekStartsOn: 1 })
      const sunday = endOfWeek(today, { weekStartsOn: 1 })
      const wl = `${format(monday, "MMM d")} – ${format(sunday, "MMM d")}`
      setWeekLabel(wl)

      const weekDays = getWeekDays(monday, sunday)
      const weekMonths = [...new Set(weekDays.map((d) => d.month))]
      const weekSet = new Set(weekDays.map((d) => `${d.month}-${d.day}`))

      // Next 7 days for stat card
      const next7End = addDays(today, 6)
      const next7Days = getWeekDays(today, next7End)
      const next7Months = [...new Set(next7Days.map((d) => d.month))]
      const next7Set = new Set(next7Days.map((d) => `${d.month}-${d.day}`))

      // Friday for bible study
      const fri = isFriday(today) ? today : nextFriday(today)
      const friISO = format(fri, "yyyy-MM-dd")

      // Monday/Sunday ISO for dispatch query
      const mondayISO = format(monday, "yyyy-MM-dd")
      const sundayISO = format(sunday, "yyyy-MM-dd")

      // Run all queries in parallel
      const [
        familiesRes,
        membersRes,
        dispatchCountRes,
        birthdayCountRes,
        weekBirthdaysRes,
        weekAnniversariesRes,
        bibleStudyRes,
        weekDispatchesRes,
        mailingListsRes,
      ] = await Promise.all([
        // Stats
        supabase
          .from("families")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
        supabase
          .from("members")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
        supabase
          .from("dispatch_queue")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "previewed", "approved"]),

        // Birthday count (next 7 days)
        supabase
          .from("members")
          .select("birth_month, birth_day")
          .eq("is_active", true)
          .not("birth_month", "is", null)
          .not("birth_day", "is", null)
          .in("birth_month", next7Months)
          .returns<{ birth_month: number; birth_day: number }[]>(),

        // This week birthdays (include inactive for dimmed display)
        supabase
          .from("members")
          .select("id, full_name, birth_month, birth_day, is_active")
          .not("birth_month", "is", null)
          .not("birth_day", "is", null)
          .in("birth_month", weekMonths)
          .returns<
            {
              id: string
              full_name: string
              birth_month: number
              birth_day: number
              is_active: boolean
            }[]
          >(),

        // This week anniversaries (include family active status)
        supabase
          .from("wedding_anniversaries")
          .select(
            "id, anniversary_month, anniversary_day, anniversary_year, family:families!family_id(is_active), husband:members!husband_member_id(full_name, is_active), wife:members!wife_member_id(full_name, is_active)"
          )
          .in("anniversary_month", weekMonths)
          .returns<
            {
              id: string
              anniversary_month: number
              anniversary_day: number
              anniversary_year: number | null
              family: { is_active: boolean } | null
              husband: { full_name: string; is_active: boolean } | null
              wife: { full_name: string; is_active: boolean } | null
            }[]
          >(),

        // Bible study instance
        supabase
          .from("event_instances")
          .select(
            "instance_date, instance_time, location_override, notes, host_family_id"
          )
          .eq("instance_date", friISO)
          .eq("status", "confirmed")
          .limit(1)
          .returns<
            {
              instance_date: string
              instance_time: string | null
              location_override: string | null
              notes: string | null
              host_family_id: string | null
            }[]
          >(),

        // This week dispatches
        supabase
          .from("dispatch_queue")
          .select("id, subject, status, scheduled_at, created_at")
          .gte("created_at", mondayISO)
          .lte("created_at", sundayISO + "T23:59:59")
          .not("status", "eq", "cancelled")
          .order("created_at", { ascending: false })
          .returns<DispatchRecord[]>(),

        // Mailing lists
        supabase
          .from("mailing_lists")
          .select("id, name")
          .order("name")
          .returns<MailingListOption[]>(),
      ])

      // Check errors
      if (familiesRes.error) throw familiesRes.error
      if (membersRes.error) throw membersRes.error
      if (dispatchCountRes.error) throw dispatchCountRes.error
      if (birthdayCountRes.error) throw birthdayCountRes.error
      if (weekBirthdaysRes.error) throw weekBirthdaysRes.error
      if (weekAnniversariesRes.error) throw weekAnniversariesRes.error
      if (bibleStudyRes.error) throw bibleStudyRes.error
      if (weekDispatchesRes.error) throw weekDispatchesRes.error
      if (mailingListsRes.error) throw mailingListsRes.error

      // ---- Stats ----
      const upcomingBirthdayCount = (birthdayCountRes.data ?? []).filter((m) =>
        next7Set.has(`${m.birth_month}-${m.birth_day}`)
      ).length

      setStats({
        totalFamilies: familiesRes.count ?? 0,
        activeMembers: membersRes.count ?? 0,
        upcomingBirthdays: upcomingBirthdayCount,
        pendingDispatches: dispatchCountRes.count ?? 0,
      })

      // ---- Process birthdays (active first, inactive dimmed) ----
      const bdays = (weekBirthdaysRes.data ?? [])
        .filter((m) => weekSet.has(`${m.birth_month}-${m.birth_day}`))
        .sort((a, b) => {
          if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
          return a.birth_month !== b.birth_month
            ? a.birth_month - b.birth_month
            : a.birth_day - b.birth_day
        })

      const bdayEntries: BirthdayEntry[] = bdays
        .filter((m) => m.is_active)
        .map((m) => ({
          name: m.full_name,
          date: `${m.birth_month}/${m.birth_day}`,
        }))

      const inactiveBdays = bdays
        .filter((m) => !m.is_active)
        .map((m) => `${m.full_name} (${m.birth_month}/${m.birth_day})`)

      setBirthdayForm({
        weekLabel: wl,
        birthdays: bdayEntries,
        message: inactiveBdays.length > 0
          ? `Note: Inactive members with birthdays this week: ${inactiveBdays.join(", ")}`
          : "",
      })

      // ---- Process anniversaries (skip inactive families) ----
      const currentYear = today.getFullYear()
      const annis = (weekAnniversariesRes.data ?? [])
        .filter((a) =>
          weekSet.has(`${a.anniversary_month}-${a.anniversary_day}`)
        )
        .sort((a, b) =>
          a.anniversary_month !== b.anniversary_month
            ? a.anniversary_month - b.anniversary_month
            : a.anniversary_day - b.anniversary_day
        )

      const activeAnnis = annis.filter(
        (a) => a.family?.is_active !== false && a.husband?.is_active !== false
      )
      const inactiveAnnis = annis.filter(
        (a) => a.family?.is_active === false || a.husband?.is_active === false
      )

      const anniEntries: AnniversaryEntry[] = activeAnnis.map((a) => ({
        husbandName: a.husband?.full_name?.split(" ")[0] ?? "?",
        wifeName: a.wife?.full_name?.split(" ")[0] ?? "?",
        date: `${a.anniversary_month}/${a.anniversary_day}`,
        years: a.anniversary_year
          ? currentYear - a.anniversary_year
          : undefined,
      }))

      setAnniversaryForm({
        weekLabel: wl,
        anniversaries: anniEntries,
        message: inactiveAnnis.length > 0
          ? `Note: ${inactiveAnnis.length} inactive family anniversar${inactiveAnnis.length > 1 ? "ies" : "y"} not shown`
          : "",
      })

      // ---- Process Bible Study ----
      const bsInstance =
        bibleStudyRes.data && bibleStudyRes.data.length > 0
          ? bibleStudyRes.data[0]
          : null

      let bsHostName = "TBD"
      let bsAddress = "TBD"
      let bsPhone = ""
      const bsCity = ""

      if (bsInstance?.host_family_id) {
        const [familyRes, addrRes] = await Promise.all([
          supabase
            .from("families")
            .select("family_name, home_phone")
            .eq("id", bsInstance.host_family_id)
            .returns<{ family_name: string; home_phone: string | null }[]>()
            .single(),
          supabase
            .from("addresses")
            .select("full_address")
            .eq("family_id", bsInstance.host_family_id)
            .eq("is_current", true)
            .returns<{ full_address: string }[]>()
            .limit(1)
            .single(),
        ])

        if (familyRes.data) {
          bsHostName = familyRes.data.family_name
          bsPhone = familyRes.data.home_phone ?? ""
        }
        if (addrRes.data) bsAddress = addrRes.data.full_address
      }

      if (bsInstance?.location_override) bsAddress = bsInstance.location_override
      if (bsInstance?.notes) {
        const contactMatch = bsInstance.notes.match(/Contact:\s*(.+)/i)
        if (contactMatch) bsPhone = contactMatch[1].trim()
      }

      setBibleStudyForm({
        hostNames: bsHostName,
        address: bsAddress,
        city: bsCity,
        phone: bsPhone,
        date: format(fri, "EEEE, MMMM do"),
        time: bsInstance?.instance_time
          ? formatTime(bsInstance.instance_time)
          : "7:30 PM",
        topic: "Studying the Book of Acts",
        message: "",
      })

      // ---- Women's Study ----
      const wed = addDays(monday, 2) // Wednesday
      setWomensStudyForm({
        topic: "Building a Relationship with God",
        date: format(wed, "EEEE, MMMM do"),
        time: "7:00 PM",
        zoomLink: "",
        message: "",
      })

      // ---- Bulletin ----
      setBulletinForm({
        weekLabel: `Week of ${wl}`,
        birthdays: bdayEntries.map((b) => ({ name: b.name, date: b.date })),
        anniversaries: anniEntries.map((a) => ({
          names: `${a.husbandName} & ${a.wifeName}`,
          date: a.date,
        })),
        helpers: [],
        events: [
          {
            title: "Women's Bible Study",
            details: `Building a Relationship with God — ${format(wed, "EEEE")} @ 7:00 PM via Zoom`,
          },
          {
            title: "San Ramon Bible Study",
            details: `Studying the Book of Acts — ${format(fri, "EEEE")} at ${bsInstance?.instance_time ? formatTime(bsInstance.instance_time) : "7:30 PM"}`,
          },
        ],
      })

      // ---- Mailing lists ----
      setMailingLists(mailingListsRes.data ?? [])

      // ---- Match dispatches to communication types ----
      const weekDispatches = weekDispatchesRes.data ?? []
      const matchedDispatches: Record<CommType, DispatchRecord | null> = {
        birthday: null,
        anniversary: null,
        bible_study: null,
        womens_study: null,
        bulletin: null,
      }

      for (const d of weekDispatches) {
        for (const [type, matcher] of Object.entries(DISPATCH_MATCHERS)) {
          if (
            matcher(d.subject) &&
            !matchedDispatches[type as CommType]
          ) {
            matchedDispatches[type as CommType] = d
          }
        }
      }

      setDispatches(matchedDispatches)
    } catch (err) {
      console.error("Dashboard fetch error:", err)
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard data"
      )
    } finally {
      setLoading(false)
    }
  }

  // ---- Computed status for each communication ----
  function getStatus(type: CommType): CommunicationStatus {
    const d = dispatches[type]
    if (!d) return "draft"
    return mapDispatchStatus(d.status)
  }

  function getScheduledAt(type: CommType): Date | null {
    const d = dispatches[type]
    if (!d?.scheduled_at) return null
    return new Date(d.scheduled_at)
  }

  // ---- Preview HTML builders (memoized) ----
  const birthdayPreview = useMemo(() => {
    if (birthdayForm.birthdays.length === 0) return null
    return buildBirthdayCard({
      weekLabel: birthdayForm.weekLabel,
      birthdays: birthdayForm.birthdays,
      message: birthdayForm.message || undefined,
    })
  }, [birthdayForm])

  const anniversaryPreview = useMemo(() => {
    if (anniversaryForm.anniversaries.length === 0) return null
    return buildAnniversaryCard({
      weekLabel: anniversaryForm.weekLabel,
      anniversaries: anniversaryForm.anniversaries,
      message: anniversaryForm.message || undefined,
    })
  }, [anniversaryForm])

  const bibleStudyPreview = useMemo(
    () =>
      buildBibleStudyCard({
        hostNames: bibleStudyForm.hostNames,
        address: bibleStudyForm.address,
        city: bibleStudyForm.city || undefined,
        phone: bibleStudyForm.phone || undefined,
        date: bibleStudyForm.date,
        time: bibleStudyForm.time,
        topic: bibleStudyForm.topic || undefined,
        message: bibleStudyForm.message || undefined,
      }),
    [bibleStudyForm]
  )

  const womensStudyPreview = useMemo(
    () =>
      buildWomensStudyCard({
        topic: womensStudyForm.topic,
        date: womensStudyForm.date,
        time: womensStudyForm.time,
        zoomLink: womensStudyForm.zoomLink || undefined,
        message: womensStudyForm.message || undefined,
      }),
    [womensStudyForm]
  )

  const bulletinPreview = useMemo(
    () =>
      buildBulletinCard({
        weekLabel: bulletinForm.weekLabel,
        birthdays: bulletinForm.birthdays,
        anniversaries: bulletinForm.anniversaries,
        helpers: bulletinForm.helpers,
        events: bulletinForm.events,
      }),
    [bulletinForm]
  )

  // ---- Subject lines (custom override or auto-generated) ----
  function getSubject(type: CommType): string {
    if (customSubjects[type]) return customSubjects[type]!
    switch (type) {
      case "birthday":
        return `Happy Birthday! — Week of ${weekLabel}`
      case "anniversary":
        return `Happy Anniversary! — Week of ${weekLabel}`
      case "bible_study":
        return `Bible Study This Friday — ${bibleStudyForm.date}`
      case "womens_study":
        return `Women's Bible Study This Wednesday`
      case "bulletin":
        return `Weekly Bulletin — ${bulletinForm.weekLabel}`
    }
  }

  function setSubjectOverride(type: CommType, value: string) {
    setCustomSubjects((prev) => ({ ...prev, [type]: value }))
  }

  // ---- Get preview for type ----
  function getPreview(type: CommType): string | null {
    switch (type) {
      case "birthday":
        return birthdayPreview
      case "anniversary":
        return anniversaryPreview
      case "bible_study":
        return bibleStudyPreview
      case "womens_study":
        return womensStudyPreview
      case "bulletin":
        return bulletinPreview
    }
  }

  // ---- Queue / Send ----
  const handleSendNow = useCallback(
    async (type: CommType) => {
      const html = getPreview(type)
      const subject = getSubject(type)
      if (!html) {
        toast.error("No content to send. Please add data first.")
        return
      }

      setSendingType(type)
      try {
        const supabase = createClient()
        const { error } = await supabase.from("dispatch_queue").insert({
          subject,
          body_html: html,
          scheduled_at: new Date().toISOString(),
          status: "pending",
          mailing_list_id: selectedMailingList || null,
        } as never)

        if (error) {
          toast.error(`Failed: ${error.message}`)
        } else {
          toast.success(
            `"${subject}" queued for dispatch. Go to Dispatch Queue to approve and send.`
          )
          // Update local state to show as scheduled
          setDispatches((prev) => ({
            ...prev,
            [type]: {
              id: "local",
              subject,
              status: "pending",
              scheduled_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            },
          }))
        }
      } catch {
        toast.error("An unexpected error occurred")
      } finally {
        setSendingType(null)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      selectedMailingList,
      weekLabel,
      birthdayPreview,
      anniversaryPreview,
      bibleStudyPreview,
      womensStudyPreview,
      bulletinPreview,
      birthdayForm,
      anniversaryForm,
      bibleStudyForm,
      womensStudyForm,
      bulletinForm,
    ]
  )

  const handleSchedule = useCallback(
    async (type: CommType) => {
      const html = getPreview(type)
      if (!html) {
        toast.error("No content to schedule. Please add data first.")
        return
      }
      // Open schedule dialog
      setScheduleDialog({
        open: true,
        commType: type,
        dateTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      birthdayPreview,
      anniversaryPreview,
      bibleStudyPreview,
      womensStudyPreview,
      bulletinPreview,
      birthdayForm,
      anniversaryForm,
      bibleStudyForm,
      womensStudyForm,
      bulletinForm,
      weekLabel,
    ]
  )

  const confirmSchedule = useCallback(async () => {
    const type = scheduleDialog.commType
    if (!type) return

    const html = getPreview(type)
    const subject = getSubject(type)
    if (!html) return

    setSendingType(type)
    setScheduleDialog((prev) => ({ ...prev, open: false }))

    try {
      const supabase = createClient()
      const scheduledAt = new Date(scheduleDialog.dateTime).toISOString()

      const { error } = await supabase.from("dispatch_queue").insert({
        subject,
        body_html: html,
        scheduled_at: scheduledAt,
        status: "pending",
        mailing_list_id: selectedMailingList || null,
      } as never)

      if (error) {
        toast.error(`Failed: ${error.message}`)
      } else {
        toast.success(
          `"${subject}" scheduled for ${format(new Date(scheduledAt), "EEE, MMM d 'at' h:mm a")}`
        )
        setDispatches((prev) => ({
          ...prev,
          [type]: {
            id: "local",
            subject,
            status: "pending",
            scheduled_at: scheduledAt,
            created_at: new Date().toISOString(),
          },
        }))
      }
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setSendingType(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    scheduleDialog,
    selectedMailingList,
    birthdayPreview,
    anniversaryPreview,
    bibleStudyPreview,
    womensStudyPreview,
    bulletinPreview,
    birthdayForm,
    anniversaryForm,
    bibleStudyForm,
    womensStudyForm,
    bulletinForm,
    weekLabel,
  ])

  // ---- Stat card config ----
  const statCards: StatCardConfig[] | null = stats
    ? [
        {
          title: "Families",
          value: stats.totalFamilies,
          icon: Home,
          color: "text-blue-600 dark:text-blue-400",
          bg: "bg-blue-100 dark:bg-blue-950/40",
        },
        {
          title: "Members",
          value: stats.activeMembers,
          icon: Users,
          color: "text-emerald-600 dark:text-emerald-400",
          bg: "bg-emerald-100 dark:bg-emerald-950/40",
        },
        {
          title: "Birthdays (7d)",
          value: stats.upcomingBirthdays,
          icon: Cake,
          color: "text-purple-600 dark:text-purple-400",
          bg: "bg-purple-100 dark:bg-purple-950/40",
        },
        {
          title: "Pending",
          value: stats.pendingDispatches,
          icon: Clock,
          color: "text-amber-600 dark:text-amber-400",
          bg: "bg-amber-100 dark:bg-amber-950/40",
        },
      ]
    : null

  // ---- Summary lines ----
  const birthdaySummary = useMemo(() => {
    const names = birthdayForm.birthdays.map((b) => b.name).filter(Boolean)
    if (names.length === 0) return ["No birthdays this week"]
    const list =
      names.length <= 3 ? names.join(", ") : `${names.slice(0, 3).join(", ")} +${names.length - 3} more`
    return [`${names.length} birthday${names.length > 1 ? "s" : ""}: ${list}`]
  }, [birthdayForm.birthdays])

  const anniversarySummary = useMemo(() => {
    const couples = anniversaryForm.anniversaries
    if (couples.length === 0) return ["No anniversaries this week"]
    const names = couples.map((a) => `${a.husbandName} & ${a.wifeName}`)
    const list =
      names.length <= 2 ? names.join(", ") : `${names.slice(0, 2).join(", ")} +${names.length - 2} more`
    return [
      `${couples.length} anniversary${couples.length > 1 ? "ies" : "y"}: ${list}`,
    ]
  }, [anniversaryForm.anniversaries])

  const bibleStudySummary = useMemo(() => {
    const lines: string[] = []
    lines.push(
      `Host: ${bibleStudyForm.hostNames} — ${bibleStudyForm.date} at ${bibleStudyForm.time}`
    )
    if (bibleStudyForm.address !== "TBD") {
      lines.push(`Location: ${bibleStudyForm.address}`)
    }
    if (bibleStudyForm.topic) {
      lines.push(`Topic: ${bibleStudyForm.topic}`)
    }
    return lines
  }, [bibleStudyForm])

  const womensStudySummary = useMemo(() => {
    const lines: string[] = []
    lines.push(`${womensStudyForm.date} at ${womensStudyForm.time} via Zoom`)
    if (womensStudyForm.topic) {
      lines.push(`Topic: ${womensStudyForm.topic}`)
    }
    return lines
  }, [womensStudyForm])

  const bulletinSummary = useMemo(() => {
    const parts: string[] = []
    const bc = bulletinForm.birthdays.length
    const ac = bulletinForm.anniversaries.length
    const ec = bulletinForm.events.length
    const hc = bulletinForm.helpers.length
    if (bc > 0) parts.push(`${bc} birthday${bc > 1 ? "s" : ""}`)
    if (ac > 0) parts.push(`${ac} anniversary${ac > 1 ? "ies" : "y"}`)
    if (hc > 0) parts.push(`${hc} helper${hc > 1 ? "s" : ""}`)
    if (ec > 0) parts.push(`${ec} event${ec > 1 ? "s" : ""}`)
    return [
      parts.length > 0
        ? `Contains: ${parts.join(", ")}`
        : "Empty bulletin — add content",
    ]
  }, [bulletinForm])

  // ---- Error state ----
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Weekly Command Center
          </h1>
          <p className="text-sm text-muted-foreground">
            Week of {weekLabel || "..."}
          </p>
        </div>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-destructive">
              Failed to load data: {error}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => fetchAll()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ---- Main render ----
  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Weekly Command Center
          </h1>
          <p className="text-sm text-muted-foreground">
            Review, edit, preview, and send all communications for the week of{" "}
            <span className="font-medium text-foreground">
              {weekLabel || "..."}
            </span>
          </p>
        </div>
        {mailingLists.length > 0 && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">
              Send to:
            </Label>
            <Select
              value={selectedMailingList}
              onValueChange={(val) => setSelectedMailingList(val ?? "")}
            >
              <SelectTrigger className="w-48" size="sm">
                <SelectValue placeholder="Select list..." />
              </SelectTrigger>
              <SelectContent>
                {mailingLists.map((ml) => (
                  <SelectItem key={ml.id} value={ml.id}>
                    {ml.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* ── Stats Row (compact) ───────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards
          ? statCards.map((stat) => (
              <div
                key={stat.title}
                className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 ring-1 ring-foreground/5"
              >
                <div className={`rounded-md p-1.5 ${stat.bg}`}>
                  <stat.icon className={`size-4 ${stat.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold tabular-nums leading-tight">
                    {stat.value.toLocaleString()}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {stat.title}
                  </p>
                </div>
              </div>
            ))
          : Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5"
              >
                <Skeleton className="size-7 rounded-md" />
                <div className="space-y-1">
                  <Skeleton className="h-5 w-10" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
      </div>

      {/* ── Communication Cards ───────────────────────────────── */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Birthday Card */}
          <WeeklyCommunicationCard
            title="Birthdays This Week"
            accentColor="#7C3AED"
            icon={Cake}
            status={getStatus("birthday")}
            summaryLines={birthdaySummary}
            subject={getSubject("birthday")}
            onSubjectChange={(v) => setSubjectOverride("birthday", v)}
            scheduledAt={getScheduledAt("birthday")}
            previewHtml={birthdayPreview}
            onSchedule={() => handleSchedule("birthday")}
            onSendNow={() => handleSendNow("birthday")}
          >
            <BirthdayEditForm
              data={birthdayForm}
              onChange={setBirthdayForm}
            />
          </WeeklyCommunicationCard>

          {/* Anniversary Card */}
          <WeeklyCommunicationCard
            title="Anniversaries This Week"
            accentColor="#D97706"
            icon={Heart}
            status={getStatus("anniversary")}
            summaryLines={anniversarySummary}
            subject={getSubject("anniversary")}
            onSubjectChange={(v) => setSubjectOverride("anniversary", v)}
            scheduledAt={getScheduledAt("anniversary")}
            previewHtml={anniversaryPreview}
            onSchedule={() => handleSchedule("anniversary")}
            onSendNow={() => handleSendNow("anniversary")}
          >
            <AnniversaryEditForm
              data={anniversaryForm}
              onChange={setAnniversaryForm}
            />
          </WeeklyCommunicationCard>

          {/* Bible Study Card */}
          <WeeklyCommunicationCard
            title="Friday Bible Study Invite"
            accentColor="#0D9488"
            icon={BookOpen}
            status={getStatus("bible_study")}
            summaryLines={bibleStudySummary}
            subject={getSubject("bible_study")}
            onSubjectChange={(v) => setSubjectOverride("bible_study", v)}
            scheduledAt={getScheduledAt("bible_study")}
            previewHtml={bibleStudyPreview}
            onSchedule={() => handleSchedule("bible_study")}
            onSendNow={() => handleSendNow("bible_study")}
          >
            <BibleStudyEditForm
              data={bibleStudyForm}
              onChange={setBibleStudyForm}
            />
          </WeeklyCommunicationCard>

          {/* Women's Study Card */}
          <WeeklyCommunicationCard
            title="Wednesday Women's Bible Study"
            accentColor="#DB2777"
            icon={Users}
            status={getStatus("womens_study")}
            summaryLines={womensStudySummary}
            subject={getSubject("womens_study")}
            onSubjectChange={(v) => setSubjectOverride("womens_study", v)}
            scheduledAt={getScheduledAt("womens_study")}
            previewHtml={womensStudyPreview}
            onSchedule={() => handleSchedule("womens_study")}
            onSendNow={() => handleSendNow("womens_study")}
          >
            <WomensStudyEditForm
              data={womensStudyForm}
              onChange={setWomensStudyForm}
            />
          </WeeklyCommunicationCard>

          {/* Bulletin Card */}
          <WeeklyCommunicationCard
            title="Weekly Bulletin"
            accentColor="#4F46E5"
            icon={Newspaper}
            status={getStatus("bulletin")}
            summaryLines={bulletinSummary}
            subject={getSubject("bulletin")}
            onSubjectChange={(v) => setSubjectOverride("bulletin", v)}
            scheduledAt={getScheduledAt("bulletin")}
            previewHtml={bulletinPreview}
            onSchedule={() => handleSchedule("bulletin")}
            onSendNow={() => handleSendNow("bulletin")}
          >
            <BulletinEditForm
              data={bulletinForm}
              onChange={setBulletinForm}
            />
          </WeeklyCommunicationCard>
        </div>
      )}

      {/* ── Quick Links ───────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" render={<Link href="/members" />}>
          <Users className="size-3.5" data-icon="inline-start" />
          Members
          <ArrowRight className="size-3 opacity-50" data-icon="inline-end" />
        </Button>
        <Button variant="outline" size="sm" render={<Link href="/calendar" />}>
          <CalendarDays className="size-3.5" data-icon="inline-start" />
          Calendar
          <ArrowRight className="size-3 opacity-50" data-icon="inline-end" />
        </Button>
        <Button variant="outline" size="sm" render={<Link href="/templates" />}>
          <Mail className="size-3.5" data-icon="inline-start" />
          Templates
          <ArrowRight className="size-3 opacity-50" data-icon="inline-end" />
        </Button>
        <Button variant="outline" size="sm" render={<Link href="/dispatch" />}>
          <History className="size-3.5" data-icon="inline-start" />
          Dispatch History
          <ArrowRight className="size-3 opacity-50" data-icon="inline-end" />
        </Button>
      </div>

      {/* ── Schedule Dialog ───────────────────────────────────── */}
      <Dialog
        open={scheduleDialog.open}
        onOpenChange={(open) =>
          setScheduleDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Schedule Dispatch</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="schedule-dt">Send Date & Time</Label>
              <Input
                id="schedule-dt"
                type="datetime-local"
                value={scheduleDialog.dateTime}
                onChange={(e) =>
                  setScheduleDialog((prev) => ({
                    ...prev,
                    dateTime: e.target.value,
                  }))
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              The email will be queued for dispatch at the selected time.
              You can approve it in the Dispatch Queue.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={confirmSchedule}
              disabled={!scheduleDialog.dateTime || sendingType !== null}
            >
              {sendingType ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Clock className="size-4" data-icon="inline-start" />
              )}
              Confirm Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Sending overlay (subtle) ──────────────────────────── */}
      {sendingType && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg">
            <Loader2 className="size-4 animate-spin" />
            Queuing dispatch...
          </div>
        </div>
      )}
    </div>
  )
}
