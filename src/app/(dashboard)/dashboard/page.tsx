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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
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
  Mail,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Settings2,
  Send,
  X,
  CalendarDays,
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
  buildGenericEventCard,
  buildStyleContext,
  type BirthdayEntry,
  type AnniversaryEntry,
  type TemplateStyleSettings,
  extractCommonCardData,
  pastelBoxHtml,
  PASTEL_BORDER_MAP,
  type BaseCardData,
} from "@/lib/email/card-builder"
import { toast } from "sonner"
import {
  startOfWeek,
  endOfWeek,
  format,
  addDays,
  parse,
} from "date-fns"
import { getOccurrences } from "@/lib/recurrence"
import { type SmartSectionContext, buildSmartSectionsHtml } from "@/lib/email/smart-section-builder"
import { type VisualConfig, isSmartSection } from "@/lib/email/visual-config-types"
import {
  type CommType,
  DISPATCH_MATCHERS,
  buildCommTypeMappings,
  formatRelativeTime,
  getWeekDays,
  mapDispatchStatus,
} from "@/lib/dashboard-types"
import { useCardVisibility } from "@/hooks/dashboard/use-card-visibility"
import { resolveSignupAutoFill, type SignupFieldMap, type AutoFillResult } from "@/lib/signup/auto-fill"

