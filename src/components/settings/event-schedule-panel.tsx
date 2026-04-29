"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { format, addDays, isAfter } from "date-fns"
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
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  CalendarDays,
  Plus,
  Trash2,
  Save,
  Loader2,
  X,
} from "lucide-react"

interface EventRow {
  id: string
  title: string
  recurrence_rule: string | null
  default_time: string | null
  is_active: boolean
  event_type_name: string
  event_type_color: string
}

interface ParsedRule {
  freq: string
  byDay: string
  nthWeek: string
  except: string[]
  until: string
}

const DAY_MAP: Record<string, number> = {
  SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
}

const DAY_OPTIONS = [
  { value: "SU", label: "Sunday" },
  { value: "MO", label: "Monday" },
  { value: "TU", label: "Tuesday" },
  { value: "WE", label: "Wednesday" },
  { value: "TH", label: "Thursday" },
  { value: "FR", label: "Friday" },
  { value: "SA", label: "Saturday" },
]

const NTH_OPTIONS = [
  { value: "", label: "Every" },
  { value: "1", label: "1st" },
  { value: "2", label: "2nd" },
  { value: "3", label: "3rd" },
  { value: "4", label: "4th" },
]

function parseRecurrenceRule(rule: string | null): ParsedRule {
  if (!rule) return { freq: "WEEKLY", byDay: "FR", nthWeek: "", except: [], until: "" }

  const parts: Record<string, string> = {}
  for (const seg of rule.split(";")) {
    const [k, v] = seg.split("=")
    if (k && v) parts[k.trim().toUpperCase()] = v.trim()
  }

  const byDayRaw = parts.BYDAY || "FR"
  const nthMatch = byDayRaw.match(/^(\d)([A-Z]{2})$/)

  return {
    freq: parts.FREQ || "WEEKLY",
    byDay: nthMatch ? nthMatch[2] : byDayRaw,
    nthWeek: nthMatch ? nthMatch[1] : "",
    except: parts.EXCEPT ? parts.EXCEPT.split(",").map(d => d.trim()) : [],
    until: parts.UNTIL || "",
  }
}

function buildRecurrenceRule(parsed: ParsedRule): string {
  const byDay = parsed.freq === "MONTHLY" && parsed.nthWeek
    ? `${parsed.nthWeek}${parsed.byDay}`
    : parsed.byDay

  let rule = `FREQ=${parsed.freq};BYDAY=${byDay}`
  if (parsed.except.length > 0) rule += `;EXCEPT=${parsed.except.join(",")}`
  if (parsed.until) rule += `;UNTIL=${parsed.until}`
  return rule
}

