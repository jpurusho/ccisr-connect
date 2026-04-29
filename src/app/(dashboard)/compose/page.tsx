"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  buildBirthdayCard,
  buildAnniversaryCard,
  buildBibleStudyCard,
  buildWomensStudyCard,
  buildPrayerMeetingCard,
  buildBulletinCard,
  buildCustomCard,
  EVENT_COLORS,
} from "@/lib/email/card-builder"
import { toast } from "sonner"
import {
  Send,
  Cake,
  Heart,
  BookOpen,
  Users,
  HandHelping,
  Newspaper,
  Loader2,
  Eye,
  Plus,
  Trash2,
  Save,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
} from "lucide-react"
import { startOfWeek, endOfWeek, format, addDays, nextFriday, isFriday } from "date-fns"
import { logAudit } from "@/lib/audit"
import { getUpcomingSunday, getBulletinWeekBounds } from "@/lib/date-utils"
import {
  parseBodyTemplate,
  FALLBACK_DEFAULTS,
  SUBJECT_FALLBACKS,
  TEMPLATE_PLACEHOLDERS,
  extractCommonFields,
  type BibleStudyDefaults,
  type WomensStudyDefaults,
  type BulletinDefaults,
  type CommonCardFields,
  type PlaceholderDef,
} from "@/lib/template-defaults"
import { interpolate, interp, makeBirthdayVars, makeAnniversaryVars, makeEventVars, makeBulletinVars } from "@/lib/interpolate"

// ---------------------------------------------------------------------------
// Template metadata
// ---------------------------------------------------------------------------

const TEMPLATES = [
  { id: "birthday", title: "Birthday Card", description: "Birthdays for the upcoming week", icon: Cake, color: EVENT_COLORS.birthday.primary },
  { id: "anniversary", title: "Anniversary Card", description: "Anniversaries for the upcoming week", icon: Heart, color: EVENT_COLORS.anniversary.primary },
  { id: "bible_study", title: "Bible Study Invite", description: "This Friday's Bible study", icon: BookOpen, color: EVENT_COLORS.friday_bible_study.primary },
  { id: "womens_study", title: "Women's Bible Study", description: "Wednesday women's study", icon: Users, color: EVENT_COLORS.wednesday_womens_study.primary },
  { id: "prayer_meeting", title: "Prayer Meeting", description: "Monthly prayer meeting invite", icon: HandHelping, color: EVENT_COLORS.monthly_prayer.primary },
  { id: "bulletin", title: "Weekly Bulletin", description: "Full weekly bulletin with all info", icon: Newspaper, color: EVENT_COLORS.bulletin.primary },
] as const

type BuiltinTemplateId = (typeof TEMPLATES)[number]["id"]
type TemplateId = BuiltinTemplateId | string

const TEMPLATE_TO_EVENT_TYPE: Record<string, string> = {
  birthday: "birthday",
  anniversary: "anniversary",
  bible_study: "friday_bible_study",
  womens_study: "wednesday_womens_study",
  prayer_meeting: "monthly_prayer",
  bulletin: "bulletin",
}

// Form types — imported from edit-forms (single source of truth)
import {
  HostFamilyInput,
  ResourceLinksEditor,
  CardStyleFields,
  BirthdayEditForm,
  AnniversaryEditForm,
  BibleStudyEditForm,
  WomensStudyEditForm,
  BulletinEditForm,
  type BirthdayFormData as BirthdayFormState,
  type AnniversaryFormData as AnniversaryFormState,
  type BibleStudyFormData as BibleStudyFormState,
  type WomensStudyFormData as WomensStudyFormState,
  type BulletinFormData as BulletinFormState,
} from "@/components/dashboard/communication-edit-forms"
import { formatPhone } from "@/lib/utils"

interface PrayerMeetingFormState {
  hostNames: string
  address: string
  city: string
  phone: string
  date: string
  time: string
  dinnerNote: string
  signupLink: string
  message: string
  headerSubtitle: string
  primaryColor: string
  footerVerse: string
  resourceLinks: { label: string; url: string }[]
}

interface CustomFormState {
  title: string
  subtitle: string
  emoji: string
  bannerImageUrl: string
  body: string
  primaryColor: string
  footerText: string
  resourceLinks: { label: string; url: string }[]
  weekLabel?: string
  date?: string
}

type FormState =
  | { type: "birthday"; data: BirthdayFormState }
  | { type: "anniversary"; data: AnniversaryFormState }
  | { type: "bible_study"; data: BibleStudyFormState }
  | { type: "womens_study"; data: WomensStudyFormState }
  | { type: "prayer_meeting"; data: PrayerMeetingFormState }
  | { type: "bulletin"; data: BulletinFormState }
  | { type: "custom"; data: CustomFormState }

// ---------------------------------------------------------------------------
// Mailing list type
// ---------------------------------------------------------------------------

