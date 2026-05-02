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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Users,
  Home,
  Cake,
  Clock,
  BookOpen,
  Heart,
  Newspaper,
  HandHelping,
  CalendarDays,
  Mail,
  History,
  ArrowRight,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Settings2,
  Send,
  Pencil,
  Trash2,
  Plus,
  X,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  buildBirthdayCard,
  buildAnniversaryCard,
  buildBibleStudyCard,
  buildWomensStudyCard,
  buildPrayerMeetingCard,
  buildBulletinCard,
  buildCustomCard,
  type BirthdayEntry,
  type AnniversaryEntry,
  extractCommonCardData,
  type BaseCardData,
} from "@/lib/email/card-builder"
import { toast } from "sonner"
import {
  startOfWeek,
  endOfWeek,
  format,
  addDays,
} from "date-fns"
import { getOccurrences } from "@/lib/recurrence"

import {
  WeeklyCommunicationCard,
  type CommunicationStatus,
  type SmtpConfigOption,
} from "@/components/dashboard/weekly-communication-card"
import { logAudit } from "@/lib/audit"
import {
  parseBodyTemplate,
  FALLBACK_DEFAULTS,
  SUBJECT_FALLBACKS,
  extractCommonFields,
  type BibleStudyDefaults,
  type WomensStudyDefaults,
  type PrayerMeetingDefaults,
  type BulletinDefaults,
  type CommonCardFields,
} from "@/lib/template-defaults"
import { interpolate, interp, makeBirthdayVars, makeAnniversaryVars, makeEventVars, makeBulletinVars } from "@/lib/interpolate"
import {
  BirthdayEditForm,
  AnniversaryEditForm,
  BibleStudyEditForm,
  WomensStudyEditForm,
  PrayerMeetingEditForm,
  BulletinEditForm,
  type BirthdayFormData,
  type AnniversaryFormData,
  type BibleStudyFormData,
  type WomensStudyFormData,
  type PrayerMeetingFormData,
  type BulletinFormData,
  type BaseFormData,
  CustomSectionsEditor,
  ResourceLinksEditor,
  CardStyleFields,
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
  body_html: string | null
  status: string
  scheduled_at: string | null
  sent_at: string | null
  created_at: string
  template_type: string | null
  week_start: string | null
  mailing_list_id: string | null
  smtp_config_id: string | null
  additional_recipients: string | null
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
  | "prayer_meeting"
  | "bulletin"

const COMM_TYPE_TO_ET: Record<CommType, string> = {
  birthday: "birthday",
  anniversary: "anniversary",
  bible_study: "friday_bible_study",
  womens_study: "wednesday_womens_study",
  prayer_meeting: "monthly_prayer",
  bulletin: "bulletin",
}

// Fallback subject-based matching for legacy dispatches without template_type
const DISPATCH_MATCHERS: Record<CommType, (subject: string) => boolean> = {
  birthday: (s) => /birthday/i.test(s),
  anniversary: (s) => /anniversary/i.test(s),
  bible_study: (s) => /bible.?study/i.test(s) && !/women/i.test(s),
  womens_study: (s) => /women.*(?:bible|study)/i.test(s),
  prayer_meeting: (s) => /prayer/i.test(s),
  bulletin: (s) => /bulletin/i.test(s),
}

// ── Relative time helper ─────────────────────────────────────────────────

function formatRelativeTime(isoStr: string | null | undefined): string | null {
  if (!isoStr) return null
  const d = new Date(isoStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return format(d, "MMM d")
}

// ── Custom dashboard template form data ──────────────────────────────────

interface CustomDashFormData extends BaseFormData {
  title: string
  subtitle: string
  emoji: string
  body: string
  footerText: string
}

function buildCustomDashPreview(form: CustomDashFormData): string {
  return buildCustomCard({
    title: form.title || "Announcement",
    subtitle: form.subtitle || undefined,
    emoji: form.emoji || undefined,
    bodyHtml: form.body
      ? `<p style="margin:0;font-size:14px;line-height:1.6;white-space:pre-wrap">${form.body}</p>`
      : "",
    footerText: form.footerText || undefined,
    ...extractCommonCardData(form),
  })
}

const EMPTY_CUSTOM_FORM: CustomDashFormData = {
  title: "",
  subtitle: "",
  emoji: "📋",
  body: "",
  footerText: "",
  message: "",
  headerTitle: "",
  headerSubtitle: "",
  headerEmoji: "",
  primaryColor: "",
  footerVerse: "",
  resourceLinks: [],
  customSections: [],
}

// ── Template visibility ──────────────────────────────────────────────────

const BUILTIN_TEMPLATES: { type: CommType; label: string; color: string; icon: typeof Cake }[] = [
  { type: "bulletin", label: "Bulletin", color: "#4F46E5", icon: Newspaper },
  { type: "birthday", label: "Birthdays", color: "#7C3AED", icon: Cake },
  { type: "anniversary", label: "Anniversaries", color: "#D97706", icon: Heart },
  { type: "bible_study", label: "Bible Study", color: "#0D9488", icon: BookOpen },
  { type: "womens_study", label: "Women's Study", color: "#DB2777", icon: Users },
  { type: "prayer_meeting", label: "Prayer Meeting", color: "#059669", icon: HandHelping },
]

const TEMPLATE_STORAGE_KEY = "ccisr-dashboard-templates"

function loadVisibleTemplates(): CommType[] {
  if (typeof window === "undefined") return BUILTIN_TEMPLATES.map((t) => t.type)
  try {
    const saved = localStorage.getItem(TEMPLATE_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as string[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as CommType[]
    }
  } catch { /* ignore */ }
  return BUILTIN_TEMPLATES.map((t) => t.type)
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
  const [savedSubjectTemplates, setSavedSubjectTemplates] = useState<Record<string, string>>({})
  // ---- Template visibility ----
  const [visibleTemplates, setVisibleTemplates] = useState<CommType[]>(() => loadVisibleTemplates())

  function toggleTemplate(type: CommType) {
    setVisibleTemplates((prev) => {
      const next = prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
      localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  // ---- Composed instance tracking ----
  const [instanceIds, setInstanceIds] = useState<Partial<Record<CommType, string>>>({})
  const [instanceWeeks, setInstanceWeeks] = useState<Partial<Record<CommType, string>>>({})
  const [instanceUpdatedAt, setInstanceUpdatedAt] = useState<Partial<Record<CommType, string>>>({})
  const [savingInstance, setSavingInstance] = useState<CommType | null>(null)

  const [dispatches, setDispatches] = useState<
    Record<CommType, DispatchRecord | null>
  >({
    birthday: null,
    anniversary: null,
    bible_study: null,
    womens_study: null,
    prayer_meeting: null,
    bulletin: null,
  })

  // ---- Form state for each communication ----
  const [birthdayForm, setBirthdayForm] = useState<BirthdayFormData>({
    weekLabel: "",
    birthdays: [],
    message: "",
    headerTitle: "",
    headerSubtitle: "",
    headerEmoji: "",
    primaryColor: "",
    footerVerse: "",
    resourceLinks: [],
    customSections: [],
  })
  const [anniversaryForm, setAnniversaryForm] = useState<AnniversaryFormData>({
    weekLabel: "",
    anniversaries: [],
    message: "",
    headerTitle: "",
    headerSubtitle: "",
    headerEmoji: "",
    primaryColor: "",
    footerVerse: "",
    resourceLinks: [],
    customSections: [],
  })
  const [bibleStudyForm, setBibleStudyForm] = useState<BibleStudyFormData>({
    title: "Bible Study This Friday",
    date: "",
    time: "7:30 PM",
    topic: "Studying the Book of Acts",
    message: "",
    headerTitle: "",
    headerSubtitle: "",
    headerEmoji: "",
    primaryColor: "",
    footerVerse: "",
    resourceLinks: [],
    customSections: [],
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
    headerTitle: "",
    headerSubtitle: "",
    headerEmoji: "",
    primaryColor: "",
    footerVerse: "",
    resourceLinks: [],
    customSections: [],
  })
  const [prayerMeetingForm, setPrayerMeetingForm] = useState<PrayerMeetingFormData>({
    date: "",
    time: "6:00 PM",
    hostNames: "TBD",
    address: "TBD",
    city: "",
    phone: "",
    dinnerNote: "",
    signupLink: "",
    message: "",
    headerTitle: "",
    headerSubtitle: "",
    headerEmoji: "",
    primaryColor: "",
    footerVerse: "",
    resourceLinks: [],
    customSections: [],
  })
  const [bulletinForm, setBulletinForm] = useState<BulletinFormData>({
    weekLabel: "",
    birthdays: [],
    anniversaries: [],
    helpers: [],
    events: [],
    resourceLinks: [],
    customSections: [],
    message: "",
    headerTitle: "",
    headerSubtitle: "",
    headerEmoji: "",
    primaryColor: "",
    footerVerse: "",
  })

  // ---- Custom dashboard templates ----
  interface DashboardCustomTemplate {
    id: string
    name: string
    subject_template: string
    color: string
    emoji: string
    defaults: Record<string, unknown>
  }

  const [customDashTemplates, setCustomDashTemplates] = useState<DashboardCustomTemplate[]>([])
  const [customForms, setCustomForms] = useState<Record<string, CustomDashFormData>>({})
  const [customInstanceIds, setCustomInstanceIds] = useState<Record<string, string>>({})
  const [customDispatches, setCustomDispatches] = useState<Record<string, { status: string; count: number; lastSentAt: string | null }>>({})
  const [customSubjectOverrides, setCustomSubjectOverrides] = useState<Record<string, string>>({})
  const [customCommOptions, setCustomCommOptions] = useState<Record<string, { mailingListId: string; smtpConfigId: string; additionalRecipients: string }>>({})
  const [customSnapshots, setCustomSnapshots] = useState<Record<string, Record<string, unknown>>>({})
  const [selectedCustomCard, setSelectedCustomCard] = useState<string | null>(null)

  // ---- Saved form snapshots for cancel/revert ----
  const [savedSnapshots, setSavedSnapshots] = useState<Partial<Record<CommType, Record<string, unknown>>>>({})

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
    prayer_meeting: { mailingListId: "", smtpConfigId: "", additionalRecipients: "" },
    bulletin: { mailingListId: "", smtpConfigId: "", additionalRecipients: "" },
  })

  // ---- Dispatch counts per type ----
  const [dispatchCounts, setDispatchCounts] = useState<Record<CommType, number>>({
    birthday: 0,
    anniversary: 0,
    bible_study: 0,
    womens_study: 0,
    prayer_meeting: 0,
    bulletin: 0,
  })

  // ---- Multi-event count per comm type ----
  const [eventCounts, setEventCounts] = useState<Partial<Record<CommType, number>>>({})

  // ---- Schedule dialog state ----
  const [scheduleDialog, setScheduleDialog] = useState<{
    open: boolean
    commType: CommType | null
    dateTime: string
  }>({ open: false, commType: null, dateTime: "" })
  const [sendingType, setSendingType] = useState<CommType | null>(null)

  // ---- Week strip: recurring events + dispatches ----
  const [weekStripEvents, setWeekStripEvents] = useState<{ title: string; date: Date; color: string; commType: CommType | null }[]>([])
  const [weekStripDispatches, setWeekStripDispatches] = useState<{ label: string; date: string; color: string; status: string; targetLabel: string; commType: CommType | null; dispatchId: string }[]>([])

  // ---- Sent email preview ----
  const [sentEmailPreview, setSentEmailPreview] = useState<{ subject: string; html: string } | null>(null)

  // ---- Selected communication card (supports ?card= query param from calendar) ----
  const [selectedCard, setSelectedCard] = useState<CommType>("bulletin")
  const [cardParamApplied, setCardParamApplied] = useState(false)

  useEffect(() => {
    if (cardParamApplied) return
    const params = new URLSearchParams(window.location.search)
    const cardParam = params.get("card")
    const valid: CommType[] = ["birthday", "anniversary", "bible_study", "womens_study", "prayer_meeting", "bulletin"]
    if (cardParam && valid.includes(cardParam as CommType)) {
      setSelectedCard(cardParam as CommType)
    }
    setCardParamApplied(true)
  }, [cardParamApplied])

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
      const baseDate = addDays(today, weekOffset * 7)

      // Single calendar week: Sun–Sat — all cards use this same range
      const wkSun = startOfWeek(baseDate, { weekStartsOn: 0 })
      const wkSat = endOfWeek(baseDate, { weekStartsOn: 0 })
      const wl = `${format(wkSun, "MMM d")} – ${format(wkSat, "MMM d")}`
      setWeekLabel(wl)

      const weekDays = getWeekDays(wkSun, wkSat)
      const weekMonths = [...new Set(weekDays.map((d) => d.month))]
      const weekSet = new Set(weekDays.map((d) => `${d.month}-${d.day}`))

      // Next 7 days from today for stat card
      const next7End = addDays(today, 6)
      const next7Days = getWeekDays(today, next7End)
      const next7Months = [...new Set(next7Days.map((d) => d.month))]
      const next7Set = new Set(next7Days.map((d) => `${d.month}-${d.day}`))

      // Week range for dispatch query
      const wkSunISO = format(wkSun, "yyyy-MM-dd")
      const wkSatISO = format(wkSat, "yyyy-MM-dd")

      // Run all queries in parallel
      const [
        familiesRes,
        membersRes,
        dispatchCountRes,
        birthdayCountRes,
        weekBirthdaysRes,
        weekAnniversariesRes,
        activeEventsRes,
        weekInstancesRes,
        weekDispatchesRes,
        mailingListsRes,
        smtpConfigsRes,
        templateDefaultsRes,
        eventTypesRes,
        composedInstancesRes,
        stripDispatchesRes,
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

        // Birthday count (next 7 days) — exclude inactive families
        supabase
          .from("members")
          .select("birth_month, birth_day, family:families!family_id(is_active)")
          .eq("is_active", true)
          .not("birth_month", "is", null)
          .not("birth_day", "is", null)
          .in("birth_month", next7Months)
          .returns<{ birth_month: number; birth_day: number; family: { is_active: boolean } | null }[]>(),

        // Birthdays for current + bulletin weeks (include inactive for dimmed display)
        supabase
          .from("members")
          .select("id, full_name, birth_month, birth_day, is_active, family:families!family_id(is_active)")
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
              family: { is_active: boolean } | null
            }[]
          >(),

        // Anniversaries for current + bulletin weeks (include family active status)
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

        // Active events (for recurrence rules + host family)
        supabase
          .from("events")
          .select("*")
          .eq("is_active", true)
          .returns<{ id: string; title: string; event_type_id: string; recurrence_rule: string | null; default_time: string | null; host_family_id?: string | null; host_until?: string | null; is_active: boolean }[]>(),

        // Event instances for current week (host/location overrides)
        supabase
          .from("event_instances")
          .select("event_id, instance_date, instance_time, location_override, notes, host_family_id, status")
          .gte("instance_date", wkSunISO)
          .lte("instance_date", wkSatISO)
          .neq("status", "cancelled")
          .returns<{
            event_id: string
            instance_date: string
            instance_time: string | null
            location_override: string | null
            notes: string | null
            host_family_id: string | null
            status: string
          }[]>(),

        // This week dispatches (for card status — matched by target week)
        supabase
          .from("dispatch_queue")
          .select("id, subject, body_html, status, scheduled_at, sent_at, created_at, template_type, week_start, mailing_list_id, smtp_config_id, additional_recipients")
          .not("status", "eq", "cancelled")
          .or(`week_start.eq.${wkSunISO},and(week_start.is.null,created_at.gte.${wkSunISO},created_at.lte.${wkSatISO}T23:59:59)`)
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

        // Composed instances: match current week, bulletin week, or recurring
        supabase
          .from("composed_instances")
          .select("id, template_type, form_data, subject, mailing_list_id, smtp_config_id, additional_recipients, week_start, is_recurring, recur_until, updated_at")
          .eq("is_active", true)
          .or(`week_start.eq.${wkSunISO},and(is_recurring.eq.true,week_start.lte.${wkSunISO})`)
          .returns<{ id: string; template_type: string; form_data: Record<string, unknown>; subject: string; mailing_list_id: string | null; smtp_config_id: string | null; additional_recipients: string | null; week_start: string | null; is_recurring: boolean; recur_until: string | null; updated_at: string }[]>(),

        // Strip dispatches: anything sent during this week (for the upcoming strip)
        supabase
          .from("dispatch_queue")
          .select("id, subject, template_type, status, sent_at, created_at, week_start")
          .not("status", "eq", "cancelled")
          .or(`and(sent_at.gte.${wkSunISO},sent_at.lte.${wkSatISO}T23:59:59),and(status.neq.sent,week_start.eq.${wkSunISO})`)
          .order("created_at", { ascending: false })
          .returns<{ id: string; subject: string; template_type: string | null; status: string; sent_at: string | null; created_at: string; week_start: string | null }[]>(),
      ])

      // Check errors
      if (familiesRes.error) throw familiesRes.error
      if (membersRes.error) throw membersRes.error
      if (dispatchCountRes.error) throw dispatchCountRes.error
      if (birthdayCountRes.error) throw birthdayCountRes.error
      if (weekBirthdaysRes.error) throw weekBirthdaysRes.error
      if (weekAnniversariesRes.error) throw weekAnniversariesRes.error
      if (activeEventsRes.error) throw activeEventsRes.error
      if (weekInstancesRes.error) throw weekInstancesRes.error
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

      setSavedSubjectTemplates(
        Object.fromEntries(Object.entries(savedDefaults).map(([k, v]) => [k, v.subject]))
      )

      // Build composed instances map (template_type → data)
      type CIRow = (typeof composedInstancesRes.data extends (infer U)[] | null ? U : never)
      const composedMap: Record<string, CIRow> = {}
      if (composedInstancesRes.data) {
        for (const ci of composedInstancesRes.data) {
          if (ci.is_recurring && ci.recur_until && ci.recur_until < wkSunISO) continue
          const existing = composedMap[ci.template_type]
          if (!existing) {
            composedMap[ci.template_type] = ci
          } else {
            const rank = (c: CIRow) => c.week_start === wkSunISO ? 2 : c.is_recurring ? 1 : 0
            if (rank(ci) > rank(existing)) composedMap[ci.template_type] = ci
          }
        }
      }

      // Track composed instance IDs, week_start, and updated_at for save/delete
      const resolvedInstanceIds: Partial<Record<CommType, string>> = {}
      const resolvedInstanceWeeks: Partial<Record<CommType, string>> = {}
      const resolvedInstanceUpdatedAt: Partial<Record<CommType, string>> = {}
      const commTypeKeys: CommType[] = ["birthday", "anniversary", "bible_study", "womens_study", "prayer_meeting", "bulletin"]
      for (const ct of commTypeKeys) {
        if (composedMap[ct]) {
          resolvedInstanceIds[ct] = composedMap[ct].id
          if (composedMap[ct].week_start) resolvedInstanceWeeks[ct] = composedMap[ct].week_start!
          if (composedMap[ct].updated_at) resolvedInstanceUpdatedAt[ct] = composedMap[ct].updated_at
        }
      }
      setInstanceIds(resolvedInstanceIds)
      setInstanceWeeks(resolvedInstanceWeeks)
      setInstanceUpdatedAt(resolvedInstanceUpdatedAt)

      // Priority: composed instance > template defaults > hardcoded fallbacks
      const resolve = (ciKey: string, etKey: string, fallbackKey?: string): CommonCardFields & Record<string, unknown> =>
        (composedMap[ciKey]?.form_data ?? savedDefaults[etKey]?.data ?? (fallbackKey ? FALLBACK_DEFAULTS[fallbackKey].data : {})) as CommonCardFields & Record<string, unknown>

      const bsDef = resolve("bible_study", "friday_bible_study", "friday_bible_study") as BibleStudyDefaults
      const wsDef = resolve("womens_study", "wednesday_womens_study", "wednesday_womens_study") as WomensStudyDefaults
      const pmDef = resolve("prayer_meeting", "monthly_prayer") as PrayerMeetingDefaults
      const bdDef = resolve("birthday", "birthday") as CommonCardFields
      const anDef = resolve("anniversary", "anniversary") as CommonCardFields
      const bulDef = resolve("bulletin", "bulletin", "bulletin") as BulletinDefaults

      // ---- Stats ----
      const upcomingBirthdayCount = (birthdayCountRes.data ?? []).filter((m) =>
        next7Set.has(`${m.birth_month}-${m.birth_day}`) && m.family?.is_active !== false
      ).length

      setStats({
        totalFamilies: familiesRes.count ?? 0,
        activeMembers: membersRes.count ?? 0,
        upcomingBirthdays: upcomingBirthdayCount,
        pendingDispatches: dispatchCountRes.count ?? 0,
      })

      // ---- Process birthdays (active first, inactive dimmed) ----
      // A member is considered inactive if they or their family is inactive
      const isActiveMember = (m: { is_active: boolean; family: { is_active: boolean } | null }) =>
        m.is_active && m.family?.is_active !== false

      const bdays = (weekBirthdaysRes.data ?? [])
        .filter((m) => weekSet.has(`${m.birth_month}-${m.birth_day}`))
        .sort((a, b) => {
          const aActive = isActiveMember(a)
          const bActive = isActiveMember(b)
          if (aActive !== bActive) return aActive ? -1 : 1
          return a.birth_month !== b.birth_month
            ? a.birth_month - b.birth_month
            : a.birth_day - b.birth_day
        })

      const bdayEntries: BirthdayEntry[] = bdays
        .filter(isActiveMember)
        .map((m) => ({
          name: m.full_name,
          date: `${m.birth_month}/${m.birth_day}`,
        }))

      const inactiveBdays = bdays
        .filter((m) => !isActiveMember(m))
        .map((m) => `${m.full_name} (${m.birth_month}/${m.birth_day})`)

      const hasBdDraft = !!composedMap["birthday"]
      const bdCommon = extractCommonFields(bdDef)
      if (hasBdDraft) {
        const fd = composedMap["birthday"].form_data as Record<string, unknown>
        setBirthdayForm({
          weekLabel: (fd.weekLabel as string) ?? wl,
          birthdays: (fd.birthdays as BirthdayFormData["birthdays"]) ?? bdayEntries,
          ...bdCommon,
        })
      } else {
        setBirthdayForm({
          weekLabel: wl,
          birthdays: bdayEntries,
          ...bdCommon,
          message: inactiveBdays.length > 0
            ? `Note: Inactive members with birthdays this week: ${inactiveBdays.join(", ")}`
            : bdCommon.message,
        })
      }

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

      const hasAnDraft = !!composedMap["anniversary"]
      const anCommon = extractCommonFields(anDef)
      if (hasAnDraft) {
        const fd = composedMap["anniversary"].form_data as Record<string, unknown>
        setAnniversaryForm({
          weekLabel: (fd.weekLabel as string) ?? wl,
          anniversaries: (fd.anniversaries as AnniversaryFormData["anniversaries"]) ?? anniEntries,
          ...anCommon,
        })
      } else {
        setAnniversaryForm({
          weekLabel: wl,
          anniversaries: anniEntries,
          ...anCommon,
          message: inactiveAnnis.length > 0
            ? `Note: ${inactiveAnnis.length} inactive family anniversar${inactiveAnnis.length > 1 ? "ies" : "y"} not shown`
            : anCommon.message,
        })
      }

      // ---- Recurrence-based event processing ----
      // Build event type name map for matching events to comm types
      const activeEvents = activeEventsRes.data ?? []
      const weekInstances = weekInstancesRes.data ?? []

      // Helper: find event instance for a specific event on a specific date
      const findInstance = (eventId: string, dateStr: string) =>
        weekInstances.find((i) => i.event_id === eventId && i.instance_date === dateStr)

      // Helper: resolve host family info from an instance
      async function resolveHostFamily(hostFamilyId: string | null) {
        if (!hostFamilyId) return { hostName: "TBD", address: "TBD", city: "", phone: "" }
        const [familyRes, addrRes] = await Promise.all([
          supabase.from("families").select("family_name, home_phone").eq("id", hostFamilyId)
            .returns<{ family_name: string; home_phone: string | null }[]>().single(),
          supabase.from("addresses").select("full_address, city, state, zip").eq("family_id", hostFamilyId).eq("is_current", true)
            .returns<{ full_address: string; city: string | null; state: string | null; zip: string | null }[]>().limit(1).single(),
        ])
        return {
          hostName: familyRes.data?.family_name ?? "TBD",
          address: addrRes.data?.full_address ?? "TBD",
          city: [addrRes.data?.city, addrRes.data?.state, addrRes.data?.zip].filter(Boolean).join(", "),
          phone: familyRes.data?.home_phone ?? "",
        }
      }

      // Find events by type name (first match used for dashboard card, count for indicator)
      const findEventsByType = (typeName: string) =>
        activeEvents.filter((e) => etIdToName[e.event_type_id] === typeName)
      const findEventByType = (typeName: string) => findEventsByType(typeName)[0] ?? undefined

      // Track event counts per comm type for multi-event indicator
      {
        const counts: Partial<Record<CommType, number>> = {}
        for (const [ct, etName] of Object.entries(COMM_TYPE_TO_ET)) {
          counts[ct as CommType] = findEventsByType(etName).length
        }
        setEventCounts(counts)
      }

      // ---- Build week strip events (all recurring events resolved to dates) ----
      {
        const etNameToCommColor: Record<string, string> = {}
        const etNameToCommType: Record<string, CommType> = {}
        for (const bt of BUILTIN_TEMPLATES) {
          const etName = COMM_TYPE_TO_ET[bt.type]
          if (etName) {
            etNameToCommColor[etName] = bt.color
            etNameToCommType[etName] = bt.type
          }
        }
        const stripEvts: { title: string; date: Date; color: string; commType: CommType | null }[] = []
        for (const evt of activeEvents) {
          if (!evt.recurrence_rule) continue
          const etName = etIdToName[evt.event_type_id] ?? ""
          const color = etNameToCommColor[etName] ?? "#6B7280"
          const commType = etNameToCommType[etName] ?? null
          const occs = getOccurrences(evt.recurrence_rule, wkSun, wkSat)
          for (const occ of occs) {
            stripEvts.push({ title: evt.title, date: occ, color, commType })
          }
        }
        setWeekStripEvents(stripEvts)
      }

      // ---- Process Bible Study (recurrence-based) ----
      const hasBsDraft = !!composedMap["bible_study"]
      const bsEvent = findEventByType("friday_bible_study")
      const bsOccurrences = bsEvent ? getOccurrences(bsEvent.recurrence_rule, wkSun, wkSat) : []
      const bsDate = bsOccurrences.length > 0 ? bsOccurrences[0] : null
      const bsInstance = bsDate && bsEvent ? findInstance(bsEvent.id, format(bsDate, "yyyy-MM-dd")) : null

      const bsCommon = extractCommonFields(bsDef)
      if (bsCommon.resourceLinks.length === 0) {
        const def = bsDef as Record<string, unknown>
        const url = (def.resourceLinkUrl as string) ?? ""
        if (url) bsCommon.resourceLinks = [{ label: (def.resourceLinkLabel as string) || "View Resources", url }]
      }

      const bsDateStr = bsDate ? format(bsDate, "EEEE, MMMM do") : "No bible study this week"
      const bsTimeStr = bsInstance?.instance_time ? formatTime(bsInstance.instance_time) : null

      if (hasBsDraft) {
        const fd = composedMap["bible_study"].form_data as Record<string, unknown>
        setBibleStudyForm({
          title: (fd.title as string) ?? bsDef.title ?? "Bible Study This Friday",
          date: bsDateStr,
          time: bsTimeStr ?? (fd.time as string) ?? bsDef.time ?? "7:30 PM",
          topic: (fd.topic as string) ?? bsDef.topic ?? "Studying the Book of Acts",
          locations: (fd.locations as BibleStudyFormData["locations"]) ?? bsDef.locations ?? [],
          ...bsCommon,
        })
      } else {
        let bsHostData = { hostName: "TBD", address: "TBD", city: "", phone: "" }
        if (bsInstance?.host_family_id) {
          bsHostData = await resolveHostFamily(bsInstance.host_family_id)
        } else if (bsEvent?.host_family_id) {
          const expired = bsEvent.host_until ? new Date(bsEvent.host_until + "T23:59:59") < new Date() : false
          if (!expired) bsHostData = await resolveHostFamily(bsEvent.host_family_id)
        }
        if (bsInstance?.location_override) bsHostData.address = bsInstance.location_override
        if (bsInstance?.notes) {
          const contactMatch = bsInstance.notes.match(/Contact:\s*(.+)/i)
          if (contactMatch) bsHostData.phone = contactMatch[1].trim()
        }

        const savedLocs = bsDef.locations ?? (FALLBACK_DEFAULTS.friday_bible_study.data as BibleStudyDefaults).locations ?? []
        const mergedLocs = savedLocs.map((loc, i) => {
          const base = { onVacation: false, vacationMessage: "", ...loc }
          if (i === 0 && bsHostData.hostName !== "TBD" && !base.onVacation) {
            return { ...base, hostNames: bsHostData.hostName, address: bsHostData.address, city: bsHostData.city, phone: bsHostData.phone }
          }
          return base
        })

        setBibleStudyForm({
          title: bsDef.title ?? "Bible Study This Friday",
          date: bsDate ? format(bsDate, "EEEE, MMMM do") : "No bible study this week",
          time: bsInstance?.instance_time
            ? formatTime(bsInstance.instance_time)
            : bsDef.time ?? "7:30 PM",
          topic: bsDef.topic ?? "Studying the Book of Acts",
          ...bsCommon,
          locations: mergedLocs,
        })
      }

      // ---- Women's Study (recurrence-based) ----
      const hasWsDraft = !!composedMap["womens_study"]
      const wsEvent = findEventByType("wednesday_womens_study")
      const wsOccurrences = wsEvent ? getOccurrences(wsEvent.recurrence_rule, wkSun, wkSat) : []
      const wsDate = wsOccurrences.length > 0 ? wsOccurrences[0] : null

      const wsDateStr = wsDate ? format(wsDate, "EEEE, MMMM do") : "No study this week"

      const wsCommon = extractCommonFields(wsDef)
      if (hasWsDraft) {
        const fd = composedMap["womens_study"].form_data as Record<string, unknown>
        setWomensStudyForm({
          title: (fd.title as string) ?? wsDef.title ?? "Women's Bible Study",
          topic: (fd.topic as string) ?? wsDef.topic ?? "Building a Relationship with God",
          date: wsDateStr,
          time: (fd.time as string) ?? wsDef.time ?? "7:00 PM",
          zoomLink: (fd.zoomLink as string) ?? wsDef.zoomLink ?? "",
          zoomMeetingId: (fd.zoomMeetingId as string) ?? wsDef.zoomMeetingId ?? "",
          zoomPasscode: (fd.zoomPasscode as string) ?? wsDef.zoomPasscode ?? "",
          location: (fd.location as string) ?? wsDef.location ?? "",
          ...wsCommon,
        })
      } else {
        setWomensStudyForm({
          title: wsDef.title ?? "Women's Bible Study",
          topic: wsDef.topic ?? "Building a Relationship with God",
          date: wsDate ? format(wsDate, "EEEE, MMMM do") : "No study this week",
          time: wsDef.time ?? "7:00 PM",
          zoomLink: wsDef.zoomLink ?? "",
          zoomMeetingId: wsDef.zoomMeetingId ?? "",
          zoomPasscode: wsDef.zoomPasscode ?? "",
          location: wsDef.location ?? "",
          ...wsCommon,
        })
      }

      // ---- Prayer Meeting (recurrence-based) ----
      const hasPmDraft = !!composedMap["prayer_meeting"]
      const pmEvent = findEventByType("monthly_prayer")
      const pmOccurrences = pmEvent ? getOccurrences(pmEvent.recurrence_rule, wkSun, wkSat) : []
      const pmDate = pmOccurrences.length > 0 ? pmOccurrences[0] : null
      const pmInstance = pmDate && pmEvent ? findInstance(pmEvent.id, format(pmDate, "yyyy-MM-dd")) : null

      const pmDateStr = pmDate ? format(pmDate, "EEEE, MMMM do") : null
      const pmTimeStr = pmInstance?.instance_time ? formatTime(pmInstance.instance_time) : null

      const pmCommon = extractCommonFields(pmDef)
      if (hasPmDraft) {
        const fd = composedMap["prayer_meeting"].form_data as Record<string, unknown>
        setPrayerMeetingForm({
          date: pmDateStr ?? (pmEvent ? "Not scheduled this week" : (fd.date as string) ?? ""),
          time: pmTimeStr ?? ((fd.time as string) ?? pmDef.time ?? "6:00 PM"),
          hostNames: (fd.hostNames as string) ?? pmDef.hostNames ?? "TBD",
          address: (fd.address as string) ?? pmDef.address ?? "TBD",
          city: (fd.city as string) ?? pmDef.city ?? "",
          phone: (fd.phone as string) ?? pmDef.phone ?? "",
          dinnerNote: (fd.dinnerNote as string) ?? pmDef.dinnerNote ?? "",
          signupLink: (fd.signupLink as string) ?? pmDef.signupLink ?? "",
          ...pmCommon,
        })
      } else {
        let pmHostData = { hostName: pmDef.hostNames ?? "TBD", address: pmDef.address ?? "TBD", city: pmDef.city ?? "", phone: pmDef.phone ?? "" }
        if (pmInstance?.host_family_id) {
          pmHostData = await resolveHostFamily(pmInstance.host_family_id)
        } else if (pmEvent?.host_family_id) {
          const expired = pmEvent.host_until ? new Date(pmEvent.host_until + "T23:59:59") < new Date() : false
          if (!expired) pmHostData = await resolveHostFamily(pmEvent.host_family_id)
        }
        if (pmInstance?.location_override) pmHostData.address = pmInstance.location_override

        setPrayerMeetingForm({
          date: pmDateStr ?? pmDef.date ?? "",
          time: pmTimeStr ?? pmDef.time ?? "6:00 PM",
          hostNames: pmHostData.hostName,
          address: pmHostData.address,
          city: pmHostData.city,
          phone: pmHostData.phone,
          dinnerNote: pmDef.dinnerNote ?? "",
          signupLink: pmDef.signupLink ?? "",
          ...pmCommon,
        })
      }

      // ---- Bulletin (same week as everything else) ----
      const hasBulDraft = !!composedMap["bulletin"]
      const bulCommon = extractCommonFields(bulDef)

      if (hasBulDraft) {
        const fd = composedMap["bulletin"].form_data as Record<string, unknown>
        setBulletinForm({
          weekLabel: (fd.weekLabel as string) ?? `Week of ${wl}`,
          birthdays: (fd.birthdays as BulletinFormData["birthdays"]) ?? bdayEntries.map((b) => ({ name: b.name, date: b.date })),
          anniversaries: (fd.anniversaries as BulletinFormData["anniversaries"]) ?? anniEntries.map((a) => ({ names: `${a.husbandName} & ${a.wifeName}`, date: a.date })),
          helpers: (fd.helpers as BulletinFormData["helpers"]) ?? [],
          events: (fd.events as BulletinFormData["events"]) ?? [],
          sectionOrder: (fd.sectionOrder as BulletinFormData["sectionOrder"]) ?? undefined,
          ...bulCommon,
        })
      } else {
        const bulEvents = bulDef.events ?? (FALLBACK_DEFAULTS.bulletin.data as BulletinDefaults).events ?? []
        const bulHelpers = (bulDef as Record<string, unknown>).helpers as BulletinFormData["helpers"] ?? []
        setBulletinForm({
          weekLabel: `Week of ${wl}`,
          birthdays: bdayEntries.map((b) => ({ name: b.name, date: b.date })),
          anniversaries: anniEntries.map((a) => ({
            names: `${a.husbandName} & ${a.wifeName}`,
            date: a.date,
          })),
          helpers: bulHelpers,
          events: bulEvents,
          ...bulCommon,
        })
      }

      // ---- Custom dashboard templates ----
      const { data: customTmpls } = await supabase
        .from("email_templates")
        .select("id, name, subject_template, body_template")
        .eq("is_default", false)
        .order("name")
        .returns<{ id: string; name: string; subject_template: string; body_template: string }[]>()

      const dashCustom: DashboardCustomTemplate[] = []
      const customFormInit: Record<string, CustomDashFormData> = {}
      const customInstIds: Record<string, string> = {}
      const customSubjOvr: Record<string, string> = {}

      for (const ct of customTmpls ?? []) {
        const ctKey = `custom:${ct.id}`
        let parsed: Record<string, unknown> = {}
        try { parsed = JSON.parse(ct.body_template) } catch { /* ignore */ }

        dashCustom.push({
          id: ct.id,
          name: ct.name,
          subject_template: ct.subject_template,
          color: (parsed.primaryColor as string) || "#6B7280",
          emoji: (parsed.emoji as string) || "📋",
          defaults: parsed,
        })

        const ci = composedMap[ctKey]
        if (ci) {
          const fd = ci.form_data as Record<string, unknown>
          customFormInit[ct.id] = {
            title: (fd.title as string) ?? (parsed.title as string) ?? ct.name,
            subtitle: (fd.subtitle as string) ?? (parsed.subtitle as string) ?? "",
            emoji: (fd.emoji as string) ?? (parsed.emoji as string) ?? "📋",
            body: (fd.body as string) ?? (parsed.body as string) ?? "",
            footerText: (fd.footerText as string) ?? (parsed.footerText as string) ?? "",
            message: (fd.message as string) ?? "",
            headerTitle: (fd.headerTitle as string) ?? "",
            headerSubtitle: (fd.headerSubtitle as string) ?? "",
            headerEmoji: (fd.headerEmoji as string) ?? "",
            primaryColor: (fd.primaryColor as string) ?? (parsed.primaryColor as string) ?? "",
            footerVerse: (fd.footerVerse as string) ?? "",
            resourceLinks: (fd.resourceLinks as BaseFormData["resourceLinks"]) ?? (parsed.resourceLinks as BaseFormData["resourceLinks"]) ?? [],
            customSections: (fd.customSections as BaseFormData["customSections"]) ?? (parsed.customSections as BaseFormData["customSections"]) ?? [],
          }
          customInstIds[ct.id] = ci.id
          if (ci.subject) customSubjOvr[ct.id] = ci.subject
        } else {
          customFormInit[ct.id] = {
            ...EMPTY_CUSTOM_FORM,
            title: (parsed.title as string) || ct.name,
            subtitle: (parsed.subtitle as string) || "",
            emoji: (parsed.emoji as string) || "📋",
            body: (parsed.body as string) || "",
            footerText: (parsed.footerText as string) || "",
            primaryColor: (parsed.primaryColor as string) || "",
            resourceLinks: (parsed.resourceLinks as BaseFormData["resourceLinks"]) ?? [],
            customSections: (parsed.customSections as BaseFormData["customSections"]) ?? [],
          }
        }
      }

      const customCommOpts: Record<string, { mailingListId: string; smtpConfigId: string; additionalRecipients: string }> = {}
      for (const ct of dashCustom) {
        const ci = composedMap[`custom:${ct.id}`]
        customCommOpts[ct.id] = {
          mailingListId: ci?.mailing_list_id || "",
          smtpConfigId: ci?.smtp_config_id || "",
          additionalRecipients: ci?.additional_recipients || "",
        }
      }

      setCustomDashTemplates(dashCustom)
      setCustomForms(customFormInit)
      setCustomInstanceIds(customInstIds)
      setCustomSubjectOverrides(customSubjOvr)
      setCustomCommOptions(customCommOpts)
      setCustomSnapshots(Object.fromEntries(Object.entries(customFormInit).map(([k, v]) => [k, structuredClone(v as unknown as Record<string, unknown>)])))

      // ---- Mailing lists + SMTP configs ----
      setMailingLists(mailingListsRes.data ?? [])
      setSmtpConfigs(smtpConfigsRes.data ?? [])

      // ---- Pre-fill mailing list + SMTP from composed instances ----
      const commTypes: CommType[] = ["birthday", "anniversary", "bible_study", "womens_study", "prayer_meeting", "bulletin"]
      const prefilledOptions: Record<CommType, { mailingListId: string; smtpConfigId: string; additionalRecipients: string }> = {
        birthday: { mailingListId: "", smtpConfigId: "", additionalRecipients: "" },
        anniversary: { mailingListId: "", smtpConfigId: "", additionalRecipients: "" },
        bible_study: { mailingListId: "", smtpConfigId: "", additionalRecipients: "" },
        womens_study: { mailingListId: "", smtpConfigId: "", additionalRecipients: "" },
        prayer_meeting: { mailingListId: "", smtpConfigId: "", additionalRecipients: "" },
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

      // Pre-fill custom subjects from composed instances
      const subjectOverrides: Partial<Record<CommType, string>> = {}
      for (const ct of commTypeKeys) {
        const ci = composedMap[ct]
        if (ci?.subject) subjectOverrides[ct] = ci.subject
      }

      // ---- Match dispatches to communication types (count all, keep latest) ----
      const weekDispatches = weekDispatchesRes.data ?? []
      const matchedDispatches: Record<CommType, DispatchRecord | null> = {
        birthday: null,
        anniversary: null,
        bible_study: null,
        womens_study: null,
        prayer_meeting: null,
        bulletin: null,
      }
      const counts: Record<CommType, number> = {
        birthday: 0,
        anniversary: 0,
        bible_study: 0,
        womens_study: 0,
        prayer_meeting: 0,
        bulletin: 0,
      }

      for (const d of weekDispatches) {
        let matched = false
        // Prefer explicit template_type over subject regex
        if (d.template_type && (d.template_type as CommType) in counts) {
          const ct = d.template_type as CommType
          counts[ct]++
          if (!matchedDispatches[ct]) matchedDispatches[ct] = d
          matched = true
        }
        // Fallback: regex match for legacy dispatches without template_type
        if (!matched) {
          for (const [type, matcher] of Object.entries(DISPATCH_MATCHERS)) {
            if (matcher(d.subject)) {
              counts[type as CommType]++
              if (!matchedDispatches[type as CommType]) {
                matchedDispatches[type as CommType] = d
              }
            }
          }
        }
      }

      setDispatches(matchedDispatches)
      setDispatchCounts(counts)

      // Build strip dispatch indicators (from dedicated strip query — sent during this week + pending for this week)
      {
        const commColorMap: Record<string, string> = {}
        const commLabelMap: Record<string, string> = {}
        for (const bt of BUILTIN_TEMPLATES) {
          commColorMap[bt.type] = bt.color
          commLabelMap[bt.type] = bt.label
        }
        const stripDisps: { label: string; date: string; color: string; status: string; targetLabel: string; commType: CommType | null; dispatchId: string }[] = []
        const seen = new Set<string>()
        for (const d of (stripDispatchesRes.data ?? [])) {
          const ct = d.template_type ?? ""
          const key = `${ct}:${d.status}`
          if (seen.has(key)) continue
          seen.add(key)
          const color = commColorMap[ct] ?? "#6B7280"
          const label = commLabelMap[ct] || d.subject.split("—")[0].trim().split(" ").slice(0, 2).join(" ") || "Email"
          const commType = ct in commColorMap ? (ct as CommType) : null
          const isSent = d.status === "sent"
          const dateStr = isSent && d.sent_at
            ? format(new Date(d.sent_at), "yyyy-MM-dd")
            : d.week_start ?? format(new Date(d.created_at), "yyyy-MM-dd")
          let targetLabel = ""
          if (d.week_start && d.week_start !== wkSunISO) {
            const ws = new Date(d.week_start + "T00:00:00")
            const we = addDays(ws, 6)
            targetLabel = `${format(ws, "MMM d")}–${format(we, "d")}`
          }
          stripDisps.push({ label, date: dateStr, color, status: d.status, targetLabel, commType, dispatchId: d.id })
        }
        setWeekStripDispatches(stripDisps)
      }

      // Fallback: pre-fill mailing list + SMTP from dispatches when no composed instance
      for (const ct of commTypes) {
        if (!prefilledOptions[ct].mailingListId && !prefilledOptions[ct].smtpConfigId) {
          const d = matchedDispatches[ct]
          if (d) {
            prefilledOptions[ct] = {
              mailingListId: d.mailing_list_id || "",
              smtpConfigId: d.smtp_config_id || "",
              additionalRecipients: d.additional_recipients || "",
            }
          }
        }
      }
      setCommOptions(prefilledOptions)
      setCustomSubjects(subjectOverrides)

      // Match dispatches for custom templates
      const customDispInfo: Record<string, { status: string; count: number; lastSentAt: string | null }> = {}
      for (const ct of dashCustom) {
        const ctKey = `custom:${ct.id}`
        let dCount = 0
        let dStatus = "draft"
        let lastSent: string | null = null
        for (const d of weekDispatches) {
          if (d.template_type === ctKey) {
            dCount++
            if (dCount === 1) dStatus = mapDispatchStatus(d.status)
            if (d.sent_at && (!lastSent || d.sent_at > lastSent)) lastSent = d.sent_at
          }
        }
        customDispInfo[ct.id] = { status: dStatus, count: dCount, lastSentAt: lastSent }
      }
      setCustomDispatches(customDispInfo)
    } catch (err) {
      console.error("Dashboard fetch error:", err)
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard data"
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!loading) snapshotAllForms()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

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

  function interpCommon(form: import("@/components/dashboard/communication-edit-forms").BaseFormData, vars: Record<string, string>): BaseCardData {
    return {
      ...extractCommonCardData(form),
      message: interp(form.message, vars) || undefined,
      headerSubtitle: interp(form.headerSubtitle, vars) || undefined,
      footerVerse: interp(form.footerVerse, vars) || undefined,
    }
  }

  const birthdayPreview = useMemo(() => {
    if (birthdayForm.birthdays.length === 0) return null
    const vars = makeBirthdayVars(birthdayForm.weekLabel, birthdayForm.birthdays.map(b => b.name))
    return buildBirthdayCard({
      weekLabel: birthdayForm.weekLabel,
      birthdays: birthdayForm.birthdays,
      ...interpCommon(birthdayForm, vars),
    })
  }, [birthdayForm])

  const anniversaryPreview = useMemo(() => {
    if (anniversaryForm.anniversaries.length === 0) return null
    const vars = makeAnniversaryVars(anniversaryForm.weekLabel, anniversaryForm.anniversaries.map(a => `${a.husbandName} & ${a.wifeName}`))
    return buildAnniversaryCard({
      weekLabel: anniversaryForm.weekLabel,
      anniversaries: anniversaryForm.anniversaries,
      ...interpCommon(anniversaryForm, vars),
    })
  }, [anniversaryForm])

  const bibleStudyPreview = useMemo(() => {
    const vars = makeEventVars(weekLabel, bibleStudyForm.date, bibleStudyForm.time, bibleStudyForm.topic || "")
    return buildBibleStudyCard({
      title: interp(bibleStudyForm.title, vars),
      date: bibleStudyForm.date,
      time: bibleStudyForm.time,
      topic: interp(bibleStudyForm.topic, vars),
      locations: bibleStudyForm.locations.map((loc) => ({
        label: loc.label,
        hostNames: loc.hostNames || undefined,
        address: loc.address || undefined,
        city: loc.city || undefined,
        phone: loc.phone || undefined,
      })),
      ...interpCommon(bibleStudyForm, vars),
    })
  }, [bibleStudyForm, weekLabel])

  const womensStudyPreview = useMemo(() => {
    const vars = makeEventVars(weekLabel, womensStudyForm.date, womensStudyForm.time, womensStudyForm.topic || "")
    return buildWomensStudyCard({
      title: interp(womensStudyForm.title, vars),
      topic: interp(womensStudyForm.topic, vars),
      date: womensStudyForm.date,
      time: womensStudyForm.time,
      zoomLink: womensStudyForm.zoomLink || undefined,
      zoomMeetingId: womensStudyForm.zoomMeetingId || undefined,
      zoomPasscode: womensStudyForm.zoomPasscode || undefined,
      location: womensStudyForm.location || undefined,
      ...interpCommon(womensStudyForm, vars),
    })
  }, [womensStudyForm, weekLabel])

  const prayerMeetingPreview = useMemo(() => {
    return buildPrayerMeetingCard({
      hostNames: prayerMeetingForm.hostNames,
      address: prayerMeetingForm.address,
      city: prayerMeetingForm.city || undefined,
      phone: prayerMeetingForm.phone || undefined,
      date: prayerMeetingForm.date || "TBD",
      time: prayerMeetingForm.time,
      dinnerNote: prayerMeetingForm.dinnerNote || undefined,
      signupLink: prayerMeetingForm.signupLink || undefined,
      ...extractCommonCardData(prayerMeetingForm),
    })
  }, [prayerMeetingForm])

  const bulletinPreview = useMemo(() => {
    const vars = makeBulletinVars(weekLabel, weekLabel)
    return buildBulletinCard({
      weekLabel: bulletinForm.weekLabel,
      birthdays: bulletinForm.birthdays,
      anniversaries: bulletinForm.anniversaries,
      helpers: bulletinForm.helpers,
      events: bulletinForm.events,
      sectionOrder: bulletinForm.sectionOrder,
      ...interpCommon(bulletinForm, vars),
    })
  }, [bulletinForm, weekLabel])

  // ---- Subject lines (custom override or auto-generated) ----
  function getSubjectVars(type: CommType) {
    switch (type) {
      case "birthday":       return makeBirthdayVars(weekLabel, birthdayForm.birthdays.map(b => b.name))
      case "anniversary":    return makeAnniversaryVars(weekLabel, anniversaryForm.anniversaries.map(a => `${a.husbandName} & ${a.wifeName}`))
      case "bible_study":    return makeEventVars(weekLabel, bibleStudyForm.date, bibleStudyForm.time, bibleStudyForm.topic || "")
      case "womens_study":   return makeEventVars(weekLabel, womensStudyForm.date, womensStudyForm.time, womensStudyForm.topic || "")
      case "prayer_meeting": return makeEventVars(weekLabel, prayerMeetingForm.date, prayerMeetingForm.time, "")
      case "bulletin":       return makeBulletinVars(weekLabel, weekLabel)
    }
  }

  function getSubject(type: CommType): string {
    // If dispatched, show the exact subject that was sent
    const d = dispatches[type]
    if (d && (d.status === "sent" || d.status === "sending")) return d.subject
    if (customSubjects[type]) return customSubjects[type]!
    const etKey = COMM_TYPE_TO_ET[type]
    const savedTmpl = savedSubjectTemplates[etKey]
    if (savedTmpl) return interpolate(savedTmpl, getSubjectVars(type))
    switch (type) {
      case "birthday":       return `Happy Birthday! — Week of ${weekLabel}`
      case "anniversary":    return `Happy Anniversary! — Week of ${weekLabel}`
      case "bible_study":    return `Bible Study This Friday — ${bibleStudyForm.date}`
      case "womens_study":   return `Women's Bible Study This Wednesday`
      case "prayer_meeting": return `Monthly Prayer Meeting — ${prayerMeetingForm.date || "Date TBD"}`
      case "bulletin":       return `Weekly Bulletin for ${bulletinForm.weekLabel}`
    }
  }

  function setSubjectOverride(type: CommType, value: string) {
    setCustomSubjects((prev) => ({ ...prev, [type]: value }))
  }

  // ---- Get preview for type ----
  // If dispatched/queued, show the exact HTML that was sent/queued.
  // Otherwise show the live-computed preview for editing.
  function getPreview(type: CommType): string | null {
    switch (type) {
      case "birthday":       return birthdayPreview
      case "anniversary":    return anniversaryPreview
      case "bible_study":    return bibleStudyPreview
      case "womens_study":   return womensStudyPreview
      case "prayer_meeting": return prayerMeetingPreview
      case "bulletin":       return bulletinPreview
    }
  }

  // Get the live-computed preview (ignoring dispatch state) — used when creating new dispatches
  function getLivePreview(type: CommType): string | null {
    switch (type) {
      case "birthday":       return birthdayPreview
      case "anniversary":    return anniversaryPreview
      case "bible_study":    return bibleStudyPreview
      case "womens_study":   return womensStudyPreview
      case "prayer_meeting": return prayerMeetingPreview
      case "bulletin":       return bulletinPreview
    }
  }

  // ---- Form data helper (for save) ----
  function getFormData(type: CommType): Record<string, unknown> {
    switch (type) {
      case "birthday": return birthdayForm as unknown as Record<string, unknown>
      case "anniversary": return anniversaryForm as unknown as Record<string, unknown>
      case "bible_study": return bibleStudyForm as unknown as Record<string, unknown>
      case "womens_study": return womensStudyForm as unknown as Record<string, unknown>
      case "prayer_meeting": return prayerMeetingForm as unknown as Record<string, unknown>
      case "bulletin": return bulletinForm as unknown as Record<string, unknown>
    }
  }

  function snapshotForm(type: CommType) {
    setSavedSnapshots((prev) => ({ ...prev, [type]: structuredClone(getFormData(type)) }))
  }

  function snapshotAllForms() {
    const snap: Partial<Record<CommType, Record<string, unknown>>> = {}
    const types: CommType[] = ["birthday", "anniversary", "bible_study", "womens_study", "prayer_meeting", "bulletin"]
    for (const t of types) snap[t] = structuredClone(getFormData(t))
    setSavedSnapshots(snap)
  }

  function handleCancelEdit(type: CommType) {
    const snap = savedSnapshots[type]
    if (!snap) return
    const r = structuredClone(snap) as unknown
    switch (type) {
      case "birthday": setBirthdayForm(r as typeof birthdayForm); break
      case "anniversary": setAnniversaryForm(r as typeof anniversaryForm); break
      case "bible_study": setBibleStudyForm(r as typeof bibleStudyForm); break
      case "womens_study": setWomensStudyForm(r as typeof womensStudyForm); break
      case "prayer_meeting": setPrayerMeetingForm(r as typeof prayerMeetingForm); break
      case "bulletin": setBulletinForm(r as typeof bulletinForm); break
    }
  }

  // ---- Save / Delete instance ----
  async function handleSaveInstance(type: CommType) {
    setSavingInstance(type)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const base = addDays(new Date(), weekOffset * 7)
      const weekStart = format(startOfWeek(base, { weekStartsOn: 0 }), "yyyy-MM-dd")
      const templateName = BUILTIN_TEMPLATES.find((t) => t.type === type)?.label || type

      const payload = {
        template_type: type,
        name: templateName,
        subject: getSubject(type),
        form_data: getFormData(type),
        mailing_list_id: commOptions[type].mailingListId || null,
        smtp_config_id: commOptions[type].smtpConfigId || null,
        additional_recipients: commOptions[type].additionalRecipients || null,
        is_active: true,
        week_start: weekStart,
        is_recurring: false,
        recur_until: null,
        created_by: user?.id ?? null,
      }

      const existingId = instanceIds[type]
      if (existingId) {
        const { error } = await supabase
          .from("composed_instances")
          .update(payload as never)
          .eq("id", existingId)
        if (error) {
          toast.error(`Save failed: ${error.message}`)
        } else {
          toast.success(`${templateName} draft saved`)
          snapshotForm(type)
          logAudit("composed_instance_updated", "composed_instances", existingId, { type, weekStart })
        }
      } else {
        const { data: inserted, error } = await supabase
          .from("composed_instances")
          .insert(payload as never)
          .select("id")
          .single() as { data: { id: string } | null; error: { message: string } | null }
        if (error) {
          toast.error(`Save failed: ${error.message}`)
        } else {
          toast.success(`${templateName} draft saved`)
          setInstanceIds((prev) => ({ ...prev, [type]: inserted?.id ?? undefined }))
          snapshotForm(type)
          logAudit("composed_instance_created", "composed_instances", inserted?.id, { type, weekStart })
        }
      }
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setSavingInstance(null)
    }
  }

  async function handleDeleteInstance(type: CommType) {
    const id = instanceIds[type]
    if (!id) return
    const label = BUILTIN_TEMPLATES.find((t) => t.type === type)?.label || type
    if (!confirm(`Delete the saved ${label} draft for this week?`)) return

    const supabase = createClient()
    const { error } = await supabase.from("composed_instances").delete().eq("id", id)
    if (error) {
      toast.error(`Delete failed: ${error.message}`)
    } else {
      toast.success("Draft deleted")
      setInstanceIds((prev) => {
        const next = { ...prev }
        delete next[type]
        return next
      })
      logAudit("composed_instance_deleted", "composed_instances", id, { type })
      fetchAll()
    }
  }

  // ---- Queue / Send ----
  const handleSendNow = useCallback(
    async (type: CommType) => {
      const html = getLivePreview(type)
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
      if (!opts.mailingListId && !opts.additionalRecipients.trim()) {
        toast.error("Please select a mailing list or add recipient emails before sending.")
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

        const dispatchWeekStart = format(startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 0 }), "yyyy-MM-dd")

        // Auto-save draft before dispatching so form data persists
        const templateName = BUILTIN_TEMPLATES.find((t) => t.type === type)?.label || type
        const draftPayload = {
          template_type: type,
          name: templateName,
          subject,
          form_data: getFormData(type),
          mailing_list_id: opts.mailingListId || null,
          smtp_config_id: opts.smtpConfigId || null,
          additional_recipients: opts.additionalRecipients.trim() || null,
          is_active: true,
          week_start: dispatchWeekStart,
          is_recurring: false,
          recur_until: null,
          created_by: user?.id ?? null,
        }
        const existingDraftId = instanceIds[type]
        if (existingDraftId) {
          await supabase.from("composed_instances").update(draftPayload as never).eq("id", existingDraftId)
        } else {
          const { data: newDraft } = await supabase.from("composed_instances").insert(draftPayload as never).select("id").single() as { data: { id: string } | null }
          if (newDraft) setInstanceIds((prev) => ({ ...prev, [type]: newDraft.id }))
        }
        snapshotForm(type)

        const { data: inserted, error } = await supabase
          .from("dispatch_queue")
          .insert({
            subject,
            body_html: html,
            scheduled_at: new Date().toISOString(),
            status: "pending",
            template_type: type,
            week_start: dispatchWeekStart,
            mailing_list_id: opts.mailingListId || null,
            smtp_config_id: opts.smtpConfigId || null,
            additional_recipients: opts.additionalRecipients.trim() || null,
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
              body_html: html,
              status: "pending",
              scheduled_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              template_type: type,
              week_start: dispatchWeekStart,
              mailing_list_id: opts.mailingListId || null,
              smtp_config_id: opts.smtpConfigId || null,
              additional_recipients: opts.additionalRecipients.trim() || null,
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
      prayerMeetingPreview,
      bulletinPreview,
      birthdayForm,
      anniversaryForm,
      bibleStudyForm,
      womensStudyForm,
      prayerMeetingForm,
      bulletinForm,
    ]
  )

  const handleSchedule = useCallback(
    async (type: CommType) => {
      const html = getLivePreview(type)
      if (!html) {
        toast.error("No content to schedule. Please add data first.")
        return
      }
      const opts = commOptions[type]
      if (!opts.mailingListId && !opts.additionalRecipients.trim()) {
        toast.error("Please select a mailing list or add recipient emails before scheduling.")
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

    const html = getLivePreview(type)
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

      const schedWeekStart = format(startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 0 }), "yyyy-MM-dd")

      const { data: inserted, error } = await supabase
        .from("dispatch_queue")
        .insert({
          subject,
          body_html: html,
          scheduled_at: scheduledAt,
          status: "pending",
          template_type: type,
          week_start: schedWeekStart,
          mailing_list_id: opts.mailingListId || null,
          smtp_config_id: opts.smtpConfigId || null,
          additional_recipients: opts.additionalRecipients.trim() || null,
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
            body_html: html,
            status: "pending",
            scheduled_at: scheduledAt,
            created_at: new Date().toISOString(),
            template_type: type,
            week_start: schedWeekStart,
            mailing_list_id: opts.mailingListId || null,
            smtp_config_id: opts.smtpConfigId || null,
            additional_recipients: opts.additionalRecipients.trim() || null,
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

  const prayerMeetingSummary = useMemo(() => {
    const lines: string[] = []
    if (prayerMeetingForm.date) {
      lines.push(`${prayerMeetingForm.date} at ${prayerMeetingForm.time}`)
    } else {
      lines.push("Date not set — click Edit to configure")
    }
    if (prayerMeetingForm.hostNames && prayerMeetingForm.hostNames !== "TBD") {
      lines.push(`Host: ${prayerMeetingForm.hostNames}`)
    }
    if (prayerMeetingForm.dinnerNote) {
      lines.push(prayerMeetingForm.dinnerNote)
    }
    return lines
  }, [prayerMeetingForm])

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
            {weekOffset === 0 ? "This Week" : weekOffset === 1 ? "Next Week" : weekOffset === -1 ? "Last Week" : weekOffset > 0 ? `${weekOffset} Weeks Ahead` : `${Math.abs(weekOffset)} Weeks Ago`}
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
            onClick={() => setWeekOffset((w) => w - 1)}
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
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{weekOffset === 0 ? "This Week" : weekOffset > 0 ? "Upcoming" : "Past Week"}</p>
              <Link href="/calendar" className="text-xs text-primary hover:underline">Full Calendar</Link>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
              {(() => {
                const days: { date: Date; label: string }[] = []
                const start = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 0 })
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
                  const dayIso = format(day.date, "yyyy-MM-dd")
                  const dayEvents = weekStripEvents.filter((e) => format(e.date, "yyyy-MM-dd") === dayIso)
                  const dayDispatches = weekStripDispatches.filter((d) => d.date === dayIso)
                  const isToday = dayIso === format(new Date(), "yyyy-MM-dd")
                  const hasAnything = dayBdays.length > 0 || dayAnnis.length > 0 || dayEvents.length > 0 || dayDispatches.length > 0
                  return (
                    <div
                      key={day.label}
                      className={`flex min-w-[80px] flex-col items-center gap-1 rounded-lg border px-2 py-1.5 text-center ${isToday ? "border-primary bg-primary/5" : ""}`}
                    >
                      <span className={`text-[10px] font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>{day.label}</span>
                      {dayEvents.map((e, i) => (
                        <button key={`e${i}`} type="button" className="w-full truncate rounded-full px-1.5 py-0.5 text-[9px] text-white transition-opacity hover:opacity-80" style={{ backgroundColor: e.color }} onClick={() => e.commType && setSelectedCard(e.commType)}>{e.title.replace(/^San Ramon\s*/i, "").split(" ").slice(0, 2).join(" ")}</button>
                      ))}
                      {dayBdays.map((b, i) => (
                        <button key={`b${i}`} type="button" className="w-full truncate rounded-full bg-purple-500 px-1.5 py-0.5 text-[9px] text-white transition-opacity hover:opacity-80" onClick={() => setSelectedCard("birthday")}>{b.name.split(" ")[0]}</button>
                      ))}
                      {dayAnnis.map((a, i) => (
                        <button key={`a${i}`} type="button" className="w-full truncate rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] text-white transition-opacity hover:opacity-80" onClick={() => setSelectedCard("anniversary")}>{a.husbandName}</button>
                      ))}
                      {dayDispatches.map((d, i) => (
                        d.status === "sent" ? (
                          <button key={`d${i}`} type="button" className="w-full truncate rounded-full px-1.5 py-0.5 text-[9px] text-white transition-opacity hover:opacity-80" style={{ backgroundColor: d.color }} title={d.targetLabel ? `For week of ${d.targetLabel}` : undefined} onClick={async () => {
                            const supabase = createClient()
                            const { data } = await supabase.from("dispatch_queue").select("subject, body_html").eq("id", d.dispatchId).returns<{ subject: string; body_html: string }[]>().single()
                            if (data?.body_html) setSentEmailPreview({ subject: data.subject, html: data.body_html })
                          }}>
                            {d.label} ✓{d.targetLabel ? ` (${d.targetLabel})` : ""}
                          </button>
                        ) : (
                          <button key={`d${i}`} type="button" className="w-full truncate rounded-full border border-dashed px-1.5 py-0.5 text-[9px] transition-opacity hover:opacity-80" style={{ borderColor: d.color, color: d.color }} title={d.targetLabel ? `For week of ${d.targetLabel}` : undefined} onClick={() => d.commType && setSelectedCard(d.commType)}>
                            {d.label}{d.targetLabel ? ` (${d.targetLabel})` : ""}
                          </button>
                        )
                      ))}
                      {!hasAnything && (
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
          {/* Status legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-green-500" />Sent — email delivered</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-500" />Queued — waiting to send</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-blue-500" />Draft — saved, not sent</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full border border-muted-foreground/30" />No action taken</span>
          </div>

          {(() => {
            const hasContent: Record<CommType, boolean> = {
              birthday: birthdayForm.birthdays.length > 0,
              anniversary: anniversaryForm.anniversaries.length > 0,
              bible_study: bibleStudyForm.date !== "No bible study this week",
              womens_study: womensStudyForm.date !== "No study this week",
              prayer_meeting: !!prayerMeetingForm.date && prayerMeetingForm.date !== "",
              bulletin: true,
            }

            const cardTitles: Record<CommType, string> = {
              birthday: "Birthdays",
              anniversary: "Anniversaries",
              bible_study: "Bible Study",
              womens_study: "Women's Study",
              prayer_meeting: "Prayer Meeting",
              bulletin: "Weekly Bulletin",
            }

            const shortSummaries: Record<CommType, string> = {
              birthday: birthdayForm.birthdays.length > 0
                ? `${birthdayForm.birthdays.length} birthday${birthdayForm.birthdays.length > 1 ? "s" : ""}`
                : "None this week",
              anniversary: anniversaryForm.anniversaries.length > 0
                ? `${anniversaryForm.anniversaries.length} anniversary${anniversaryForm.anniversaries.length > 1 ? "ies" : "y"}`
                : "None this week",
              bible_study: bibleStudyForm.date !== "No bible study this week"
                ? `${bibleStudyForm.date} at ${bibleStudyForm.time}`
                : "No study this week",
              womens_study: womensStudyForm.date !== "No study this week"
                ? `${womensStudyForm.date} at ${womensStudyForm.time}`
                : "No study this week",
              prayer_meeting: prayerMeetingForm.date
                ? `${prayerMeetingForm.date} at ${prayerMeetingForm.time}`
                : "Not scheduled",
              bulletin: `${bulletinForm.birthdays.length + bulletinForm.anniversaries.length + bulletinForm.events.length} items`,
            }

            const fullSummaries: Record<CommType, string[]> = {
              birthday: birthdaySummary,
              anniversary: anniversarySummary,
              bible_study: bibleStudySummary,
              womens_study: womensStudySummary,
              prayer_meeting: prayerMeetingSummary,
              bulletin: bulletinSummary,
            }

            const links: Record<CommType, { label: string; url: string }[]> = {
              birthday: (birthdayForm.resourceLinks ?? []).filter((l) => l.url),
              anniversary: (anniversaryForm.resourceLinks ?? []).filter((l) => l.url),
              bible_study: (bibleStudyForm.resourceLinks ?? []).filter((l) => l.url),
              womens_study: [
                ...(womensStudyForm.zoomLink ? [{ label: "Join Zoom Meeting", url: womensStudyForm.zoomLink }] : []),
                ...(womensStudyForm.resourceLinks ?? []).filter((l) => l.url),
              ],
              prayer_meeting: [
                ...(prayerMeetingForm.signupLink ? [{ label: "Sign Up", url: prayerMeetingForm.signupLink }] : []),
                ...(prayerMeetingForm.resourceLinks ?? []).filter((l) => l.url),
              ],
              bulletin: bulletinForm.resourceLinks.filter((l) => l.url),
            }

            const editForms: Record<CommType, React.ReactNode> = {
              birthday: <BirthdayEditForm data={birthdayForm} onChange={setBirthdayForm} />,
              anniversary: <AnniversaryEditForm data={anniversaryForm} onChange={setAnniversaryForm} />,
              bible_study: <BibleStudyEditForm data={bibleStudyForm} onChange={setBibleStudyForm} />,
              womens_study: <WomensStudyEditForm data={womensStudyForm} onChange={setWomensStudyForm} />,
              prayer_meeting: <PrayerMeetingEditForm data={prayerMeetingForm} onChange={setPrayerMeetingForm} />,
              bulletin: <BulletinEditForm data={bulletinForm} onChange={setBulletinForm} />,
            }

            const visibleCards = BUILTIN_TEMPLATES.filter((t) => visibleTemplates.includes(t.type))

            return <>
          {/* ── Mini-card grid ── */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCards.map(({ type, label, color, icon: TIcon }) => {
              const status = getStatus(type)
              const count = dispatchCounts[type]
              const hasData = hasContent[type]
              const hasDraft = !!instanceIds[type]
              const isSelected = selectedCard === type

              return (
                <button
                  key={type}
                  onClick={() => setSelectedCard(isSelected ? type : type)}
                  className={`relative flex items-start gap-3 rounded-xl border p-3 text-left transition-all hover:shadow-sm ${
                    isSelected
                      ? "ring-2 ring-offset-1 shadow-sm"
                      : hasData
                      ? "border-border hover:border-foreground/20"
                      : "border-dashed border-muted-foreground/20 opacity-60"
                  }`}
                  style={isSelected ? { borderColor: color, "--tw-ring-color": color } as React.CSSProperties : undefined}
                >
                  {/* Left accent + icon */}
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: color + "15", color }}
                  >
                    <TIcon className="size-4" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">{cardTitles[type]}</span>
                      {(eventCounts[type] ?? 0) > 1 && (
                        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {eventCounts[type]} events
                        </span>
                      )}
                      {/* Status badges */}
                      {status === "sent" && count > 0 && (
                        <>
                          <span className="shrink-0 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Sent{count > 1 ? ` ${count}x` : ""}
                          </span>
                          {dispatches[type]?.body_html && (
                            <span
                              role="link"
                              tabIndex={0}
                              className="shrink-0 cursor-pointer text-[10px] font-medium text-green-600 hover:text-green-800 hover:underline dark:text-green-400"
                              onClick={(e) => { e.stopPropagation(); setSentEmailPreview({ subject: dispatches[type]!.subject, html: dispatches[type]!.body_html! }) }}
                              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); setSentEmailPreview({ subject: dispatches[type]!.subject, html: dispatches[type]!.body_html! }) } }}
                            >
                              View
                            </span>
                          )}
                        </>
                      )}
                      {status === "scheduled" && (
                        <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          Queued
                        </span>
                      )}
                      {hasDraft && status === "draft" && (
                        <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          Draft
                          <span
                            role="button"
                            tabIndex={0}
                            className="ml-0.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 p-0.5 -mr-0.5 cursor-pointer"
                            title="Clear draft — revert to defaults"
                            onClick={(e) => { e.stopPropagation(); handleDeleteInstance(type) }}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); handleDeleteInstance(type) } }}
                          >
                            <X className="size-2.5" />
                          </span>
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">
                      {shortSummaries[type]}
                    </p>
                    {(() => {
                      const d = dispatches[type]
                      const sentTs = formatRelativeTime(d?.sent_at)
                      const modTs = formatRelativeTime(instanceUpdatedAt[type])
                      if (sentTs) return <p className="mt-0.5 text-[10px] text-green-600 dark:text-green-400">Sent {sentTs}</p>
                      if (modTs && hasDraft) return <p className="mt-0.5 text-[10px] text-blue-600 dark:text-blue-400">Modified {modTs}</p>
                      if (weekOffset < 0 && !hasDraft && status === "draft" && hasData) return <p className="mt-0.5 text-[10px] text-amber-600 dark:text-amber-400">Not dispatched</p>
                      if (!hasData && (type === "bible_study" || type === "womens_study" || type === "prayer_meeting")) {
                        return <Link href="/calendar" className="mt-0.5 text-[10px] text-primary hover:underline" onClick={(e) => e.stopPropagation()}>Set up schedule</Link>
                      }
                      return null
                    })()}
                  </div>

                  {/* Active dot */}
                  {hasData && (
                    <span className="absolute right-2 top-2 size-2 rounded-full" style={{ backgroundColor: color }} />
                  )}
                </button>
              )
            })}
          </div>

          {/* ── Settings popover ── */}
          <div className="flex justify-end">
            <Popover>
              <PopoverTrigger
                render={
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1">
                    <Settings2 className="size-3.5" />
                    Customize cards
                  </Button>
                }
              />
              <PopoverContent align="end" className="w-64">
                <p className="text-sm font-medium mb-3">Show on Dashboard</p>
                <div className="space-y-2">
                  {BUILTIN_TEMPLATES.map(({ type, label, icon: TIcon, color }) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TIcon className="size-3.5" style={{ color }} />
                        <span className="text-sm">{label}</span>
                      </div>
                      <Switch
                        size="sm"
                        checked={visibleTemplates.includes(type)}
                        onCheckedChange={() => toggleTemplate(type)}
                      />
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* ── Expanded card detail ── */}
          {visibleTemplates.includes(selectedCard) && (() => {
            const tmpl = BUILTIN_TEMPLATES.find((t) => t.type === selectedCard)!
            const type = selectedCard

            // Build status indicators for the full card
            const summaries = [...fullSummaries[type]]
            const status = getStatus(type)
            const count = dispatchCounts[type]
            const hasDraft = !!instanceIds[type]

            const d = dispatches[type]
            const sentTs = d?.sent_at ? format(new Date(d.sent_at), "MMM d 'at' h:mm a") : null
            if (status === "sent" && count > 0) {
              summaries.push(`✅ Email sent${count > 1 ? ` (${count}x)` : ""}${sentTs ? ` — ${sentTs}` : ""}`)
            } else if (status === "scheduled") {
              summaries.push("⏳ Queued for dispatch")
            }
            if (hasDraft) {
              const modTs = instanceUpdatedAt[type]
              const modLabel = modTs ? formatRelativeTime(modTs) : null
              summaries.push(`📌 Draft${modLabel ? ` — modified ${modLabel}` : ""}`)
            }

            return (
              <WeeklyCommunicationCard
                key={type}
                title={cardTitles[type]}
                accentColor={tmpl.color}
                icon={tmpl.icon}
                status={getStatus(type)}
                summaryLines={summaries}
                subject={getSubject(type)}
                onSubjectChange={(v) => setSubjectOverride(type, v)}
                scheduledAt={getScheduledAt(type)}
                previewHtml={getPreview(type)}
                resourceLinks={links[type]}
                onSchedule={() => handleSchedule(type)}
                onSendNow={() => handleSendNow(type)}
                onSave={() => handleSaveInstance(type)}
                onDelete={() => handleDeleteInstance(type)}
                onCancel={() => handleCancelEdit(type)}
                saving={savingInstance === type}
                hasInstance={!!instanceIds[type]}
                mailingLists={mailingLists}
                smtpConfigs={smtpConfigs}
                selectedMailingList={commOptions[type].mailingListId}
                onMailingListChange={(id) => setCommOptions((prev) => ({ ...prev, [type]: { ...prev[type], mailingListId: id } }))}
                selectedSmtpConfig={commOptions[type].smtpConfigId}
                onSmtpConfigChange={(id) => setCommOptions((prev) => ({ ...prev, [type]: { ...prev[type], smtpConfigId: id } }))}
                sendCount={dispatchCounts[type]}
                additionalRecipients={commOptions[type].additionalRecipients}
                onAdditionalRecipientsChange={(v) => setCommOptions((prev) => ({ ...prev, [type]: { ...prev[type], additionalRecipients: v } }))}
              >
                {editForms[type]}
              </WeeklyCommunicationCard>
            )
          })()}
        {/* ── Custom Template Cards ── */}
        {customDashTemplates.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-2">
              <Send className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-muted-foreground">Custom Templates</h3>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {customDashTemplates.map((ct) => {
                const di = customDispatches[ct.id] ?? { status: "draft", count: 0 }
                const hasDraft = !!customInstanceIds[ct.id]
                const isSelected = selectedCustomCard === ct.id

                return (
                  <button
                    key={ct.id}
                    onClick={() => { setSelectedCustomCard(isSelected ? null : ct.id); setSelectedCard("bulletin") }}
                    className={`relative flex items-start gap-3 rounded-xl border p-3 text-left transition-all hover:shadow-sm ${
                      isSelected ? "ring-2 ring-offset-1 shadow-sm" : "border-border hover:border-foreground/20"
                    }`}
                    style={isSelected ? { borderColor: ct.color, "--tw-ring-color": ct.color } as React.CSSProperties : undefined}
                  >
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg text-lg"
                      style={{ backgroundColor: ct.color + "15" }}
                    >
                      {ct.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{ct.name}</span>
                        {di.status === "sent" && di.count > 0 && (
                          <span className="shrink-0 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Sent{di.count > 1 ? ` ${di.count}x` : ""}
                          </span>
                        )}
                        {hasDraft && di.status === "draft" && (
                          <span className="shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            Draft
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground truncate">
                        {customForms[ct.id]?.title || "Custom announcement"}
                      </p>
                      {di.lastSentAt ? (
                        <p className="mt-0.5 text-[10px] text-green-600 dark:text-green-400">Sent {formatRelativeTime(di.lastSentAt)}</p>
                      ) : hasDraft ? (
                        <p className="mt-0.5 text-[10px] text-blue-600 dark:text-blue-400">Draft saved</p>
                      ) : null}
                    </div>
                    <span className="absolute right-2 top-2 size-2 rounded-full" style={{ backgroundColor: ct.color }} />
                  </button>
                )
              })}
            </div>

            {/* Expanded custom card */}
            {selectedCustomCard && (() => {
              const ct = customDashTemplates.find((t) => t.id === selectedCustomCard)
              if (!ct) return null
              const form = customForms[ct.id]
              if (!form) return null
              const ctKey = `custom:${ct.id}`
              const di = customDispatches[ct.id] ?? { status: "draft", count: 0 }
              const preview = buildCustomDashPreview(form)
              const subj = customSubjectOverrides[ct.id] || ct.subject_template || ct.name

              return (
                <WeeklyCommunicationCard
                  key={ctKey}
                  title={ct.name}
                  accentColor={ct.color}
                  icon={Send}
                  status={di.status as CommunicationStatus}
                  summaryLines={[form.title || "Custom announcement"]}
                  subject={subj}
                  onSubjectChange={(v) => setCustomSubjectOverrides((prev) => ({ ...prev, [ct.id]: v }))}
                  previewHtml={preview}
                  resourceLinks={(form.resourceLinks ?? []).filter((l) => l.url)}
                  mailingLists={mailingLists}
                  smtpConfigs={smtpConfigs}
                  selectedMailingList={customCommOptions[ct.id]?.mailingListId}
                  onMailingListChange={(id) => setCustomCommOptions((prev) => ({ ...prev, [ct.id]: { ...prev[ct.id], mailingListId: id } }))}
                  selectedSmtpConfig={customCommOptions[ct.id]?.smtpConfigId}
                  onSmtpConfigChange={(id) => setCustomCommOptions((prev) => ({ ...prev, [ct.id]: { ...prev[ct.id], smtpConfigId: id } }))}
                  additionalRecipients={customCommOptions[ct.id]?.additionalRecipients}
                  onAdditionalRecipientsChange={(v) => setCustomCommOptions((prev) => ({ ...prev, [ct.id]: { ...prev[ct.id], additionalRecipients: v } }))}
                  sendCount={di.count}
                  onSchedule={() => {}}
                  onSendNow={async () => {
                    const html = buildCustomDashPreview(form)
                    if (!html) { toast.error("No content"); return }
                    const opts = customCommOptions[ct.id]
                    if (!opts?.smtpConfigId) { toast.error("Please select a Send From account first."); return }
                    if (!opts?.mailingListId && !opts?.additionalRecipients?.trim()) { toast.error("Please select a mailing list or add recipients."); return }
                    setSendingType("bulletin")
                    try {
                      const supabase = createClient()
                      const { data: { user } } = await supabase.auth.getUser()
                      const weekStart = format(startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 0 }), "yyyy-MM-dd")

                      // Auto-save draft
                      const draftPayload = {
                        template_type: ctKey,
                        name: ct.name,
                        subject: subj,
                        form_data: form as unknown as Record<string, unknown>,
                        mailing_list_id: opts.mailingListId || null,
                        smtp_config_id: opts.smtpConfigId || null,
                        additional_recipients: opts.additionalRecipients?.trim() || null,
                        is_active: true,
                        week_start: weekStart,
                        is_recurring: false,
                        recur_until: null,
                        created_by: user?.id ?? null,
                      }
                      const existingId = customInstanceIds[ct.id]
                      if (existingId) {
                        await supabase.from("composed_instances").update(draftPayload as never).eq("id", existingId)
                      } else {
                        const { data: newDraft } = await supabase.from("composed_instances").insert(draftPayload as never).select("id").single() as { data: { id: string } | null }
                        if (newDraft) setCustomInstanceIds((prev) => ({ ...prev, [ct.id]: newDraft.id }))
                      }
                      setCustomSnapshots((prev) => ({ ...prev, [ct.id]: structuredClone(form as unknown as Record<string, unknown>) }))

                      const { error } = await supabase.from("dispatch_queue").insert({
                        subject: subj,
                        body_html: html,
                        scheduled_at: new Date().toISOString(),
                        status: "pending",
                        template_type: ctKey,
                        week_start: weekStart,
                        mailing_list_id: opts.mailingListId || null,
                        smtp_config_id: opts.smtpConfigId || null,
                        additional_recipients: opts.additionalRecipients?.trim() || null,
                        created_by: user?.id ?? null,
                      } as never)
                      if (error) toast.error(`Failed: ${error.message}`)
                      else {
                        toast.success(`"${subj}" queued for dispatch`)
                        setCustomDispatches((prev) => ({ ...prev, [ct.id]: { status: "scheduled", count: (prev[ct.id]?.count ?? 0) + 1, lastSentAt: prev[ct.id]?.lastSentAt ?? null } }))
                      }
                    } finally { setSendingType(null) }
                  }}
                  onSave={async () => {
                    setSavingInstance("bulletin")
                    try {
                      const supabase = createClient()
                      const { data: { user } } = await supabase.auth.getUser()
                      const weekStart = format(startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 0 }), "yyyy-MM-dd")
                      const opts = customCommOptions[ct.id]
                      const payload = {
                        template_type: ctKey,
                        name: ct.name,
                        subject: subj,
                        form_data: form as unknown as Record<string, unknown>,
                        mailing_list_id: opts?.mailingListId || null,
                        smtp_config_id: opts?.smtpConfigId || null,
                        additional_recipients: opts?.additionalRecipients?.trim() || null,
                        is_active: true,
                        week_start: weekStart,
                        is_recurring: false,
                        recur_until: null,
                        created_by: user?.id ?? null,
                      }
                      const existingId = customInstanceIds[ct.id]
                      if (existingId) {
                        const { error } = await supabase.from("composed_instances").update(payload as never).eq("id", existingId)
                        if (error) toast.error(`Save failed: ${error.message}`)
                        else toast.success(`${ct.name} draft saved`)
                      } else {
                        const { data: ins, error } = await supabase.from("composed_instances").insert(payload as never).select("id").single() as { data: { id: string } | null; error: { message: string } | null }
                        if (error) toast.error(`Save failed: ${error.message}`)
                        else {
                          toast.success(`${ct.name} draft saved`)
                          if (ins) setCustomInstanceIds((prev) => ({ ...prev, [ct.id]: ins.id }))
                        }
                      }
                      setCustomSnapshots((prev) => ({ ...prev, [ct.id]: structuredClone(form as unknown as Record<string, unknown>) }))
                    } finally { setSavingInstance(null) }
                  }}
                  onDelete={async () => {
                    const id = customInstanceIds[ct.id]
                    if (!id || !confirm(`Delete the saved ${ct.name} draft?`)) return
                    const supabase = createClient()
                    await supabase.from("composed_instances").delete().eq("id", id)
                    setCustomInstanceIds((prev) => { const n = { ...prev }; delete n[ct.id]; return n })
                    toast.success(`${ct.name} draft deleted`)
                  }}
                  onCancel={() => {
                    const snap = customSnapshots[ct.id]
                    if (snap) {
                      setCustomForms((prev) => ({ ...prev, [ct.id]: structuredClone(snap) as unknown as CustomDashFormData }))
                    } else {
                      const parsed = ct.defaults
                      setCustomForms((prev) => ({
                        ...prev,
                        [ct.id]: {
                          ...EMPTY_CUSTOM_FORM,
                          title: (parsed.title as string) || ct.name,
                          subtitle: (parsed.subtitle as string) || "",
                          emoji: (parsed.emoji as string) || "📋",
                          body: (parsed.body as string) || "",
                          footerText: (parsed.footerText as string) || "",
                          primaryColor: (parsed.primaryColor as string) || "",
                          resourceLinks: (parsed.resourceLinks as BaseFormData["resourceLinks"]) ?? [],
                          customSections: (parsed.customSections as BaseFormData["customSections"]) ?? [],
                        },
                      }))
                    }
                  }}
                  saving={savingInstance === "bulletin"}
                  hasInstance={!!customInstanceIds[ct.id]}
                >
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor={`ct-${ct.id}-title`}>Card Title</Label>
                      <Input
                        id={`ct-${ct.id}-title`}
                        value={form.title}
                        onChange={(e) => setCustomForms((prev) => ({ ...prev, [ct.id]: { ...prev[ct.id], title: e.target.value } }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`ct-${ct.id}-sub`}>Subtitle</Label>
                      <Input
                        id={`ct-${ct.id}-sub`}
                        value={form.subtitle}
                        onChange={(e) => setCustomForms((prev) => ({ ...prev, [ct.id]: { ...prev[ct.id], subtitle: e.target.value } }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`ct-${ct.id}-body`}>Message Body</Label>
                      <textarea
                        id={`ct-${ct.id}-body`}
                        value={form.body}
                        onChange={(e) => setCustomForms((prev) => ({ ...prev, [ct.id]: { ...prev[ct.id], body: e.target.value } }))}
                        className="w-full min-h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                        placeholder="Write your message..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`ct-${ct.id}-footer`}>Footer Text</Label>
                      <Input
                        id={`ct-${ct.id}-footer`}
                        value={form.footerText}
                        onChange={(e) => setCustomForms((prev) => ({ ...prev, [ct.id]: { ...prev[ct.id], footerText: e.target.value } }))}
                      />
                    </div>
                    <CustomSectionsEditor
                      sections={form.customSections ?? []}
                      onChange={(sections) => setCustomForms((prev) => ({ ...prev, [ct.id]: { ...prev[ct.id], customSections: sections } }))}
                    />
                    <ResourceLinksEditor
                      links={form.resourceLinks ?? []}
                      onChange={(links) => setCustomForms((prev) => ({ ...prev, [ct.id]: { ...prev[ct.id], resourceLinks: links } }))}
                    />
                    <CardStyleFields
                      data={form}
                      onChange={(updated) => setCustomForms((prev) => ({ ...prev, [ct.id]: updated }))}
                      idPrefix={`ct-${ct.id}`}
                    />
                  </div>
                </WeeklyCommunicationCard>
              )
            })()}
          </>
        )}
        </>
          })()}
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

      {/* Sent email preview dialog */}
      <Dialog open={!!sentEmailPreview} onOpenChange={(open) => { if (!open) setSentEmailPreview(null) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sent Email</DialogTitle>
            {sentEmailPreview?.subject && (
              <DialogDescription>{sentEmailPreview.subject}</DialogDescription>
            )}
          </DialogHeader>
          <div
            className="rounded-lg border bg-white p-4 dark:bg-slate-900"
            dangerouslySetInnerHTML={{ __html: sentEmailPreview?.html ?? "" }}
          />
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </div>
  )
}