function formatTime(time: string | null): string {
  if (!time) return ""
  const [h, m] = time.split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`
}

function describeRule(rule: string | null): string {
  if (!rule) return "No schedule set"
  const p = parseRecurrenceRule(rule)
  const dayLabel = DAY_OPTIONS.find(d => d.value === p.byDay)?.label || p.byDay
  const nthLabel = NTH_OPTIONS.find(n => n.value === p.nthWeek)?.label || ""

  if (p.freq === "WEEKLY") {
    const desc = `Every ${dayLabel}`
    const parts = [desc]
    if (p.except.length > 0) parts.push(`(${p.except.length} exception${p.except.length > 1 ? "s" : ""})`)
    if (p.until) parts.push(`until ${p.until}`)
    return parts.join(" ")
  }
  if (p.freq === "MONTHLY") {
    const desc = `${nthLabel} ${dayLabel} of each month`
    const parts = [desc]
    if (p.except.length > 0) parts.push(`(${p.except.length} exception${p.except.length > 1 ? "s" : ""})`)
    if (p.until) parts.push(`until ${p.until}`)
    return parts.join(" ")
  }
  return rule
}

export function EventSchedulePanel() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRule, setEditRule] = useState<ParsedRule>({ freq: "WEEKLY", byDay: "FR", nthWeek: "", except: [], until: "" })
  const [editTime, setEditTime] = useState("")
  const [saving, setSaving] = useState(false)
  const [newExceptDate, setNewExceptDate] = useState("")
  const [rangeFrom, setRangeFrom] = useState("")
  const [rangeTo, setRangeTo] = useState("")

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const [eventsRes, typesRes] = await Promise.all([
      supabase.from("events").select("id, title, recurrence_rule, default_time, is_active, event_type_id")
        .order("title")
        .returns<{ id: string; title: string; recurrence_rule: string | null; default_time: string | null; is_active: boolean; event_type_id: string }[]>(),
      supabase.from("event_types").select("id, name, color_scheme")
        .returns<{ id: string; name: string; color_scheme: { primary: string } | null }[]>(),
    ])

    const typeMap = new Map((typesRes.data ?? []).map(t => [t.id, t]))

    const rows: EventRow[] = (eventsRes.data ?? []).map(e => {
      const et = typeMap.get(e.event_type_id)
      return {
        id: e.id,
        title: e.title,
        recurrence_rule: e.recurrence_rule,
        default_time: e.default_time,
        is_active: e.is_active,
        event_type_name: et?.name ?? "unknown",
        event_type_color: et?.color_scheme?.primary ?? "#6B7280",
      }
    })

    setEvents(rows)
    setLoading(false)
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  function startEditing(event: EventRow) {
    setEditingId(event.id)
    setEditRule(parseRecurrenceRule(event.recurrence_rule))
    setEditTime(event.default_time || "")
    setNewExceptDate("")
  }

  function cancelEditing() {
    setEditingId(null)
    setNewExceptDate("")
  }

  async function handleSave(event: EventRow) {
    setSaving(true)
    try {
      const supabase = createClient()
      const rule = buildRecurrenceRule(editRule)

      const { error } = await supabase
        .from("events")
        .update({
          recurrence_rule: rule,
          default_time: editTime || null,
        } as never)
        .eq("id", event.id)

      if (error) {
        toast.error(`Failed: ${error.message}`)
      } else {
        toast.success(`Schedule updated for "${event.title}"`)
        logAudit("event_schedule_updated", "events", event.id, { recurrence_rule: rule })
        setEditingId(null)
        fetchEvents()
      }
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(event: EventRow) {
    const supabase = createClient()
    const { error } = await supabase
      .from("events")
      .update({ is_active: !event.is_active } as never)
      .eq("id", event.id)

    if (error) {
      toast.error(`Failed: ${error.message}`)
    } else {
      toast.success(`"${event.title}" ${event.is_active ? "paused" : "activated"}`)
      logAudit("event_toggled", "events", event.id, { is_active: !event.is_active })
      fetchEvents()
    }
  }

  function addException() {
    if (!newExceptDate) return
    if (editRule.except.includes(newExceptDate)) {
      toast.error("Date already excluded")
      return
    }
    setEditRule(prev => ({
      ...prev,
      except: [...prev.except, newExceptDate].sort(),
    }))
    setNewExceptDate("")
  }

  function removeException(date: string) {
    setEditRule(prev => ({
      ...prev,
      except: prev.except.filter(d => d !== date),
    }))
  }

  function addExceptionRange() {
    if (!rangeFrom || !rangeTo) return
    const from = new Date(rangeFrom + "T00:00:00")
    const to = new Date(rangeTo + "T00:00:00")
    if (isAfter(from, to)) {
      toast.error("Start date must be before end date")
      return
    }

    const targetDow = DAY_MAP[editRule.byDay]
    const newDates: string[] = []
    let d = new Date(from)
    const currentDow = d.getDay()
    const diff = (targetDow - currentDow + 7) % 7
    d = addDays(d, diff)

    if (editRule.freq === "WEEKLY") {
      while (!isAfter(d, to)) {
        const iso = format(d, "yyyy-MM-dd")
        if (!editRule.except.includes(iso)) newDates.push(iso)
        d = addDays(d, 7)
      }
    } else {
      // For monthly, just add every occurrence of that day in range
      while (!isAfter(d, to)) {
        const iso = format(d, "yyyy-MM-dd")
        if (!editRule.except.includes(iso)) newDates.push(iso)
        d = addDays(d, 7)
      }
    }

    if (newDates.length === 0) {
      toast.error("No matching dates found in range")
      return
    }

    setEditRule(prev => ({
      ...prev,
      except: [...prev.except, ...newDates].sort(),
    }))
    setRangeFrom("")
    setRangeTo("")
    toast.success(`Added ${newDates.length} skip date${newDates.length > 1 ? "s" : ""}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground">
          Manage recurring event schedules. Set frequency, day, exceptions (vacation/holidays), and end dates.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="size-5" />
            Recurring Events
          </CardTitle>
          <CardDescription>
            {events.length} event{events.length !== 1 ? "s" : ""} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No events configured. Events are created from the database.
            </p>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={`rounded-lg border p-4 transition-colors ${
                    !event.is_active ? "opacity-50" : ""
                  } ${editingId === event.id ? "ring-2 ring-primary/30" : ""}`}
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: event.event_type_color }}
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {describeRule(event.recurrence_rule)}
                          {event.default_time && ` at ${formatTime(event.default_time)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        size="sm"
                        checked={event.is_active}
                        onCheckedChange={() => toggleActive(event)}
                      />
                      {editingId !== event.id ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditing(event)}
                        >
                          Edit Schedule
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={cancelEditing}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Exception badges (read-only when not editing) */}
                  {editingId !== event.id && parseRecurrenceRule(event.recurrence_rule).except.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {parseRecurrenceRule(event.recurrence_rule).except.map(date => (
                        <Badge key={date} variant="outline" className="text-[10px] text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800">
                          Skip {date}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Edit form */}
                  {editingId === event.id && (
                    <div className="mt-4 space-y-4 border-t pt-4">
                      {/* Frequency + Day */}
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label>Frequency</Label>
                          <Select
                            value={editRule.freq}
                            onValueChange={(v) => setEditRule(prev => ({ ...prev, freq: v ?? "WEEKLY", nthWeek: v === "MONTHLY" ? "1" : "" }))}
>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="WEEKLY">Weekly</SelectItem>
                              <SelectItem value="MONTHLY">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {editRule.freq === "MONTHLY" && (
                          <div className="space-y-1.5">
                            <Label>Which week</Label>
                            <Select
                              value={editRule.nthWeek || "1"}
                              onValueChange={(v) => setEditRule(prev => ({ ...prev, nthWeek: v ?? "1" }))}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {NTH_OPTIONS.filter(n => n.value).map(n => (
                                  <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <Label>Day</Label>
                          <Select
                            value={editRule.byDay}
                            onValueChange={(v) => setEditRule(prev => ({ ...prev, byDay: v ?? "FR" }))}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {DAY_OPTIONS.map(d => (
                                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Default time + Until */}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="evt-time">Default Time</Label>
                          <Input
                            id="evt-time"
                            type="time"
                            value={editTime}
                            onChange={(e) => setEditTime(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="evt-until">End Date (optional)</Label>
                          <Input
                            id="evt-until"
                            type="date"
                            value={editRule.until}
                            onChange={(e) => setEditRule(prev => ({ ...prev, until: e.target.value }))}
                          />
                          {editRule.until && (
                            <button
                              type="button"
                              className="text-[11px] text-muted-foreground hover:text-foreground"
                              onClick={() => setEditRule(prev => ({ ...prev, until: "" }))}
                            >
                              Clear end date
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Exception dates */}
                      <div className="space-y-3">
                        <Label>Skip Dates (vacations, holidays)</Label>
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Add a single date:</p>
                          <div className="flex items-center gap-2">
                            <Input
                              type="date"
                              value={newExceptDate}
                              onChange={(e) => setNewExceptDate(e.target.value)}
                              className="w-44"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={addException}
                              disabled={!newExceptDate}
                            >
                              <Plus className="size-3.5" />
                              Add
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">
                            Or skip a date range (adds all {DAY_OPTIONS.find(d => d.value === editRule.byDay)?.label || "event"}s in range):
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Input
                              type="date"
                              value={rangeFrom}
                              onChange={(e) => setRangeFrom(e.target.value)}
                              className="w-40"
                              placeholder="From"
                            />
                            <span className="text-xs text-muted-foreground">to</span>
                            <Input
                              type="date"
                              value={rangeTo}
                              onChange={(e) => setRangeTo(e.target.value)}
                              className="w-40"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={addExceptionRange}
                              disabled={!rangeFrom || !rangeTo}
                            >
                              <Plus className="size-3.5" />
                              Add Range
                            </Button>
                          </div>
                        </div>
                        {editRule.except.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {editRule.except.map(date => {
                              const d = new Date(date + "T00:00:00")
                              return (
                                <Badge
                                  key={date}
                                  variant="secondary"
                                  className="gap-1 pr-1"
                                >
                                  {format(d, "EEE, MMM d, yyyy")}
                                  <button
                                    type="button"
                                    onClick={() => removeException(date)}
                                    className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20"
                                  >
                                    <X className="size-3" />
                                  </button>
                                </Badge>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No exceptions — event occurs every scheduled date.</p>
                        )}
                      </div>

                      {/* Preview + Save */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <p className="text-xs text-muted-foreground">
                          Preview: {describeRule(buildRecurrenceRule(editRule))}
                          {editTime && ` at ${formatTime(editTime)}`}
                        </p>
                        <Button
                          size="sm"
                          onClick={() => handleSave(event)}
                          disabled={saving}
                        >
                          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                          Save Schedule
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
