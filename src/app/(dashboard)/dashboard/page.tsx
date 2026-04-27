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
  ChevronLeft,
  ChevronRight,
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
  type SmtpConfigOption,
} from "@/components/dashboard/weekly-communication-card"
import { logAudit } from "@/lib/audit"
import {
  getUpcomingSunday,
  getBulletinWeekBounds,
  getBulletinMultiWeekBounds,
} from "@/lib/date-utils"
import {
  parseBodyTemplate,
  FALLBACK_DEFAULTS,
  extractCommonFields,
  type BibleStudyDefaults,
  type WomensStudyDefaults,
  type BulletinDefaults,
  type CommonCardFields,
} from "@/lib/template-defaults"
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
  bible_study: (s) => /bible.?study/i.test(s) && !/women/i.test(s),
  womens_study: (s) => /women.*(?:bible|study)/i.test(s),
  bulletin: (s) => /bulletin/i.test(s),
}

// ── Stat card config type ─────────────────────────────────────────────────

interface StatCardConfig {
  title: string
  value: number
  icon: typeof Home
  color: string
  bg: string
  href: string
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
    headerSubtitle: "",
    primaryColor: "",
    footerVerse: "",
    resourceLinks: [],
  })
  const [anniversaryForm, setAnniversaryForm] = useState<AnniversaryFormData>({
    weekLabel: "",
    anniversaries: [],
    message: "",
    headerSubtitle: "",
    primaryColor: "",
    footerVerse: "",
    resourceLinks: [],
  })
  const [bibleStudyForm, setBibleStudyForm] = useState<BibleStudyFormData>({
    title: "Bible Study This Friday",
    date: "",
    time: "7:30 PM",
    topic: "Studying the Book of Acts",
    message: "",
    headerSubtitle: "",
    primaryColor: "",
    footerVerse: "",
    resourceLinks: [],
    locations: [
      { label: "San Ramon", hostNames: "TBD", address: "TBD", city: "", phone: "", onVacation: false, vacationMessage: "" },
      { label: "Mountain House", hostNames: "TBD", address: "TBD", city: "", phone: "", onVacation: false, vacationMessage: "" },
    ],
  })
  const [womensStudyForm, setWomensStudyForm] = useState<WomensStudyFormData>({
    title: "Women's Bible Study",
    topic: "Building a Relationship with God",
    date: "",
    time: "7:00 PM",
    zoomLink: "",
    zoomMeetingId: "",
    zoomPasscode: "",
    location: "",
    message: "",
    headerSubtitle: "",
    primaryColor: "",
    footerVerse: "",
    resourceLinks: [],
  })
  const [bulletinForm, setBulletinForm] = useState<BulletinFormData>({
    weekLabel: "",
    birthdays: [],
    anniversaries: [],
    helpers: [],
    events: [],
    resourceLinks: [],
    message: "",
    headerSubtitle: "",
    primaryColor: "",
    footerVerse: "",
  })

  // ---- Custom subject overrides ----
  const [customSubjects, setCustomSubjects] = useState<Partial<Record<CommType, string>>>({})

  // ---- Mailing list + SMTP state (per-card) ----
  const [mailingLists, setMailingLists] = useState<MailingListOption[]>([])
  const [smtpConfigs, setSmtpConfigs] = useState<SmtpConfigOption[]>([])
  const [commOptions, setCommOptions] = useState<
    Record<CommType, { mailingListId: string; smtpConfigId: string; additionalRecipients: string }>
  >({
    birthday: { mailingListId: "", smtpConfigId: "", additionalRecipients: "" },
    anniversary: { mailingListId: "", smtpConfigId: "", additionalRecipients: "" },
    bible_study: { mailingListId: "", smtpConfigId: "", additionalRecipients: "" },
    womens_study: { mailingListId: "", smtpConfigId: "", additionalRecipients: "" },
    bulletin: { mailingListId: "", smtpConfigId: "", additionalRecipients: "" },
  })

  // ---- Dispatch counts per type ----
  const [dispatchCounts, setDispatchCounts] = useState<Record<CommType, number>>({
    birthday: 0,
    anniversary: 0,
    bible_study: 0,
    womens_study: 0,
    bulletin: 0,
  })

  // ---- Schedule dialog state ----
  const [scheduleDialog, setScheduleDialog] = useState<{
    open: boolean
    commType: CommType | null
    dateTime: string
  }>({ open: false, commType: null, dateTime: "" })
  const [sendingType, setSendingType] = useState<CommType | null>(null)

  // ---- Selected communication card ----
  const [selectedCard, setSelectedCard] = useState<CommType>("bulletin")

  // ---- Week offset for future scheduling (0 = this week, 1 = next week, etc.) ----
  const [weekOffset, setWeekOffset] = useState(0)

  // ---- Data fetch ----
  useEffect(() => {
    fetchAll()
  }, [weekOffset])

  async function fetchAll() {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const today = new Date()
      // Apply week offset for future scheduling
      const baseDate = addDays(today, weekOffset * 7)
      // All weekly communications target the bulletin week: coming Sunday through following Saturday
      const bulSun = getUpcomingSunday(baseDate)
      const { saturday: bulSat } = getBulletinWeekBounds(bulSun)
      const wl = `${format(bulSun, "MMM d")} – ${format(bulSat, "MMM d")}`
      setWeekLabel(wl)

      // Also keep Mon-Sun for dispatch query range
      const monday = startOfWeek(baseDate, { weekStartsOn: 1 })
      const sunday = endOfWeek(baseDate, { weekStartsOn: 1 })

      const weekDays = getWeekDays(bulSun, bulSat)
      const weekMonths = [...new Set(weekDays.map((d) => d.month))]
      const weekSet = new Set(weekDays.map((d) => `${d.month}-${d.day}`))

      // Next 7 days for stat card
      const next7End = addDays(today, 6)
      const next7Days = getWeekDays(today, next7End)
      const next7Months = [...new Set(next7Days.map((d) => d.month))]
      const next7Set = new Set(next7Days.map((d) => `${d.month}-${d.day}`))

      // Friday for bible study
      const fri = isFriday(baseDate) ? baseDate : nextFriday(baseDate)
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
        smtpConfigsRes,
        templateDefaultsRes,
        eventTypesRes,
        composedInstancesRes,
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

        // SMTP configs
        supabase
          .from("smtp_configs")
          .select("id, name, from_email")
          .eq("is_active", true)
          .order("name")
          .returns<SmtpConfigOption[]>(),

        // Saved template defaults (no FK join — resolve event type name in JS)
        supabase
          .from("email_templates")
          .select("id, event_type_id, subject_template, body_template")
          .eq("is_default", true)
          .returns<{ id: string; event_type_id: string; subject_template: string; body_template: string }[]>(),

        // Event type id-to-name map
        supabase
          .from("event_types")
          .select("id, name")
          .returns<{ id: string; name: string }[]>(),

        // Composed instances for this week: exact match, recurring that covers this week, or legacy (no week_start)
        supabase
          .from("composed_instances")
          .select("template_type, form_data, subject, mailing_list_id, smtp_config_id, additional_recipients, week_start, is_recurring, recur_until")
          .eq("is_active", true)
          .or(`week_start.eq.${format(bulSun, "yyyy-MM-dd")},week_start.is.null,and(is_recurring.eq.true,week_start.lte.${format(bulSun, "yyyy-MM-dd")})`)
          .returns<{ template_type: string; form_data: Record<string, unknown>; subject: string; mailing_list_id: string | null; smtp_config_id: string | null; additional_recipients: string | null; week_start: string | null; is_recurring: boolean; recur_until: string | null }[]>(),
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
      if (smtpConfigsRes.error) throw smtpConfigsRes.error

      // ---- Parse saved template defaults (no FK join, resolve in JS) ----
      const etIdToName: Record<string, string> = {}
      if (eventTypesRes.data) {
        for (const et of eventTypesRes.data) etIdToName[et.id] = et.name
      }

      // Use the last template per event type (in case of duplicates)
      const savedDefaults: Record<string, { subject: string; data: Record<string, unknown> }> = {}
      if (templateDefaultsRes.data) {
        for (const t of templateDefaultsRes.data) {
          const etName = etIdToName[t.event_type_id]
          if (!etName) continue
          const parsed = parseBodyTemplate(etName, t.body_template)
          if (parsed) {
            savedDefaults[etName] = {
              subject: t.subject_template,
              data: parsed.data as Record<string, unknown>,
            }
          }
        }
      }

      // Build composed instances map (template_type → data)
      // Priority: exact week match > recurring (filter expired) > legacy (null week_start)
      const weekStr = format(bulSun, "yyyy-MM-dd")
      type CIRow = (typeof composedInstancesRes.data extends (infer U)[] | null ? U : never)
      const composedMap: Record<string, CIRow> = {}
      if (composedInstancesRes.data) {
        for (const ci of composedInstancesRes.data) {
          if (ci.is_recurring && ci.recur_until && ci.recur_until < weekStr) continue
          const existing = composedMap[ci.template_type]
          if (!existing) {
            composedMap[ci.template_type] = ci
          } else {
            const rank = (c: CIRow) => c.week_start === weekStr ? 2 : c.is_recurring ? 1 : 0
            if (rank(ci) > rank(existing)) composedMap[ci.template_type] = ci
          }
        }
      }

      // Priority: composed instance > template defaults > hardcoded fallbacks
      const resolve = (ciKey: string, etKey: string, fallbackKey?: string): CommonCardFields & Record<string, unknown> =>
        (composedMap[ciKey]?.form_data ?? savedDefaults[etKey]?.data ?? (fallbackKey ? FALLBACK_DEFAULTS[fallbackKey].data : {})) as CommonCardFields & Record<string, unknown>

      const bsDef = resolve("bible_study", "friday_bible_study", "friday_bible_study") as BibleStudyDefaults
      const wsDef = resolve("womens_study", "wednesday_womens_study", "wednesday_womens_study") as WomensStudyDefaults
      const bdDef = resolve("birthday", "birthday") as CommonCardFields
      const anDef = resolve("anniversary", "anniversary") as CommonCardFields
      const bulDef = resolve("bulletin", "bulletin", "bulletin") as BulletinDefaults

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

      const bdCommon = extractCommonFields(bdDef)
      setBirthdayForm({
        weekLabel: wl,
        birthdays: bdayEntries,
        ...bdCommon,
        message: inactiveBdays.length > 0
          ? `Note: Inactive members with birthdays this week: ${inactiveBdays.join(", ")}`
          : bdCommon.message,
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

      const anCommon = extractCommonFields(anDef)
      setAnniversaryForm({
        weekLabel: wl,
        anniversaries: anniEntries,
        ...anCommon,
        message: inactiveAnnis.length > 0
          ? `Note: ${inactiveAnnis.length} inactive family anniversar${inactiveAnnis.length > 1 ? "ies" : "y"} not shown`
          : anCommon.message,
      })

      // ---- Process Bible Study (multi-location) ----
      const bsInstance =
        bibleStudyRes.data && bibleStudyRes.data.length > 0
          ? bibleStudyRes.data[0]
          : null

      let bsHostName = "TBD"
      let bsAddress = "TBD"
      let bsPhone = ""
      let bsCity = ""

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
            .select("full_address, city, state, zip")
            .eq("family_id", bsInstance.host_family_id)
            .eq("is_current", true)
            .returns<{ full_address: string; city: string | null; state: string | null; zip: string | null }[]>()
            .limit(1)
            .single(),
        ])

        if (familyRes.data) {
          bsHostName = familyRes.data.family_name
          bsPhone = familyRes.data.home_phone ?? ""
        }
        if (addrRes.data) {
          bsAddress = addrRes.data.full_address
          bsCity = [addrRes.data.city, addrRes.data.state, addrRes.data.zip].filter(Boolean).join(", ")
        }
      }

      if (bsInstance?.location_override) bsAddress = bsInstance.location_override
      if (bsInstance?.notes) {
        const contactMatch = bsInstance.notes.match(/Contact:\s*(.+)/i)
        if (contactMatch) bsPhone = contactMatch[1].trim()
      }

      // Merge saved locations with DB host data for first location
      const savedLocs = bsDef.locations ?? (FALLBACK_DEFAULTS.friday_bible_study.data as BibleStudyDefaults).locations ?? []
      const mergedLocs = savedLocs.map((loc, i) => {
        const base = { onVacation: false, vacationMessage: "", ...loc }
        if (i === 0 && bsHostName !== "TBD" && !base.onVacation) {
          return { ...base, hostNames: bsHostName, address: bsAddress, city: bsCity, phone: bsPhone }
        }
        return base
      })

      const bsCommon = extractCommonFields(bsDef)
      // Migrate legacy single-link format
      if (bsCommon.resourceLinks.length === 0) {
        const def = bsDef as Record<string, unknown>
        const url = (def.resourceLinkUrl as string) ?? ""
        if (url) bsCommon.resourceLinks = [{ label: (def.resourceLinkLabel as string) || "View Resources", url }]
      }
      setBibleStudyForm({
        title: bsDef.title ?? "Bible Study This Friday",
        date: format(fri, "EEEE, MMMM do"),
        time: bsInstance?.instance_time
          ? formatTime(bsInstance.instance_time)
          : bsDef.time ?? "7:30 PM",
        topic: bsDef.topic ?? "Studying the Book of Acts",
        ...bsCommon,
        locations: mergedLocs,
      })

      // ---- Women's Study ----
      const wed = addDays(bulSun, 3) // Wednesday of bulletin week
      const wsCommon = extractCommonFields(wsDef)
      setWomensStudyForm({
        title: wsDef.title ?? "Women's Bible Study",
        topic: wsDef.topic ?? "Building a Relationship with God",
        date: format(wed, "EEEE, MMMM do"),
        time: wsDef.time ?? "7:00 PM",
        zoomLink: wsDef.zoomLink ?? "",
        zoomMeetingId: wsDef.zoomMeetingId ?? "",
        zoomPasscode: wsDef.zoomPasscode ?? "",
        location: wsDef.location ?? "",
        ...wsCommon,
      })

      // ---- Bulletin ----
      // Bulletin reuses the same Sun-Sat range already computed at top
      const bulEvents = bulDef.events ?? (FALLBACK_DEFAULTS.bulletin.data as BulletinDefaults).events ?? []

      const bulCommon = extractCommonFields(bulDef)
      setBulletinForm({
        weekLabel: `Sunday ${format(bulSun, "MMMM d, yyyy")} — Week of ${wl}`,
        birthdays: bdayEntries.map((b) => ({ name: b.name, date: b.date })),
        anniversaries: anniEntries.map((a) => ({
          names: `${a.husbandName} & ${a.wifeName}`,
          date: a.date,
        })),
        helpers: [],
        events: bulEvents,
        ...bulCommon,
      })

      // ---- Mailing lists + SMTP configs ----
      setMailingLists(mailingListsRes.data ?? [])
      setSmtpConfigs(smtpConfigsRes.data ?? [])

      // ---- Pre-fill mailing list + SMTP from composed instances ----
      const commTypes: CommType[] = ["birthday", "anniversary", "bible_study", "womens_study", "bulletin"]
      const prefilledOptions: Record<CommType, { mailingListId: string; smtpConfigId: string; additionalRecipients: string }> = {
        birthday: { mailingListId: "", smtpConfigId: "", additionalRecipients: "" },
        anniversary: { mailingListId: "", smtpConfigId: "", additionalRecipients: "" },
        bible_study: { mailingListId: "", smtpConfigId: "", additionalRecipients: "" },
        womens_study: { mailingListId: "", smtpConfigId: "", additionalRecipients: "" },
        bulletin: { mailingListId: "", smtpConfigId: "", additionalRecipients: "" },
      }
      for (const ct of commTypes) {
        const ci = composedMap[ct]
        if (ci) {
          prefilledOptions[ct] = {
            mailingListId: ci.mailing_list_id || "",
            smtpConfigId: ci.smtp_config_id || "",
            additionalRecipients: ci.additional_recipients || "",
          }
        }
      }
      setCommOptions(prefilledOptions)

      // ---- Match dispatches to communication types (count all, keep latest) ----
      const weekDispatches = weekDispatchesRes.data ?? []
      const matchedDispatches: Record<CommType, DispatchRecord | null> = {
        birthday: null,
        anniversary: null,
        bible_study: null,
        womens_study: null,
        bulletin: null,
      }
      const counts: Record<CommType, number> = {
        birthday: 0,
        anniversary: 0,
        bible_study: 0,
        womens_study: 0,
        bulletin: 0,
      }

      for (const d of weekDispatches) {
        for (const [type, matcher] of Object.entries(DISPATCH_MATCHERS)) {
          if (matcher(d.subject)) {
            counts[type as CommType]++
            if (!matchedDispatches[type as CommType]) {
              matchedDispatches[type as CommType] = d
            }
          }
        }
      }

      setDispatches(matchedDispatches)
      setDispatchCounts(counts)
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
      headerSubtitle: birthdayForm.headerSubtitle || undefined,
      primaryColor: birthdayForm.primaryColor || undefined,
      footerVerse: birthdayForm.footerVerse || undefined,
      resourceLinks: (birthdayForm.resourceLinks ?? []).filter((l) => l.url),
    })
  }, [birthdayForm])

  const anniversaryPreview = useMemo(() => {
    if (anniversaryForm.anniversaries.length === 0) return null
    return buildAnniversaryCard({
      weekLabel: anniversaryForm.weekLabel,
      anniversaries: anniversaryForm.anniversaries,
      message: anniversaryForm.message || undefined,
      headerSubtitle: anniversaryForm.headerSubtitle || undefined,
      primaryColor: anniversaryForm.primaryColor || undefined,
      footerVerse: anniversaryForm.footerVerse || undefined,
      resourceLinks: (anniversaryForm.resourceLinks ?? []).filter((l) => l.url),
    })
  }, [anniversaryForm])

  const bibleStudyPreview = useMemo(
    () =>
      buildBibleStudyCard({
        title: bibleStudyForm.title || undefined,
        date: bibleStudyForm.date,
        time: bibleStudyForm.time,
        topic: bibleStudyForm.topic || undefined,
        message: bibleStudyForm.message || undefined,
        headerSubtitle: bibleStudyForm.headerSubtitle || undefined,
        primaryColor: bibleStudyForm.primaryColor || undefined,
        footerVerse: bibleStudyForm.footerVerse || undefined,
        resourceLinks: (bibleStudyForm.resourceLinks ?? []).filter((l) => l.url),
        locations: bibleStudyForm.locations.map((loc) => ({
          label: loc.label,
          hostNames: loc.hostNames || undefined,
          address: loc.address || undefined,
          city: loc.city || undefined,
          phone: loc.phone || undefined,
        })),
      }),
    [bibleStudyForm]
  )

  const womensStudyPreview = useMemo(
    () =>
      buildWomensStudyCard({
        title: womensStudyForm.title || undefined,
        topic: womensStudyForm.topic || undefined,
        date: womensStudyForm.date,
        time: womensStudyForm.time,
        zoomLink: womensStudyForm.zoomLink || undefined,
        zoomMeetingId: womensStudyForm.zoomMeetingId || undefined,
        zoomPasscode: womensStudyForm.zoomPasscode || undefined,
        location: womensStudyForm.location || undefined,
        message: womensStudyForm.message || undefined,
        headerSubtitle: womensStudyForm.headerSubtitle || undefined,
        primaryColor: womensStudyForm.primaryColor || undefined,
        footerVerse: womensStudyForm.footerVerse || undefined,
        resourceLinks: (womensStudyForm.resourceLinks ?? []).filter((l) => l.url),
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
        resourceLinks: bulletinForm.resourceLinks,
        message: bulletinForm.message || undefined,
        headerSubtitle: bulletinForm.headerSubtitle || undefined,
        primaryColor: bulletinForm.primaryColor || undefined,
        footerVerse: bulletinForm.footerVerse || undefined,
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
        return `Weekly Bulletin for ${bulletinForm.weekLabel}`
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
      let subject = getSubject(type)
      if (!html) {
        toast.error("No content to send. Please add data first.")
        return
      }

      const currentStatus = getStatus(type)
      const isReminder = currentStatus === "sent" || currentStatus === "scheduled"
      if (isReminder && !subject.startsWith("Reminder: ")) {
        subject = `Reminder: ${subject}`
      }

      const opts = commOptions[type]
      if (!opts.mailingListId) {
        toast.error("Please select a mailing list before sending.")
        return
      }
      if (!opts.smtpConfigId) {
        toast.error("Please select a Send From account before sending.")
        return
      }

      setSendingType(type)
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        const { data: inserted, error } = await supabase
          .from("dispatch_queue")
          .insert({
            subject,
            body_html: html,
            scheduled_at: new Date().toISOString(),
            status: "pending",
            mailing_list_id: opts.mailingListId || null,
            smtp_config_id: opts.smtpConfigId || null,
            created_by: user?.id ?? null,
          } as never)
          .select("id")
          .single() as { data: { id: string } | null; error: { message: string } | null }

        if (error) {
          toast.error(`Failed: ${error.message}`)
        } else {
          toast.success(
            isReminder
              ? `Reminder queued for "${getSubject(type)}".`
              : `"${subject}" queued for dispatch. Go to Dispatch Queue to approve and send.`
          )
          setDispatches((prev) => ({
            ...prev,
            [type]: {
              id: inserted?.id ?? "local",
              subject,
              status: "pending",
              scheduled_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            },
          }))
          setDispatchCounts((prev) => ({
            ...prev,
            [type]: prev[type] + 1,
          }))

          await logAudit(
            isReminder ? "dispatch_reminder_sent" : "dispatch_created",
            "dispatch_queue",
            inserted?.id,
            { subject, commType: type, isReminder }
          )
        }
      } catch {
        toast.error("An unexpected error occurred")
      } finally {
        setSendingType(null)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      commOptions,
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
      const opts = commOptions[type]
      if (!opts.mailingListId) {
        toast.error("Please select a mailing list before scheduling.")
        return
      }
      if (!opts.smtpConfigId) {
        toast.error("Please select a Send From account before scheduling.")
        return
      }
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

    const opts = commOptions[type]

    setSendingType(type)
    setScheduleDialog((prev) => ({ ...prev, open: false }))

    try {
      const supabase = createClient()
      const scheduledAt = new Date(scheduleDialog.dateTime).toISOString()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data: inserted, error } = await supabase
        .from("dispatch_queue")
        .insert({
          subject,
          body_html: html,
          scheduled_at: scheduledAt,
          status: "pending",
          mailing_list_id: opts.mailingListId || null,
          smtp_config_id: opts.smtpConfigId || null,
          created_by: user?.id ?? null,
        } as never)
        .select("id")
        .single() as { data: { id: string } | null; error: { message: string } | null }

      if (error) {
        toast.error(`Failed: ${error.message}`)
      } else {
        toast.success(
          `"${subject}" scheduled for ${format(new Date(scheduledAt), "EEE, MMM d 'at' h:mm a")}`
        )
        setDispatches((prev) => ({
          ...prev,
          [type]: {
            id: inserted?.id ?? "local",
            subject,
            status: "pending",
            scheduled_at: scheduledAt,
            created_at: new Date().toISOString(),
          },
        }))
        setDispatchCounts((prev) => ({
          ...prev,
          [type]: prev[type] + 1,
        }))

        await logAudit("dispatch_scheduled", "dispatch_queue", inserted?.id, {
          subject,
          commType: type,
          scheduledAt,
        })
      }
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setSendingType(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    scheduleDialog,
    commOptions,
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
          href: "/members?view=family&filter=active",
        },
        {
          title: "Members",
          value: stats.activeMembers,
          icon: Users,
          color: "text-emerald-600 dark:text-emerald-400",
          bg: "bg-emerald-100 dark:bg-emerald-950/40",
          href: "/members?filter=active",
        },
        {
          title: "Birthdays (7d)",
          value: stats.upcomingBirthdays,
          icon: Cake,
          color: "text-purple-600 dark:text-purple-400",
          bg: "bg-purple-100 dark:bg-purple-950/40",
          href: "/reports",
        },
        {
          title: "Pending",
          value: stats.pendingDispatches,
          icon: Clock,
          color: "text-amber-600 dark:text-amber-400",
          bg: "bg-amber-100 dark:bg-amber-950/40",
          href: "/dispatch",
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
    lines.push(`${bibleStudyForm.date} at ${bibleStudyForm.time}`)
    for (const loc of bibleStudyForm.locations) {
      lines.push(`${loc.label}: ${loc.hostNames}${loc.address !== "TBD" ? ` — ${loc.address}` : ""}`)
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
            Communication Hub
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {weekOffset === 0 ? "This Week" : weekOffset === 1 ? "Next Week" : `${weekOffset} Weeks Ahead`}
          </h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {weekLabel || "..."}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
            disabled={weekOffset === 0}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant={weekOffset === 0 ? "default" : "outline"}
            size="sm"
            onClick={() => setWeekOffset(0)}
          >
            This Week
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset((w) => w + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Stats row moved to Members page */}

      {/* ── Upcoming Events Strip ──────────────────────────────── */}
      {!loading && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Upcoming This Week</p>
              <Link href="/calendar" className="text-xs text-primary hover:underline">Full Calendar</Link>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
              {(() => {
                const days: { date: Date; label: string }[] = []
                const start = getUpcomingSunday(addDays(new Date(), weekOffset * 7))
                for (let i = 0; i < 7; i++) {
                  const d = addDays(start, i)
                  days.push({ date: d, label: format(d, "EEE d") })
                }
                return days.map((day) => {
                  const dayBdays = birthdayForm.birthdays.filter((b) => {
                    const [m, d] = b.date.split("/").map(Number)
                    return m === day.date.getMonth() + 1 && d === day.date.getDate()
                  })
                  const dayAnnis = anniversaryForm.anniversaries.filter((a) => {
                    const [m, d] = a.date.split("/").map(Number)
                    return m === day.date.getMonth() + 1 && d === day.date.getDate()
                  })
                  const isToday = format(day.date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
                  return (
                    <div
                      key={day.label}
                      className={`flex min-w-[80px] flex-col items-center gap-1 rounded-lg border px-2 py-1.5 text-center ${isToday ? "border-primary bg-primary/5" : ""}`}
                    >
                      <span className={`text-[10px] font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>{day.label}</span>
                      {dayBdays.map((b, i) => (
                        <span key={`b${i}`} className="w-full truncate rounded-full bg-purple-500 px-1.5 py-0.5 text-[9px] text-white">{b.name.split(" ")[0]}</span>
                      ))}
                      {dayAnnis.map((a, i) => (
                        <span key={`a${i}`} className="w-full truncate rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] text-white">{a.husbandName}</span>
                      ))}
                      {dayBdays.length === 0 && dayAnnis.length === 0 && (
                        <span className="text-[9px] text-muted-foreground/30">—</span>
                      )}
                    </div>
                  )
                })
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Communication Summary Tabs ────────────────────────── */}
      {loading ? (
        <div className="space-y-4">
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-28 rounded-full" />)}
          </div>
          <CardSkeleton />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary pills */}
          <div className="flex flex-wrap gap-2">
            {([
              { type: "bulletin" as CommType, label: "Bulletin", color: "#4F46E5", icon: Newspaper },
              { type: "birthday" as CommType, label: "Birthdays", color: "#7C3AED", icon: Cake },
              { type: "anniversary" as CommType, label: "Anniversaries", color: "#D97706", icon: Heart },
              { type: "bible_study" as CommType, label: "Bible Study", color: "#0D9488", icon: BookOpen },
              { type: "womens_study" as CommType, label: "Women's Study", color: "#DB2777", icon: Users },
            ]).map(({ type, label, color, icon: Icon }) => {
              const status = getStatus(type)
              const count = dispatchCounts[type]
              const isActive = selectedCard === type
              return (
                <button
                  key={type}
                  onClick={() => setSelectedCard(type)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    isActive ? "text-white shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                  style={isActive ? { backgroundColor: color } : undefined}
                >
                  <Icon className="size-3.5" />
                  {label}
                  {status === "sent" && count > 0 && (
                    <span className={`rounded-full px-1.5 text-[10px] ${isActive ? "bg-white/20" : "bg-foreground/10"}`}>
                      {count}x
                    </span>
                  )}
                  {status === "scheduled" && (
                    <span className={`size-1.5 rounded-full ${isActive ? "bg-white/60" : "bg-amber-400"}`} />
                  )}
                </button>
              )
            })}
          </div>

          {/* Selected card expanded */}
          {selectedCard === "birthday" && (
            <WeeklyCommunicationCard title="Birthdays This Week" accentColor="#7C3AED" icon={Cake} status={getStatus("birthday")} summaryLines={birthdaySummary} subject={getSubject("birthday")} onSubjectChange={(v) => setSubjectOverride("birthday", v)} scheduledAt={getScheduledAt("birthday")} previewHtml={birthdayPreview} resourceLinks={(birthdayForm.resourceLinks ?? []).filter((l) => l.url)} onSchedule={() => handleSchedule("birthday")} onSendNow={() => handleSendNow("birthday")} mailingLists={mailingLists} smtpConfigs={smtpConfigs} selectedMailingList={commOptions.birthday.mailingListId} onMailingListChange={(id) => setCommOptions((prev) => ({ ...prev, birthday: { ...prev.birthday, mailingListId: id } }))} selectedSmtpConfig={commOptions.birthday.smtpConfigId} onSmtpConfigChange={(id) => setCommOptions((prev) => ({ ...prev, birthday: { ...prev.birthday, smtpConfigId: id } }))} sendCount={dispatchCounts.birthday} additionalRecipients={commOptions.birthday.additionalRecipients} onAdditionalRecipientsChange={(v) => setCommOptions((prev) => ({ ...prev, birthday: { ...prev.birthday, additionalRecipients: v } }))}>
              <BirthdayEditForm data={birthdayForm} onChange={setBirthdayForm} />
            </WeeklyCommunicationCard>
          )}
          {selectedCard === "anniversary" && (
            <WeeklyCommunicationCard title="Anniversaries This Week" accentColor="#D97706" icon={Heart} status={getStatus("anniversary")} summaryLines={anniversarySummary} subject={getSubject("anniversary")} onSubjectChange={(v) => setSubjectOverride("anniversary", v)} scheduledAt={getScheduledAt("anniversary")} previewHtml={anniversaryPreview} resourceLinks={(anniversaryForm.resourceLinks ?? []).filter((l) => l.url)} onSchedule={() => handleSchedule("anniversary")} onSendNow={() => handleSendNow("anniversary")} mailingLists={mailingLists} smtpConfigs={smtpConfigs} selectedMailingList={commOptions.anniversary.mailingListId} onMailingListChange={(id) => setCommOptions((prev) => ({ ...prev, anniversary: { ...prev.anniversary, mailingListId: id } }))} selectedSmtpConfig={commOptions.anniversary.smtpConfigId} onSmtpConfigChange={(id) => setCommOptions((prev) => ({ ...prev, anniversary: { ...prev.anniversary, smtpConfigId: id } }))} sendCount={dispatchCounts.anniversary} additionalRecipients={commOptions.anniversary.additionalRecipients} onAdditionalRecipientsChange={(v) => setCommOptions((prev) => ({ ...prev, anniversary: { ...prev.anniversary, additionalRecipients: v } }))}>
              <AnniversaryEditForm data={anniversaryForm} onChange={setAnniversaryForm} />
            </WeeklyCommunicationCard>
          )}
          {selectedCard === "bible_study" && (
            <WeeklyCommunicationCard title="Friday Bible Study Invite" accentColor="#0D9488" icon={BookOpen} status={getStatus("bible_study")} summaryLines={bibleStudySummary} subject={getSubject("bible_study")} onSubjectChange={(v) => setSubjectOverride("bible_study", v)} scheduledAt={getScheduledAt("bible_study")} previewHtml={bibleStudyPreview} resourceLinks={(bibleStudyForm.resourceLinks ?? []).filter((l) => l.url)} onSchedule={() => handleSchedule("bible_study")} onSendNow={() => handleSendNow("bible_study")} mailingLists={mailingLists} smtpConfigs={smtpConfigs} selectedMailingList={commOptions.bible_study.mailingListId} onMailingListChange={(id) => setCommOptions((prev) => ({ ...prev, bible_study: { ...prev.bible_study, mailingListId: id } }))} selectedSmtpConfig={commOptions.bible_study.smtpConfigId} onSmtpConfigChange={(id) => setCommOptions((prev) => ({ ...prev, bible_study: { ...prev.bible_study, smtpConfigId: id } }))} sendCount={dispatchCounts.bible_study} additionalRecipients={commOptions.bible_study.additionalRecipients} onAdditionalRecipientsChange={(v) => setCommOptions((prev) => ({ ...prev, bible_study: { ...prev.bible_study, additionalRecipients: v } }))}>
              <BibleStudyEditForm data={bibleStudyForm} onChange={setBibleStudyForm} />
            </WeeklyCommunicationCard>
          )}
          {selectedCard === "womens_study" && (
            <WeeklyCommunicationCard title="Wednesday Women's Bible Study" accentColor="#DB2777" icon={Users} status={getStatus("womens_study")} summaryLines={womensStudySummary} subject={getSubject("womens_study")} onSubjectChange={(v) => setSubjectOverride("womens_study", v)} scheduledAt={getScheduledAt("womens_study")} previewHtml={womensStudyPreview} resourceLinks={[...(womensStudyForm.zoomLink ? [{ label: "Join Zoom Meeting", url: womensStudyForm.zoomLink }] : []), ...(womensStudyForm.resourceLinks ?? []).filter((l) => l.url)]} onSchedule={() => handleSchedule("womens_study")} onSendNow={() => handleSendNow("womens_study")} mailingLists={mailingLists} smtpConfigs={smtpConfigs} selectedMailingList={commOptions.womens_study.mailingListId} onMailingListChange={(id) => setCommOptions((prev) => ({ ...prev, womens_study: { ...prev.womens_study, mailingListId: id } }))} selectedSmtpConfig={commOptions.womens_study.smtpConfigId} onSmtpConfigChange={(id) => setCommOptions((prev) => ({ ...prev, womens_study: { ...prev.womens_study, smtpConfigId: id } }))} sendCount={dispatchCounts.womens_study} additionalRecipients={commOptions.womens_study.additionalRecipients} onAdditionalRecipientsChange={(v) => setCommOptions((prev) => ({ ...prev, womens_study: { ...prev.womens_study, additionalRecipients: v } }))}>
              <WomensStudyEditForm data={womensStudyForm} onChange={setWomensStudyForm} />
            </WeeklyCommunicationCard>
          )}
          {selectedCard === "bulletin" && (
            <WeeklyCommunicationCard title="Weekly Bulletin" accentColor="#4F46E5" icon={Newspaper} status={getStatus("bulletin")} summaryLines={bulletinSummary} subject={getSubject("bulletin")} onSubjectChange={(v) => setSubjectOverride("bulletin", v)} scheduledAt={getScheduledAt("bulletin")} previewHtml={bulletinPreview} resourceLinks={bulletinForm.resourceLinks.filter((l) => l.url)} onSchedule={() => handleSchedule("bulletin")} onSendNow={() => handleSendNow("bulletin")} mailingLists={mailingLists} smtpConfigs={smtpConfigs} selectedMailingList={commOptions.bulletin.mailingListId} onMailingListChange={(id) => setCommOptions((prev) => ({ ...prev, bulletin: { ...prev.bulletin, mailingListId: id } }))} selectedSmtpConfig={commOptions.bulletin.smtpConfigId} onSmtpConfigChange={(id) => setCommOptions((prev) => ({ ...prev, bulletin: { ...prev.bulletin, smtpConfigId: id } }))} sendCount={dispatchCounts.bulletin} additionalRecipients={commOptions.bulletin.additionalRecipients} onAdditionalRecipientsChange={(v) => setCommOptions((prev) => ({ ...prev, bulletin: { ...prev.bulletin, additionalRecipients: v } }))}>
              <BulletinEditForm data={bulletinForm} onChange={setBulletinForm} />
            </WeeklyCommunicationCard>
          )}
        </div>
      )}

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
