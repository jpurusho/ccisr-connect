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
import {
  buildBirthdayCard,
  buildAnniversaryCard,
  buildBibleStudyCard,
  buildWomensStudyCard,
  buildPrayerMeetingCard,
  buildBulletinCard,
  buildCustomCard,
  EVENT_COLORS,
  type BirthdayEntry,
  type AnniversaryEntry,
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
} from "lucide-react"
import { startOfWeek, endOfWeek, format, addDays, nextFriday, isFriday } from "date-fns"
import { logAudit } from "@/lib/audit"
import { getUpcomingSunday, getBulletinWeekBounds } from "@/lib/date-utils"
import {
  parseBodyTemplate,
  FALLBACK_DEFAULTS,
  type BibleStudyDefaults,
  type WomensStudyDefaults,
  type BulletinDefaults,
} from "@/lib/template-defaults"

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
  type BirthdayFormData as BirthdayFormState,
  type AnniversaryFormData as AnniversaryFormState,
  type BibleStudyFormData as BibleStudyFormState,
  type BibleStudyLocationData as BibleStudyLocationState,
  type WomensStudyFormData as WomensStudyFormState,
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
}

interface BulletinFormState {
  weekLabel: string
  birthdays: { name: string; date: string }[]
  anniversaries: { names: string; date: string }[]
  helpers: { role: string; name: string }[]
  events: { title: string; details: string }[]
}

