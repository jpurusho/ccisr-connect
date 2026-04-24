"use client"

import { useEffect, useState, useCallback } from "react"
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
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  buildBirthdayCard,
  buildAnniversaryCard,
  buildBibleStudyCard,
  buildWomensStudyCard,
  buildPrayerMeetingCard,
  buildBulletinCard,
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
} from "lucide-react"
import { startOfWeek, endOfWeek, format, addDays, nextFriday, isFriday } from "date-fns"

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

const TEMPLATES = [
  { id: "birthday", title: "Birthday Card", description: "Birthdays for the upcoming week", icon: Cake, color: EVENT_COLORS.birthday.primary },
  { id: "anniversary", title: "Anniversary Card", description: "Anniversaries for the upcoming week", icon: Heart, color: EVENT_COLORS.anniversary.primary },
  { id: "bible_study", title: "Bible Study Invite", description: "This Friday's Bible study", icon: BookOpen, color: EVENT_COLORS.friday_bible_study.primary },
  { id: "womens_study", title: "Women's Bible Study", description: "Wednesday women's study", icon: Users, color: EVENT_COLORS.wednesday_womens_study.primary },
  { id: "prayer_meeting", title: "Prayer Meeting", description: "Monthly prayer meeting invite", icon: HandHelping, color: EVENT_COLORS.monthly_prayer.primary },
  { id: "bulletin", title: "Weekly Bulletin", description: "Full weekly bulletin with all info", icon: Newspaper, color: EVENT_COLORS.bulletin.primary },
]

interface MailingListOption {
  id: string
  name: string
}

export default function ComposePage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mailingLists, setMailingLists] = useState<MailingListOption[]>([])
  const [selectedMailingList, setSelectedMailingList] = useState<string>("")
  const [scheduling, setScheduling] = useState(false)
  const [subject, setSubject] = useState("")

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

  const generatePreview = useCallback(async (templateId: string) => {
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

    let html = ""

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

        html = buildBirthdayCard({ weekLabel, birthdays: bdays.length > 0 ? bdays : [{ name: "(No birthdays this week)", date: "" }] })
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

        html = buildAnniversaryCard({ weekLabel, anniversaries: anns.length > 0 ? anns : [{ husbandName: "(No anniversaries", wifeName: "this week)", date: "" }] })
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

        html = buildBibleStudyCard({
          hostNames: hostName,
          address,
          phone: phone || undefined,
          date: format(fri, "EEEE, MMMM do"),
          time: instance?.instance_time ? formatTime(instance.instance_time) : "7:30 PM",
          topic: "Studying the Book of Acts",
        })
        setSubject(`Bible Study This Friday — ${format(fri, "MMM d")}`)
        break
      }

      case "womens_study": {
        html = buildWomensStudyCard({
          topic: "Building a Relationship with God",
          date: format(addDays(monday, 2), "EEEE, MMMM do"),
          time: "7:00 PM",
        })
        setSubject("Women's Bible Study This Wednesday")
        break
      }

      case "prayer_meeting": {
        html = buildPrayerMeetingCard({
          hostNames: "TBD",
          address: "TBD",
          date: "TBD",
          time: "6:30 PM",
          dinnerNote: "Dinner provided by the host family",
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

        html = buildBulletinCard({
          weekLabel: `Week of ${weekLabel}`,
          birthdays: bdays,
          anniversaries: anns,
          helpers: [],
          events: [
            { title: "Women's Bible Study", details: "Building a Relationship with God — Wednesdays @ 7:00 PM via Zoom" },
            { title: "San Ramon Bible Study", details: "Studying the Book of Acts — Friday at 7:30 PM" },
          ],
        })
        setSubject(`Weekly Bulletin — Week of ${weekLabel}`)
        break
      }
    }

    setPreviewHtml(html)
    setLoading(false)
  }, [])

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
        setPreviewHtml(null)
        setSelectedTemplate(null)
        setSubject("")
      }
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setScheduling(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Compose</h1>
        <p className="text-muted-foreground">
          Select a template to auto-generate content from church data, then preview and send.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((tmpl) => {
          const Icon = tmpl.icon
          const isSelected = selectedTemplate === tmpl.id
          return (
            <Card
              key={tmpl.id}
              className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? "ring-2" : ""}`}
              style={isSelected ? { borderColor: tmpl.color, boxShadow: `0 0 0 1px ${tmpl.color}` } : {}}
              onClick={() => generatePreview(tmpl.id)}
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

      {loading && (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span>Generating preview from church data...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {previewHtml && !loading && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>
                    Subject: <strong>{subject}</strong>
                  </CardDescription>
                </div>
                <div className="flex gap-2">
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
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="rounded-lg border bg-slate-50 p-6 dark:bg-slate-900"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </CardContent>
          </Card>

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

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`
}