import {
  WeeklyCommunicationCard,
  type CommunicationStatus,
  type SmtpConfigOption,
} from "@/components/dashboard/weekly-communication-card"
import { logAudit } from "@/lib/audit"
import { sanitizeHtml } from "@/lib/sanitize-html"
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
  FlyerSectionsEditor,
  PastelColorPicker,
  type FlyerSectionItem,
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

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`
}

// ── Custom dashboard template form data ──────────────────────────────────

interface CustomDashFormData extends BaseFormData {
  title: string
  subtitle: string
  emoji: string
  body: string
  bodyBgColor?: string
  bodyTextColor?: string
  flyerSections: FlyerSectionItem[]
}

function buildCustomDashPreview(form: CustomDashFormData, styleSettings?: TemplateStyleSettings, visualConfig?: VisualConfig | null, ctx?: SmartSectionContext | null): string {
  const style = buildStyleContext(styleSettings)
  const sz = style.sizes
  const bodyColor = form.bodyTextColor || "#374151"
  const rawBodyHtml = form.body
    ? `<p style="margin:0;font-size:${sz.body}px;line-height:1.6;white-space:pre-wrap;color:${bodyColor}">${form.body}</p>`
    : ""

  // If visual config has smart sections and context is available, render them
  let smartHtml = ""
  if (visualConfig && ctx) {
    const smartSections = visualConfig.sections.filter((s) => s.enabled && isSmartSection(s.type))
    if (smartSections.length > 0) {
      const enrichedCtx: SmartSectionContext = {
        ...ctx,
        eventTitle: form.title || "Event",
        primaryColor: form.primaryColor || null,
        style,
      }
      smartHtml = buildSmartSectionsHtml(smartSections, enrichedCtx)
    }
  }

  return buildCustomCard({
    title: form.title || "Announcement",
    subtitle: form.subtitle || undefined,
    emoji: form.emoji || undefined,
    bodyHtml: (rawBodyHtml ? pastelBoxHtml(rawBodyHtml, form.bodyBgColor, undefined, style.customPastels) : "") + smartHtml,
    flyerSections: (form.flyerSections ?? [])
      .filter((s) => s.imageUrl)
      .map((s) => ({
        imageUrl: s.imageUrl,
        caption: s.caption || undefined,
        captionBgColor: s.captionBgColor || undefined,
        resourceLinks: s.resourceLinks.filter((l) => l.url),
      })),
    ...extractCommonCardData(form),
  }, style)
}

const EMPTY_CUSTOM_FORM: CustomDashFormData = {
  title: "",
  subtitle: "",
  emoji: "📋",
  body: "",
  bodyBgColor: undefined,
  flyerSections: [],
  message: "",
  messageBgColor: undefined,
  headerTitle: "",
  headerSubtitle: "",
  headerEmoji: "",
  primaryColor: "",
  footerVerse: "",
  footerVerseBgColor: undefined,
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

const BUILTIN_LABEL: Record<CommType, string> = Object.fromEntries(BUILTIN_TEMPLATES.map((t) => [t.type, t.label])) as Record<CommType, string>

// StatCardConfig kept for potential future use
interface StatCardConfig {
  title: string
  value: number
  icon: typeof Home
  color: string
  bg: string
  href: string
}

// ── Custom Template Edit Fields (extracted to reduce render-path nesting) ──

function CustomEditFields({ ctId, form, onChange }: {
  ctId: string
  form: CustomDashFormData
  onChange: (id: string, partial: Partial<CustomDashFormData>) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={`ct-${ctId}-title`}>Card Title</Label>
        <Input id={`ct-${ctId}-title`} value={form.title} onChange={(e) => onChange(ctId, { title: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`ct-${ctId}-sub`}>Subtitle</Label>
        <Input id={`ct-${ctId}-sub`} value={form.subtitle} onChange={(e) => onChange(ctId, { subtitle: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`ct-${ctId}-emoji`}>Header Emoji</Label>
        <Input id={`ct-${ctId}-emoji`} value={form.emoji} onChange={(e) => onChange(ctId, { emoji: e.target.value })} className="w-24 text-2xl text-center" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`ct-${ctId}-body`}>Message Body</Label>
        <textarea
          id={`ct-${ctId}-body`}
          value={form.body}
          onChange={(e) => onChange(ctId, { body: e.target.value })}
          className="w-full min-h-24 rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
          placeholder="Write your message..."
          style={form.bodyBgColor ? { backgroundColor: form.bodyBgColor, borderColor: PASTEL_BORDER_MAP[form.bodyBgColor], boxShadow: `0 0 6px ${PASTEL_BORDER_MAP[form.bodyBgColor]}50` } : undefined}
        />
        <PastelColorPicker value={form.bodyBgColor} onChange={(color) => onChange(ctId, { bodyBgColor: color })} />
      </div>
      <div className="space-y-1.5">
        <Label>Theme Color</Label>
        <div className="flex items-center gap-2">
          <input type="color" value={form.primaryColor || "#6B7280"} onChange={(e) => onChange(ctId, { primaryColor: e.target.value })} className="h-8 w-12 cursor-pointer rounded border p-0.5" />
          <span className="text-sm text-muted-foreground">{form.primaryColor || "Default"}</span>
          {form.primaryColor && <button type="button" className="text-xs text-muted-foreground underline" onClick={() => onChange(ctId, { primaryColor: "" })}>Reset</button>}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`ct-${ctId}-footer`}>Footer Verse</Label>
        <Input
          id={`ct-${ctId}-footer`}
          value={form.footerVerse}
          onChange={(e) => onChange(ctId, { footerVerse: e.target.value })}
          style={form.footerVerseBgColor ? { backgroundColor: form.footerVerseBgColor, borderColor: PASTEL_BORDER_MAP[form.footerVerseBgColor], boxShadow: `0 0 6px ${PASTEL_BORDER_MAP[form.footerVerseBgColor]}50` } : undefined}
        />
        <PastelColorPicker value={form.footerVerseBgColor} onChange={(color) => onChange(ctId, { footerVerseBgColor: color })} />
      </div>
      <FlyerSectionsEditor sections={form.flyerSections ?? []} onChange={(flyerSections) => onChange(ctId, { flyerSections })} />
      <CustomSectionsEditor sections={form.customSections ?? []} onChange={(sections) => onChange(ctId, { customSections: sections })} />
      <ResourceLinksEditor links={form.resourceLinks ?? []} onChange={(links) => onChange(ctId, { resourceLinks: links })} />
      <CardStyleFields data={form} onChange={(updated) => onChange(ctId, { ...updated })} idPrefix={`ct-${ctId}`} />
    </div>
  )
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
  const [savedTemplateData, setSavedTemplateData] = useState<Record<string, Record<string, unknown>>>({})
  const [commTypeEtNames, setCommTypeEtNames] = useState<Record<CommType, string>>({
    birthday: "birthday",
    anniversary: "anniversary",
    bible_study: "bible_study",
    womens_study: "womens_study",
    prayer_meeting: "prayer_meeting",
    bulletin: "bulletin",
  })
  const [templateStyles, setTemplateStyles] = useState<Record<string, TemplateStyleSettings>>({})
  // ---- Template visibility (extracted hook) ----
  const { visibleTemplates, toggleTemplate, isCustomVisible, toggleCustomTemplate } = useCardVisibility()

  // ---- Composed instance tracking ----
  const [instanceIds, setInstanceIds] = useState<Partial<Record<CommType, string>>>({})
  const [instanceWeeks, setInstanceWeeks] = useState<Partial<Record<CommType, string>>>({})
  const [instanceUpdatedAt, setInstanceUpdatedAt] = useState<Partial<Record<CommType, string>>>({})
  const [savingInstance, setSavingInstance] = useState<CommType | null>(null)

  // ---- Signup auto-fill tracking ----
  const [signupAutoFills, setSignupAutoFills] = useState<Partial<Record<CommType, AutoFillResult>>>({})

  // ---- Smart section context (resolved per week for visual builder templates) ----
  const [smartContext, setSmartContext] = useState<SmartSectionContext | null>(null)


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
    hostNames: "TBD",
    address: "TBD",
    city: "",
    phone: "",
    message: "",
    headerTitle: "",
    headerSubtitle: "",
    headerEmoji: "",
    primaryColor: "",
    footerVerse: "",
    resourceLinks: [],
    customSections: [],
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

  const [dbBdayEntries, setDbBdayEntries] = useState<BirthdayEntry[]>([])
  const [dbAnniEntries, setDbAnniEntries] = useState<AnniversaryEntry[]>([])
  const [dbBulletinEvents, setDbBulletinEvents] = useState<{ title: string; details: string }[]>([])

  // ---- Custom dashboard templates ----
  interface DashboardCustomTemplate {
    id: string
    name: string
    subject_template: string
    color: string
    emoji: string
    defaults: Record<string, unknown>
    eventInfo?: {
      eventTypeName: string
      eventDate: string | null
      eventTime: string | null
      hostName: string | null
    }
  }

  const [customDashTemplates, setCustomDashTemplates] = useState<DashboardCustomTemplate[]>([])

  // ---- Generic event cards (event types with active events but no built-in card) ----
  interface GenericCardData {
    eventTypeId: string
    eventTypeName: string
    eventId: string
    title: string
    date: string
    time: string
    hostNames: string
    address: string
    topic: string
    color: string
  }
  const [genericCards, setGenericCards] = useState<GenericCardData[]>([])

  // ---- Unified custom template state (one record per custom template ID) ----
  interface CustomCardState {
    form: CustomDashFormData
    style: TemplateStyleSettings
    instanceId: string | null
    dispatch: { status: string; count: number; lastSentAt: string | null }
    snapshot: Record<string, unknown> | null
  }
  const [customCards, setCustomCards] = useState<Record<string, CustomCardState>>({})

  // Accessors for backward compat during transition
  const customForms = Object.fromEntries(Object.entries(customCards).map(([k, v]) => [k, v.form]))
  const customTemplateStyles = Object.fromEntries(Object.entries(customCards).map(([k, v]) => [k, v.style]))
  const customInstanceIds = Object.fromEntries(Object.entries(customCards).filter(([, v]) => v.instanceId).map(([k, v]) => [k, v.instanceId!]))
  const customDispatches = Object.fromEntries(Object.entries(customCards).map(([k, v]) => [k, v.dispatch]))
  const customSnapshots = Object.fromEntries(Object.entries(customCards).filter(([, v]) => v.snapshot).map(([k, v]) => [k, v.snapshot!]))

  function setCustomForms(updater: (prev: Record<string, CustomDashFormData>) => Record<string, CustomDashFormData>) {
    setCustomCards((prev) => {
      const prevForms = Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, v.form]))
      const newForms = updater(prevForms)
      const result = { ...prev }
      for (const [k, form] of Object.entries(newForms)) {
        result[k] = { ...(result[k] ?? { style: {}, instanceId: null, dispatch: { status: "draft", count: 0, lastSentAt: null }, snapshot: null }), form }
      }
      return result
    })
  }

  function setCustomInstanceIds(updater: (prev: Record<string, string>) => Record<string, string>) {
    setCustomCards((prev) => {
      const prevIds = Object.fromEntries(Object.entries(prev).filter(([, v]) => v.instanceId).map(([k, v]) => [k, v.instanceId!]))
      const newIds = updater(prevIds)
      const result = { ...prev }
      for (const k of Object.keys(result)) {
        result[k] = { ...result[k], instanceId: newIds[k] ?? null }
      }
      for (const [k, id] of Object.entries(newIds)) {
        if (!result[k]) continue
        result[k] = { ...result[k], instanceId: id }
      }
      return result
    })
  }

  function setCustomDispatches(updater: (prev: Record<string, { status: string; count: number; lastSentAt: string | null }>) => Record<string, { status: string; count: number; lastSentAt: string | null }>) {
    setCustomCards((prev) => {
      const prevDisp = Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, v.dispatch]))
      const newDisp = updater(prevDisp)
      const result = { ...prev }
      for (const [k, dispatch] of Object.entries(newDisp)) {
        if (result[k]) result[k] = { ...result[k], dispatch }
      }
      return result
    })
  }

  function setCustomSnapshots(updater: (prev: Record<string, Record<string, unknown>>) => Record<string, Record<string, unknown>>) {
    setCustomCards((prev) => {
      const prevSnap = Object.fromEntries(Object.entries(prev).filter(([, v]) => v.snapshot).map(([k, v]) => [k, v.snapshot!]))
      const newSnap = updater(prevSnap)
      const result = { ...prev }
      for (const [k, snapshot] of Object.entries(newSnap)) {
        if (result[k]) result[k] = { ...result[k], snapshot }
      }
      return result
    })
  }

  // ---- Saved form snapshots for cancel/revert ----
  const [savedSnapshots, setSavedSnapshots] = useState<Partial<Record<CommType, Record<string, unknown>>>>({})

  // ---- Subject overrides (built-in CommType keys + custom template IDs) ----
  const [subjectOverrides, setSubjectOverrides] = useState<Record<string, string>>({})

  // ---- Mailing list + SMTP state (per-card, keyed by CommType or custom template ID) ----
  const [mailingLists, setMailingLists] = useState<MailingListOption[]>([])
  const [smtpConfigs, setSmtpConfigs] = useState<SmtpConfigOption[]>([])
  const [commOptions, setCommOptions] = useState<
    Record<string, { mailingListId: string; smtpConfigId: string; additionalRecipients: string }>
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
  const [sendConfirm, setSendConfirm] = useState<{
    open: boolean
    type: CommType | null
    subject: string
    recipientCount: number
    listName: string
    isReminder: boolean
  }>({ open: false, type: null, subject: "", recipientCount: 0, listName: "", isReminder: false })

  // ---- Sent email preview ----
  const [sentEmailPreview, setSentEmailPreview] = useState<{
    subject: string
    html: string
    sentAt?: string
    mailingListName?: string
    recipientCount?: number
    smtpFrom?: string
    additionalRecipients?: string
  } | null>(null)

  // ---- Selected card (unified: CommType for built-in, "custom:<id>" for custom) ----
  const [activeCardKey, setActiveCardKey] = useState<string>("bulletin")
  const [cardParamApplied, setCardParamApplied] = useState(false)

  useEffect(() => {
    if (cardParamApplied) return
    const params = new URLSearchParams(window.location.search)
    const cardParam = params.get("card")
    const valid: CommType[] = ["birthday", "anniversary", "bible_study", "womens_study", "prayer_meeting", "bulletin"]
    if (cardParam && valid.includes(cardParam as CommType)) {
      setActiveCardKey(cardParam)
    }
    setCardParamApplied(true)
  }, [cardParamApplied])

  // Derived helpers for the unified selection
  const selectedCard = (["birthday", "anniversary", "bible_study", "womens_study", "prayer_meeting", "bulletin"].includes(activeCardKey) ? activeCardKey : "") as CommType
  const selectedCustomCard = activeCardKey.startsWith("custom:") ? activeCardKey.slice(7) : null

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

        // Active events (for recurrence rules + host family + bulletin details)
        supabase
          .from("events")
          .select("*")
          .eq("is_active", true)
          .returns<{ id: string; title: string; event_type_id: string; recurrence_rule: string | null; default_time: string | null; host_family_id?: string | null; host_until?: string | null; start_date?: string | null; end_date?: string | null; is_active: boolean; description?: string | null; zoom_link?: string | null }[]>(),

        // Event instances for current week (including cancelled — needed for break/cancel detection)
        supabase
          .from("event_instances")
          .select("id, event_id, instance_date, instance_time, location_override, notes, host_family_id, status")
          .gte("instance_date", wkSunISO)
          .lte("instance_date", wkSatISO)
          .returns<{
            id: string
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
          .select("id, event_type_id, subject_template, body_template, style_settings")
          .eq("is_default", true)
          .returns<{ id: string; event_type_id: string; subject_template: string; body_template: string; style_settings: Record<string, unknown> | null }[]>(),

        // Event type id-to-name map (+ template link, color, signup link, bulletin detail template, comm_type)
        supabase
          .from("event_types")
          .select("id, name, default_template_id, color_scheme, linked_signup_form_id, signup_field_map, bulletin_detail_template, comm_type")
          .returns<{ id: string; name: string; default_template_id: string | null; color_scheme: { primary: string } | null; linked_signup_form_id: string | null; signup_field_map: import("@/lib/signup/auto-fill").SignupFieldMap | null; bulletin_detail_template: string | null; comm_type: string | null }[]>(),

        // Composed instances: match current week, bulletin week, or recurring
        supabase
          .from("composed_instances")
          .select("id, template_type, form_data, subject, mailing_list_id, smtp_config_id, additional_recipients, week_start, is_recurring, recur_until, updated_at")
          .eq("is_active", true)
          .or(`week_start.eq.${wkSunISO},and(is_recurring.eq.true,week_start.lte.${wkSunISO})`)
          .returns<{ id: string; template_type: string; form_data: Record<string, unknown>; subject: string; mailing_list_id: string | null; smtp_config_id: string | null; additional_recipients: string | null; week_start: string | null; is_recurring: boolean; recur_until: string | null; updated_at: string }[]>(),

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
      const etIdToTabName: Record<string, string> = {}
      const etSignupLinks: Record<string, { formId: string; fieldMap: SignupFieldMap }> = {}
      const etBulletinTemplates: Record<string, string> = {}

      // Build DB-driven comm_type mappings
      const { commTypeToEtName, etIdToCommType } = buildCommTypeMappings(eventTypesRes.data ?? [])
      setCommTypeEtNames(commTypeToEtName)

      if (eventTypesRes.data) {
        for (const et of eventTypesRes.data) {
          etIdToName[et.id] = et.name
          const tabName = etIdToCommType[et.id] ?? et.name
          etIdToTabName[et.id] = tabName
          if (et.linked_signup_form_id && et.signup_field_map) {
            etSignupLinks[tabName] = { formId: et.linked_signup_form_id, fieldMap: et.signup_field_map }
          }
          if (et.bulletin_detail_template) {
            etBulletinTemplates[et.id] = et.bulletin_detail_template
          }
        }
      }

      // Use the last template per event type (in case of duplicates)
      const savedDefaults: Record<string, { subject: string; data: Record<string, unknown> }> = {}
      const loadedStyles: Record<string, TemplateStyleSettings> = {}
      if (templateDefaultsRes.data) {
        for (const t of templateDefaultsRes.data) {
          const tabName = etIdToTabName[t.event_type_id]
          if (!tabName) continue
          const parsed = parseBodyTemplate(tabName, t.body_template)
          if (parsed) {
            savedDefaults[tabName] = {
              subject: t.subject_template,
              data: parsed.data as Record<string, unknown>,
            }
          }
          if (t.style_settings) loadedStyles[tabName] = t.style_settings as TemplateStyleSettings
        }
      }
      setTemplateStyles(loadedStyles)

      setSavedSubjectTemplates(
        Object.fromEntries(Object.entries(savedDefaults).map(([k, v]) => [k, v.subject]))
      )
      setSavedTemplateData(
        Object.fromEntries(Object.entries(savedDefaults).map(([k, v]) => [k, v.data]))
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

      const bsDef = resolve("bible_study", "bible_study", "bible_study") as BibleStudyDefaults
      const wsDef = resolve("womens_study", "womens_study", "womens_study") as WomensStudyDefaults
      const pmDef = resolve("prayer_meeting", "prayer_meeting") as PrayerMeetingDefaults
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
      setDbBdayEntries(bdayEntries)

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
      setDbAnniEntries(anniEntries)

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

      // Find events by internal tab name
      const findEventsByType = (typeName: string) =>
        activeEvents.filter((e) => etIdToTabName[e.event_type_id] === typeName)
      const findEventByType = (typeName: string) => findEventsByType(typeName)[0] ?? undefined

      // Track event counts per comm type for multi-event indicator
      {
        const counts: Partial<Record<CommType, number>> = {}
        for (const ct of Object.keys(commTypeToEtName)) {
          counts[ct as CommType] = findEventsByType(ct).length
        }
        setEventCounts(counts)
      }

      // ---- Signup auto-fill accumulator ----
      const autoFills: Partial<Record<CommType, AutoFillResult>> = {}

      // ---- Process Bible Study (recurrence-based) ----
      const hasBsDraft = !!composedMap["bible_study"]
      const bsEvent = findEventByType("bible_study")
      const bsOccurrences = bsEvent ? getOccurrences(bsEvent.recurrence_rule, wkSun, wkSat) : []
      const bsRawDate = bsOccurrences.length > 0 ? bsOccurrences[0] : null
      const bsInstance = bsRawDate && bsEvent ? findInstance(bsEvent.id, format(bsRawDate, "yyyy-MM-dd")) : null
      const bsCancelled = bsInstance?.status === "cancelled"
      const bsDate = bsCancelled ? null : bsRawDate

      const bsCommon = extractCommonFields(bsDef)
      if (bsCommon.resourceLinks.length === 0) {
        const def = bsDef as Record<string, unknown>
        const url = (def.resourceLinkUrl as string) ?? ""
        if (url) bsCommon.resourceLinks = [{ label: (def.resourceLinkLabel as string) || "View Resources", url }]
      }

      const bsDateStr = bsDate ? format(bsDate, "EEEE, MMMM do") : "No bible study this week"
      const bsTimeStr = bsInstance?.instance_time ? formatTime(bsInstance.instance_time) : null

      // Break detection: query event_breaks for this event+date
      const bsBreakCheckDate = bsRawDate ? format(bsRawDate, "yyyy-MM-dd") : format(wkSun, "yyyy-MM-dd")
      let bsOnBreak = bsCancelled
      if (!bsOnBreak && bsEvent) {
        const { data: breakRows } = await supabase
          .from("event_breaks")
          .select("id")
          .eq("event_id", bsEvent.id)
          .lte("start_date", bsBreakCheckDate)
          .gte("end_date", bsBreakCheckDate)
          .limit(1)
        if (breakRows && breakRows.length > 0) bsOnBreak = true
      }

      if (hasBsDraft) {
        const fd = composedMap["bible_study"].form_data as Record<string, unknown>
        setBibleStudyForm({
          title: (fd.title as string) ?? bsDef.title ?? "Bible Study This Friday",
          date: bsOnBreak ? "No bible study this week" : bsDateStr,
          time: bsTimeStr ?? (fd.time as string) ?? bsDef.time ?? "7:30 PM",
          topic: (fd.topic as string) ?? bsDef.topic ?? "Studying the Book of Acts",
          hostNames: (fd.hostNames as string) ?? bsDef.hostNames ?? "TBD",
          address: (fd.address as string) ?? bsDef.address ?? "TBD",
          city: (fd.city as string) ?? bsDef.city ?? "",
          phone: (fd.phone as string) ?? bsDef.phone ?? "",
          ...bsCommon,
        })
      } else {
        let bsHostData = { hostName: bsDef.hostNames ?? "TBD", address: bsDef.address ?? "TBD", city: bsDef.city ?? "", phone: bsDef.phone ?? "" }

        // Try signup auto-fill first (most specific — user signed up for this month)
        const bsSignup = etSignupLinks["bible_study"]
        let bsAutoFill: AutoFillResult | null = null
        if (bsSignup && bsDate) {
          bsAutoFill = await resolveSignupAutoFill(bsSignup.formId, bsSignup.fieldMap, bsDate)
          if (bsAutoFill.source === "signup") {
            bsHostData = {
              hostName: bsAutoFill.hostName ?? "TBD",
              address: bsAutoFill.address ?? "TBD",
              city: bsAutoFill.city ?? "",
              phone: bsAutoFill.phone ?? "",
            }
          }
        }

        // Fall back to event/instance host assignment if no signup match
        if (bsHostData.hostName === "TBD") {
          if (bsInstance?.host_family_id) {
            bsHostData = await resolveHostFamily(bsInstance.host_family_id)
          } else if (bsEvent?.host_family_id) {
            const expired = bsEvent.host_until ? new Date(bsEvent.host_until + "T23:59:59") < new Date() : false
            if (!expired) bsHostData = await resolveHostFamily(bsEvent.host_family_id)
          }
        }
        if (bsInstance?.location_override) bsHostData.address = bsInstance.location_override
        if (bsInstance?.notes) {
          const contactMatch = bsInstance.notes.match(/Contact:\s*(.+)/i)
          if (contactMatch) bsHostData.phone = contactMatch[1].trim()
        }

        if (bsAutoFill?.source === "signup") {
          autoFills["bible_study"] = bsAutoFill
        }

        setBibleStudyForm({
          title: bsDef.title ?? "Bible Study This Friday",
          date: bsOnBreak ? "No bible study this week" : bsDateStr,
          time: bsTimeStr ?? bsDef.time ?? "7:30 PM",
          topic: bsDef.topic ?? "Studying the Book of Acts",
          hostNames: bsOnBreak ? "" : bsHostData.hostName,
          address: bsOnBreak ? "" : bsHostData.address,
          city: bsOnBreak ? "" : bsHostData.city,
          phone: bsOnBreak ? "" : bsHostData.phone,
          ...bsCommon,
        })
      }

      // ---- Women's Study (recurrence-based) ----
      const hasWsDraft = !!composedMap["womens_study"]
      const wsEvent = findEventByType("womens_study")
      const wsOccurrences = wsEvent ? getOccurrences(wsEvent.recurrence_rule, wkSun, wkSat) : []
      const wsRawDate = wsOccurrences.length > 0 ? wsOccurrences[0] : null
      const wsInstance = wsRawDate && wsEvent ? findInstance(wsEvent.id, format(wsRawDate, "yyyy-MM-dd")) : null
      const wsCancelled = wsInstance?.status === "cancelled"
      const wsDate = wsCancelled ? null : wsRawDate

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
      const pmEvent = findEventByType("prayer_meeting")
      const pmOccurrences = pmEvent ? getOccurrences(pmEvent.recurrence_rule, wkSun, wkSat) : []
      const pmRawDate = pmOccurrences.length > 0 ? pmOccurrences[0] : null
      const pmInstance = pmRawDate && pmEvent ? findInstance(pmEvent.id, format(pmRawDate, "yyyy-MM-dd")) : null
      const pmCancelled = pmInstance?.status === "cancelled"
      const pmDate = pmCancelled ? null : pmRawDate

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

        // Try signup auto-fill first
        const pmSignup = etSignupLinks["prayer_meeting"]
        if (pmSignup && pmDate) {
          const pmAutoFill = await resolveSignupAutoFill(pmSignup.formId, pmSignup.fieldMap, pmDate)
          if (pmAutoFill.source === "signup") {
            pmHostData = {
              hostName: pmAutoFill.hostName ?? "TBD",
              address: pmAutoFill.address ?? "TBD",
              city: pmAutoFill.city ?? "",
              phone: pmAutoFill.phone ?? "",
            }
            autoFills["prayer_meeting"] = pmAutoFill
          }
        }

        // Fall back to event/instance host
        if (pmHostData.hostName === "TBD") {
          if (pmInstance?.host_family_id) {
            pmHostData = await resolveHostFamily(pmInstance.host_family_id)
          } else if (pmEvent?.host_family_id) {
            const expired = pmEvent.host_until ? new Date(pmEvent.host_until + "T23:59:59") < new Date() : false
            if (!expired) pmHostData = await resolveHostFamily(pmEvent.host_family_id)
          }
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

      // ---- Build bulletin events from ALL active calendar events for the week ----
      const bulletinAutoEvents: { title: string; details: string }[] = []
      const bulletinSkipTypes = new Set(["birthday", "anniversary", "bulletin"])

      // Helper: build bulletin details from template or fallback to date+time
      function buildBulletinDetails(evt: typeof activeEvents[0], occ: Date, inst: typeof weekInstances[0] | undefined): string {
        const time = inst?.instance_time ?? evt.default_time
        const timeStr = time ? formatTime(time) : null
        const dateStr = format(occ, "EEEE, MMM d")
        const tmpl = etBulletinTemplates[evt.event_type_id]
        if (!tmpl) return timeStr ? `${dateStr} at ${timeStr}` : dateStr
        const evtAny = evt as typeof evt & { description?: string | null; zoom_link?: string | null }
        const vars: Record<string, string> = {
          date: dateStr,
          time: timeStr ?? "",
          topic: evtAny.description ?? "",
          location: inst?.location_override ?? "",
          zoom: evtAny.zoom_link ?? "",
          host: "",
        }
        return tmpl.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "").replace(/\s{2,}/g, " ").trim() || (timeStr ? `${dateStr} at ${timeStr}` : dateStr)
      }

      for (const evt of activeEvents) {
        const etTabName = etIdToTabName[evt.event_type_id] ?? ""
        if (bulletinSkipTypes.has(etTabName)) continue
        if (evt.recurrence_rule) {
          // Recurring events — resolve occurrences for the week
          const occs = getOccurrences(evt.recurrence_rule, wkSun, wkSat)
          for (const occ of occs) {
            const inst = weekInstances.find((wi) => wi.event_id === evt.id && wi.instance_date === format(occ, "yyyy-MM-dd"))
            if (inst?.status === "cancelled") continue
            const occDateStr = format(occ, "yyyy-MM-dd")
            // Check if event has a break for this date — if so, skip it
            const { data: occBreaks } = await supabase
              .from("event_breaks")
              .select("id, message")
              .eq("event_id", evt.id)
              .lte("start_date", occDateStr)
              .gte("end_date", occDateStr)
              .limit(1)
            if (occBreaks && occBreaks.length > 0) continue
            // One bulletin entry per event occurrence
            bulletinAutoEvents.push({
              title: evt.title,
              details: buildBulletinDetails(evt, occ, inst),
            })
          }
        } else {
          // One-time / date-range events — check if they overlap this week
          const evtStart = evt.start_date ? new Date(evt.start_date + "T00:00:00") : null
          const evtEnd = evt.end_date ? new Date(evt.end_date + "T00:00:00") : evtStart
          const inst = weekInstances.find((wi) => wi.event_id === evt.id)

          const overlapsWeek = inst
            || (evtStart && evtEnd && evtStart <= wkSat && evtEnd >= wkSun)
            || (evtStart && !evtEnd && evtStart >= wkSun && evtStart <= wkSat)

          if (overlapsWeek) {
            const timeStr = inst?.instance_time ? formatTime(inst.instance_time) : (evt.default_time ? formatTime(evt.default_time) : null)
            let details: string
            if (evtStart && evtEnd && evtStart.getTime() !== evtEnd.getTime()) {
              // Multi-day event — show visible portion relative to this week
              const visibleStart = evtStart >= wkSun ? evtStart : wkSun
              const visibleEnd = evtEnd <= wkSat ? evtEnd : wkSat
              const startsThisWeek = evtStart >= wkSun
              if (startsThisWeek) {
                details = timeStr
                  ? `${format(visibleStart, "EEEE, MMM d")} – ${format(visibleEnd, "EEEE, MMM d")} at ${timeStr}`
                  : `${format(visibleStart, "EEEE, MMM d")} – ${format(visibleEnd, "EEEE, MMM d")}`
              } else {
                details = timeStr
                  ? `Continues through ${format(visibleEnd, "EEEE, MMM d")} at ${timeStr}`
                  : `Continues through ${format(visibleEnd, "EEEE, MMM d")}`
              }
            } else {
              const displayDate = inst ? new Date(inst.instance_date + "T00:00:00") : evtStart!
              details = timeStr
                ? `${format(displayDate, "EEEE, MMM d")} at ${timeStr}`
                : format(displayDate, "EEEE, MMM d")
            }
            bulletinAutoEvents.push({ title: evt.title, details })
          }
        }
      }

      // Also fetch manual bulletin_items from DB
      const { data: manualItems } = await supabase
        .from("bulletin_items")
        .select("title, details")
        .eq("is_active", true)
        .or(`is_recurring.eq.true,week_start.eq.${format(wkSun, "yyyy-MM-dd")}`)
        .order("sort_order")
        .returns<{ title: string; details: string | null }[]>()

      const manualBulletinItems = (manualItems ?? []).map((item) => ({
        title: item.title,
        details: item.details ?? "",
      }))

      setDbBulletinEvents([...bulletinAutoEvents, ...manualBulletinItems])

      // ---- Bulletin (same week as everything else) ----
      const hasBulDraft = !!composedMap["bulletin"]
      const bulCommon = extractCommonFields(bulDef)

      // Auto-fill helpers from signup form (if bulletin event type has a linked form)
      let autoFilledHelpers: BulletinFormData["helpers"] = []
      const bulSignup = etSignupLinks["bulletin"]
      if (bulSignup && wkSun) {
        const bulAutoFill = await resolveSignupAutoFill(bulSignup.formId, bulSignup.fieldMap, wkSun)
        if (bulAutoFill.source === "signup" && bulAutoFill.helpers && bulAutoFill.helpers.length > 0) {
          autoFilledHelpers = bulAutoFill.helpers
        }
      }

      // Live events always come from DB (current state), not from stale drafts
      const liveEvents = [...bulletinAutoEvents, ...manualBulletinItems]

      if (hasBulDraft) {
        const fd = composedMap["bulletin"].form_data as Record<string, unknown>
        // Merge: keep only user-added draft events not covered by live events or active calendar events
        const draftEvents = (fd.events as BulletinFormData["events"]) ?? []
        const activeEventTitles = activeEvents.map((e) => e.title.toLowerCase())
        const manualDraftEvents = draftEvents.filter((de) => {
          const dtl = de.title.toLowerCase()
          if (liveEvents.some((le) => le.title === de.title)) return false
          if (manualBulletinItems.some((mi) => mi.title === de.title)) return false
          if (activeEventTitles.some((t) => dtl.includes(t) || t.includes(dtl))) return false
          return true
        })
        setBulletinForm({
          weekLabel: (fd.weekLabel as string) ?? `Week of ${wl}`,
          birthdays: (fd.birthdays as BulletinFormData["birthdays"]) ?? bdayEntries.map((b) => ({ name: b.name, date: b.date })),
          anniversaries: (fd.anniversaries as BulletinFormData["anniversaries"]) ?? anniEntries.map((a) => ({ names: `${a.husbandName} & ${a.wifeName}`, date: a.date })),
          helpers: (fd.helpers as BulletinFormData["helpers"]) ?? autoFilledHelpers,
          events: [...liveEvents, ...manualDraftEvents],
          sectionOrder: (fd.sectionOrder as BulletinFormData["sectionOrder"]) ?? undefined,
          ...bulCommon,
        })
      } else {
        const bulHelpers = autoFilledHelpers.length > 0
          ? autoFilledHelpers
          : ((bulDef as Record<string, unknown>).helpers as BulletinFormData["helpers"] ?? [])
        setBulletinForm({
          weekLabel: `Week of ${wl}`,
          birthdays: bdayEntries.map((b) => ({ name: b.name, date: b.date })),
          anniversaries: anniEntries.map((a) => ({
            names: `${a.husbandName} & ${a.wifeName}`,
            date: a.date,
          })),
          helpers: bulHelpers,
          events: liveEvents,
          ...bulCommon,
        })
      }

      // ---- Generic event cards (non-built-in event types with occurrences this week) ----
      const builtinCommTypes = new Set<string>(["birthday", "anniversary", "bible_study", "womens_study", "prayer_meeting", "bulletin"])
      // Event types that have a linked custom template already get their own card
      const etIdsWithCustomTemplate = new Set(
        (eventTypesRes.data ?? []).filter((et) => et.default_template_id).map((et) => et.id)
      )
      const resolvedGenericCards: GenericCardData[] = []

      for (const evt of activeEvents) {
        const etTabName = etIdToTabName[evt.event_type_id] ?? ""
        // Skip if this event belongs to a built-in comm type
        if (builtinCommTypes.has(etTabName)) continue
        // Skip if this event type has a custom template (already shown as custom card)
        if (etIdsWithCustomTemplate.has(evt.event_type_id)) continue
        // Skip if there's already a generic card for this event type
        if (resolvedGenericCards.some((g) => g.eventTypeId === evt.event_type_id)) continue

        // Resolve occurrences for recurring events
        let occDate: Date | null = null
        let instForOcc: typeof weekInstances[0] | undefined

        if (evt.recurrence_rule) {
          const occs = getOccurrences(evt.recurrence_rule, wkSun, wkSat)
          if (occs.length > 0) {
            occDate = occs[0]
            instForOcc = weekInstances.find((i) => i.event_id === evt.id && i.instance_date === format(occs[0], "yyyy-MM-dd"))
          }
        } else {
          // One-time / date-range events
          const evtStart = evt.start_date ? new Date(evt.start_date + "T00:00:00") : null
          const evtEnd = evt.end_date ? new Date(evt.end_date + "T00:00:00") : evtStart
          instForOcc = weekInstances.find((i) => i.event_id === evt.id)
          if (instForOcc) {
            occDate = new Date(instForOcc.instance_date + "T00:00:00")
          } else if (evtStart && evtEnd && evtStart <= wkSat && evtEnd >= wkSun) {
            occDate = evtStart >= wkSun ? evtStart : wkSun
          }
        }

        if (!occDate) continue

        // Skip if cancelled
        if (instForOcc?.status === "cancelled") continue

        // Check for breaks
        const occDateStr = format(occDate, "yyyy-MM-dd")
        const { data: breakRows } = await supabase
          .from("event_breaks")
          .select("id")
          .eq("event_id", evt.id)
          .lte("start_date", occDateStr)
          .gte("end_date", occDateStr)
          .limit(1)
        if (breakRows && breakRows.length > 0) continue

        // Resolve host info
        let hostName = ""
        let address = ""
        if (instForOcc?.host_family_id) {
          const hf = await resolveHostFamily(instForOcc.host_family_id)
          hostName = hf.hostName !== "TBD" ? hf.hostName : ""
          address = hf.address !== "TBD" ? hf.address : ""
        } else if (evt.host_family_id) {
          const expired = evt.host_until ? new Date(evt.host_until + "T23:59:59") < new Date() : false
          if (!expired) {
            const hf = await resolveHostFamily(evt.host_family_id)
            hostName = hf.hostName !== "TBD" ? hf.hostName : ""
            address = hf.address !== "TBD" ? hf.address : ""
          }
        }
        if (instForOcc?.location_override) address = instForOcc.location_override

        const etColor = (eventTypesRes.data ?? []).find((et) => et.id === evt.event_type_id)?.color_scheme?.primary || "#6B7280"
        const timeStr = instForOcc?.instance_time ? formatTime(instForOcc.instance_time) : (evt.default_time ? formatTime(evt.default_time) : "")

        resolvedGenericCards.push({
          eventTypeId: evt.event_type_id,
          eventTypeName: etIdToName[evt.event_type_id] || evt.title,
          eventId: evt.id,
          title: evt.title,
          date: format(occDate, "EEEE, MMMM do"),
          time: timeStr,
          hostNames: hostName,
          address: address,
          topic: evt.description ?? "",
          color: etColor,
        })
      }
      setGenericCards(resolvedGenericCards)

      // ---- Custom dashboard templates ----
      const { data: customTmpls } = await supabase
        .from("email_templates")
        .select("id, name, subject_template, body_template, style_settings")
        .eq("is_default", false)
        .order("name")
        .returns<{ id: string; name: string; subject_template: string; body_template: string; style_settings: Record<string, unknown> | null }[]>()

      const dashCustom: DashboardCustomTemplate[] = []
      const customFormInit: Record<string, CustomDashFormData> = {}
      const customInstIds: Record<string, string> = {}
      const customSubjOvr: Record<string, string> = {}
      const loadedCustomStyles: Record<string, TemplateStyleSettings> = {}

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
        if (ct.style_settings) loadedCustomStyles[ct.id] = ct.style_settings as TemplateStyleSettings

        const ci = composedMap[ctKey]
        if (ci) {
          const fd = ci.form_data as Record<string, unknown>
          customFormInit[ct.id] = {
            title: (fd.title as string) ?? (parsed.title as string) ?? ct.name,
            subtitle: (fd.subtitle as string) ?? (parsed.subtitle as string) ?? "",
            emoji: (fd.emoji as string) ?? (parsed.emoji as string) ?? "📋",
            body: (fd.body as string) ?? (parsed.body as string) ?? "",
            bodyBgColor: (fd.bodyBgColor as string) ?? (parsed.bodyBgColor as string) ?? undefined,
            footerVerse: (fd.footerVerse as string) ?? (parsed.footerVerse as string) ?? "",
            footerVerseBgColor: (fd.footerVerseBgColor as string) ?? (parsed.footerVerseBgColor as string) ?? undefined,
            message: (fd.message as string) ?? "",
            messageBgColor: (fd.messageBgColor as string) ?? undefined,
            headerTitle: (fd.headerTitle as string) ?? "",
            headerSubtitle: (fd.headerSubtitle as string) ?? "",
            headerEmoji: (fd.headerEmoji as string) ?? "",
            primaryColor: (fd.primaryColor as string) ?? (parsed.primaryColor as string) ?? "",
            resourceLinks: (fd.resourceLinks as BaseFormData["resourceLinks"]) ?? (parsed.resourceLinks as BaseFormData["resourceLinks"]) ?? [],
            customSections: ((fd.customSections as BaseFormData["customSections"])?.length ? (fd.customSections as BaseFormData["customSections"]) : (parsed.customSections as BaseFormData["customSections"])) ?? [],
            flyerSections: ((fd.flyerSections as FlyerSectionItem[])?.length ? (fd.flyerSections as FlyerSectionItem[]) : (parsed.flyerSections as FlyerSectionItem[])) ?? [],
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
            bodyBgColor: (parsed.bodyBgColor as string) || undefined,
            footerVerse: (parsed.footerVerse as string) || "",
            footerVerseBgColor: (parsed.footerVerseBgColor as string) || undefined,
            primaryColor: (parsed.primaryColor as string) || "",
            resourceLinks: (parsed.resourceLinks as BaseFormData["resourceLinks"]) ?? [],
            customSections: (parsed.customSections as BaseFormData["customSections"]) ?? [],
            flyerSections: (parsed.flyerSections as FlyerSectionItem[]) ?? [],
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

      // ---- Enrich custom templates with linked event data ----
      for (const ct of dashCustom) {
        const linkedEt = (eventTypesRes.data ?? []).find((et) => et.default_template_id === ct.id)
        if (!linkedEt) continue
        const linkedEvents = activeEvents.filter((e) => e.event_type_id === linkedEt.id)
        const linkedColor = linkedEt.color_scheme?.primary
        if (linkedColor) ct.color = linkedColor

        for (const evt of linkedEvents) {
          if (!evt.recurrence_rule) continue
          const occs = getOccurrences(evt.recurrence_rule, wkSun, wkSat)
          if (occs.length > 0) {
            const occ = occs[0]
            const dateStr = format(occ, "yyyy-MM-dd")
            const inst = weekInstances.find((i) => i.event_id === evt.id && i.instance_date === dateStr)
            let hostName: string | null = null
            if (inst?.host_family_id) {
              const hf = await resolveHostFamily(inst.host_family_id)
              hostName = hf.hostName !== "TBD" ? hf.hostName : null
            } else if (evt.host_family_id) {
              const expired = evt.host_until ? new Date(evt.host_until + "T23:59:59") < new Date() : false
              if (!expired) {
                const hf = await resolveHostFamily(evt.host_family_id)
                hostName = hf.hostName !== "TBD" ? hf.hostName : null
              }
            }
            ct.eventInfo = {
              eventTypeName: linkedEt.name,
              eventDate: format(occ, "EEEE, MMMM do"),
              eventTime: inst?.instance_time ? formatTime(inst.instance_time) : (evt.default_time ? formatTime(evt.default_time) : null),
              hostName,
            }
            break
          }
        }
        if (!ct.eventInfo) {
          ct.eventInfo = { eventTypeName: linkedEt.name, eventDate: null, eventTime: null, hostName: null }
        }
      }

      setCustomDashTemplates(dashCustom)
      // Build unified custom card state in one pass
      const unifiedCustom: Record<string, CustomCardState> = {}
      for (const ct of dashCustom) {
        unifiedCustom[ct.id] = {
          form: customFormInit[ct.id] ?? { ...EMPTY_CUSTOM_FORM },
          style: (loadedCustomStyles[ct.id] ?? {}) as TemplateStyleSettings,
          instanceId: customInstIds[ct.id] ?? null,
          dispatch: { status: "draft", count: 0, lastSentAt: null },
          snapshot: customFormInit[ct.id] ? structuredClone(customFormInit[ct.id] as unknown as Record<string, unknown>) : null,
        }
      }
      setCustomCards(unifiedCustom)

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

      // Pre-fill subject overrides from composed instances
      const resolvedSubjects: Record<string, string> = {}
      for (const ct of commTypeKeys) {
        const ci = composedMap[ct]
        if (ci?.subject) resolvedSubjects[ct] = ci.subject
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
      setCommOptions({ ...prefilledOptions, ...customCommOpts })
      setSubjectOverrides({ ...resolvedSubjects, ...customSubjOvr })

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
      // Merge dispatch info into unified custom state
      setCustomCards((prev) => {
        const result = { ...prev }
        for (const [id, info] of Object.entries(customDispInfo)) {
          if (result[id]) result[id] = { ...result[id], dispatch: info }
        }
        return result
      })
      setSignupAutoFills(autoFills)

      // Build smart section context from resolved week data
      setSmartContext({
        eventTitle: "",
        eventDate: null,
        eventTime: null,
        topic: null,
        locations: [],
        virtual: null,
        birthdays: bdayEntries.map((b) => ({ name: b.name, date: b.date })),
        anniversaries: anniEntries.map((a) => ({ names: `${a.husbandName} & ${a.wifeName}`, date: a.date })),
        helpers: [],
        upcomingEvents: [],
        weekLabel: wl,
        primaryColor: null,
        style: null,
      })
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
    }, buildStyleContext(templateStyles.birthday))
  }, [birthdayForm, templateStyles])

  const anniversaryPreview = useMemo(() => {
    if (anniversaryForm.anniversaries.length === 0) return null
    const vars = makeAnniversaryVars(anniversaryForm.weekLabel, anniversaryForm.anniversaries.map(a => `${a.husbandName} & ${a.wifeName}`))
    return buildAnniversaryCard({
      weekLabel: anniversaryForm.weekLabel,
      anniversaries: anniversaryForm.anniversaries,
      ...interpCommon(anniversaryForm, vars),
    }, buildStyleContext(templateStyles.anniversary))
  }, [anniversaryForm, templateStyles])

  const bibleStudyPreview = useMemo(() => {
    const vars = makeEventVars(weekLabel, bibleStudyForm.date, bibleStudyForm.time, bibleStudyForm.topic || "")
    return buildBibleStudyCard({
      title: interp(bibleStudyForm.title, vars),
      date: bibleStudyForm.date,
      time: bibleStudyForm.time,
      topic: interp(bibleStudyForm.topic, vars),
      hostNames: bibleStudyForm.hostNames || undefined,
      address: bibleStudyForm.address || undefined,
      city: bibleStudyForm.city || undefined,
      phone: bibleStudyForm.phone || undefined,
      ...interpCommon(bibleStudyForm, vars),
    }, buildStyleContext(templateStyles.bible_study))
  }, [bibleStudyForm, weekLabel, templateStyles])

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
    }, buildStyleContext(templateStyles.womens_study))
  }, [womensStudyForm, weekLabel, templateStyles])

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
      ...interpCommon(prayerMeetingForm, {}),
    }, buildStyleContext(templateStyles.prayer_meeting))
  }, [prayerMeetingForm, templateStyles])

  const bulletinPreview = useMemo(() => {
    const vars = makeBulletinVars(weekLabel, weekLabel)
    return buildBulletinCard({
      weekLabel: bulletinForm.weekLabel,
      birthdays: bulletinForm.birthdays,
      anniversaries: bulletinForm.anniversaries,
      helpers: bulletinForm.helpers,
      events: bulletinForm.events,
      upcomingEvents: bulletinForm.upcomingEvents,
      sectionOrder: bulletinForm.sectionOrder,
      ...interpCommon(bulletinForm, vars),
    }, buildStyleContext(templateStyles.bulletin))
  }, [bulletinForm, weekLabel, templateStyles])

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
    if (subjectOverrides[type]) return subjectOverrides[type]!
    const etKey = commTypeEtNames[type]
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
    setSubjectOverrides((prev) => ({ ...prev, [type]: value }))
  }

  // ---- Get preview for type ----
  // If dispatched/queued, show the exact HTML that was sent/queued.
  // Otherwise show the live-computed preview for editing.
  function getPreview(type: CommType): string | null {
    // Always show live preview from current form state — dispatch HTML is only for "View Sent Email"
    const d = dispatches[type]
    if (d?.body_html && (d.status === "pending" || d.status === "previewed" || d.status === "approved" || d.status === "sending")) {
      // Only use dispatch HTML for queued/pending items (not yet sent, form isn't editable)
      return d.body_html
    }
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

  const EVENT_BASED_TYPES: CommType[] = ["bible_study", "womens_study", "prayer_meeting"]

  function getWeekStartForSave(type: CommType): string {
    if (EVENT_BASED_TYPES.includes(type)) {
      const formData = getFormData(type)
      const dateStr = formData.date as string | undefined
      if (dateStr && !dateStr.toLowerCase().includes("no ") && !dateStr.toLowerCase().includes("not ")) {
        try {
          const baseDate = addDays(new Date(), weekOffset * 7)
          const currentYear = baseDate.getFullYear()
          const parsed = parse(`${dateStr} ${currentYear}`, "EEEE, MMMM do yyyy", baseDate)
          if (!isNaN(parsed.getTime())) {
            return format(startOfWeek(parsed, { weekStartsOn: 0 }), "yyyy-MM-dd")
          }
        } catch { /* fall through */ }
      }
    }
    const base = addDays(new Date(), weekOffset * 7)
    return format(startOfWeek(base, { weekStartsOn: 0 }), "yyyy-MM-dd")
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

      const weekStart = getWeekStartForSave(type)
      const templateName = BUILTIN_LABEL[type] || type

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
          logAudit("composed_instance_updated", "composed_instances", existingId, { name: templateName, type, weekStart })
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
          logAudit("composed_instance_created", "composed_instances", inserted?.id, { name: templateName, type, weekStart })
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
    const label = BUILTIN_LABEL[type] || type
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
      logAudit("composed_instance_deleted", "composed_instances", id, { name: label, type })
      fetchAll()
    }
  }

  function handleRefreshFromTemplate(type: CommType) {
    const etKey = commTypeEtNames[type]
    const tmplData = savedTemplateData[etKey]
    if (!tmplData) {
      toast.error("No template defaults found")
      return
    }
    const common = extractCommonFields(tmplData as CommonCardFields)
    switch (type) {
      case "birthday": setBirthdayForm((prev) => ({ ...prev, ...common })); break
      case "anniversary": setAnniversaryForm((prev) => ({ ...prev, ...common })); break
      case "bible_study": setBibleStudyForm((prev) => ({ ...prev, ...(tmplData as unknown as BibleStudyFormData) })); break
      case "womens_study": setWomensStudyForm((prev) => ({ ...prev, ...(tmplData as unknown as WomensStudyFormData) })); break
      case "prayer_meeting": setPrayerMeetingForm((prev) => ({ ...prev, ...(tmplData as unknown as PrayerMeetingFormData) })); break
      case "bulletin": setBulletinForm((prev) => ({ ...prev, ...common })); break
    }
    toast.success("Refreshed from template defaults")
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

        const dispatchWeekStart = getWeekStartForSave(type)

        // Auto-save draft before dispatching so form data persists
        const templateName = BUILTIN_LABEL[type] || type
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

        // Resolve recipient count for confirmation dialog
        let recipientCount = 0
        if (opts.mailingListId) {
          const { count } = await supabase.from("mailing_list_members").select("*", { count: "exact", head: true }).eq("mailing_list_id", opts.mailingListId)
          recipientCount = count ?? 0
        }
        const extraCount = opts.additionalRecipients.trim() ? opts.additionalRecipients.split(",").filter(Boolean).length : 0
        const totalRecipients = recipientCount + extraCount
        const listName = mailingLists.find((ml) => ml.id === opts.mailingListId)?.name || "Direct recipients"

        // Show confirmation dialog instead of sending immediately
        setSendConfirm({ open: true, type, subject, recipientCount: totalRecipients, listName, isReminder })
        setSendingType(null)
        return
      } catch {
        toast.error("An unexpected error occurred")
      } finally {
        setSendingType(null)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const executeSend = useCallback(async () => {
    if (!sendConfirm.type) return
    const type = sendConfirm.type
    const subject = sendConfirm.subject
    const isReminder = sendConfirm.isReminder
    setSendConfirm((prev) => ({ ...prev, open: false }))
    setSendingType(type)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const opts = commOptions[type]
      const html = getLivePreview(type)
      const dispatchWeekStart = getWeekStartForSave(type)

      const { data: inserted, error } = await supabase
          .from("dispatch_queue")
          .insert({
            subject,
            body_html: html,
            scheduled_at: new Date().toISOString(),
            status: "sending",
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
          // Immediately send via API
          const sendRes = await fetch("/api/dispatch/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dispatchId: inserted?.id }),
          })

          if (sendRes.ok) {
            toast.success(isReminder ? `Reminder sent!` : `"${subject}" sent to ${sendConfirm.recipientCount} recipients!`)
          } else {
            const err = await sendRes.json().catch(() => ({ error: "Send failed" }))
            toast.error(`Queued but send failed: ${err.error}. Check Dispatch Queue in Settings.`)
          }
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

  async function handleTestSend(type: CommType) {
    const html = getLivePreview(type)
    if (!html) { toast.error("No content to send."); return }
    const opts = commOptions[type]
    if (!opts.smtpConfigId) { toast.error("Select a Send From account first."); return }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const adminEmail = user?.email
    if (!adminEmail) { toast.error("Could not determine your email."); return }
    const subject = getSubject(type)
    try {
      const res = await fetch("/api/dispatch/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, html, smtpConfigId: opts.smtpConfigId, toEmail: adminEmail }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        toast.error(`Test send failed: ${error}`)
      } else {
        toast.success(`Test email sent to ${adminEmail}`)
      }
    } catch { toast.error("Test send failed") }
  }

  // ---- Custom template handlers (shared logic) ----
  async function handleCustomSendNow(ctId: string) {
    const ct = customDashTemplates.find((t) => t.id === ctId)
    if (!ct) return
    const form = customForms[ctId]
    if (!form) return
    const vc = (ct.defaults.visualConfig as VisualConfig) ?? null
    const html = buildCustomDashPreview(form, customTemplateStyles[ctId], vc, smartContext)
    if (!html) { toast.error("No content"); return }
    const opts = commOptions[ctId]
    if (!opts?.smtpConfigId) { toast.error("Please select a Send From account first."); return }
    if (!opts?.mailingListId && !opts?.additionalRecipients?.trim()) { toast.error("Please select a mailing list or add recipients."); return }

    const ctKey = `custom:${ctId}`
    const subj = subjectOverrides[ctId] || ct.subject_template || ct.name
    setSendingType("bulletin")
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const weekStart = format(startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 0 }), "yyyy-MM-dd")

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
      const existingId = customInstanceIds[ctId]
      if (existingId) {
        await supabase.from("composed_instances").update(draftPayload as never).eq("id", existingId)
      } else {
        const { data: newDraft } = await supabase.from("composed_instances").insert(draftPayload as never).select("id").single() as { data: { id: string } | null }
        if (newDraft) setCustomInstanceIds((prev) => ({ ...prev, [ctId]: newDraft.id }))
      }
      setCustomSnapshots((prev) => ({ ...prev, [ctId]: structuredClone(form as unknown as Record<string, unknown>) }))

      const { data: inserted, error } = await supabase.from("dispatch_queue").insert({
        subject: subj,
        body_html: html,
        scheduled_at: new Date().toISOString(),
        status: "sending",
        template_type: ctKey,
        week_start: weekStart,
        mailing_list_id: opts.mailingListId || null,
        smtp_config_id: opts.smtpConfigId || null,
        additional_recipients: opts.additionalRecipients?.trim() || null,
        created_by: user?.id ?? null,
      } as never).select("id").single() as { data: { id: string } | null; error: { message: string } | null }
      if (error) { toast.error(`Failed: ${error.message}`); return }

      const sendRes = await fetch("/api/dispatch/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dispatchId: inserted?.id }),
      })
      if (sendRes.ok) {
        toast.success(`"${subj}" sent!`)
        setCustomDispatches((prev) => ({ ...prev, [ctId]: { status: "sent", count: (prev[ctId]?.count ?? 0) + 1, lastSentAt: new Date().toISOString() } }))
      } else {
        toast.error("Send failed. Check Settings → Dispatch Queue.")
      }
    } finally { setSendingType(null) }
  }

  async function handleCustomSave(ctId: string) {
    const ct = customDashTemplates.find((t) => t.id === ctId)
    if (!ct) return
    const form = customForms[ctId]
    if (!form) return
    const ctKey = `custom:${ctId}`
    const subj = subjectOverrides[ctId] || ct.subject_template || ct.name
    setSavingInstance("bulletin")
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const weekStart = format(startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 0 }), "yyyy-MM-dd")
      const opts = commOptions[ctId]
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
      const existingId = customInstanceIds[ctId]
      if (existingId) {
        const { error } = await supabase.from("composed_instances").update(payload as never).eq("id", existingId)
        if (error) toast.error(`Save failed: ${error.message}`)
        else toast.success(`${ct.name} draft saved`)
      } else {
        const { data: ins, error } = await supabase.from("composed_instances").insert(payload as never).select("id").single() as { data: { id: string } | null; error: { message: string } | null }
        if (error) toast.error(`Save failed: ${error.message}`)
        else {
          toast.success(`${ct.name} draft saved`)
          if (ins) setCustomInstanceIds((prev) => ({ ...prev, [ctId]: ins.id }))
        }
      }
      setCustomSnapshots((prev) => ({ ...prev, [ctId]: structuredClone(form as unknown as Record<string, unknown>) }))
    } finally { setSavingInstance(null) }
  }

  async function handleCustomDelete(ctId: string) {
    const ct = customDashTemplates.find((t) => t.id === ctId)
    const id = customInstanceIds[ctId]
    if (!id || !confirm(`Delete the saved ${ct?.name ?? "custom"} draft?`)) return
    const supabase = createClient()
    await supabase.from("composed_instances").delete().eq("id", id)
    setCustomInstanceIds((prev) => { const n = { ...prev }; delete n[ctId]; return n })
    toast.success(`${ct?.name ?? "Custom"} draft deleted`)
  }

  function updateCustomForm(ctId: string, partial: Partial<CustomDashFormData>) {
    setCustomForms((prev) => ({ ...prev, [ctId]: { ...prev[ctId], ...partial } }))
  }

  async function viewSentEmail(type: CommType) {
    const d = dispatches[type]
    if (!d?.body_html) return
    const supabase = createClient()
    let mailingListName = ""
    let recipientCount = 0
    let smtpFrom = ""
    if (d.mailing_list_id) {
      const { data: ml } = await supabase.from("mailing_lists").select("name").eq("id", d.mailing_list_id).single() as { data: { name: string } | null }
      mailingListName = ml?.name ?? ""
      const { count } = await supabase.from("mailing_list_members").select("*", { count: "exact", head: true }).eq("mailing_list_id", d.mailing_list_id)
      recipientCount = count ?? 0
    }
    if (d.smtp_config_id) {
      const { data: smtp } = await supabase.from("smtp_configs").select("from_email").eq("id", d.smtp_config_id).single() as { data: { from_email: string } | null }
      smtpFrom = smtp?.from_email ?? ""
    }
    setSentEmailPreview({ subject: d.subject, html: d.body_html, sentAt: d.sent_at ?? undefined, mailingListName, recipientCount, smtpFrom, additionalRecipients: d.additional_recipients ?? undefined })
  }

  function handleCustomCancel(ctId: string) {
    const ct = customDashTemplates.find((t) => t.id === ctId)
    if (!ct) return
    const snap = customSnapshots[ctId]
    if (snap) {
      setCustomForms((prev) => ({ ...prev, [ctId]: structuredClone(snap) as unknown as CustomDashFormData }))
    } else {
      const parsed = ct.defaults
      setCustomForms((prev) => ({
        ...prev,
        [ctId]: {
          ...EMPTY_CUSTOM_FORM,
          title: (parsed.title as string) || ct.name,
          subtitle: (parsed.subtitle as string) || "",
          emoji: (parsed.emoji as string) || "📋",
          body: (parsed.body as string) || "",
          bodyBgColor: (parsed.bodyBgColor as string) || undefined,
          footerVerse: (parsed.footerVerse as string) || "",
          footerVerseBgColor: (parsed.footerVerseBgColor as string) || undefined,
          primaryColor: (parsed.primaryColor as string) || "",
          resourceLinks: (parsed.resourceLinks as BaseFormData["resourceLinks"]) ?? [],
          customSections: (parsed.customSections as BaseFormData["customSections"]) ?? [],
          flyerSections: (parsed.flyerSections as FlyerSectionItem[]) ?? [],
        },
      }))
    }
  }

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

      const schedWeekStart = getWeekStartForSave(type)

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
    const isBreak = bibleStudyForm.date.toLowerCase().includes("no ")
    lines.push(isBreak ? bibleStudyForm.date : `${bibleStudyForm.date} at ${bibleStudyForm.time}`)
    if (bibleStudyForm.hostNames && bibleStudyForm.hostNames !== "TBD") {
      lines.push(`Host: ${bibleStudyForm.hostNames}${bibleStudyForm.address !== "TBD" ? ` — ${bibleStudyForm.address}` : ""}`)
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

      {/* Quick link to Calendar */}
      {!loading && (
        <div className="flex items-center justify-end">
          <Link href="/calendar" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            View schedule on Calendar →
          </Link>
        </div>
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
              bulletin: <BulletinEditForm data={bulletinForm} onChange={setBulletinForm} onWeeksChange={async (weeks) => {
                setBulletinForm((prev) => ({ ...prev, weeksAhead: weeks }))
                if (weeks <= 1) {
                  setBulletinForm((prev) => ({ ...prev, upcomingEvents: [] }))
                  return
                }
                const supabase = createClient()
                const baseDate = addDays(new Date(), weekOffset * 7)
                const nextStart = format(addDays(startOfWeek(baseDate, { weekStartsOn: 0 }), 7), "yyyy-MM-dd")
                const futureEnd = format(addDays(startOfWeek(baseDate, { weekStartsOn: 0 }), weeks * 7 - 1), "yyyy-MM-dd")
                const { data: futureInstances } = await supabase
                  .from("event_instances")
                  .select("event_id, instance_date, instance_time, status, events(title, default_time, event_type_id, event_types(name))")
                  .gte("instance_date", nextStart)
                  .lte("instance_date", futureEnd)
                  .neq("status", "cancelled")
                  .returns<{ event_id: string; instance_date: string; instance_time: string | null; status: string; events: { title: string; default_time: string | null; event_type_id: string; event_types: { name: string } | null } | null }[]>()
                const upcomingItems: { title: string; details: string }[] = []
                for (const inst of futureInstances ?? []) {
                  if (!inst.events) continue
                  const etName = inst.events.event_types?.name ?? ""
                  if (["birthday", "anniversary", "bulletin"].includes(etName)) continue
                  const time = inst.instance_time ?? inst.events.default_time
                  const dateStr = format(new Date(inst.instance_date + "T00:00:00"), "EEEE, MMM d")
                  upcomingItems.push({ title: inst.events.title, details: time ? `${dateStr} at ${time}` : dateStr })
                }
                setBulletinForm((prev) => ({ ...prev, upcomingEvents: upcomingItems }))
              }} onRefreshFromDb={() => {
                setBulletinForm((prev) => ({
                  ...prev,
                  birthdays: dbBdayEntries.map((b) => ({ name: b.name, date: b.date })),
                  anniversaries: dbAnniEntries.map((a) => ({ names: `${a.husbandName} & ${a.wifeName}`, date: a.date })),
                  events: [...dbBulletinEvents, ...prev.events.filter((e) => !dbBulletinEvents.some((ae) => ae.title === e.title))],
                }))
              }} />,
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
                  onClick={() => setActiveCardKey(type)}
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
                          <span
                            role="link"
                            tabIndex={0}
                            className="shrink-0 cursor-pointer rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                            onClick={(e) => { e.stopPropagation(); window.location.href = `/dispatch?status=sent&type=${type}` }}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); window.location.href = `/dispatch?status=sent&type=${type}` } }}
                          >
                            Sent{count > 1 ? ` ${count}x` : ""}
                          </span>
                          {dispatches[type]?.body_html && (
                            <span
                              role="link"
                              tabIndex={0}
                              className="shrink-0 cursor-pointer text-[10px] font-medium text-green-600 hover:text-green-800 hover:underline dark:text-green-400"
                              onClick={(e) => { e.stopPropagation(); viewSentEmail(type) }}
                              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); viewSentEmail(type) } }}
                            >
                              View
                            </span>
                          )}
                        </>
                      )}
                      {status === "scheduled" && (
                        <span
                          role="link"
                          tabIndex={0}
                          className="shrink-0 cursor-pointer rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
                          onClick={(e) => { e.stopPropagation(); window.location.href = `/dispatch?status=pending&type=${type}` }}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); window.location.href = `/dispatch?status=pending&type=${type}` } }}
                        >
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
            {/* Custom template cards — in same grid */}
            {customDashTemplates.filter((ct) => isCustomVisible(ct.id)).map((ct) => {
              const di = customDispatches[ct.id] ?? { status: "draft", count: 0 }
              const hasDraft = !!customInstanceIds[ct.id]
              const isSelected = selectedCustomCard === ct.id

              return (
                <button
                  key={ct.id}
                  onClick={() => setActiveCardKey(isSelected ? "bulletin" : `custom:${ct.id}`)}
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
                      {ct.eventInfo?.eventDate
                        ? `${ct.eventInfo.eventDate}${ct.eventInfo.eventTime ? ` at ${ct.eventInfo.eventTime}` : ""}`
                        : customForms[ct.id]?.title || "Custom announcement"}
                    </p>
                  </div>
                  <span className="absolute right-2 top-2 size-2 rounded-full" style={{ backgroundColor: ct.color }} />
                </button>
              )
            })}
            {/* Generic event cards — auto-discovered from active events */}
            {genericCards.map((gc) => {
              const isSelected = activeCardKey === `generic:${gc.eventTypeId}`
              return (
                <button
                  key={`generic:${gc.eventTypeId}`}
                  onClick={() => setActiveCardKey(isSelected ? "bulletin" : `generic:${gc.eventTypeId}`)}
                  className={`relative flex items-start gap-3 rounded-xl border p-3 text-left transition-all hover:shadow-sm ${
                    isSelected ? "ring-2 ring-offset-1 shadow-sm" : "border-border hover:border-foreground/20"
                  }`}
                  style={isSelected ? { borderColor: gc.color, "--tw-ring-color": gc.color } as React.CSSProperties : undefined}
                >
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: gc.color + "15", color: gc.color }}
                  >
                    <CalendarDays className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">{gc.eventTypeName}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">
                      {gc.date}{gc.time ? ` at ${gc.time}` : ""}
                    </p>
                  </div>
                  <span className="absolute right-2 top-2 size-2 rounded-full" style={{ backgroundColor: gc.color }} />
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
                  {customDashTemplates.length > 0 && (
                    <>
                      <div className="border-t pt-2 mt-2" />
                      {customDashTemplates.map((ct) => (
                        <div key={ct.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{ct.emoji}</span>
                            <span className="text-sm truncate max-w-36">{ct.name}</span>
                          </div>
                          <Switch
                            size="sm"
                            checked={isCustomVisible(ct.id)}
                            onCheckedChange={() => toggleCustomTemplate(ct.id)}
                          />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* ── Expanded card detail ── */}
          {visibleTemplates.includes(selectedCard) && !selectedCustomCard && (() => {
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
                onTestSend={() => handleTestSend(type)}
                onSave={() => handleSaveInstance(type)}
                onDelete={() => handleDeleteInstance(type)}
                onCancel={() => handleCancelEdit(type)}
                onRefresh={() => handleRefreshFromTemplate(type)}
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
                autoFilledFrom={signupAutoFills[type]?.formTitle ?? null}
              >
                {editForms[type]}
              </WeeklyCommunicationCard>
            )
          })()}
        {/* ── Custom Template Expanded Card ── */}
        {selectedCustomCard && (() => {
          const ct = customDashTemplates.find((t) => t.id === selectedCustomCard)
          if (!ct) return null
          const form = customForms[ct.id]
          if (!form) return null
          const di = customDispatches[ct.id] ?? { status: "draft", count: 0 }
          const vc = (ct.defaults.visualConfig as VisualConfig) ?? null
          const preview = buildCustomDashPreview(form, customTemplateStyles[ct.id], vc, smartContext)
          const subj = subjectOverrides[ct.id] || ct.subject_template || ct.name

          return (
            <WeeklyCommunicationCard
              key={`custom:${ct.id}`}
              title={ct.name}
              accentColor={ct.color}
              icon={Send}
              status={di.status as CommunicationStatus}
              summaryLines={[form.title || "Custom announcement"]}
              subject={subj}
              onSubjectChange={(v) => setSubjectOverrides((prev) => ({ ...prev, [ct.id]: v }))}
              previewHtml={preview}
              resourceLinks={(form.resourceLinks ?? []).filter((l) => l.url)}
              mailingLists={mailingLists}
              smtpConfigs={smtpConfigs}
              selectedMailingList={commOptions[ct.id]?.mailingListId}
              onMailingListChange={(id) => setCommOptions((prev) => ({ ...prev, [ct.id]: { ...prev[ct.id], mailingListId: id } }))}
              selectedSmtpConfig={commOptions[ct.id]?.smtpConfigId}
              onSmtpConfigChange={(id) => setCommOptions((prev) => ({ ...prev, [ct.id]: { ...prev[ct.id], smtpConfigId: id } }))}
              additionalRecipients={commOptions[ct.id]?.additionalRecipients}
              onAdditionalRecipientsChange={(v) => setCommOptions((prev) => ({ ...prev, [ct.id]: { ...prev[ct.id], additionalRecipients: v } }))}
              sendCount={di.count}
              onSchedule={() => {}}
              onSendNow={() => handleCustomSendNow(ct.id)}
              onSave={() => handleCustomSave(ct.id)}
              onDelete={() => handleCustomDelete(ct.id)}
              onCancel={() => handleCustomCancel(ct.id)}
              saving={savingInstance === "bulletin"}
              hasInstance={!!customInstanceIds[ct.id]}
            >
              <CustomEditFields ctId={ct.id} form={form} onChange={updateCustomForm} />
            </WeeklyCommunicationCard>
          )
        })()}
        {/* ── Generic Event Card Expanded ── */}
        {activeCardKey.startsWith("generic:") && (() => {
          const genericEtId = activeCardKey.slice(8)
          const gc = genericCards.find((g) => g.eventTypeId === genericEtId)
          if (!gc) return null

          const summaryLines: string[] = []
          summaryLines.push(gc.time ? `${gc.date} at ${gc.time}` : gc.date)
          if (gc.hostNames) summaryLines.push(`Host: ${gc.hostNames}`)
          if (gc.address) summaryLines.push(`Location: ${gc.address}`)
          if (gc.topic) summaryLines.push(`Topic: ${gc.topic}`)

          const locations = (gc.hostNames || gc.address) ? [{
            label: gc.eventTypeName,
            hostName: gc.hostNames || undefined,
            address: gc.address || undefined,
          }] : undefined

          const previewHtml = buildGenericEventCard({
            title: gc.title,
            date: gc.date,
            time: gc.time || undefined,
            topic: gc.topic || undefined,
            locations,
            primaryColor: gc.color,
          })

          return (
            <WeeklyCommunicationCard
              key={`generic:${gc.eventTypeId}`}
              title={gc.eventTypeName}
              accentColor={gc.color}
              icon={CalendarDays}
              status="draft"
              summaryLines={summaryLines}
              previewHtml={previewHtml}
              onSchedule={() => {}}
              onSendNow={() => {}}
            />
          )
        })()}
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
      <Sheet open={!!sentEmailPreview} onOpenChange={(open) => { if (!open) setSentEmailPreview(null) }}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Sent Email</SheetTitle>
          </SheetHeader>
          <div className="flex-1 space-y-4 px-4 pb-4">
            {sentEmailPreview?.subject && (
              <p className="text-sm font-medium">{sentEmailPreview.subject}</p>
            )}
            {sentEmailPreview && (sentEmailPreview.sentAt || sentEmailPreview.mailingListName || sentEmailPreview.smtpFrom) && (
              <div className="rounded-lg border bg-muted/50 p-3 space-y-1 text-xs text-muted-foreground">
                {sentEmailPreview.sentAt && (
                  <p><span className="font-medium text-foreground">Sent:</span> {format(new Date(sentEmailPreview.sentAt), "MMM d, yyyy 'at' h:mm a")}</p>
                )}
                {sentEmailPreview.smtpFrom && (
                  <p><span className="font-medium text-foreground">From:</span> {sentEmailPreview.smtpFrom}</p>
                )}
                {sentEmailPreview.mailingListName && (
                  <p><span className="font-medium text-foreground">To:</span> {sentEmailPreview.mailingListName}{sentEmailPreview.recipientCount ? ` (${sentEmailPreview.recipientCount} recipients)` : ""}</p>
                )}
                {sentEmailPreview.additionalRecipients && (
                  <p><span className="font-medium text-foreground">CC:</span> {sentEmailPreview.additionalRecipients}</p>
                )}
              </div>
            )}
            <div
              className="rounded-lg border bg-white p-4 dark:bg-slate-900"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(sentEmailPreview?.html ?? "") }}
            />
          </div>
          <SheetFooter>
            <SheetClose render={<Button variant="outline" />}>Close</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Send confirmation dialog */}
      <Dialog open={sendConfirm.open} onOpenChange={(open) => { if (!open) setSendConfirm((prev) => ({ ...prev, open: false })) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Send</DialogTitle>
            <DialogDescription>
              {sendConfirm.isReminder ? "Send a reminder?" : "Ready to send this email?"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-lg border bg-muted/50 p-3 space-y-1.5">
              <p className="text-sm font-medium truncate">{sendConfirm.subject}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="size-3.5" />
                <span>{sendConfirm.recipientCount} recipient{sendConfirm.recipientCount !== 1 ? "s" : ""}</span>
              </div>
              <p className="text-xs text-muted-foreground">{sendConfirm.listName}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSendConfirm((prev) => ({ ...prev, open: false }))}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => executeSend()}>
              <Send className="size-3.5" />
              {sendConfirm.isReminder ? "Send Reminder" : "Send Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
