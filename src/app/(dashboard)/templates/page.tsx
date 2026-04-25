"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { logAudit } from "@/lib/audit"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  Cake,
  Heart,
  BookOpen,
  Users,
  Newspaper,
  Save,
  Eye,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react"
import {
  buildBirthdayCard,
  buildAnniversaryCard,
  buildBibleStudyCard,
  buildWomensStudyCard,
  buildBulletinCard,
} from "@/lib/email/card-builder"
import {
  type BibleStudyDefaults,
  type WomensStudyDefaults,
  type BirthdayDefaults,
  type AnniversaryDefaults,
  type BulletinDefaults,
  type BibleStudyLocationDefault,
  parseBodyTemplate,
  FALLBACK_DEFAULTS,
  SUBJECT_FALLBACKS,
} from "@/lib/template-defaults"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface SavedTemplate {
  id: string
  event_type_id: string
  event_type_name: string
  subject_template: string
  body_template: string
}

const EVENT_TYPE_TABS = [
  { name: "birthday", label: "Birthday", icon: Cake, color: "#7C3AED" },
  { name: "anniversary", label: "Anniversary", icon: Heart, color: "#D97706" },
  { name: "friday_bible_study", label: "Bible Study", icon: BookOpen, color: "#0D9488" },
  { name: "wednesday_womens_study", label: "Women's Study", icon: Users, color: "#DB2777" },
  { name: "bulletin", label: "Bulletin", icon: Newspaper, color: "#4F46E5" },
]

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

const COLOR_PRESETS = [
  { label: "Purple", value: "#7C3AED" },
  { label: "Gold", value: "#D97706" },
  { label: "Teal", value: "#0D9488" },
  { label: "Rose", value: "#DB2777" },
  { label: "Green", value: "#059669" },
  { label: "Indigo", value: "#4F46E5" },
  { label: "Blue", value: "#2563EB" },
  { label: "Red", value: "#DC2626" },
  { label: "Orange", value: "#EA580C" },
  { label: "Cyan", value: "#0891B2" },
  { label: "Slate", value: "#475569" },
]

function ColorPickerField({ value, onChange, defaultColor }: { value: string | undefined; onChange: (color: string) => void; defaultColor: string }) {
  const current = value || defaultColor
  return (
    <div className="space-y-1.5">
      <Label>Theme Color</Label>
      <div className="flex items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              title={preset.label}
              className={`size-6 rounded-full border-2 transition-transform hover:scale-110 ${current === preset.value ? "border-foreground scale-110" : "border-transparent"}`}
              style={{ backgroundColor: preset.value }}
              onClick={() => onChange(preset.value)}
            />
          ))}
        </div>
        <Input
          type="color"
          value={current}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-12 cursor-pointer rounded border p-0.5"
        />
      </div>
    </div>
  )
}