interface CustomFormState {
  title: string
  subtitle: string
  emoji: string
  body: string
  primaryColor: string
  footerText: string
  resourceLinks: { label: string; url: string }[]
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
        primaryColor: d.primaryColor || undefined,
        footerVerse: d.footerVerse || undefined,
        resourceLink: d.resourceLinkUrl
          ? { label: d.resourceLinkLabel || "View Resources", url: d.resourceLinkUrl }
          : undefined,
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
        primaryColor: d.primaryColor || undefined,
        footerVerse: d.footerVerse || undefined,
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
      })
    }
    case "bulletin": {
      const d = form.data
      return buildBulletinCard({
        weekLabel: d.weekLabel,
        birthdays: d.birthdays,
        anniversaries: d.anniversaries,
        helpers: d.helpers,
        events: d.events,
      })
    }
    case "custom": {
      const d = form.data
      const linksHtml = (d.resourceLinks ?? []).filter(l => l.url).map(l =>
        `<a href="${l.url}" style="display:inline-block;padding:8px 20px;background:${d.primaryColor || "#6B7280"};color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;margin:4px">${l.label || "View Link"}</a>`
      ).join("")
      const bodyWithLinks = `<p style="margin:0;font-size:14px;line-height:1.6;white-space:pre-wrap">${d.body}</p>${linksHtml ? `<div style="text-align:center;margin-top:16px">${linksHtml}</div>` : ""}`
      return buildCustomCard({
        title: d.title || "Announcement",
        subtitle: d.subtitle || undefined,
        emoji: d.emoji || undefined,
        bodyHtml: bodyWithLinks,
        primaryColor: d.primaryColor || undefined,
        footerText: d.footerText || undefined,
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
  const [savedInstances, setSavedInstances] = useState<{ id: string; template_type: string; name: string; subject: string; updated_at: string; mailing_list_id: string | null; smtp_config_id: string | null }[]>([])
  const [savingInstance, setSavingInstance] = useState(false)

  // Fetch mailing lists + SMTP configs + custom templates + saved instances on mount
  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from("mailing_lists").select("id, name").order("name"),
      supabase.from("smtp_configs").select("id, name, from_email").eq("is_active", true).order("name"),
      supabase.from("email_templates").select("id, name, subject_template, body_template").eq("is_default", false).order("name")
        .returns<CustomTemplate[]>(),
      supabase.from("composed_instances").select("id, template_type, name, subject, updated_at, mailing_list_id, smtp_config_id")
        .eq("is_active", true).order("updated_at", { ascending: false })
        .returns<{ id: string; template_type: string; name: string; subject: string; updated_at: string; mailing_list_id: string | null; smtp_config_id: string | null }[]>(),
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
    const today = new Date()

    // Fetch saved template defaults for this type (no FK join)
    const etName = TEMPLATE_TO_EVENT_TYPE[templateId]
    let savedData: Record<string, unknown> = {}
    if (etName) {
      const [etRes, tmplRes] = await Promise.all([
        supabase.from("event_types").select("id, name").returns<{ id: string; name: string }[]>(),
        supabase.from("email_templates").select("event_type_id, body_template").eq("is_default", true)
          .returns<{ event_type_id: string; body_template: string }[]>(),
      ])
      const etMap: Record<string, string> = {}
      if (etRes.data) for (const et of etRes.data) etMap[et.name] = et.id
      const targetEtId = etMap[etName]
      const match = tmplRes.data?.find((t) => t.event_type_id === targetEtId)
      if (match) {
        const parsed = parseBodyTemplate(etName, match.body_template)
        if (parsed) savedData = parsed.data as Record<string, unknown>
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
          .select("full_name, birth_month, birth_day")
          .eq("is_active", true)
          .not("birth_month", "is", null)
          .not("birth_day", "is", null)
          .in("birth_month", weekMonths)
          .returns<{ full_name: string; birth_month: number; birth_day: number }[]>()

        const bdays = (data ?? [])
          .filter((m) => weekSet.has(`${m.birth_month}-${m.birth_day}`))
          .map((m) => ({ name: m.full_name, date: `${m.birth_month}/${m.birth_day}` }))

        setFormState({
          type: "birthday",
          data: { weekLabel, birthdays: bdays, message: "" },
        })
        setSubject(`Happy Birthday! — Week of ${weekLabel}`)
        break
      }

      case "anniversary": {
        const { data } = await supabase
          .from("wedding_anniversaries")
          .select("anniversary_month, anniversary_day, husband:members!husband_member_id(full_name), wife:members!wife_member_id(full_name)")
          .in("anniversary_month", weekMonths)
          .returns<{ anniversary_month: number; anniversary_day: number; husband: { full_name: string } | null; wife: { full_name: string } | null }[]>()

        const anns = (data ?? [])
          .filter((a) => weekSet.has(`${a.anniversary_month}-${a.anniversary_day}`))
          .map((a) => ({
            husbandName: a.husband?.full_name?.split(" ")[0] ?? "?",
            wifeName: a.wife?.full_name?.split(" ")[0] ?? "?",
            date: `${a.anniversary_month}/${a.anniversary_day}`,
          }))

        setFormState({
          type: "anniversary",
          data: { weekLabel, anniversaries: anns, message: "" },
        })
        setSubject(`Happy Anniversary! — Week of ${weekLabel}`)
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

        setFormState({
          type: "bible_study",
          data: {
            title: bsDef.title ?? fallbackBs.title ?? "Bible Study This Friday",
            date: format(fri, "EEEE, MMMM do"),
            time: instance?.instance_time ? formatTime(instance.instance_time) : bsDef.time ?? "7:30 PM",
            topic: bsDef.topic ?? fallbackBs.topic ?? "Studying the Book of Acts",
            message: bsDef.message ?? "",
            primaryColor: bsDef.primaryColor ?? "",
            footerVerse: bsDef.footerVerse ?? "",
            resourceLinkLabel: (bsDef as Record<string, unknown>).resourceLinkLabel as string ?? "",
            resourceLinkUrl: (bsDef as Record<string, unknown>).resourceLinkUrl as string ?? "",
            locations: mergedLocs,
          },
        })
        setSubject(`Bible Study This Friday — ${format(fri, "MMM d")}`)
        break
      }

      case "womens_study": {
        setFormState({
          type: "womens_study",
          data: {
            title: (savedData as WomensStudyDefaults).title ?? "Women's Bible Study",
            topic: (savedData as WomensStudyDefaults).topic ?? "Building a Relationship with God",
            date: format(addDays(monday, 2), "EEEE, MMMM do"),
            time: (savedData as WomensStudyDefaults).time ?? "7:00 PM",
            zoomLink: (savedData as WomensStudyDefaults).zoomLink ?? "",
            zoomMeetingId: (savedData as WomensStudyDefaults).zoomMeetingId ?? "",
            zoomPasscode: (savedData as WomensStudyDefaults).zoomPasscode ?? "",
            location: (savedData as WomensStudyDefaults).location ?? "",
            message: (savedData as WomensStudyDefaults).message ?? "",
            primaryColor: (savedData as WomensStudyDefaults).primaryColor ?? "",
            footerVerse: (savedData as WomensStudyDefaults).footerVerse ?? "",
          },
        })
        setSubject("Women's Bible Study This Wednesday")
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
            message: "",
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
            .select("full_name, birth_month, birth_day")
            .eq("is_active", true)
            .not("birth_month", "is", null)
            .in("birth_month", bulMonths)
            .returns<{ full_name: string; birth_month: number; birth_day: number }[]>(),
          supabase
            .from("wedding_anniversaries")
            .select("anniversary_month, anniversary_day, husband:members!husband_member_id(full_name), wife:members!wife_member_id(full_name)")
            .in("anniversary_month", bulMonths)
            .returns<{ anniversary_month: number; anniversary_day: number; husband: { full_name: string } | null; wife: { full_name: string } | null }[]>(),
        ])

        const bdays = (bdayRes.data ?? [])
          .filter((m) => bulSet.has(`${m.birth_month}-${m.birth_day}`))
          .map((m) => ({ name: m.full_name, date: `${m.birth_month}/${m.birth_day}` }))

        const anns = (annRes.data ?? [])
          .filter((a) => bulSet.has(`${a.anniversary_month}-${a.anniversary_day}`))
          .map((a) => ({
            names: `${a.husband?.full_name?.split(" ")[0] ?? "?"} & ${a.wife?.full_name?.split(" ")[0] ?? "?"}`,
            date: `${a.anniversary_month}/${a.anniversary_day}`,
          }))

        setFormState({
          type: "bulletin",
          data: {
            weekLabel: `Sunday ${format(bulSunday, "MMMM d, yyyy")} — Week of ${bulLabel}`,
            birthdays: bdays,
            anniversaries: anns,
            helpers: [],
            events: [
              { title: "Women's Bible Study", details: "Building a Relationship with God — Wednesdays @ 7:00 PM via Zoom" },
              { title: "San Ramon Bible Study", details: "Studying the Book of Acts — Friday at 7:30 PM" },
            ],
          },
        })
        setSubject(`Weekly Bulletin for Sunday ${format(bulSunday, "MMMM d, yyyy")}`)
        break
      }
    }

    setLoading(false)
  }, [])

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

      // Check if an active instance already exists for this type
      const { data: existing } = await supabase
        .from("composed_instances")
        .select("id")
        .eq("template_type", templateType)
        .eq("is_active", true)
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
          toast.success(`"${templateName}" instance saved. Ready to send from Communication Hub.`)
          logAudit("composed_instance_updated", "composed_instances", existing[0].id, { templateType })
        }
      } else {
        const { error } = await supabase
          .from("composed_instances")
          .insert(payload as never)
        if (error) {
          toast.error(`Save failed: ${error.message}`)
        } else {
          toast.success(`"${templateName}" instance saved. Ready to send from Communication Hub.`)
          logAudit("composed_instance_created", "composed_instances", null, { templateType })
        }
      }

      // Refresh saved instances list
      const { data: refreshed } = await supabase
        .from("composed_instances")
        .select("id, template_type, name, subject, updated_at, mailing_list_id, smtp_config_id")
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
      .single() as { data: { id: string; template_type: string; name: string; subject: string; form_data: Record<string, unknown>; mailing_list_id: string | null; smtp_config_id: string | null } | null }

    if (data) {
      const type = data.template_type.startsWith("custom:") ? "custom" : data.template_type
      setSelectedTemplate(data.template_type as TemplateId)
      setFormState({ type, data: data.form_data } as unknown as FormState)
      setSubject(data.subject)
      setSelectedMailingList(data.mailing_list_id || "")
      setSelectedSmtpConfig(data.smtp_config_id || "")
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
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Compose</h1>
        <p className="text-muted-foreground">
          Select a template, edit the content, then preview and send.
        </p>
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
                <button
                  key={si.id}
                  type="button"
                  className="flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
                  onClick={() => loadSavedInstance(si.id)}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Send className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{si.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{si.subject}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      Updated {new Date(si.updated_at).toLocaleDateString()}
                      {si.mailing_list_id && " · List set"}
                      {si.smtp_config_id && " · SMTP set"}
                    </p>
                  </div>
                </button>
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
                try {
                  const body = JSON.parse(ct.body_template)
                  setFormState({
                    type: "custom",
                    data: {
                      title: body.title || ct.name,
                      subtitle: body.subtitle || "",
                      emoji: body.emoji || "📋",
                      body: body.body || "",
                      primaryColor: body.primaryColor || "",
                      footerText: body.footerText || "",
                      resourceLinks: body.resourceLinks || [],
                    },
                  })
                  setSubject(ct.subject_template || ct.name)
                } catch {
                  setFormState({
                    type: "custom",
                    data: { title: ct.name, subtitle: "", emoji: "📋", body: ct.body_template, primaryColor: "", footerText: "", resourceLinks: [] },
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
            setFormState({
              type: "custom",
              data: { title: "", subtitle: "Christ Church of India, San Ramon", emoji: "📋", body: "", primaryColor: "#6B7280", footerText: "", resourceLinks: [] },
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
                    <BirthdayForm
                      data={formState.data}
                      onChange={(data) => updateForm("birthday", () => data)}
                    />
                  )}
                  {formState.type === "anniversary" && (
                    <AnniversaryForm
                      data={formState.data}
                      onChange={(data) => updateForm("anniversary", () => data)}
                    />
                  )}
                  {formState.type === "bible_study" && (
                    <BibleStudyForm
                      data={formState.data}
                      onChange={(data) => updateForm("bible_study", () => data)}
                    />
                  )}
                  {formState.type === "womens_study" && (
                    <WomensStudyForm
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
                    <BulletinForm
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
// Sub-form components
// ===========================================================================

// Shared field wrapper for consistent spacing
function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Birthday Form
// ---------------------------------------------------------------------------

function BirthdayForm({
  data,
  onChange,
}: {
  data: BirthdayFormState
  onChange: (data: BirthdayFormState) => void
}) {
  function updateBirthday(index: number, field: keyof BirthdayEntry, value: string) {
    const updated = [...data.birthdays]
    updated[index] = { ...updated[index], [field]: value }
    onChange({ ...data, birthdays: updated })
  }

  function removeBirthday(index: number) {
    onChange({ ...data, birthdays: data.birthdays.filter((_, i) => i !== index) })
  }

  function addBirthday() {
    onChange({ ...data, birthdays: [...data.birthdays, { name: "", date: "" }] })
  }

  return (
    <div className="space-y-4">
      <Field label="Week Label" htmlFor="bday-week">
        <Input
          id="bday-week"
          value={data.weekLabel}
          onChange={(e) => onChange({ ...data, weekLabel: e.target.value })}
        />
      </Field>

      <div className="space-y-2">
        <Label>Birthdays</Label>
        {data.birthdays.map((b, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              placeholder="Name"
              value={b.name}
              onChange={(e) => updateBirthday(i, "name", e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Date (e.g., 4/29)"
              value={b.date}
              onChange={(e) => updateBirthday(i, "date", e.target.value)}
              className="w-28"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => removeBirthday(i)}
            >
              <Trash2 className="size-3.5 text-muted-foreground" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addBirthday}>
          <Plus className="size-3.5" />
          Add Birthday
        </Button>
      </div>

      <Field label="Custom Message (optional)" htmlFor="bday-msg">
        <Textarea
          id="bday-msg"
          placeholder="Leave blank for default message"
          value={data.message}
          onChange={(e) => onChange({ ...data, message: e.target.value })}
        />
      </Field>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Anniversary Form
// ---------------------------------------------------------------------------

function AnniversaryForm({
  data,
  onChange,
}: {
  data: AnniversaryFormState
  onChange: (data: AnniversaryFormState) => void
}) {
  function updateAnniversary(index: number, field: keyof AnniversaryEntry, value: string | number | undefined) {
    const updated = [...data.anniversaries]
    updated[index] = { ...updated[index], [field]: value }
    onChange({ ...data, anniversaries: updated })
  }

  function removeAnniversary(index: number) {
    onChange({ ...data, anniversaries: data.anniversaries.filter((_, i) => i !== index) })
  }

  function addAnniversary() {
    onChange({
      ...data,
      anniversaries: [...data.anniversaries, { husbandName: "", wifeName: "", date: "" }],
    })
  }

  return (
    <div className="space-y-4">
      <Field label="Week Label" htmlFor="ann-week">
        <Input
          id="ann-week"
          value={data.weekLabel}
          onChange={(e) => onChange({ ...data, weekLabel: e.target.value })}
        />
      </Field>

      <div className="space-y-2">
        <Label>Anniversaries</Label>
        {data.anniversaries.map((a, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Husband"
              value={a.husbandName}
              onChange={(e) => updateAnniversary(i, "husbandName", e.target.value)}
              className="w-28 flex-1"
            />
            <Input
              placeholder="Wife"
              value={a.wifeName}
              onChange={(e) => updateAnniversary(i, "wifeName", e.target.value)}
              className="w-28 flex-1"
            />
            <Input
              placeholder="Date"
              value={a.date}
              onChange={(e) => updateAnniversary(i, "date", e.target.value)}
              className="w-20"
            />
            <Input
              placeholder="Years"
              type="number"
              value={a.years ?? ""}
              onChange={(e) =>
                updateAnniversary(i, "years", e.target.value ? parseInt(e.target.value, 10) : undefined)
              }
              className="w-16"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => removeAnniversary(i)}
            >
              <Trash2 className="size-3.5 text-muted-foreground" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addAnniversary}>
          <Plus className="size-3.5" />
          Add Anniversary
        </Button>
      </div>

      <Field label="Custom Message (optional)" htmlFor="ann-msg">
        <Textarea
          id="ann-msg"
          placeholder="Leave blank for default message"
          value={data.message}
          onChange={(e) => onChange({ ...data, message: e.target.value })}
        />
      </Field>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bible Study Form
// ---------------------------------------------------------------------------

function BibleStudyForm({
  data,
  onChange,
}: {
  data: BibleStudyFormState
  onChange: (data: BibleStudyFormState) => void
}) {
  function set<K extends keyof Omit<BibleStudyFormState, "locations">>(field: K, value: BibleStudyFormState[K]) {
    onChange({ ...data, [field]: value })
  }

  function updateLocation(index: number, field: keyof BibleStudyLocationState, value: string) {
    const updated = [...data.locations]
    updated[index] = { ...updated[index], [field]: value }
    onChange({ ...data, locations: updated })
  }

  function removeLocation(index: number) {
    onChange({ ...data, locations: data.locations.filter((_, i) => i !== index) })
  }

  function addLocation() {
    onChange({
      ...data,
      locations: [...data.locations, { label: "", hostNames: "TBD", address: "TBD", city: "", phone: "", onVacation: false, vacationMessage: "" }],
    })
  }

  return (
    <div className="space-y-4">
      <Field label="Card Title" htmlFor="bs-title">
        <Input id="bs-title" value={data.title} onChange={(e) => set("title", e.target.value)} placeholder="Bible Study This Friday" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date" htmlFor="bs-date">
          <Input id="bs-date" value={data.date} onChange={(e) => set("date", e.target.value)} placeholder="Friday, May 2nd" />
        </Field>
        <Field label="Time" htmlFor="bs-time">
          <Input id="bs-time" value={data.time} onChange={(e) => set("time", e.target.value)} placeholder="7:30 PM" />
        </Field>
      </div>
      <Field label="Topic (leave empty to exclude)" htmlFor="bs-topic">
        <Input id="bs-topic" value={data.topic} onChange={(e) => set("topic", e.target.value)} />
      </Field>

      {data.locations.map((loc, i) => (
        <div key={i} className="space-y-2 rounded-md border p-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Location name"
              value={loc.label}
              onChange={(e) => updateLocation(i, "label", e.target.value)}
              className="flex-1 font-medium"
            />
            {data.locations.length > 1 && (
              <Button variant="ghost" size="icon-sm" onClick={() => removeLocation(i)}>
                <Trash2 className="size-3.5 text-muted-foreground" />
              </Button>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <HostFamilyInput
              value={loc.hostNames}
              onChange={(v) => updateLocation(i, "hostNames", v)}
              onSelect={(f) => {
                const locs = [...data.locations]
                locs[i] = {
                  ...locs[i],
                  hostNames: `${f.family_name}'s Residence`,
                  address: f.full_address ?? locs[i].address,
                  city: [f.city, f.state, f.zip].filter(Boolean).join(", ") || locs[i].city,
                  phone: formatPhone(f.home_phone) || locs[i].phone,
                }
                onChange({ ...data, locations: locs })
              }}
            />
            <Input placeholder="Phone" value={loc.phone} onChange={(e) => updateLocation(i, "phone", e.target.value)} />
          </div>
          <Input placeholder="Address" value={loc.address} onChange={(e) => updateLocation(i, "address", e.target.value)} />
          <Input placeholder="City, State ZIP" value={loc.city} onChange={(e) => updateLocation(i, "city", e.target.value)} />
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addLocation}>
        <Plus className="size-3.5" />
        Add Location
      </Button>

      <Field label="Custom Message (optional)" htmlFor="bs-msg">
        <Textarea
          id="bs-msg"
          placeholder="Leave blank for default message"
          value={data.message}
          onChange={(e) => set("message", e.target.value)}
        />
      </Field>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Women's Study Form
// ---------------------------------------------------------------------------

function WomensStudyForm({
  data,
  onChange,
}: {
  data: WomensStudyFormState
  onChange: (data: WomensStudyFormState) => void
}) {
  function set<K extends keyof WomensStudyFormState>(field: K, value: WomensStudyFormState[K]) {
    onChange({ ...data, [field]: value })
  }

  return (
    <div className="space-y-4">
      <Field label="Card Title" htmlFor="ws-title">
        <Input id="ws-title" value={data.title} onChange={(e) => set("title", e.target.value)} placeholder="Women's Bible Study" />
      </Field>
      <Field label="Topic (leave empty to exclude)" htmlFor="ws-topic">
        <Input id="ws-topic" value={data.topic} onChange={(e) => set("topic", e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date" htmlFor="ws-date">
          <Input id="ws-date" value={data.date} onChange={(e) => set("date", e.target.value)} placeholder="Wednesday, May 7th" />
        </Field>
        <Field label="Time" htmlFor="ws-time">
          <Input id="ws-time" value={data.time} onChange={(e) => set("time", e.target.value)} placeholder="7:00 PM" />
        </Field>
      </div>
      <Field label="Zoom Link (leave empty to exclude)" htmlFor="ws-zoom">
        <Input id="ws-zoom" value={data.zoomLink} onChange={(e) => set("zoomLink", e.target.value)} placeholder="https://zoom.us/j/..." />
      </Field>
      {data.zoomLink && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Meeting ID" htmlFor="ws-zmid">
            <Input id="ws-zmid" value={data.zoomMeetingId} onChange={(e) => set("zoomMeetingId", e.target.value)} placeholder="779 2123 2378" />
          </Field>
          <Field label="Passcode" htmlFor="ws-zmpw">
            <Input id="ws-zmpw" value={data.zoomPasscode} onChange={(e) => set("zoomPasscode", e.target.value)} placeholder="6gLy8u" />
          </Field>
        </div>
      )}
      <Field label="Location (used when no Zoom link)" htmlFor="ws-loc">
        <Input id="ws-loc" value={data.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g., Fellowship Hall" />
      </Field>
      <Field label="Custom Message (optional)" htmlFor="ws-msg">
        <Textarea
          id="ws-msg"
          placeholder="Leave blank for default message"
          value={data.message}
          onChange={(e) => set("message", e.target.value)}
        />
      </Field>
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
                address: f.full_address ?? data.address,
                city: [f.city, f.state, f.zip].filter(Boolean).join(", ") || data.city,
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
      <Field label="Custom Message (optional)" htmlFor="pm-msg">
        <Textarea
          id="pm-msg"
          placeholder="Leave blank for default message"
          value={data.message}
          onChange={(e) => set("message", e.target.value)}
        />
      </Field>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bulletin Form
// ---------------------------------------------------------------------------

function BulletinForm({
  data,
  onChange,
}: {
  data: BulletinFormState
  onChange: (data: BulletinFormState) => void
}) {
  // --- Birthdays ---
  function updateBirthday(i: number, field: string, value: string) {
    const updated = [...data.birthdays]
    updated[i] = { ...updated[i], [field]: value }
    onChange({ ...data, birthdays: updated })
  }
  function removeBirthday(i: number) {
    onChange({ ...data, birthdays: data.birthdays.filter((_, idx) => idx !== i) })
  }
  function addBirthday() {
    onChange({ ...data, birthdays: [...data.birthdays, { name: "", date: "" }] })
  }

  // --- Anniversaries ---
  function updateAnniversary(i: number, field: string, value: string) {
    const updated = [...data.anniversaries]
    updated[i] = { ...updated[i], [field]: value }
    onChange({ ...data, anniversaries: updated })
  }
  function removeAnniversary(i: number) {
    onChange({ ...data, anniversaries: data.anniversaries.filter((_, idx) => idx !== i) })
  }
  function addAnniversary() {
    onChange({ ...data, anniversaries: [...data.anniversaries, { names: "", date: "" }] })
  }

  // --- Helpers ---
  function updateHelper(i: number, field: string, value: string) {
    const updated = [...data.helpers]
    updated[i] = { ...updated[i], [field]: value }
    onChange({ ...data, helpers: updated })
  }
  function removeHelper(i: number) {
    onChange({ ...data, helpers: data.helpers.filter((_, idx) => idx !== i) })
  }
  function addHelper() {
    onChange({ ...data, helpers: [...data.helpers, { role: "", name: "" }] })
  }

  // --- Events ---
  function updateEvent(i: number, field: string, value: string) {
    const updated = [...data.events]
    updated[i] = { ...updated[i], [field]: value }
    onChange({ ...data, events: updated })
  }
  function removeEvent(i: number) {
    onChange({ ...data, events: data.events.filter((_, idx) => idx !== i) })
  }
  function addEvent() {
    onChange({ ...data, events: [...data.events, { title: "", details: "" }] })
  }

  return (
    <div className="space-y-5">
      <Field label="Week Label" htmlFor="bul-week">
        <Input
          id="bul-week"
          value={data.weekLabel}
          onChange={(e) => onChange({ ...data, weekLabel: e.target.value })}
        />
      </Field>

      {/* Birthdays */}
      <ListSection
        label="Birthdays"
        items={data.birthdays}
        fields={[
          { key: "name", placeholder: "Name", className: "flex-1" },
          { key: "date", placeholder: "Date", className: "w-24" },
        ]}
        onUpdate={updateBirthday}
        onRemove={removeBirthday}
        onAdd={addBirthday}
        addLabel="Add Birthday"
      />

      {/* Anniversaries */}
      <ListSection
        label="Anniversaries"
        items={data.anniversaries}
        fields={[
          { key: "names", placeholder: "Names (e.g., John & Jane)", className: "flex-1" },
          { key: "date", placeholder: "Date", className: "w-24" },
        ]}
        onUpdate={updateAnniversary}
        onRemove={removeAnniversary}
        onAdd={addAnniversary}
        addLabel="Add Anniversary"
      />

      {/* Helpers */}
      <ListSection
        label="Helpers This Month"
        items={data.helpers}
        fields={[
          { key: "role", placeholder: "Role (e.g., Usher)", className: "w-36" },
          { key: "name", placeholder: "Name", className: "flex-1" },
        ]}
        onUpdate={updateHelper}
        onRemove={removeHelper}
        onAdd={addHelper}
        addLabel="Add Helper"
      />

      {/* Events */}
      <div className="space-y-2">
        <Label>Events</Label>
        {data.events.map((evt, i) => (
          <div key={i} className="space-y-1.5 rounded-md border border-border p-2.5">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Title"
                value={evt.title}
                onChange={(e) => updateEvent(i, "title", e.target.value)}
                className="flex-1"
              />
              <Button variant="ghost" size="icon-sm" onClick={() => removeEvent(i)}>
                <Trash2 className="size-3.5 text-muted-foreground" />
              </Button>
            </div>
            <Textarea
              placeholder="Details"
              value={evt.details}
              onChange={(e) => updateEvent(i, "details", e.target.value)}
              className="min-h-10"
            />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addEvent}>
          <Plus className="size-3.5" />
          Add Event
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Generic list section used in Bulletin form
// ---------------------------------------------------------------------------

interface ListFieldDef {
  key: string
  placeholder: string
  className?: string
}

function ListSection<T extends Record<string, string>>({
  label,
  items,
  fields,
  onUpdate,
  onRemove,
  onAdd,
  addLabel,
}: {
  label: string
  items: T[]
  fields: ListFieldDef[]
  onUpdate: (index: number, field: string, value: string) => void
  onRemove: (index: number) => void
  onAdd: () => void
  addLabel: string
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          {fields.map((f) => (
            <Input
              key={f.key}
              placeholder={f.placeholder}
              value={(item as Record<string, string>)[f.key] ?? ""}
              onChange={(e) => onUpdate(i, f.key, e.target.value)}
              className={f.className}
            />
          ))}
          <Button variant="ghost" size="icon-sm" onClick={() => onRemove(i)}>
            <Trash2 className="size-3.5 text-muted-foreground" />
          </Button>
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground">None added yet.</p>
      )}
      <Button variant="outline" size="sm" onClick={onAdd}>
        <Plus className="size-3.5" />
        {addLabel}
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Custom Announcement Form
// ---------------------------------------------------------------------------

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

  function set<K extends keyof CustomFormState>(field: K, value: CustomFormState[K]) {
    onChange({ ...data, [field]: value })
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
      <Field label="Message Body" htmlFor="ct-body">
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