interface MailingListOption {
  id: string
  name: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`
}

/** Build preview HTML from the current form state */
function buildPreview(form: FormState): string {
  switch (form.type) {
    case "birthday": {
      const d = form.data
      const birthdays =
        d.birthdays.length > 0
          ? d.birthdays
          : [{ name: "(No birthdays this week)", date: "" }]
      return buildBirthdayCard({
        weekLabel: d.weekLabel,
        birthdays,
        message: d.message || undefined,
        headerSubtitle: d.headerSubtitle || undefined,
        primaryColor: d.primaryColor || undefined,
        footerVerse: d.footerVerse || undefined,
        resourceLinks: (d.resourceLinks ?? []).filter((l) => l.url),
      })
    }
    case "anniversary": {
      const d = form.data
      const anniversaries =
        d.anniversaries.length > 0
          ? d.anniversaries
          : [{ husbandName: "(No anniversaries", wifeName: "this week)", date: "" }]
      return buildAnniversaryCard({
        weekLabel: d.weekLabel,
        anniversaries,
        message: d.message || undefined,
        headerSubtitle: d.headerSubtitle || undefined,
        primaryColor: d.primaryColor || undefined,
        footerVerse: d.footerVerse || undefined,
        resourceLinks: (d.resourceLinks ?? []).filter((l) => l.url),
      })
    }
    case "bible_study": {
      const d = form.data
      return buildBibleStudyCard({
        title: d.title || undefined,
        date: d.date,
        time: d.time,
        topic: d.topic || undefined,
        message: d.message || undefined,
        headerSubtitle: d.headerSubtitle || undefined,
        primaryColor: d.primaryColor || undefined,
        footerVerse: d.footerVerse || undefined,
        resourceLinks: (d.resourceLinks ?? []).filter((l) => l.url),
        locations: d.locations.map((loc) => ({
          label: loc.label,
          hostNames: loc.hostNames || undefined,
          address: loc.address || undefined,
          city: loc.city || undefined,
          phone: loc.phone || undefined,
        })),
      })
    }
    case "womens_study": {
      const d = form.data
      return buildWomensStudyCard({
        title: d.title || undefined,
        topic: d.topic || undefined,
        date: d.date,
        time: d.time,
        zoomLink: d.zoomLink || undefined,
        zoomMeetingId: d.zoomMeetingId || undefined,
        zoomPasscode: d.zoomPasscode || undefined,
        location: d.location || undefined,
        message: d.message || undefined,
        headerSubtitle: d.headerSubtitle || undefined,
        primaryColor: d.primaryColor || undefined,
        footerVerse: d.footerVerse || undefined,
        resourceLinks: (d.resourceLinks ?? []).filter((l) => l.url),
      })
    }
    case "prayer_meeting": {
      const d = form.data
      return buildPrayerMeetingCard({
        hostNames: d.hostNames,
        address: d.address,
        city: d.city || undefined,
        phone: d.phone || undefined,
        date: d.date,
        time: d.time,
        dinnerNote: d.dinnerNote || undefined,
        signupLink: d.signupLink || undefined,
        message: d.message || undefined,
        headerSubtitle: d.headerSubtitle || undefined,
        primaryColor: d.primaryColor || undefined,
        footerVerse: d.footerVerse || undefined,
        resourceLinks: (d.resourceLinks ?? []).filter((l) => l.url),
      })
    }
    case "bulletin": {
      const d = form.data
      return buildBulletinCard({
        weekLabel: d.weekLabel,
        headerSubtitle: d.headerSubtitle || undefined,
        birthdays: d.birthdays,
        anniversaries: d.anniversaries,
        helpers: d.helpers,
        events: d.events,
        resourceLinks: (d.resourceLinks ?? []).filter((l) => l.url),
        message: d.message || undefined,
        primaryColor: d.primaryColor || undefined,
        footerVerse: d.footerVerse || undefined,
      })
    }
    case "custom": {
      const d = form.data
      const vars = makeBulletinVars(d.weekLabel || "", d.date || "")
      return buildCustomCard({
        title: interp(d.title, vars) || "Announcement",
        subtitle: d.subtitle || undefined,
        emoji: d.emoji || undefined,
        bannerImageUrl: d.bannerImageUrl || undefined,
        bodyHtml: `<p style="margin:0;font-size:14px;line-height:1.6;white-space:pre-wrap">${interp(d.body, vars) ?? d.body}</p>`,
        primaryColor: d.primaryColor || undefined,
        footerText: interp(d.footerText, vars),
        resourceLinks: (d.resourceLinks ?? []).filter((l: { url: string }) => l.url),
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CustomTemplate {
  id: string
  name: string
  subject_template: string
  body_template: string
}

export default function ComposePage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId | null>(null)
  const [formState, setFormState] = useState<FormState | null>(null)
  const [loading, setLoading] = useState(false)
  const [mailingLists, setMailingLists] = useState<MailingListOption[]>([])
  const [selectedMailingList, setSelectedMailingList] = useState<string>("")
  const [smtpConfigs, setSmtpConfigs] = useState<{ id: string; name: string; from_email: string }[]>([])
  const [selectedSmtpConfig, setSelectedSmtpConfig] = useState<string>("")
  const [scheduling, setScheduling] = useState(false)
  const [subject, setSubject] = useState("")
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([])
  const [savedInstances, setSavedInstances] = useState<{ id: string; template_type: string; name: string; subject: string; updated_at: string; mailing_list_id: string | null; smtp_config_id: string | null; week_start: string | null; is_recurring: boolean; recur_until: string | null }[]>([])
  const [savingInstance, setSavingInstance] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurUntil, setRecurUntil] = useState("")

  // Fetch mailing lists + SMTP configs + custom templates + saved instances on mount
  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from("mailing_lists").select("id, name").order("name"),
      supabase.from("smtp_configs").select("id, name, from_email").eq("is_active", true).order("name"),
      supabase.from("email_templates").select("id, name, subject_template, body_template").eq("is_default", false).order("name")
        .returns<CustomTemplate[]>(),
      supabase.from("composed_instances").select("id, template_type, name, subject, updated_at, mailing_list_id, smtp_config_id, week_start, is_recurring, recur_until")
        .eq("is_active", true).order("updated_at", { ascending: false })
        .returns<{ id: string; template_type: string; name: string; subject: string; updated_at: string; mailing_list_id: string | null; smtp_config_id: string | null; week_start: string | null; is_recurring: boolean; recur_until: string | null }[]>(),
    ]).then(([mlRes, smtpRes, ctRes, ciRes]) => {
      if (mlRes.data) setMailingLists(mlRes.data)
      if (smtpRes.data) setSmtpConfigs(smtpRes.data)
      if (ctRes.data) setCustomTemplates(ctRes.data)
      if (ciRes.data) setSavedInstances(ciRes.data)
    })
  }, [])

  // Build preview from form state (live update)
  const previewHtml = useMemo(() => {
    if (!formState) return null
    return buildPreview(formState)
  }, [formState])

  // ----------------------------------------------------------
  // Template selection -> fetch DB data -> populate form
  // ----------------------------------------------------------

  const selectTemplate = useCallback(async (templateId: TemplateId) => {
    setLoading(true)
    setSelectedTemplate(templateId)

    const supabase = createClient()
    const today = addDays(new Date(), weekOffset * 7)

    // Fetch saved template defaults for this type (no FK join)
    const etName = TEMPLATE_TO_EVENT_TYPE[templateId]
    let savedData: Record<string, unknown> = {}
    let savedSubjectTmpl: string | null = null
    if (etName) {
      const [etRes, tmplRes] = await Promise.all([
        supabase.from("event_types").select("id, name").returns<{ id: string; name: string }[]>(),
        supabase.from("email_templates").select("event_type_id, body_template, subject_template").eq("is_default", true)
          .returns<{ event_type_id: string; body_template: string; subject_template: string }[]>(),
      ])
      const etMap: Record<string, string> = {}
      if (etRes.data) for (const et of etRes.data) etMap[et.name] = et.id
      const targetEtId = etMap[etName]
      const match = tmplRes.data?.find((t) => t.event_type_id === targetEtId)
      if (match) {
        const parsed = parseBodyTemplate(etName, match.body_template)
        if (parsed) savedData = parsed.data as Record<string, unknown>
        if (match.subject_template) savedSubjectTmpl = match.subject_template
      }
    }
    const monday = startOfWeek(today, { weekStartsOn: 1 })
    const sunday = endOfWeek(today, { weekStartsOn: 1 })
    const weekLabel = `${format(monday, "MMM d")} – ${format(sunday, "MMM d")}`

    const weekDays: { month: number; day: number }[] = []
    for (let d = new Date(monday); d <= sunday; d = addDays(d, 1)) {
      weekDays.push({ month: d.getMonth() + 1, day: d.getDate() })
    }
    const weekMonths = [...new Set(weekDays.map((d) => d.month))]
    const weekSet = new Set(weekDays.map((d) => `${d.month}-${d.day}`))

    switch (templateId) {
      case "birthday": {
        const { data } = await supabase
          .from("members")
          .select("full_name, birth_month, birth_day, family:families!family_id(is_active)")
          .eq("is_active", true)
          .not("birth_month", "is", null)
          .not("birth_day", "is", null)
          .in("birth_month", weekMonths)
          .returns<{ full_name: string; birth_month: number; birth_day: number; family: { is_active: boolean } | null }[]>()

        const bdays = (data ?? [])
          .filter((m) => weekSet.has(`${m.birth_month}-${m.birth_day}`) && m.family?.is_active !== false)
          .map((m) => ({ name: m.full_name, date: `${m.birth_month}/${m.birth_day}` }))

        setFormState({
          type: "birthday",
          data: {
            weekLabel,
            birthdays: bdays,
            ...extractCommonFields(savedData as CommonCardFields),
          },
        })
        setSubject(interpolate(
          savedSubjectTmpl ?? `Happy Birthday! — Week of {{weekLabel}}`,
          makeBirthdayVars(weekLabel, bdays.map(b => b.name))
        ))
        break
      }

      case "anniversary": {
        const { data } = await supabase
          .from("wedding_anniversaries")
          .select("anniversary_month, anniversary_day, family:families!family_id(is_active), husband:members!husband_member_id(full_name, is_active), wife:members!wife_member_id(full_name, is_active)")
          .in("anniversary_month", weekMonths)
          .returns<{ anniversary_month: number; anniversary_day: number; family: { is_active: boolean } | null; husband: { full_name: string; is_active: boolean } | null; wife: { full_name: string; is_active: boolean } | null }[]>()

        const anns = (data ?? [])
          .filter((a) => weekSet.has(`${a.anniversary_month}-${a.anniversary_day}`))
          .filter((a) => a.family?.is_active !== false && a.husband?.is_active !== false)
          .map((a) => ({
            husbandName: a.husband?.full_name?.split(" ")[0] ?? "?",
            wifeName: a.wife?.full_name?.split(" ")[0] ?? "?",
            date: `${a.anniversary_month}/${a.anniversary_day}`,
          }))

        setFormState({
          type: "anniversary",
          data: {
            weekLabel,
            anniversaries: anns,
            ...extractCommonFields(savedData as CommonCardFields),
          },
        })
        setSubject(interpolate(
          savedSubjectTmpl ?? `Happy Anniversary! — Week of {{weekLabel}}`,
          makeAnniversaryVars(weekLabel, anns.map(a => `${a.husbandName} & ${a.wifeName}`))
        ))
        break
      }

      case "bible_study": {
        const fri = isFriday(today) ? today : nextFriday(today)
        const friISO = format(fri, "yyyy-MM-dd")
        const { data: instance } = await supabase
          .from("event_instances")
          .select("instance_date, instance_time, location_override, notes, host_family_id")
          .eq("instance_date", friISO)
          .eq("status", "confirmed")
          .limit(1)
          .returns<{ instance_date: string; instance_time: string | null; location_override: string | null; notes: string | null; host_family_id: string | null }[]>()
          .single()

        let hostName = "TBD"
        let address = "TBD"
        const city = ""
        let phone = ""

        if (instance?.host_family_id) {
          const { data: family } = await supabase
            .from("families")
            .select("family_name, home_phone")
            .eq("id", instance.host_family_id)
            .returns<{ family_name: string; home_phone: string | null }[]>()
            .single()
          if (family) {
            hostName = family.family_name
            phone = family.home_phone ?? ""
          }
          const { data: addr } = await supabase
            .from("addresses")
            .select("full_address")
            .eq("family_id", instance.host_family_id!)
            .eq("is_current", true)
            .returns<{ full_address: string }[]>()
            .limit(1)
            .single()
          if (addr) address = addr.full_address
        }

        if (instance?.location_override) address = instance.location_override
        if (instance?.notes) {
          const contactMatch = instance.notes.match(/Contact:\s*(.+)/i)
          if (contactMatch) phone = contactMatch[1].trim()
        }

        const bsDef = savedData as BibleStudyDefaults
        const fallbackBs = FALLBACK_DEFAULTS.friday_bible_study.data as BibleStudyDefaults
        const savedLocs = bsDef.locations ?? fallbackBs.locations ?? []
        const mergedLocs = savedLocs.map((loc, i) => {
          const base = { onVacation: false, vacationMessage: "", ...loc }
          if (i === 0 && hostName !== "TBD" && !base.onVacation) {
            return { ...base, hostNames: hostName, address, city, phone: phone || "" }
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
        setFormState({
          type: "bible_study",
          data: {
            title: bsDef.title ?? fallbackBs.title ?? "Bible Study This Friday",
            date: format(fri, "EEEE, MMMM do"),
            time: instance?.instance_time ? formatTime(instance.instance_time) : bsDef.time ?? "7:30 PM",
            topic: bsDef.topic ?? fallbackBs.topic ?? "Studying the Book of Acts",
            ...bsCommon,
            locations: mergedLocs,
          },
        })
        const bsDate = format(fri, "MMM d")
        setSubject(interpolate(
          savedSubjectTmpl ?? `Bible Study This Friday — {{date}}`,
          makeEventVars(weekLabel, bsDate, "", "")
        ))
        break
      }

      case "womens_study": {
        const ws = savedData as WomensStudyDefaults
        const wsDate = format(addDays(monday, 2), "EEEE, MMMM do")
        setFormState({
          type: "womens_study",
          data: {
            title: ws.title ?? "Women's Bible Study",
            topic: ws.topic ?? "Building a Relationship with God",
            date: wsDate,
            time: ws.time ?? "7:00 PM",
            zoomLink: ws.zoomLink ?? "",
            zoomMeetingId: ws.zoomMeetingId ?? "",
            zoomPasscode: ws.zoomPasscode ?? "",
            location: ws.location ?? "",
            ...extractCommonFields(ws),
          },
        })
        setSubject(interpolate(
          savedSubjectTmpl ?? `Women's Bible Study This Wednesday`,
          makeEventVars(weekLabel, wsDate, ws.time ?? "7:00 PM", ws.topic ?? "")
        ))
        break
      }

      case "prayer_meeting": {
        setFormState({
          type: "prayer_meeting",
          data: {
            hostNames: "TBD",
            address: "TBD",
            city: "",
            phone: "",
            date: "TBD",
            time: "6:30 PM",
            dinnerNote: "Dinner provided by the host family",
            signupLink: "",
            ...extractCommonFields(savedData as CommonCardFields),
          },
        })
        setSubject("Monthly Prayer Meeting")
        break
      }

      case "bulletin": {
        // Bulletin uses Sun-Sat week starting from the coming Sunday
        const bulSunday = getUpcomingSunday(today)
        const { saturday: bulSaturday } = getBulletinWeekBounds(bulSunday)
        const bulLabel = `${format(bulSunday, "MMM d")} – ${format(bulSaturday, "MMM d")}`

        const bulDays: { month: number; day: number }[] = []
        for (let d = new Date(bulSunday); d <= bulSaturday; d = addDays(d, 1)) {
          bulDays.push({ month: d.getMonth() + 1, day: d.getDate() })
        }
        const bulMonths = [...new Set(bulDays.map((d) => d.month))]
        const bulSet = new Set(bulDays.map((d) => `${d.month}-${d.day}`))

        const [bdayRes, annRes] = await Promise.all([
          supabase
            .from("members")
            .select("full_name, birth_month, birth_day, family:families!family_id(is_active)")
            .eq("is_active", true)
            .not("birth_month", "is", null)
            .in("birth_month", bulMonths)
            .returns<{ full_name: string; birth_month: number; birth_day: number; family: { is_active: boolean } | null }[]>(),
          supabase
            .from("wedding_anniversaries")
            .select("anniversary_month, anniversary_day, family:families!family_id(is_active), husband:members!husband_member_id(full_name, is_active), wife:members!wife_member_id(full_name, is_active)")
            .in("anniversary_month", bulMonths)
            .returns<{ anniversary_month: number; anniversary_day: number; family: { is_active: boolean } | null; husband: { full_name: string; is_active: boolean } | null; wife: { full_name: string; is_active: boolean } | null }[]>(),
        ])

        const bdays = (bdayRes.data ?? [])
          .filter((m) => bulSet.has(`${m.birth_month}-${m.birth_day}`) && m.family?.is_active !== false)
          .map((m) => ({ name: m.full_name, date: `${m.birth_month}/${m.birth_day}` }))

        const anns = (annRes.data ?? [])
          .filter((a) => bulSet.has(`${a.anniversary_month}-${a.anniversary_day}`))
          .filter((a) => a.family?.is_active !== false && a.husband?.is_active !== false)
          .map((a) => ({
            names: `${a.husband?.full_name?.split(" ")[0] ?? "?"} & ${a.wife?.full_name?.split(" ")[0] ?? "?"}`,
            date: `${a.anniversary_month}/${a.anniversary_day}`,
          }))

        const bulDef = savedData as BulletinDefaults
        const fallbackBul = FALLBACK_DEFAULTS.bulletin.data as BulletinDefaults
        setFormState({
          type: "bulletin",
          data: {
            weekLabel: `Sunday ${format(bulSunday, "MMMM d, yyyy")} — Week of ${bulLabel}`,
            birthdays: bdays,
            anniversaries: anns,
            helpers: [],
            events: bulDef.events ?? fallbackBul.events ?? [
              { title: "Women's Bible Study", details: "Building a Relationship with God — Wednesdays @ 7:00 PM via Zoom" },
              { title: "San Ramon Bible Study", details: "Studying the Book of Acts — Friday at 7:30 PM" },
            ],
            ...extractCommonFields(bulDef),
          },
        })
        setSubject(interpolate(
          savedSubjectTmpl ?? `Weekly Bulletin — {{weekLabel}}`,
          makeBulletinVars(bulLabel, format(bulSunday, "MMMM d, yyyy"))
        ))
        break
      }
    }

    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset])

  // ----------------------------------------------------------
  // Form update helpers (type-safe wrappers)
  // ----------------------------------------------------------

  function updateForm<T extends FormState["type"]>(
    type: T,
    updater: (prev: Extract<FormState, { type: T }>["data"]) => Extract<FormState, { type: T }>["data"],
  ) {
    setFormState((prev) => {
      if (!prev || prev.type !== type) return prev
      return { type, data: updater(prev.data as never) } as FormState
    })
  }

  // ----------------------------------------------------------
  // Save as composed instance (persists for Communication Hub)
  // ----------------------------------------------------------

  async function handleSaveInstance() {
    if (!formState || !subject) {
      toast.error("Select a template and fill in the subject first")
      return
    }

    setSavingInstance(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const templateType = formState.type === "custom"
        ? `custom:${selectedTemplate}`
        : formState.type
      const templateName = TEMPLATES.find((t) => t.id === formState.type)?.title || subject

      const base = addDays(new Date(), weekOffset * 7)
      const weekStart = format(getUpcomingSunday(base), "yyyy-MM-dd")

      // Check if an active instance already exists for this type + week
      const { data: existing } = await supabase
        .from("composed_instances")
        .select("id")
        .eq("template_type", templateType)
        .eq("is_active", true)
        .eq("week_start", weekStart)
        .limit(1)
        .returns<{ id: string }[]>()

      const payload = {
        template_type: templateType,
        name: templateName,
        subject,
        form_data: formState.data,
        mailing_list_id: selectedMailingList || null,
        smtp_config_id: selectedSmtpConfig || null,
        additional_recipients: null,
        is_active: true,
        week_start: weekStart,
        is_recurring: isRecurring,
        recur_until: isRecurring && recurUntil ? recurUntil : null,
        created_by: user?.id ?? null,
      }

      if (existing && existing.length > 0) {
        const { error } = await supabase
          .from("composed_instances")
          .update(payload as never)
          .eq("id", existing[0].id)
        if (error) {
          toast.error(`Save failed: ${error.message}`)
        } else {
          toast.success(`"${templateName}" saved for week of ${weekStart}.`)
          logAudit("composed_instance_updated", "composed_instances", existing[0].id, { templateType, weekStart })
        }
      } else {
        const { error } = await supabase
          .from("composed_instances")
          .insert(payload as never)
        if (error) {
          toast.error(`Save failed: ${error.message}`)
        } else {
          toast.success(`"${templateName}" saved for week of ${weekStart}.${isRecurring ? " Recurring weekly." : ""}`)
          logAudit("composed_instance_created", "composed_instances", null, { templateType, weekStart, isRecurring })
        }
      }

      // Refresh saved instances list
      const { data: refreshed } = await supabase
        .from("composed_instances")
        .select("id, template_type, name, subject, updated_at, mailing_list_id, smtp_config_id, week_start, is_recurring, recur_until")
        .eq("is_active", true).order("updated_at", { ascending: false })
        .returns<typeof savedInstances>()
      if (refreshed) setSavedInstances(refreshed)
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setSavingInstance(false)
    }
  }

  // ----------------------------------------------------------
  // Load a saved instance
  // ----------------------------------------------------------

  async function loadSavedInstance(instanceId: string) {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("composed_instances")
      .select("*")
      .eq("id", instanceId)
      .single() as { data: { id: string; template_type: string; name: string; subject: string; form_data: Record<string, unknown>; mailing_list_id: string | null; smtp_config_id: string | null; is_recurring: boolean; recur_until: string | null } | null }

    if (data) {
      const type = data.template_type.startsWith("custom:") ? "custom" : data.template_type
      setSelectedTemplate(data.template_type as TemplateId)
      const fd = data.form_data
      const patched = {
        ...fd,
        resourceLinks: (fd.resourceLinks ?? []) as { label: string; url: string }[],
        message: (fd.message ?? "") as string,
        primaryColor: (fd.primaryColor ?? "") as string,
        footerVerse: (fd.footerVerse ?? "") as string,
        bannerImageUrl: (fd.bannerImageUrl ?? "") as string,
        headerSubtitle: (fd.headerSubtitle ?? "") as string,
        // Migrate old single-link bible study fields
        ...(!fd.resourceLinks && fd.resourceLinkUrl ? {
          resourceLinks: [{ label: (fd.resourceLinkLabel as string) || "View Resources", url: fd.resourceLinkUrl as string }],
        } : {}),
      }
      setFormState({ type, data: patched } as unknown as FormState)
      setSubject(data.subject)
      setSelectedMailingList(data.mailing_list_id || "")
      setSelectedSmtpConfig(data.smtp_config_id || "")
      setIsRecurring(data.is_recurring ?? false)
      setRecurUntil(data.recur_until ?? "")
    }
    setLoading(false)
  }

  // ----------------------------------------------------------
  // Queue for dispatch
  // ----------------------------------------------------------

  async function handleScheduleDispatch() {
    if (!previewHtml || !subject) {
      toast.error("Generate a preview first")
      return
    }

    setScheduling(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data: inserted, error } = await supabase
        .from("dispatch_queue")
        .insert({
          subject,
          body_html: previewHtml,
          scheduled_at: new Date().toISOString(),
          status: "pending",
          template_type: selectedTemplate?.startsWith("custom:") ? "custom" : selectedTemplate || null,
          mailing_list_id: selectedMailingList || null,
          smtp_config_id: selectedSmtpConfig || null,
          created_by: user?.id ?? null,
        } as never)
        .select("id")
        .single() as { data: { id: string } | null; error: { message: string } | null }

      if (error) {
        toast.error(`Failed: ${error.message}`)
      } else {
        toast.success("Dispatch queued successfully! Go to Dispatch Queue to approve and send.")
        await logAudit("dispatch_created", "dispatch_queue", inserted?.id, {
          subject,
          template: selectedTemplate,
        })
        setFormState(null)
        setSelectedTemplate(null)
        setSubject("")
      }
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setScheduling(false)
    }
  }

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Page header with week selector */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compose</h1>
          <p className="text-sm text-muted-foreground">
            {weekOffset === 0 ? "This week" : weekOffset === 1 ? "Next week" : `${weekOffset} weeks ahead`}
            {" — "}
            <span className="font-medium text-foreground">
              {(() => {
                const base = addDays(new Date(), weekOffset * 7)
                const sun = getUpcomingSunday(base)
                const { saturday } = getBulletinWeekBounds(sun)
                return `${format(sun, "MMM d")} – ${format(saturday, "MMM d")}`
              })()}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => { setWeekOffset((w) => Math.max(0, w - 1)); setSelectedTemplate(null); setFormState(null) }} disabled={weekOffset === 0}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant={weekOffset === 0 ? "default" : "outline"} size="sm" onClick={() => { setWeekOffset(0); setSelectedTemplate(null); setFormState(null) }}>
            This Week
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setWeekOffset((w) => w + 1); setSelectedTemplate(null); setFormState(null) }}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Saved Instances */}
      {savedInstances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saved Instances</CardTitle>
            <CardDescription>Continue editing a previously saved communication</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {savedInstances.map((si) => (
                <div
                  key={si.id}
                  className="group relative flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent cursor-pointer"
                  onClick={() => loadSavedInstance(si.id)}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Send className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{si.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{si.subject}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {si.week_start ? `Week of ${si.week_start}` : "No week set"}
                      {si.is_recurring && " · Recurring"}
                      {si.is_recurring && si.recur_until && ` until ${si.recur_until}`}
                      {si.mailing_list_id && " · List set"}
                      {si.smtp_config_id && " · SMTP set"}
                    </p>
                  </div>
                  <button
                    type="button"
                    title="Delete instance"
                    className="absolute right-2 top-2 hidden rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:block"
                    onClick={async (e) => {
                      e.stopPropagation()
                      const supabase = createClient()
                      const { error } = await supabase
                        .from("composed_instances")
                        .delete()
                        .eq("id", si.id)
                      if (error) {
                        toast.error(`Delete failed: ${error.message}`)
                      } else {
                        setSavedInstances((prev) => prev.filter((s) => s.id !== si.id))
                        logAudit("composed_instance_deleted", "composed_instances", si.id, { name: si.name })
                        toast.success(`"${si.name}" deleted`)
                      }
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template selector cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((tmpl) => {
          const Icon = tmpl.icon
          const isSelected = selectedTemplate === tmpl.id
          return (
            <Card
              key={tmpl.id}
              className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? "ring-2" : ""}`}
              style={isSelected ? { borderColor: tmpl.color, boxShadow: `0 0 0 1px ${tmpl.color}` } : {}}
              onClick={() => selectTemplate(tmpl.id)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-10 items-center justify-center rounded-lg"
                    style={{ backgroundColor: tmpl.color + "15", color: tmpl.color }}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{tmpl.title}</CardTitle>
                    <CardDescription className="text-xs">{tmpl.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )
        })}

        {/* Custom templates */}
        {customTemplates.map((ct) => {
          const isSelected = selectedTemplate === `custom:${ct.id}`
          const color = "#6B7280"
          return (
            <Card
              key={ct.id}
              className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? "ring-2" : ""}`}
              style={isSelected ? { borderColor: color, boxShadow: `0 0 0 1px ${color}` } : {}}
              onClick={() => {
                setSelectedTemplate(`custom:${ct.id}`)
                const today = addDays(new Date(), weekOffset * 7)
                const mon = startOfWeek(today, { weekStartsOn: 1 })
                const sun = endOfWeek(today, { weekStartsOn: 1 })
                const wLabel = `${format(mon, "MMM d")} – ${format(sun, "MMM d")}`
                const dateStr = format(today, "MMMM d, yyyy")
                const ctVars = makeBulletinVars(wLabel, dateStr)
                try {
                  const body = JSON.parse(ct.body_template)
                  setFormState({
                    type: "custom",
                    data: {
                      title: body.title || ct.name,
                      subtitle: body.subtitle || "",
                      emoji: body.emoji || "📋",
                      bannerImageUrl: body.bannerImageUrl || "",
                      body: body.body || "",
                      primaryColor: body.primaryColor || "",
                      footerText: body.footerText || "",
                      resourceLinks: body.resourceLinks || [],
                      weekLabel: wLabel,
                      date: dateStr,
                    },
                  })
                  setSubject(interpolate(ct.subject_template || ct.name, ctVars))
                } catch {
                  setFormState({
                    type: "custom",
                    data: { title: ct.name, subtitle: "", emoji: "📋", bannerImageUrl: "", body: ct.body_template, primaryColor: "", footerText: "", resourceLinks: [], weekLabel: wLabel, date: dateStr },
                  })
                  setSubject(ct.name)
                }
              }}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Send className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{ct.name}</CardTitle>
                    <CardDescription className="text-xs">Custom template</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )
        })}

        {/* Create new custom template */}
        <Card
          className={`cursor-pointer transition-all hover:shadow-md border-dashed ${selectedTemplate === "custom:new" ? "ring-2" : ""}`}
          onClick={() => {
            setSelectedTemplate("custom:new")
            const today = addDays(new Date(), weekOffset * 7)
            const mon = startOfWeek(today, { weekStartsOn: 1 })
            const sun = endOfWeek(today, { weekStartsOn: 1 })
            const wLabel = `${format(mon, "MMM d")} – ${format(sun, "MMM d")}`
            const dateStr = format(today, "MMMM d, yyyy")
            setFormState({
              type: "custom",
              data: { title: "", subtitle: "Christ Church of India, San Ramon", emoji: "📋", bannerImageUrl: "", body: "", primaryColor: "#6B7280", footerText: "", resourceLinks: [], weekLabel: wLabel, date: dateStr },
            })
            setSubject("")
            setLoading(false)
          }}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                <Plus className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base">Custom Announcement</CardTitle>
                <CardDescription className="text-xs">Create a one-off or save as template</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Loading */}
      {loading && (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span>Fetching church data...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form + Preview (two-column on desktop, stacked on mobile) */}
      {formState && !loading && (
        <div className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* ---------- LEFT: Edit Form ---------- */}
            <Card>
              <CardHeader>
                <CardTitle>Edit Content</CardTitle>
                <CardDescription>
                  Modify the fields below. The preview updates live.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Subject line (shared by all) */}
                  <div className="space-y-1.5">
                    <Label htmlFor="subject">Email Subject</Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>

                  <hr className="border-border" />

                  {/* Template-specific fields */}
                  {formState.type === "birthday" && (
                    <BirthdayEditForm
                      data={formState.data}
                      onChange={(data) => updateForm("birthday", () => data)}
                    />
                  )}
                  {formState.type === "anniversary" && (
                    <AnniversaryEditForm
                      data={formState.data}
                      onChange={(data) => updateForm("anniversary", () => data)}
                    />
                  )}
                  {formState.type === "bible_study" && (
                    <BibleStudyEditForm
                      data={formState.data}
                      onChange={(data) => updateForm("bible_study", () => data)}
                    />
                  )}
                  {formState.type === "womens_study" && (
                    <WomensStudyEditForm
                      data={formState.data}
                      onChange={(data) => updateForm("womens_study", () => data)}
                    />
                  )}
                  {formState.type === "prayer_meeting" && (
                    <PrayerMeetingForm
                      data={formState.data}
                      onChange={(data) => updateForm("prayer_meeting", () => data)}
                    />
                  )}
                  {formState.type === "bulletin" && (
                    <BulletinEditForm
                      data={formState.data}
                      onChange={(data) => updateForm("bulletin", () => data)}
                    />
                  )}
                  {formState.type === "custom" && (
                    <CustomForm
                      data={formState.data}
                      onChange={(data) => setFormState({ type: "custom", data })}
                      onSaveAsTemplate={async (name) => {
                        const supabase = createClient()
                        const { error } = await supabase.from("email_templates").insert({
                          name,
                          subject_template: subject,
                          body_template: JSON.stringify(formState.data),
                          is_default: false,
                        } as never)
                        if (error) {
                          toast.error(`Failed: ${error.message}`)
                        } else {
                          toast.success(`Template "${name}" saved`)
                          logAudit("custom_template_created", "email_templates", null, { name })
                          const { data: ctRes } = await supabase
                            .from("email_templates").select("id, name, subject_template, body_template")
                            .eq("is_default", false).order("name").returns<CustomTemplate[]>()
                          if (ctRes) setCustomTemplates(ctRes)
                        }
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ---------- RIGHT: Live Preview ---------- */}
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Preview</CardTitle>
                    <CardDescription>
                      Subject: <strong>{subject}</strong>
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const w = window.open("", "_blank")
                      if (w) {
                        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{margin:0;padding:40px 16px;background:#f1f5f9;}</style></head><body>${previewHtml}</body></html>`)
                        w.document.close()
                      }
                    }}
                  >
                    <Eye className="size-4" />
                    Full Preview
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className="rounded-lg border bg-slate-50 p-6 dark:bg-slate-900"
                  dangerouslySetInnerHTML={{ __html: previewHtml ?? "" }}
                />
              </CardContent>
            </Card>
          </div>

          {/* ---------- Send Options ---------- */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Send Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Mailing List</Label>
                    <Select value={selectedMailingList} onValueChange={(val) => setSelectedMailingList(val ?? "")}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a mailing list...">
                          {mailingLists.find((ml) => ml.id === selectedMailingList)?.name || "Select a mailing list..."}
                        </SelectValue>
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
                  <div className="space-y-1.5">
                    <Label>Send From (SMTP Account)</Label>
                    <Select value={selectedSmtpConfig} onValueChange={(val) => setSelectedSmtpConfig(val ?? "")}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an SMTP account...">
                          {smtpConfigs.find((sc) => sc.id === selectedSmtpConfig)?.name || "Select an SMTP account..."}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {smtpConfigs.map((sc) => (
                          <SelectItem key={sc.id} value={sc.id}>
                            {sc.name} ({sc.from_email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      size="sm"
                      checked={isRecurring}
                      onCheckedChange={setIsRecurring}
                    />
                    <Label className="text-sm">Recurring weekly</Label>
                  </div>
                  {isRecurring && (
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground whitespace-nowrap">Until</Label>
                      <Input
                        type="date"
                        value={recurUntil}
                        onChange={(e) => setRecurUntil(e.target.value)}
                        className="h-8 w-40 text-sm"
                        placeholder="No end date"
                      />
                      {!recurUntil && <span className="text-xs text-muted-foreground">(no end date = forever)</span>}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={handleSaveInstance}
                    disabled={savingInstance}
                  >
                    {savingInstance ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Save Instance
                  </Button>
                  <Button
                    onClick={handleScheduleDispatch}
                    disabled={scheduling}
                    style={{ backgroundColor: TEMPLATES.find((t) => t.id === selectedTemplate)?.color }}
                  >
                    {scheduling ? <Loader2 className="animate-spin" /> : <Send className="size-4" />}
                    Queue for Dispatch
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// ===========================================================================
// Sub-form components (only template-specific forms that aren't shared)
// ===========================================================================

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Prayer Meeting Form
// ---------------------------------------------------------------------------

function PrayerMeetingForm({
  data,
  onChange,
}: {
  data: PrayerMeetingFormState
  onChange: (data: PrayerMeetingFormState) => void
}) {
  function set<K extends keyof PrayerMeetingFormState>(field: K, value: PrayerMeetingFormState[K]) {
    onChange({ ...data, [field]: value })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Host Names" htmlFor="pm-host">
          <HostFamilyInput
            value={data.hostNames}
            onChange={(v) => set("hostNames", v)}
            onSelect={(f) => {
              onChange({
                ...data,
                hostNames: `${f.family_name}'s Residence`,
                address: f.street ?? f.full_address ?? data.address,
                city: [f.city, [f.state, f.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ") || data.city,
                phone: formatPhone(f.home_phone) || data.phone,
              })
            }}
          />
        </Field>
        <Field label="Phone" htmlFor="pm-phone">
          <Input id="pm-phone" value={data.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
      </div>
      <Field label="Address" htmlFor="pm-addr">
        <Input id="pm-addr" value={data.address} onChange={(e) => set("address", e.target.value)} />
      </Field>
      <Field label="City" htmlFor="pm-city">
        <Input id="pm-city" value={data.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g., San Ramon, CA" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date" htmlFor="pm-date">
          <Input id="pm-date" value={data.date} onChange={(e) => set("date", e.target.value)} placeholder="Saturday, May 10th" />
        </Field>
        <Field label="Time" htmlFor="pm-time">
          <Input id="pm-time" value={data.time} onChange={(e) => set("time", e.target.value)} placeholder="6:30 PM" />
        </Field>
      </div>
      <Field label="Dinner Note" htmlFor="pm-dinner">
        <Input id="pm-dinner" value={data.dinnerNote} onChange={(e) => set("dinnerNote", e.target.value)} placeholder="Dinner provided by the host family" />
      </Field>
      <Field label="Signup Link" htmlFor="pm-signup">
        <Input id="pm-signup" value={data.signupLink} onChange={(e) => set("signupLink", e.target.value)} placeholder="https://..." />
      </Field>
      <ResourceLinksEditor
        links={data.resourceLinks ?? []}
        onChange={(links) => onChange({ ...data, resourceLinks: links })}
      />
      <CardStyleFields data={data} onChange={onChange} idPrefix="pm" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Custom Announcement Form
// ---------------------------------------------------------------------------

function CustomPlaceholderHint() {
  const placeholders: PlaceholderDef[] = TEMPLATE_PLACEHOLDERS["custom"] ?? []
  if (placeholders.length === 0) return null
  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Available Placeholders</p>
      <div className="flex flex-wrap gap-1.5">
        {placeholders.map((p) => (
          <button
            key={p.token}
            type="button"
            title={`${p.description} — e.g. "${p.example}"`}
            className="inline-flex items-center rounded border bg-background px-1.5 py-0.5 font-mono text-xs text-foreground hover:bg-accent transition-colors"
            onClick={() => navigator.clipboard.writeText(p.token).catch(() => {})}
          >
            {p.token}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">Click to copy. Use in subject, title, body, or footer fields.</p>
    </div>
  )
}

const EMOJI_PRESETS = ["📋", "📢", "🙏", "⛪", "❌", "✅", "📅", "🎉", "💡", "⚠️", "📖", "🕊️"]
const COLOR_PRESETS = ["#6B7280", "#3B82F6", "#EF4444", "#F59E0B", "#059669", "#8B5CF6", "#EC4899", "#0D9488"]

function CustomForm({
  data,
  onChange,
  onSaveAsTemplate,
}: {
  data: CustomFormState
  onChange: (data: CustomFormState) => void
  onSaveAsTemplate: (name: string) => void
}) {
  const [saveTemplateName, setSaveTemplateName] = useState("")
  const [uploading, setUploading] = useState(false)

  function set<K extends keyof CustomFormState>(field: K, value: CustomFormState[K]) {
    onChange({ ...data, [field]: value })
  }

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split(".").pop() || "jpg"
      const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from("card-images").upload(path, file, { upsert: true })
      if (error) {
        toast.error(`Upload failed: ${error.message}`)
        return
      }
      const { data: urlData } = supabase.storage.from("card-images").getPublicUrl(path)
      onChange({ ...data, bannerImageUrl: urlData.publicUrl })
      toast.success("Banner uploaded")
    } catch {
      toast.error("Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Field label="Card Title" htmlFor="ct-title">
        <Input id="ct-title" value={data.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g., No Bible Study This Week" />
      </Field>
      <Field label="Subtitle" htmlFor="ct-sub">
        <Input id="ct-sub" value={data.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="Christ Church of India, San Ramon" />
      </Field>
      <div className="space-y-1.5">
        <Label>Emoji</Label>
        <div className="flex flex-wrap gap-1.5">
          {EMOJI_PRESETS.map((e) => (
            <button
              key={e}
              type="button"
              className={`size-8 rounded-md text-lg transition-colors ${data.emoji === e ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-muted"}`}
              onClick={() => set("emoji", e)}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Color</Label>
        <div className="flex items-center gap-1.5">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              className={`size-6 rounded-full border-2 transition-transform hover:scale-110 ${data.primaryColor === c ? "border-foreground scale-110" : "border-transparent"}`}
              style={{ backgroundColor: c }}
              onClick={() => set("primaryColor", c)}
            />
          ))}
          <Input
            type="color"
            value={data.primaryColor || "#6B7280"}
            onChange={(e) => set("primaryColor", e.target.value)}
            className="h-6 w-8 cursor-pointer rounded border p-0"
          />
        </div>
      </div>
      {/* Banner Image */}
      <div className="space-y-1.5">
        <Label>Banner Image (optional)</Label>
        {data.bannerImageUrl ? (
          <div className="relative rounded-lg border overflow-hidden">
            <img src={data.bannerImageUrl} alt="Banner" className="w-full max-h-48 object-cover" />
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => set("bannerImageUrl", "")}
            >
              <Trash2 className="size-3.5" />
              Remove
            </Button>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/30">
            {uploading ? (
              <><Loader2 className="size-4 animate-spin" /> Uploading...</>
            ) : (
              <><ImagePlus className="size-5" /> Click to upload JPG, PNG, or WebP (max 5MB)</>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleBannerUpload}
              disabled={uploading}
            />
          </label>
        )}
        <p className="text-[11px] text-muted-foreground">Replaces the emoji header when set. Ideal size: 480px wide.</p>
      </div>

      <CustomPlaceholderHint />

      <Field label="Message Body" htmlFor="ct-body" hint="Placeholders above are replaced when the card is built">
        <Textarea
          id="ct-body"
          value={data.body}
          onChange={(e) => set("body", e.target.value)}
          placeholder="Write your announcement message here..."
          className="min-h-24"
        />
      </Field>
      <Field label="Footer Text (optional)" htmlFor="ct-footer">
        <Input id="ct-footer" value={data.footerText} onChange={(e) => set("footerText", e.target.value)} placeholder="Leave blank for default" />
      </Field>

      {/* Resource Links */}
      <div className="space-y-2">
        <Label>Resource Links (optional)</Label>
        {data.resourceLinks.map((link, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              placeholder="Label"
              value={link.label}
              onChange={(e) => {
                const links = [...data.resourceLinks]
                links[i] = { ...links[i], label: e.target.value }
                onChange({ ...data, resourceLinks: links })
              }}
              className="flex-1"
            />
            <Input
              placeholder="https://..."
              value={link.url}
              onChange={(e) => {
                const links = [...data.resourceLinks]
                links[i] = { ...links[i], url: e.target.value }
                onChange({ ...data, resourceLinks: links })
              }}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                const links = data.resourceLinks.filter((_, j) => j !== i)
                onChange({ ...data, resourceLinks: links })
              }}
            >
              <Trash2 className="size-3.5 text-muted-foreground" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange({ ...data, resourceLinks: [...data.resourceLinks, { label: "", url: "" }] })}
        >
          <Plus className="size-3.5" />
          Add Link
        </Button>
      </div>

      {/* Save as template */}
      <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
        <Label className="text-xs text-muted-foreground">Save as reusable template (optional)</Label>
        <div className="flex gap-2">
          <Input
            value={saveTemplateName}
            onChange={(e) => setSaveTemplateName(e.target.value)}
            placeholder="Template name..."
            className="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            disabled={!saveTemplateName.trim()}
            onClick={() => {
              onSaveAsTemplate(saveTemplateName.trim())
              setSaveTemplateName("")
            }}
          >
            Save Template
          </Button>
        </div>
      </div>
    </div>
  )
}