function ResourceLinksEditor({
  links,
  onChange,
}: {
  links: { label: string; url: string }[]
  onChange: (links: { label: string; url: string }[]) => void
}) {
  return (
    <div className="space-y-2">
      <Label>Resource Links</Label>
      {links.map((link, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            placeholder="Label (e.g., Study Materials)"
            value={link.label}
            onChange={(e) => {
              const updated = [...links]
              updated[i] = { ...updated[i], label: e.target.value }
              onChange(updated)
            }}
            className="flex-1"
          />
          <Input
            placeholder="https://..."
            value={link.url}
            onChange={(e) => {
              const updated = [...links]
              updated[i] = { ...updated[i], url: e.target.value }
              onChange(updated)
            }}
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onChange(links.filter((_, j) => j !== i))}
          >
            <Trash2 className="size-3.5 text-muted-foreground" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange([...links, { label: "", url: "" }])}
      >
        <Plus className="size-3.5" />
        Add Link
      </Button>
    </div>
  )
}

export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState("birthday")
  const [templates, setTemplates] = useState<SavedTemplate[]>([])
  const [eventTypeIds, setEventTypeIds] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [previewing, setPreviewing] = useState(false)

  // Per-type form state
  const [subjects, setSubjects] = useState<Record<string, string>>({})
  const [birthdayData, setBirthdayData] = useState<BirthdayDefaults>({})
  const [anniversaryData, setAnniversaryData] = useState<AnniversaryDefaults>({})
  const [bibleStudyData, setBibleStudyData] = useState<BibleStudyDefaults>(
    FALLBACK_DEFAULTS.friday_bible_study.data as BibleStudyDefaults
  )
  const [womensStudyData, setWomensStudyData] = useState<WomensStudyDefaults>(
    FALLBACK_DEFAULTS.wednesday_womens_study.data as WomensStudyDefaults
  )
  const [bulletinData, setBulletinData] = useState<BulletinDefaults>(
    FALLBACK_DEFAULTS.bulletin.data as BulletinDefaults
  )

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    // Fetch event types and templates separately to avoid FK ambiguity
    const [etRes, tmplRes] = await Promise.all([
      supabase.from("event_types").select("id, name").order("name").returns<{ id: string; name: string }[]>(),
      supabase
        .from("email_templates")
        .select("id, event_type_id, subject_template, body_template")
        .eq("is_default", true)
        .returns<{ id: string; event_type_id: string; subject_template: string; body_template: string }[]>(),
    ])

    // Build event type maps
    const idToName: Record<string, string> = {}
    const nameToId: Record<string, string> = {}
    if (etRes.data) {
      for (const et of etRes.data) {
        idToName[et.id] = et.name
        nameToId[et.name] = et.id
      }
      setEventTypeIds(nameToId)
    }

    // Reset to defaults first, then overlay saved data
    setBirthdayData({})
    setAnniversaryData({})
    setBibleStudyData(FALLBACK_DEFAULTS.friday_bible_study.data as BibleStudyDefaults)
    setWomensStudyData(FALLBACK_DEFAULTS.wednesday_womens_study.data as WomensStudyDefaults)
    setBulletinData(FALLBACK_DEFAULTS.bulletin.data as BulletinDefaults)

    const saved: SavedTemplate[] = []
    const subjs: Record<string, string> = { ...SUBJECT_FALLBACKS }

    if (tmplRes.data) {
      for (const t of tmplRes.data) {
        const etName = idToName[t.event_type_id]
        if (!etName) continue

        saved.push({
          id: t.id,
          event_type_id: t.event_type_id,
          event_type_name: etName,
          subject_template: t.subject_template,
          body_template: t.body_template,
        })
        subjs[etName] = t.subject_template

        const parsed = parseBodyTemplate(etName, t.body_template)
        if (parsed) {
          switch (parsed.type) {
            case "birthday":
              setBirthdayData(parsed.data)
              break
            case "anniversary":
              setAnniversaryData(parsed.data)
              break
            case "friday_bible_study":
              setBibleStudyData({ ...(FALLBACK_DEFAULTS.friday_bible_study.data as BibleStudyDefaults), ...parsed.data })
              break
            case "wednesday_womens_study":
              setWomensStudyData({ ...(FALLBACK_DEFAULTS.wednesday_womens_study.data as WomensStudyDefaults), ...parsed.data })
              break
            case "bulletin":
              setBulletinData({ ...(FALLBACK_DEFAULTS.bulletin.data as BulletinDefaults), ...parsed.data })
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
      case "friday_bible_study": return bibleStudyData
      case "wednesday_womens_study": return womensStudyData
      case "bulletin": return bulletinData
      default: return {}
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

      const existing = templates.find((t) => t.event_type_name === typeName)

      if (existing) {
        const { error, status, statusText } = await supabase
          .from("email_templates")
          .update({
            subject_template: subjectTmpl,
            body_template: bodyJson,
          } as never)
          .eq("id", existing.id)

        if (error) {
          toast.error(`Update failed: ${error.message}`)
        } else {
          toast.success(`${typeName.replace(/_/g, " ")} template saved`)
          logAudit("template_updated", "email_templates", existing.id, { typeName })
          await fetchTemplates()
        }
      } else {
        const { data: inserted, error, status, statusText } = await supabase
          .from("email_templates")
          .insert({
            name: `${typeName} default`,
            event_type_id: etId,
            subject_template: subjectTmpl,
            body_template: bodyJson,
            is_default: true,
          } as never)
          .select("id")
          .single() as { data: { id: string } | null; error: { message: string } | null; status: number; statusText: string }

        if (error) {
          toast.error(`Create failed: ${error.message}`)
        } else {
          toast.success(`${typeName.replace(/_/g, " ")} template created`)
          logAudit("template_created", "email_templates", inserted?.id, { typeName })
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

  // Live preview
  const previewHtml = useMemo(() => {
    const sampleWeek = "Apr 26 – May 2"
    switch (activeTab) {
      case "birthday":
        return buildBirthdayCard({
          weekLabel: sampleWeek,
          birthdays: [{ name: "Sample Person", date: "4/27" }],
          message: birthdayData.message || undefined,
          footerVerse: birthdayData.footerVerse || undefined,
          primaryColor: birthdayData.primaryColor || undefined,
        })
      case "anniversary":
        return buildAnniversaryCard({
          weekLabel: sampleWeek,
          anniversaries: [{ husbandName: "John", wifeName: "Mary", date: "4/28", years: 10 }],
          message: anniversaryData.message || undefined,
          footerVerse: anniversaryData.footerVerse || undefined,
          primaryColor: anniversaryData.primaryColor || undefined,
        })
      case "friday_bible_study":
        return buildBibleStudyCard({
          title: bibleStudyData.title || undefined,
          date: "Friday, May 1st",
          time: bibleStudyData.time || "7:30 PM",
          topic: bibleStudyData.topic || undefined,
          message: bibleStudyData.message || undefined,
          footerVerse: bibleStudyData.footerVerse || undefined,
          primaryColor: bibleStudyData.primaryColor || undefined,
          resourceLinks: (bibleStudyData.resourceLinks ?? []).filter(l => l.url),
          locations: (bibleStudyData.locations || []).map((loc) => ({
            label: loc.label,
            hostNames: loc.hostNames || undefined,
            address: loc.address || undefined,
            city: loc.city || undefined,
            phone: loc.phone || undefined,
          })),
        })
      case "wednesday_womens_study":
        return buildWomensStudyCard({
          title: womensStudyData.title || undefined,
          topic: womensStudyData.topic || undefined,
          date: "Wednesday, April 29th",
          time: womensStudyData.time || "7:00 PM",
          zoomLink: womensStudyData.zoomLink || undefined,
          zoomMeetingId: womensStudyData.zoomMeetingId || undefined,
          zoomPasscode: womensStudyData.zoomPasscode || undefined,
          location: womensStudyData.location || undefined,
          message: womensStudyData.message || undefined,
          footerVerse: womensStudyData.footerVerse || undefined,
          primaryColor: womensStudyData.primaryColor || undefined,
          resourceLinks: (womensStudyData.resourceLinks ?? []).filter(l => l.url),
        })
      case "bulletin":
        return buildBulletinCard({
          weekLabel: `Week of ${sampleWeek}`,
          birthdays: [{ name: "Sample Person", date: "4/27" }],
          anniversaries: [{ names: "John & Mary", date: "4/28" }],
          helpers: [],
          events: bulletinData.events || [],
          primaryColor: bulletinData.primaryColor || undefined,
        })
      default:
        return ""
    }
  }, [activeTab, birthdayData, anniversaryData, bibleStudyData, womensStudyData, bulletinData])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Templates</h1>
          <p className="text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Email Templates</h1>
        <p className="text-muted-foreground">
          Set default values for each communication type. These persist across weeks.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {EVENT_TYPE_TABS.map((tab) => {
            const Icon = tab.icon
            const hasSaved = templates.some((t) => t.event_type_name === tab.name)
            return (
              <TabsTrigger
                key={tab.name}
                value={tab.name}
                className="gap-1.5 data-[state=active]:text-white"
                style={activeTab === tab.name ? { backgroundColor: tab.color } : undefined}
              >
                <Icon className="size-3.5" />
                {tab.label}
                {hasSaved && <span className="size-1.5 rounded-full bg-current opacity-60" />}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {EVENT_TYPE_TABS.map((tab) => (
          <TabsContent key={tab.name} value={tab.name}>
            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
              {/* Editor */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {tab.label} Template Defaults
                  </CardTitle>
                  <CardDescription>
                    These values auto-populate the dashboard and compose forms each week.
                    Leave a field empty to exclude it from the email.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Field label="Subject Line Template" htmlFor={`${tab.name}-subject`} hint="Use {{weekLabel}}, {{date}} as placeholders">
                    <Input
                      id={`${tab.name}-subject`}
                      value={subjects[tab.name] || ""}
                      onChange={(e) => setSubjects((prev) => ({ ...prev, [tab.name]: e.target.value }))}
                    />
                  </Field>

                  <ColorPickerField
                    value={
                      tab.name === "birthday" ? birthdayData.primaryColor
                      : tab.name === "anniversary" ? anniversaryData.primaryColor
                      : tab.name === "friday_bible_study" ? bibleStudyData.primaryColor
                      : tab.name === "wednesday_womens_study" ? womensStudyData.primaryColor
                      : tab.name === "bulletin" ? bulletinData.primaryColor
                      : undefined
                    }
                    defaultColor={tab.color}
                    onChange={(color) => {
                      switch (tab.name) {
                        case "birthday": setBirthdayData((p) => ({ ...p, primaryColor: color })); break
                        case "anniversary": setAnniversaryData((p) => ({ ...p, primaryColor: color })); break
                        case "friday_bible_study": setBibleStudyData((p) => ({ ...p, primaryColor: color })); break
                        case "wednesday_womens_study": setWomensStudyData((p) => ({ ...p, primaryColor: color })); break
                        case "bulletin": setBulletinData((p) => ({ ...p, primaryColor: color })); break
                      }
                    }}
                  />

                  {/* Birthday fields */}
                  {tab.name === "birthday" && (
                    <>
                      <Field label="Wish Message" htmlFor="bd-msg" hint="Leave empty for no wish text">
                        <Textarea
                          id="bd-msg"
                          value={birthdayData.message || ""}
                          onChange={(e) => setBirthdayData((prev) => ({ ...prev, message: e.target.value }))}
                          className="min-h-16"
                        />
                      </Field>
                      <Field label="Footer Bible Verse" htmlFor="bd-verse" hint="Leave empty for no footer">
                        <Input
                          id="bd-verse"
                          value={birthdayData.footerVerse || ""}
                          onChange={(e) => setBirthdayData((prev) => ({ ...prev, footerVerse: e.target.value }))}
                        />
                      </Field>
                      <ResourceLinksEditor
                        links={birthdayData.resourceLinks ?? []}
                        onChange={(links) => setBirthdayData((prev) => ({ ...prev, resourceLinks: links }))}
                      />
                    </>
                  )}

                  {/* Anniversary fields */}
                  {tab.name === "anniversary" && (
                    <>
                      <Field label="Wish Message" htmlFor="an-msg" hint="Leave empty for no wish text">
                        <Textarea
                          id="an-msg"
                          value={anniversaryData.message || ""}
                          onChange={(e) => setAnniversaryData((prev) => ({ ...prev, message: e.target.value }))}
                          className="min-h-16"
                        />
                      </Field>
                      <Field label="Footer Bible Verse" htmlFor="an-verse" hint="Leave empty for no footer">
                        <Input
                          id="an-verse"
                          value={anniversaryData.footerVerse || ""}
                          onChange={(e) => setAnniversaryData((prev) => ({ ...prev, footerVerse: e.target.value }))}
                        />
                      </Field>
                      <ResourceLinksEditor
                        links={anniversaryData.resourceLinks ?? []}
                        onChange={(links) => setAnniversaryData((prev) => ({ ...prev, resourceLinks: links }))}
                      />
                    </>
                  )}

                  {/* Bible Study fields */}
                  {tab.name === "friday_bible_study" && (
                    <>
                      <Field label="Card Title" htmlFor="bs-title">
                        <Input
                          id="bs-title"
                          value={bibleStudyData.title || ""}
                          onChange={(e) => setBibleStudyData((prev) => ({ ...prev, title: e.target.value }))}
                          placeholder="Bible Study This Friday"
                        />
                      </Field>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Topic" htmlFor="bs-topic">
                          <Input
                            id="bs-topic"
                            value={bibleStudyData.topic || ""}
                            onChange={(e) => setBibleStudyData((prev) => ({ ...prev, topic: e.target.value }))}
                          />
                        </Field>
                        <Field label="Default Time" htmlFor="bs-time">
                          <Input
                            id="bs-time"
                            value={bibleStudyData.time || ""}
                            onChange={(e) => setBibleStudyData((prev) => ({ ...prev, time: e.target.value }))}
                            placeholder="7:30 PM"
                          />
                        </Field>
                      </div>
                      <Field label="Invite Message" htmlFor="bs-msg" hint="Leave empty to exclude">
                        <Textarea
                          id="bs-msg"
                          value={bibleStudyData.message || ""}
                          onChange={(e) => setBibleStudyData((prev) => ({ ...prev, message: e.target.value }))}
                          className="min-h-16"
                        />
                      </Field>
                      <Field label="Footer Bible Verse" htmlFor="bs-verse" hint="Leave empty for no footer">
                        <Input
                          id="bs-verse"
                          value={bibleStudyData.footerVerse || ""}
                          onChange={(e) => setBibleStudyData((prev) => ({ ...prev, footerVerse: e.target.value }))}
                        />
                      </Field>

                      <ResourceLinksEditor
                        links={bibleStudyData.resourceLinks ?? []}
                        onChange={(links) => setBibleStudyData((prev) => ({ ...prev, resourceLinks: links }))}
                      />

                      <div className="space-y-3">
                        <Label>Default Locations</Label>
                        {(bibleStudyData.locations || []).map((loc, i) => (
                          <div key={i} className="space-y-2 rounded-md border p-3">
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="Location name"
                                value={loc.label}
                                onChange={(e) => {
                                  const locs = [...(bibleStudyData.locations || [])]
                                  locs[i] = { ...locs[i], label: e.target.value }
                                  setBibleStudyData((prev) => ({ ...prev, locations: locs }))
                                }}
                                className="flex-1 font-medium"
                              />
                              {(bibleStudyData.locations || []).length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => {
                                    const locs = (bibleStudyData.locations || []).filter((_, j) => j !== i)
                                    setBibleStudyData((prev) => ({ ...prev, locations: locs }))
                                  }}
                                >
                                  <Trash2 className="size-3.5 text-muted-foreground" />
                                </Button>
                              )}
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <Input
                                placeholder="Host Names"
                                value={loc.hostNames}
                                onChange={(e) => {
                                  const locs = [...(bibleStudyData.locations || [])]
                                  locs[i] = { ...locs[i], hostNames: e.target.value }
                                  setBibleStudyData((prev) => ({ ...prev, locations: locs }))
                                }}
                              />
                              <Input
                                placeholder="Phone"
                                value={loc.phone}
                                onChange={(e) => {
                                  const locs = [...(bibleStudyData.locations || [])]
                                  locs[i] = { ...locs[i], phone: e.target.value }
                                  setBibleStudyData((prev) => ({ ...prev, locations: locs }))
                                }}
                              />
                            </div>
                            <Input
                              placeholder="Address"
                              value={loc.address}
                              onChange={(e) => {
                                const locs = [...(bibleStudyData.locations || [])]
                                locs[i] = { ...locs[i], address: e.target.value }
                                setBibleStudyData((prev) => ({ ...prev, locations: locs }))
                              }}
                            />
                            <Input
                              placeholder="City, State ZIP"
                              value={loc.city}
                              onChange={(e) => {
                                const locs = [...(bibleStudyData.locations || [])]
                                locs[i] = { ...locs[i], city: e.target.value }
                                setBibleStudyData((prev) => ({ ...prev, locations: locs }))
                              }}
                            />
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const locs = [...(bibleStudyData.locations || []), { label: "", hostNames: "", address: "", city: "", phone: "" }]
                            setBibleStudyData((prev) => ({ ...prev, locations: locs }))
                          }}
                        >
                          <Plus className="size-3.5" />
                          Add Location
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Women's Study fields */}
                  {tab.name === "wednesday_womens_study" && (
                    <>
                      <Field label="Card Title" htmlFor="ws-title">
                        <Input
                          id="ws-title"
                          value={womensStudyData.title || ""}
                          onChange={(e) => setWomensStudyData((prev) => ({ ...prev, title: e.target.value }))}
                          placeholder="Women's Bible Study"
                        />
                      </Field>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Topic" htmlFor="ws-topic">
                          <Input
                            id="ws-topic"
                            value={womensStudyData.topic || ""}
                            onChange={(e) => setWomensStudyData((prev) => ({ ...prev, topic: e.target.value }))}
                          />
                        </Field>
                        <Field label="Default Time" htmlFor="ws-time">
                          <Input
                            id="ws-time"
                            value={womensStudyData.time || ""}
                            onChange={(e) => setWomensStudyData((prev) => ({ ...prev, time: e.target.value }))}
                            placeholder="7:00 PM"
                          />
                        </Field>
                      </div>
                      <Field label="Zoom Link" htmlFor="ws-zoom" hint="Leave empty to exclude Zoom details">
                        <Input
                          id="ws-zoom"
                          value={womensStudyData.zoomLink || ""}
                          onChange={(e) => setWomensStudyData((prev) => ({ ...prev, zoomLink: e.target.value }))}
                          placeholder="https://zoom.us/j/..."
                        />
                      </Field>
                      {womensStudyData.zoomLink && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Meeting ID" htmlFor="ws-zmid">
                            <Input
                              id="ws-zmid"
                              value={womensStudyData.zoomMeetingId || ""}
                              onChange={(e) => setWomensStudyData((prev) => ({ ...prev, zoomMeetingId: e.target.value }))}
                              placeholder="779 2123 2378"
                            />
                          </Field>
                          <Field label="Passcode" htmlFor="ws-zmpw">
                            <Input
                              id="ws-zmpw"
                              value={womensStudyData.zoomPasscode || ""}
                              onChange={(e) => setWomensStudyData((prev) => ({ ...prev, zoomPasscode: e.target.value }))}
                              placeholder="6gLy8u"
                            />
                          </Field>
                        </div>
                      )}
                      <Field label="Location (when no Zoom)" htmlFor="ws-loc">
                        <Input
                          id="ws-loc"
                          value={womensStudyData.location || ""}
                          onChange={(e) => setWomensStudyData((prev) => ({ ...prev, location: e.target.value }))}
                        />
                      </Field>
                      <Field label="Invite Message" htmlFor="ws-msg" hint="Leave empty to exclude">
                        <Textarea
                          id="ws-msg"
                          value={womensStudyData.message || ""}
                          onChange={(e) => setWomensStudyData((prev) => ({ ...prev, message: e.target.value }))}
                          className="min-h-16"
                        />
                      </Field>
                      <Field label="Footer Bible Verse" htmlFor="ws-verse" hint="Leave empty for no footer">
                        <Input
                          id="ws-verse"
                          value={womensStudyData.footerVerse || ""}
                          onChange={(e) => setWomensStudyData((prev) => ({ ...prev, footerVerse: e.target.value }))}
                        />
                      </Field>

                      <ResourceLinksEditor
                        links={womensStudyData.resourceLinks ?? []}
                        onChange={(links) => setWomensStudyData((prev) => ({ ...prev, resourceLinks: links }))}
                      />
                    </>
                  )}

                  {/* Bulletin fields */}
                  {tab.name === "bulletin" && (
                    <div className="space-y-3">
                      <Label>Default Events</Label>
                      {(bulletinData.events || []).map((evt, i) => (
                        <div key={i} className="space-y-1.5 rounded-md border p-2.5">
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Event title"
                              value={evt.title}
                              onChange={(e) => {
                                const evts = [...(bulletinData.events || [])]
                                evts[i] = { ...evts[i], title: e.target.value }
                                setBulletinData((prev) => ({ ...prev, events: evts }))
                              }}
                              className="flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => {
                                const evts = (bulletinData.events || []).filter((_, j) => j !== i)
                                setBulletinData((prev) => ({ ...prev, events: evts }))
                              }}
                            >
                              <Trash2 className="size-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                          <Textarea
                            placeholder="Details"
                            value={evt.details}
                            onChange={(e) => {
                              const evts = [...(bulletinData.events || [])]
                              evts[i] = { ...evts[i], details: e.target.value }
                              setBulletinData((prev) => ({ ...prev, events: evts }))
                            }}
                            className="min-h-10"
                          />
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const evts = [...(bulletinData.events || []), { title: "", details: "" }]
                          setBulletinData((prev) => ({ ...prev, events: evts }))
                        }}
                      >
                        <Plus className="size-3.5" />
                        Add Event
                      </Button>
                      <ResourceLinksEditor
                        links={bulletinData.resourceLinks ?? []}
                        onChange={(links) => setBulletinData((prev) => ({ ...prev, resourceLinks: links }))}
                      />
                    </div>
                  )}

                  {/* Save + Preview buttons */}
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
                  </div>
                </CardContent>
              </Card>

              {/* Live Preview Sidebar */}
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
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Mobile preview dialog */}
      <Dialog open={previewing} onOpenChange={setPreviewing}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          <div
            className="rounded-lg border bg-slate-50 p-4 dark:bg-slate-900"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
