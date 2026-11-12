"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { logAudit } from "@/lib/audit"
import { sanitizeHtml } from "@/lib/sanitize-html"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  Cake,
  Heart,
  BookOpen,
  Users,
  Newspaper,
  HandHelping,
  Save,
  Eye,
  Loader2,
  Copy,
  Send,
  Plus,
} from "lucide-react"
import {
  buildBirthdayCard,
  buildAnniversaryCard,
  buildBibleStudyCard,
  buildWomensStudyCard,
  buildPrayerMeetingCard,
  buildBulletinCard,
  buildShoeboxMinistryCard,
  extractCommonCardData,
  buildStyleContext,
} from "@/lib/email/card-builder"
import {
  type BibleStudyDefaults,
  type WomensStudyDefaults,
  type PrayerMeetingDefaults,
  type BirthdayDefaults,
  type AnniversaryDefaults,
  type BulletinDefaults,
  type ShoeboxMinistryDefaults,
  parseBodyTemplate,
  FALLBACK_DEFAULTS,
  SUBJECT_FALLBACKS,
} from "@/lib/template-defaults"
import { interp, makeBirthdayVars, makeAnniversaryVars, makeEventVars, makeBulletinVars } from "@/lib/interpolate"
import { TemplateStyleEditor } from "@/components/dashboard/template-style-editor"
import { type TemplateStyleSettings } from "@/lib/email/card-builder"
import { type TemplateType, inferTemplateType } from "@/lib/dashboard-types"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { Field, ColorPickerField } from "@/components/templates/template-form-field"
import { PlaceholderReference } from "@/components/templates/common-template-fields"
import { BirthdayTemplateForm } from "@/components/templates/birthday-template-form"
import { AnniversaryTemplateForm } from "@/components/templates/anniversary-template-form"
import { BibleStudyTemplateForm } from "@/components/templates/bible-study-template-form"
import { WomensStudyTemplateForm } from "@/components/templates/womens-study-template-form"
import { PrayerMeetingTemplateForm } from "@/components/templates/prayer-meeting-template-form"
import { BulletinTemplateForm } from "@/components/templates/bulletin-template-form"
import { ShoeboxMinistryTemplateForm } from "@/components/templates/shoebox-ministry-template-form"
import { CustomTemplateEditor } from "@/components/templates/custom-template-editor"
import { TemplateGrid } from "@/components/templates/template-grid"
import { CustomTemplateList } from "@/components/templates/custom-template-list"

interface SavedTemplate {
  id: string
  event_type_id: string
  event_type_name: string
  subject_template: string
  body_template: string
  style_settings?: Record<string, unknown>
}

const EVENT_TYPE_TABS = [
  { name: "birthday", label: "Birthday", icon: Cake, color: "#7C3AED" },
  { name: "anniversary", label: "Anniversary", icon: Heart, color: "#D97706" },
  { name: "bible_study", label: "Bible Study", icon: BookOpen, color: "#0D9488" },
  { name: "womens_study", label: "Women's Study", icon: Users, color: "#DB2777" },
  { name: "prayer_meeting", label: "Prayer Meeting", icon: HandHelping, color: "#059669" },
  { name: "bulletin", label: "Bulletin", icon: Newspaper, color: "#4F46E5" },
  { name: "shoebox_ministry", label: "Shoebox Ministry", icon: Plus, color: "#DC2626" },
]

