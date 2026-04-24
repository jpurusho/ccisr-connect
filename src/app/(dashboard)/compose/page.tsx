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
} from "lucide-react"
import { startOfWeek, endOfWeek, format, addDays, nextFriday, isFriday } from "date-fns"

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

type TemplateId = (typeof TEMPLATES)[number]["id"]

// ---------------------------------------------------------------------------
// Form-state types (one per template)
// ---------------------------------------------------------------------------

interface BirthdayFormState {
  weekLabel: string
  birthdays: BirthdayEntry[]
  message: string
}

interface AnniversaryFormState {
  weekLabel: string
  anniversaries: AnniversaryEntry[]
  message: string
}

interface BibleStudyFormState {
  hostNames: string
  address: string
  city: string
  phone: string
  date: string
  time: string
  topic: string
  message: string
}

interface WomensStudyFormState {
  topic: string
  date: string
  time: string
  zoomLink: string
  message: string
}

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

type FormState =
  | { type: "birthday"; data: BirthdayFormState }
  | { type: "anniversary"; data: AnniversaryFormState }
  | { type: "bible_study"; data: BibleStudyFormState }
  | { type: "womens_study"; data: WomensStudyFormState }
  | { type: "prayer_meeting"; data: PrayerMeetingFormState }
  | { type: "bulletin"; data: BulletinFormState }

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
        hostNames: d.hostNames,
        address: d.address,
        city: d.city || undefined,
        phone: d.phone || undefined,
        date: d.date,
        time: d.time,
        topic: d.topic || undefined,
        message: d.message || undefined,
      })
    }
    case "womens_study": {
      const d = form.data
      return buildWomensStudyCard({
        topic: d.topic,
        date: d.date,
        time: d.time,
        zoomLink: d.zoomLink || undefined,
        message: d.message || undefined,
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
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ComposePage() {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId | null>(null)
  const [formState, setFormState] = useState<FormState | null>(null)
  const [loading, setLoading] = useState(false)
  const [mailingLists, setMailingLists] = useState<MailingListOption[]>([])
  const [selectedMailingList, setSelectedMailingList] = useState<string>("")
  const [scheduling, setScheduling] = useState(false)
  const [subject, setSubject] = useState("")

  // Fetch mailing lists on mount
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("mailing_lists")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        if (data) setMailingLists(data)
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

        setFormState({
          type: "bible_study",
          data: {
            hostNames: hostName,
            address,
            city,
            phone: phone || "",
            date: format(fri, "EEEE, MMMM do"),
            time: instance?.instance_time ? formatTime(instance.instance_time) : "7:30 PM",
            topic: "Studying the Book of Acts",
            message: "",
          },
        })
        setSubject(`Bible Study This Friday — ${format(fri, "MMM d")}`)
        break
      }

      case "womens_study": {
        setFormState({
          type: "womens_study",
          data: {
            topic: "Building a Relationship with God",
            date: format(addDays(monday, 2), "EEEE, MMMM do"),
            time: "7:00 PM",
            zoomLink: "",
            message: "",
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
        const [bdayRes, annRes] = await Promise.all([
          supabase
            .from("members")
            .select("full_name, birth_month, birth_day")
            .eq("is_active", true)
            .not("birth_month", "is", null)
            .in("birth_month", weekMonths)
            .returns<{ full_name: string; birth_month: number; birth_day: number }[]>(),
          supabase
            .from("wedding_anniversaries")
            .select("anniversary_month, anniversary_day, husband:members!husband_member_id(full_name), wife:members!wife_member_id(full_name)")
            .in("anniversary_month", weekMonths)
            .returns<{ anniversary_month: number; anniversary_day: number; husband: { full_name: string } | null; wife: { full_name: string } | null }[]>(),
        ])

        const bdays = (bdayRes.data ?? [])
          .filter((m) => weekSet.has(`${m.birth_month}-${m.birth_day}`))
          .map((m) => ({ name: m.full_name, date: `${m.birth_month}/${m.birth_day}` }))

        const anns = (annRes.data ?? [])
          .filter((a) => weekSet.has(`${a.anniversary_month}-${a.anniversary_day}`))
          .map((a) => ({
            names: `${a.husband?.full_name?.split(" ")[0] ?? "?"} & ${a.wife?.full_name?.split(" ")[0] ?? "?"}`,
            date: `${a.anniversary_month}/${a.anniversary_day}`,
          }))

        setFormState({
          type: "bulletin",
          data: {
            weekLabel: `Week of ${weekLabel}`,
            birthdays: bdays,
            anniversaries: anns,
            helpers: [],
            events: [
              { title: "Women's Bible Study", details: "Building a Relationship with God — Wednesdays @ 7:00 PM via Zoom" },
              { title: "San Ramon Bible Study", details: "Studying the Book of Acts — Friday at 7:30 PM" },
            ],
          },
        })
        setSubject(`Weekly Bulletin — Week of ${weekLabel}`)
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
      const { error } = await supabase.from("dispatch_queue").insert({
        subject,
        body_html: previewHtml,
        scheduled_at: new Date().toISOString(),
        status: "pending",
        mailing_list_id: selectedMailingList || null,
      } as never)

      if (error) {
        toast.error(`Failed: ${error.message}`)
      } else {
        toast.success("Dispatch queued successfully! Go to Dispatch Queue to approve and send.")
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
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1.5">
                  <Label>Mailing List</Label>
                  <Select value={selectedMailingList} onValueChange={(val) => setSelectedMailingList(val ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a mailing list..." />
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
                <Button
                  onClick={handleScheduleDispatch}
                  disabled={scheduling}
                  style={{ backgroundColor: TEMPLATES.find((t) => t.id === selectedTemplate)?.color }}
                >
                  {scheduling ? <Loader2 className="animate-spin" /> : <Send className="size-4" />}
                  Queue for Dispatch
                </Button>
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
  function set<K extends keyof BibleStudyFormState>(field: K, value: BibleStudyFormState[K]) {
    onChange({ ...data, [field]: value })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Host Names" htmlFor="bs-host">
          <Input id="bs-host" value={data.hostNames} onChange={(e) => set("hostNames", e.target.value)} />
        </Field>
        <Field label="Phone" htmlFor="bs-phone">
          <Input id="bs-phone" value={data.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
      </div>
      <Field label="Address" htmlFor="bs-addr">
        <Input id="bs-addr" value={data.address} onChange={(e) => set("address", e.target.value)} />
      </Field>
      <Field label="City" htmlFor="bs-city">
        <Input id="bs-city" value={data.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g., San Ramon, CA" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date" htmlFor="bs-date">
          <Input id="bs-date" value={data.date} onChange={(e) => set("date", e.target.value)} placeholder="Friday, May 2nd" />
        </Field>
        <Field label="Time" htmlFor="bs-time">
          <Input id="bs-time" value={data.time} onChange={(e) => set("time", e.target.value)} placeholder="7:30 PM" />
        </Field>
      </div>
      <Field label="Topic" htmlFor="bs-topic">
        <Input id="bs-topic" value={data.topic} onChange={(e) => set("topic", e.target.value)} />
      </Field>
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
      <Field label="Topic" htmlFor="ws-topic">
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
      <Field label="Zoom Link" htmlFor="ws-zoom">
        <Input id="ws-zoom" value={data.zoomLink} onChange={(e) => set("zoomLink", e.target.value)} placeholder="https://zoom.us/j/..." />
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
          <Input id="pm-host" value={data.hostNames} onChange={(e) => set("hostNames", e.target.value)} />
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