export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState("")
  const [templates, setTemplates] = useState<SavedTemplate[]>([])
  const [eventTypeIds, setEventTypeIds] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [previewing, setPreviewing] = useState(false)

  const [customTemplates, setCustomTemplates] = useState<{ id: string; name: string; subject_template: string; body_template: string; style_settings?: Record<string, unknown>; is_active: boolean }[]>([])

  const [editingCustom, setEditingCustom] = useState<{ id: string; name: string; subject: string; data: Record<string, unknown>; styleSettings: TemplateStyleSettings; isActive: boolean } | null>(null)
  const [creatingCustom, setCreatingCustom] = useState(false)

  const [styleSettings, setStyleSettings] = useState<Record<string, TemplateStyleSettings>>({})

  const [subjects, setSubjects] = useState<Record<string, string>>({})
  const [birthdayData, setBirthdayData] = useState<BirthdayDefaults>({})
  const [anniversaryData, setAnniversaryData] = useState<AnniversaryDefaults>({})
  const [bibleStudyData, setBibleStudyData] = useState<BibleStudyDefaults>(
    FALLBACK_DEFAULTS.bible_study.data as BibleStudyDefaults
  )
  const [womensStudyData, setWomensStudyData] = useState<WomensStudyDefaults>(
    FALLBACK_DEFAULTS.womens_study.data as WomensStudyDefaults
  )
  const [prayerMeetingData, setPrayerMeetingData] = useState<PrayerMeetingDefaults>({})
  const [bulletinData, setBulletinData] = useState<BulletinDefaults>(
    FALLBACK_DEFAULTS.bulletin.data as BulletinDefaults
  )
  const [shoeboxMinistryData, setShoeboxMinistryData] = useState<ShoeboxMinistryDefaults>(
    FALLBACK_DEFAULTS.shoebox_ministry.data as ShoeboxMinistryDefaults
  )

  // Dashboard visibility settings per template type
  const [dashboardSettings, setDashboardSettings] = useState<Record<string, { showInDashboard: boolean; displayOrder: number; iconName: string; cardColor: string }>>({})

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const [etRes, tmplRes, customRes] = await Promise.all([
      supabase.from("event_types").select("id, name, comm_type, show_in_dashboard, display_order, icon_name, card_color").order("name").returns<{ id: string; name: string; comm_type: string | null; show_in_dashboard: boolean | null; display_order: number | null; icon_name: string | null; card_color: string | null }[]>(),
      supabase
        .from("email_templates")
        .select("id, event_type_id, subject_template, body_template, style_settings")
        .eq("is_default", true)
        .returns<{ id: string; event_type_id: string; subject_template: string; body_template: string; style_settings: Record<string, unknown> | null }[]>(),
      supabase
        .from("email_templates")
        .select("*")
        .eq("is_default", false)
        .order("name")
        .returns<{ id: string; name: string; subject_template: string; body_template: string; style_settings: Record<string, unknown> | null; is_active?: boolean }[]>(),
    ])

    if (customRes.data) setCustomTemplates(customRes.data.map((ct) => ({ ...ct, style_settings: ct.style_settings ?? undefined, is_active: ct.is_active !== false })))

    const idToTabName: Record<string, string> = {}
    const tabNameToId: Record<string, string> = {}
    const dashSettings: Record<string, { showInDashboard: boolean; displayOrder: number; iconName: string; cardColor: string }> = {}
    if (etRes.data) {
      for (const et of etRes.data) {
        const tabName = (et.comm_type as string) ?? inferTemplateType(et.name) ?? et.name
        idToTabName[et.id] = tabName
        tabNameToId[tabName] = et.id
        dashSettings[tabName] = {
          showInDashboard: et.show_in_dashboard ?? true,
          displayOrder: et.display_order ?? 0,
          iconName: et.icon_name ?? "Calendar",
          cardColor: et.card_color ?? "#4F46E5",
        }
      }
      setEventTypeIds(tabNameToId)
      setDashboardSettings(dashSettings)
    }

    setBirthdayData({})
    setAnniversaryData({})
    setBibleStudyData(FALLBACK_DEFAULTS.bible_study.data as BibleStudyDefaults)
    setWomensStudyData(FALLBACK_DEFAULTS.womens_study.data as WomensStudyDefaults)
    setPrayerMeetingData({})
    setBulletinData(FALLBACK_DEFAULTS.bulletin.data as BulletinDefaults)
    setShoeboxMinistryData(FALLBACK_DEFAULTS.shoebox_ministry.data as ShoeboxMinistryDefaults)

    const saved: SavedTemplate[] = []
    const subjs: Record<string, string> = { ...SUBJECT_FALLBACKS }

    if (tmplRes.data) {
      for (const t of tmplRes.data) {
        const etName = idToTabName[t.event_type_id]
        if (!etName) continue

        saved.push({
          id: t.id,
          event_type_id: t.event_type_id,
          event_type_name: etName,
          subject_template: t.subject_template,
          body_template: t.body_template,
          style_settings: t.style_settings ?? undefined,
        })
        subjs[etName] = t.subject_template
        if (t.style_settings) {
          setStyleSettings((prev) => ({ ...prev, [etName]: t.style_settings as TemplateStyleSettings }))
        }

        const parsed = parseBodyTemplate(etName, t.body_template)
        if (parsed) {
          switch (parsed.type) {
            case "birthday":
              setBirthdayData(parsed.data)
              break
            case "anniversary":
              setAnniversaryData(parsed.data)
              break
            case "bible_study":
              setBibleStudyData({ ...(FALLBACK_DEFAULTS.bible_study.data as BibleStudyDefaults), ...parsed.data })
              break
            case "womens_study":
              setWomensStudyData({ ...(FALLBACK_DEFAULTS.womens_study.data as WomensStudyDefaults), ...parsed.data })
              break
            case "prayer_meeting":
              setPrayerMeetingData(parsed.data as PrayerMeetingDefaults)
              break
            case "bulletin":
              setBulletinData({ ...(FALLBACK_DEFAULTS.bulletin.data as BulletinDefaults), ...parsed.data })
              break
            case "shoebox_ministry":
              setShoeboxMinistryData({ ...(FALLBACK_DEFAULTS.shoebox_ministry.data as ShoeboxMinistryDefaults), ...parsed.data })
              break
          }
        }
      }
    }

    setTemplates(saved)
    setSubjects(subjs)

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  function getDataForType(typeName: string): unknown {
    switch (typeName) {
      case "birthday": return birthdayData
      case "anniversary": return anniversaryData
      case "bible_study": return bibleStudyData
      case "womens_study": return womensStudyData
      case "prayer_meeting": return prayerMeetingData
      case "bulletin": return bulletinData
      case "shoebox_ministry": return shoeboxMinistryData
      default: return {}
    }
  }

  const ET_NAME_TO_COMM_TYPE: Record<string, string> = {
    birthday: "birthday",
    anniversary: "anniversary",
    bible_study: "bible_study",
    womens_study: "womens_study",
    prayer_meeting: "prayer_meeting",
    bulletin: "bulletin",
    shoebox_ministry: "shoebox_ministry",
  }

  async function checkAndOfferDraftRefresh(typeName: string, bodyJson: string, subjectTmpl: string) {
    const commType = ET_NAME_TO_COMM_TYPE[typeName]
    if (!commType) return

    const supabase = createClient()
    const { data: drafts } = await supabase
      .from("composed_instances")
      .select("id, name, week_start")
      .eq("template_type", commType)
      .eq("is_active", true)
      .returns<{ id: string; name: string; week_start: string | null }[]>()

    if (!drafts || drafts.length === 0) return

    const label = typeName.replace(/_/g, " ")
    toast(`${drafts.length} saved draft${drafts.length > 1 ? "s" : ""} use the old ${label} template`, {
      duration: 10000,
      action: {
        label: "Refresh Drafts",
        onClick: async () => {
          const parsed = JSON.parse(bodyJson)
          let updated = 0
          for (const draft of drafts) {
            const { error } = await supabase
              .from("composed_instances")
              .update({
                form_data: parsed,
                subject: subjectTmpl,
              } as never)
              .eq("id", draft.id)
            if (!error) updated++
          }
          if (updated > 0) {
            toast.success(`${updated} draft${updated > 1 ? "s" : ""} refreshed with new template`)
            logAudit("drafts_refreshed_from_template", "composed_instances", null, { typeName, count: updated })
          }
        },
      },
    })
  }

  async function syncOperationalDataToDb(typeName: string) {
    const etId = eventTypeIds[typeName]
    if (!etId) return

    const supabase = createClient()

    const { data: events } = await supabase
      .from("events")
      .select("id")
      .eq("event_type_id", etId)
      .eq("is_active", true)
      .limit(1)
      .returns<{ id: string }[]>()

    if (!events || events.length === 0) return
    const eventId = events[0].id

    const formData = getDataForType(typeName) as Record<string, unknown>

    const formLocations = formData.locations as { label: string; breaks?: { from: string; to: string; message: string }[] }[] | undefined
    const breaksToWrite: { location_id: string | null; start_date: string; end_date: string; message: string | null }[] = []

    const templateBreaks = formData.breaks as { from: string; to: string; message: string }[] | undefined
    if (templateBreaks) {
      for (const brk of templateBreaks) {
        if (brk.from && brk.to) {
          breaksToWrite.push({ location_id: null, start_date: brk.from, end_date: brk.to, message: brk.message || null })
        }
      }
    }

    if (formLocations) {
      for (const formLoc of formLocations) {
        if (!formLoc.breaks) continue
        for (const brk of formLoc.breaks) {
          if (brk.from && brk.to) {
            breaksToWrite.push({ location_id: null, start_date: brk.from, end_date: brk.to, message: brk.message || null })
          }
        }
      }
    }

    await supabase.from("event_breaks").delete().eq("event_id", eventId)
    if (breaksToWrite.length > 0) {
      await supabase.from("event_breaks").insert(
        breaksToWrite.map((b) => ({ event_id: eventId, ...b })) as never
      )
    }

    const zoomLink = formData.zoomLink as string | undefined
    if (zoomLink) {
      await supabase.from("event_virtual_config").upsert({
        event_id: eventId,
        platform: "zoom",
        meeting_link: zoomLink,
        meeting_id: (formData.zoomMeetingId as string) || null,
        passcode: (formData.zoomPasscode as string) || null,
        is_active: true,
      } as never, { onConflict: "event_id" })
    }

    const eventUpdates: Record<string, unknown> = {}
    if (formData.topic) eventUpdates.topic = formData.topic
    if (formData.dinnerNote !== undefined) eventUpdates.dinner_note = formData.dinnerNote || null
    if (formData.signupLink !== undefined) eventUpdates.signup_link = formData.signupLink || null
    if (Object.keys(eventUpdates).length > 0) {
      await supabase.from("events").update(eventUpdates as never).eq("id", eventId)
    }
  }

  async function cloneTemplate(sourceId: string, sourceName: string) {
    const supabase = createClient()
    const { data: source } = await supabase
      .from("email_templates")
      .select("subject_template, body_template, style_settings")
      .eq("id", sourceId)
      .returns<{ subject_template: string; body_template: string; style_settings: Record<string, unknown> | null }[]>()
      .single()
    if (!source) { toast.error("Source template not found"); return }

    const cloneName = `${sourceName} (Copy)`
    const { data: inserted, error } = await supabase
      .from("email_templates")
      .insert({
        name: cloneName,
        subject_template: source.subject_template,
        body_template: source.body_template,
        style_settings: source.style_settings,
        is_default: false,
      } as never)
      .select("id")
      .returns<{ id: string }[]>()
      .single()

    if (error) {
      toast.error(`Clone failed: ${error.message}`)
    } else {
      toast.success(`Cloned as "${cloneName}"`)
      logAudit("custom_template_created", "email_templates", inserted?.id, { name: cloneName, cloned_from: sourceId })
      fetchTemplates()
    }
  }

  async function handleSave(typeName: string) {
    const etId = eventTypeIds[typeName]
    if (!etId) {
      toast.error(`Event type "${typeName}" not found in database. Available: ${Object.keys(eventTypeIds).join(", ") || "none"}`)
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const bodyJson = JSON.stringify(getDataForType(typeName))
      const subjectTmpl = subjects[typeName] || SUBJECT_FALLBACKS[typeName] || ""

      // Update dashboard settings in event_types table
      const dashSettings = dashboardSettings[typeName]
      if (dashSettings) {
        const { error: etError } = await supabase
          .from("event_types")
          .update({
            show_in_dashboard: dashSettings.showInDashboard,
            display_order: dashSettings.displayOrder,
            icon_name: dashSettings.iconName,
            card_color: dashSettings.cardColor,
          } as never)
          .eq("id", etId)

        if (etError) {
          toast.error(`Dashboard settings update failed: ${etError.message}`)
          return
        }
      }

      const existing = templates.find((t) => t.event_type_name === typeName)

      if (existing) {
        const { error } = await supabase
          .from("email_templates")
          .update({
            subject_template: subjectTmpl,
            body_template: bodyJson,
            style_settings: styleSettings[typeName] ?? {},
          } as never)
          .eq("id", existing.id)

        if (error) {
          toast.error(`Update failed: ${error.message}`)
        } else {
          toast.success(`${typeName.replace(/_/g, " ")} template saved`)
          logAudit("template_updated", "email_templates", existing.id, { typeName })
          await syncOperationalDataToDb(typeName)
          await fetchTemplates()
          await checkAndOfferDraftRefresh(typeName, bodyJson, subjectTmpl)
        }
      } else {
        const { data: inserted, error } = await supabase
          .from("email_templates")
          .insert({
            name: `${typeName} default`,
            event_type_id: etId,
            subject_template: subjectTmpl,
            body_template: bodyJson,
            style_settings: styleSettings[typeName] ?? {},
            is_default: true,
          } as never)
          .select("id")
          .single() as { data: { id: string } | null; error: { message: string } | null }

        if (error) {
          toast.error(`Create failed: ${error.message}`)
        } else {
          toast.success(`${typeName.replace(/_/g, " ")} template created`)
          logAudit("template_created", "email_templates", inserted?.id, { typeName })
          await syncOperationalDataToDb(typeName)
          await fetchTemplates()
        }
      }
    } catch (err) {
      console.error("handleSave error:", err)
      toast.error("An unexpected error occurred while saving")
    } finally {
      setSaving(false)
    }
  }

  const previewHtml = useMemo(() => {
    const sampleWeek = "Apr 26 – May 2"
    const sc = buildStyleContext(styleSettings[activeTab])
    switch (activeTab) {
      case "birthday": {
        const vars = makeBirthdayVars(sampleWeek, ["John", "Mary"])
        return buildBirthdayCard({
          weekLabel: sampleWeek,
          birthdays: [{ name: "John", date: "4/27" }, { name: "Mary", date: "4/29" }],
          ...extractCommonCardData(birthdayData),
          message: interp(birthdayData.message, vars) || undefined,
          footerVerse: interp(birthdayData.footerVerse, vars) || undefined,
          headerSubtitle: interp(birthdayData.headerSubtitle, vars) || undefined,
        }, sc)
      }
      case "anniversary": {
        const vars = makeAnniversaryVars(sampleWeek, ["John & Mary"])
        return buildAnniversaryCard({
          weekLabel: sampleWeek,
          anniversaries: [{ husbandName: "John", wifeName: "Mary", date: "4/28", years: 10 }],
          ...extractCommonCardData(anniversaryData),
          message: interp(anniversaryData.message, vars) || undefined,
          footerVerse: interp(anniversaryData.footerVerse, vars) || undefined,
          headerSubtitle: interp(anniversaryData.headerSubtitle, vars) || undefined,
        }, sc)
      }
      case "bible_study": {
        const vars = makeEventVars(sampleWeek, "Friday, May 1st", bibleStudyData.time || "7:30 PM", bibleStudyData.topic || "Book of Acts")
        return buildBibleStudyCard({
          date: "Friday, May 1st",
          time: bibleStudyData.time || "7:30 PM",
          title: interp(bibleStudyData.title, vars),
          topic: interp(bibleStudyData.topic, vars),
          hostNames: bibleStudyData.hostNames || undefined,
          address: bibleStudyData.address || undefined,
          city: bibleStudyData.city || undefined,
          phone: bibleStudyData.phone || undefined,
          ...extractCommonCardData(bibleStudyData),
          message: interp(bibleStudyData.message, vars) || undefined,
          footerVerse: interp(bibleStudyData.footerVerse, vars) || undefined,
        }, sc)
      }
      case "womens_study": {
        const vars = makeEventVars(sampleWeek, "Wednesday, Apr 29th", womensStudyData.time || "7:00 PM", womensStudyData.topic || "Building a Relationship with God")
        return buildWomensStudyCard({
          date: "Wednesday, April 29th",
          time: womensStudyData.time || "7:00 PM",
          title: interp(womensStudyData.title, vars),
          topic: interp(womensStudyData.topic, vars),
          zoomLink: womensStudyData.zoomLink || undefined,
          zoomMeetingId: womensStudyData.zoomMeetingId || undefined,
          zoomPasscode: womensStudyData.zoomPasscode || undefined,
          location: womensStudyData.location || undefined,
          ...extractCommonCardData(womensStudyData),
          message: interp(womensStudyData.message, vars) || undefined,
          footerVerse: interp(womensStudyData.footerVerse, vars) || undefined,
        }, sc)
      }
      case "prayer_meeting": {
        return buildPrayerMeetingCard({
          hostNames: prayerMeetingData.hostNames || "Sample Family",
          address: prayerMeetingData.address || "123 Main St",
          city: prayerMeetingData.city || "San Ramon, CA",
          phone: prayerMeetingData.phone || "(925) 555-1234",
          date: prayerMeetingData.date || "Saturday, May 3rd",
          time: prayerMeetingData.time || "6:00 PM",
          dinnerNote: prayerMeetingData.dinnerNote || "Potluck dinner — please bring a dish to share",
          signupLink: prayerMeetingData.signupLink || undefined,
          ...extractCommonCardData(prayerMeetingData),
        }, sc)
      }
      case "bulletin": {
        const vars = makeBulletinVars(sampleWeek, "April 27, 2026")
        return buildBulletinCard({
          weekLabel: `Week of ${sampleWeek}`,
          birthdays: [{ name: "Sample Person", date: "4/27" }],
          anniversaries: [{ names: "John & Mary", date: "4/28" }],
          helpers: [],
          events: bulletinData.events || [],
          ...extractCommonCardData(bulletinData),
          message: interp(bulletinData.message, vars) || undefined,
          footerVerse: interp(bulletinData.footerVerse, vars) || undefined,
        }, sc)
      }
      case "shoebox_ministry": {
        return buildShoeboxMinistryCard({
          dueDate: shoeboxMinistryData.dueDate || "Sunday, November 15th, 2026",
          onlineLink: shoeboxMinistryData.onlineLink || "https://build-a-shoebox.samaritanspurse.org/view/3e945c78-8c3d-4d1d-99fc-62883ef061f1",
          pdfPath: shoeboxMinistryData.pdfPath,
          ...extractCommonCardData(shoeboxMinistryData),
        }, sc)
      }
      default:
        return ""
    }
  }, [activeTab, birthdayData, anniversaryData, bibleStudyData, womensStudyData, prayerMeetingData, bulletinData, shoeboxMinistryData, styleSettings])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Templates</h1>
          <p className="text-muted-foreground">Configure default content for each communication type.</p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const allTemplateCards = [
    ...EVENT_TYPE_TABS.map((tab) => ({
      id: tab.name,
      label: tab.label,
      icon: tab.icon,
      color: tab.color,
      hasSaved: templates.some((t) => t.event_type_name === tab.name),
      isCustom: false,
    })),
    ...customTemplates.map((ct) => {
      let parsed: Record<string, unknown> = {}
      try { parsed = JSON.parse(ct.body_template) } catch { /* ignore */ }
      return {
        id: `custom-${ct.id}`,
        label: ct.name,
        icon: Send,
        color: (parsed.primaryColor as string) || "#6B7280",
        hasSaved: true,
        isCustom: true,
        isActive: ct.is_active,
      }
    }),
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {activeTab && (
          <Button variant="ghost" size="icon-sm" onClick={() => { setActiveTab(""); setEditingCustom(null); setCreatingCustom(false) }} className="shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {activeTab ? (editingCustom?.name ?? allTemplateCards.find((c) => c.id === activeTab)?.label ?? "Template") : "Templates"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {activeTab ? "Edit template styling and defaults" : "Design how your email cards look. Tap to edit."}
          </p>
        </div>
      </div>

      {!activeTab && (
        <TemplateGrid
          cards={allTemplateCards}
          onSelectCard={(cardId) => {
            if (cardId.startsWith("custom-")) {
              const ctId = cardId.replace("custom-", "")
              const ct = customTemplates.find((t) => t.id === ctId)
              if (ct) {
                let parsed: Record<string, unknown> = {}
                try { parsed = JSON.parse(ct.body_template) } catch { /* ignore */ }
                setEditingCustom({ id: ct.id, name: ct.name, subject: ct.subject_template, data: parsed, styleSettings: (ct.style_settings as TemplateStyleSettings) ?? {}, isActive: ct.is_active })
              }
              setActiveTab("custom")
            } else {
              setActiveTab(cardId)
            }
          }}
          onCreateNew={() => { setActiveTab("custom"); setCreatingCustom(true) }}
        />
      )}

      {activeTab && (
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="hidden">
          {EVENT_TYPE_TABS.map((tab) => (
            <TabsTrigger key={tab.name} value={tab.name}>{tab.label}</TabsTrigger>
          ))}
          <TabsTrigger value="custom">Custom</TabsTrigger>
        </TabsList>

        {EVENT_TYPE_TABS.map((tab) => (
          <TabsContent key={tab.name} value={tab.name}>
            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {tab.label} Template Defaults
                  </CardTitle>
                  <CardDescription>
                    These values auto-populate the dashboard forms each week.
                    Leave a field empty to exclude it from the email.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Field label="Subject Line Template" htmlFor={`${tab.name}-subject`}>
                    <Input
                      id={`${tab.name}-subject`}
                      value={subjects[tab.name] || ""}
                      onChange={(e) => setSubjects((prev) => ({ ...prev, [tab.name]: e.target.value }))}
                    />
                  </Field>

                  <PlaceholderReference typeName={tab.name} />

                  <ColorPickerField
                    value={
                      tab.name === "birthday" ? birthdayData.primaryColor
                      : tab.name === "anniversary" ? anniversaryData.primaryColor
                      : tab.name === "bible_study" ? bibleStudyData.primaryColor
                      : tab.name === "womens_study" ? womensStudyData.primaryColor
                      : tab.name === "prayer_meeting" ? prayerMeetingData.primaryColor
                      : tab.name === "bulletin" ? bulletinData.primaryColor
                      : tab.name === "shoebox_ministry" ? shoeboxMinistryData.primaryColor
                      : undefined
                    }
                    defaultColor={tab.color}
                    onChange={(color) => {
                      switch (tab.name) {
                        case "birthday": setBirthdayData((p) => ({ ...p, primaryColor: color })); break
                        case "anniversary": setAnniversaryData((p) => ({ ...p, primaryColor: color })); break
                        case "bible_study": setBibleStudyData((p) => ({ ...p, primaryColor: color })); break
                        case "womens_study": setWomensStudyData((p) => ({ ...p, primaryColor: color })); break
                        case "prayer_meeting": setPrayerMeetingData((p) => ({ ...p, primaryColor: color })); break
                        case "bulletin": setBulletinData((p) => ({ ...p, primaryColor: color })); break
                        case "shoebox_ministry": setShoeboxMinistryData((p) => ({ ...p, primaryColor: color })); break
                      }
                    }}
                  />

                  <TemplateStyleEditor
                    value={styleSettings[tab.name] ?? {}}
                    onChange={(s) => setStyleSettings((prev) => ({ ...prev, [tab.name]: s }))}
                  />

                  {/* Dashboard Visibility Settings */}
                  <div className="border-t pt-4 space-y-3">
                    <h3 className="font-medium text-sm">Dashboard Settings</h3>
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`${tab.name}-show-dashboard`} className="text-sm">
                        Show in Dashboard
                      </Label>
                      <Switch
                        id={`${tab.name}-show-dashboard`}
                        checked={dashboardSettings[tab.name]?.showInDashboard ?? true}
                        onCheckedChange={(checked) => {
                          setDashboardSettings((prev) => ({
                            ...prev,
                            [tab.name]: {
                              showInDashboard: checked,
                              displayOrder: prev[tab.name]?.displayOrder ?? 0,
                              iconName: prev[tab.name]?.iconName ?? "Calendar",
                              cardColor: prev[tab.name]?.cardColor ?? "#4F46E5",
                            },
                          }))
                        }}
                      />
                    </div>
                    <Field label="Display Order" htmlFor={`${tab.name}-display-order`} hint="Lower numbers appear first">
                      <Input
                        id={`${tab.name}-display-order`}
                        type="number"
                        value={dashboardSettings[tab.name]?.displayOrder ?? 0}
                        onChange={(e) => {
                          setDashboardSettings((prev) => ({
                            ...prev,
                            [tab.name]: {
                              showInDashboard: prev[tab.name]?.showInDashboard ?? true,
                              displayOrder: parseInt(e.target.value) || 0,
                              iconName: prev[tab.name]?.iconName ?? "Calendar",
                              cardColor: prev[tab.name]?.cardColor ?? "#4F46E5",
                            },
                          }))
                        }}
                      />
                    </Field>
                  </div>

                  {tab.name === "birthday" && (
                    <BirthdayTemplateForm data={birthdayData} onChange={setBirthdayData} styleSettings={styleSettings[tab.name]} />
                  )}

                  {tab.name === "anniversary" && (
                    <AnniversaryTemplateForm data={anniversaryData} onChange={setAnniversaryData} styleSettings={styleSettings[tab.name]} />
                  )}

                  {tab.name === "bible_study" && (
                    <BibleStudyTemplateForm data={bibleStudyData} onChange={setBibleStudyData} styleSettings={styleSettings[tab.name]} />
                  )}

                  {tab.name === "womens_study" && (
                    <WomensStudyTemplateForm data={womensStudyData} onChange={setWomensStudyData} styleSettings={styleSettings[tab.name]} />
                  )}

                  {tab.name === "prayer_meeting" && (
                    <PrayerMeetingTemplateForm data={prayerMeetingData} onChange={setPrayerMeetingData} styleSettings={styleSettings[tab.name]} />
                  )}

                  {tab.name === "bulletin" && (
                    <BulletinTemplateForm data={bulletinData} onChange={setBulletinData} styleSettings={styleSettings[tab.name]} />
                  )}

                  {tab.name === "shoebox_ministry" && (
                    <ShoeboxMinistryTemplateForm data={shoeboxMinistryData} onChange={setShoeboxMinistryData} styleSettings={styleSettings[tab.name]} />
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleSave(tab.name)}
                      disabled={saving}
                      style={{ backgroundColor: tab.color }}
                      className="text-white hover:opacity-90"
                    >
                      {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                      Save Defaults
                    </Button>
                    <Button variant="outline" onClick={() => setPreviewing(true)}>
                      <Eye className="size-4" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const existing = templates.find((t) => t.event_type_name === tab.name)
                        if (existing) {
                          cloneTemplate(existing.id, tab.label)
                        } else {
                          toast.error("Save the template first before cloning")
                        }
                      }}
                    >
                      <Copy className="size-4" />
                      Clone
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="hidden lg:block">
                <CardHeader>
                  <CardTitle className="text-sm">Live Preview</CardTitle>
                  <CardDescription>
                    Shows how the email card looks with current values
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    className="rounded-lg border bg-slate-50 p-3 dark:bg-slate-900 overflow-auto max-h-[70vh]"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewHtml) }}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ))}

        <TabsContent value="custom">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Custom Templates</CardTitle>
                  <CardDescription>
                    Create reusable templates for custom announcements, event notices, and more.
                  </CardDescription>
                </div>
                {!creatingCustom && !editingCustom && (
                  <Button onClick={() => setCreatingCustom(true)}>
                    <Plus className="size-4" />
                    New Template
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {(creatingCustom || editingCustom) ? (
                <CustomTemplateEditor
                  mode={creatingCustom ? "create" : "edit"}
                  initialData={editingCustom ? {
                    id: editingCustom.id,
                    name: editingCustom.name,
                    subject: editingCustom.subject,
                    data: editingCustom.data,
                    styleSettings: editingCustom.styleSettings,
                    isActive: editingCustom.isActive
                  } : undefined}
                  saving={saving}
                  onSave={async (data) => {
                    setSaving(true)
                    const supabase = createClient()

                    const bodyData = {
                      ...data.data,
                      flyerSections: ((data.data.flyerSections as { imageUrl: string }[]) ?? []).filter((s) => s.imageUrl),
                      resourceLinks: ((data.data.resourceLinks as { url: string }[]) ?? []).filter((l) => l.url),
                      customSections: ((data.data.customSections as { title: string; entries: { name: string }[] }[]) ?? []).filter((s) => s.title && s.entries.some((e) => e.name)),
                    }

                    if (editingCustom && data.id) {
                      const { error } = await supabase
                        .from("email_templates")
                        .update({
                          name: data.name,
                          subject_template: data.subject,
                          body_template: JSON.stringify(bodyData),
                          style_settings: data.styleSettings,
                        } as never)
                        .eq("id", data.id)

                      if (error) {
                        toast.error(`Failed: ${error.message}`)
                      } else {
                        toast.success(`"${data.name}" updated`)
                        logAudit("custom_template_updated", "email_templates", data.id, { name: data.name })
                        setEditingCustom(null)
                        await fetchTemplates()
                      }
                    } else {
                      const { data: inserted, error } = await supabase
                        .from("email_templates")
                        .insert({
                          name: data.name,
                          subject_template: data.subject,
                          body_template: JSON.stringify(bodyData),
                          style_settings: data.styleSettings,
                          is_default: false,
                        } as never)
                        .select("id")
                        .single() as { data: { id: string } | null; error: { message: string } | null }

                      if (error) {
                        toast.error(`Failed: ${error.message}`)
                      } else {
                        toast.success(`"${data.name}" created`)
                        logAudit("custom_template_created", "email_templates", inserted?.id, { name: data.name })
                        setCreatingCustom(false)
                        await fetchTemplates()
                      }
                    }
                    setSaving(false)
                  }}
                  onCancel={() => {
                    setCreatingCustom(false)
                    setEditingCustom(null)
                  }}
                  onToggleActive={async (id, isActive) => {
                    const supabase = createClient()
                    const { error } = await supabase.from("email_templates").update({ is_active: isActive } as never).eq("id", id)
                    if (error) {
                      toast.error(`Failed: ${error.message}`)
                    } else {
                      const tmpl = customTemplates.find((t) => t.id === id)
                      toast.success(isActive ? `"${tmpl?.name}" activated` : `"${tmpl?.name}" deactivated`)
                      logAudit("custom_template_toggled_active", "email_templates", id, { is_active: isActive })
                      await fetchTemplates()
                      if (editingCustom && editingCustom.id === id) {
                        setEditingCustom({ ...editingCustom, isActive })
                      }
                    }
                  }}
                />
              ) : (
                <CustomTemplateList
                  templates={customTemplates}
                  onEdit={(ct) => {
                    let parsed: Record<string, unknown> = {}
                    try { parsed = JSON.parse(ct.body_template) } catch { /* ignore */ }
                    setEditingCustom({
                      id: ct.id,
                      name: ct.name,
                      subject: ct.subject_template,
                      data: parsed,
                      styleSettings: (ct.style_settings as TemplateStyleSettings) ?? {},
                      isActive: ct.is_active
                    })
                  }}
                  onToggleActive={async (id, name, currentActive) => {
                    const supabase = createClient()
                    const newActive = !currentActive
                    const { error } = await supabase.from("email_templates").update({ is_active: newActive } as never).eq("id", id)
                    if (error) {
                      toast.error(`Failed: ${error.message}`)
                    } else {
                      toast.success(newActive ? `"${name}" activated` : `"${name}" deactivated`)
                      logAudit("custom_template_toggled_active", "email_templates", id, { name, is_active: newActive })
                      await fetchTemplates()
                    }
                  }}
                  onClone={cloneTemplate}
                  onDelete={async (id, name) => {
                    if (!confirm(`Delete template "${name}"?`)) return
                    const supabase = createClient()
                    const { error } = await supabase.from("email_templates").delete().eq("id", id)
                    if (error) {
                      toast.error(`Failed: ${error.message}`)
                    } else {
                      toast.success(`"${name}" deleted`)
                      logAudit("custom_template_deleted", "email_templates", id, { name })
                      await fetchTemplates()
                    }
                  }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}

      <Sheet open={previewing} onOpenChange={setPreviewing}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Preview</SheetTitle>
          </SheetHeader>
          <div
            className="rounded-lg border bg-slate-50 p-4 dark:bg-slate-900"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewHtml) }}
          />
          <SheetFooter>
            <SheetClose render={<Button variant="outline" />}>
              Close
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
