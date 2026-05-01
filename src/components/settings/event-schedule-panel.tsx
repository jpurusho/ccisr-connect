"use client"
// @deprecated — scheduling moved to calendar page (src/app/(dashboard)/calendar/page.tsx)

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { format, addDays, isAfter } from "date-fns"
import { logAudit } from "@/lib/audit"
import {
  type RecurrenceFields,
  DAY_MAP,
  DAY_OPTIONS,
  NTH_OPTIONS,
  parseRecurrenceRule,
  buildRecurrenceRule,
  describeRule,
  formatTime,
} from "@/lib/recurrence"
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

// ParsedRule is now RecurrenceFields from @/lib/recurrence
type ParsedRule = RecurrenceFields

export function EventSchedulePanel() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [eventTypes, setEventTypes] = useState<{ id: string; name: string; is_active: boolean; default_template_id: string | null; color_scheme: { primary: string } | null }[]>([])
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingType, setCreatingType] = useState(false)
  const [newTypeName, setNewTypeName] = useState("")
  const [newTypeTemplateId, setNewTypeTemplateId] = useState("")
  const [newTypeColor, setNewTypeColor] = useState("#6B7280")
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null)
  const [editTypeName, setEditTypeName] = useState("")
  const [editTypeTemplateId, setEditTypeTemplateId] = useState("")
  const [editTypeColor, setEditTypeColor] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRule, setEditRule] = useState<ParsedRule>({ freq: "WEEKLY", byDay: "FR", nthWeek: "", except: [], until: "" })
  const [editTime, setEditTime] = useState("")
  const [saving, setSaving] = useState(false)
  const [newExceptDate, setNewExceptDate] = useState("")
  const [rangeFrom, setRangeFrom] = useState("")
  const [rangeTo, setRangeTo] = useState("")
  const [creating, setCreating] = useState(false)
  const [newEvent, setNewEvent] = useState({ title: "", eventTypeId: "", freq: "WEEKLY", byDay: "FR", nthWeek: "", time: "" })

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const [eventsRes, typesRes, templatesRes] = await Promise.all([
      supabase.from("events").select("id, title, recurrence_rule, default_time, is_active, event_type_id")
        .order("title")
        .returns<{ id: string; title: string; recurrence_rule: string | null; default_time: string | null; is_active: boolean; event_type_id: string }[]>(),
      supabase.from("event_types").select("id, name, color_scheme, is_active, default_template_id")
        .order("name")
        .returns<{ id: string; name: string; color_scheme: { primary: string } | null; is_active: boolean; default_template_id: string | null }[]>(),
      supabase.from("email_templates").select("id, name")
        .order("name")
        .returns<{ id: string; name: string }[]>(),
    ])

    const types = typesRes.data ?? []
    setEventTypes(types)
    setTemplates(templatesRes.data ?? [])
    const typeMap = new Map(types.map(t => [t.id, t]))

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

  async function handleCreateType() {
    if (!newTypeName.trim()) { toast.error("Name is required"); return }
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("event_types").insert({
        name: newTypeName.trim(),
        default_template_id: newTypeTemplateId || null,
        color_scheme: { primary: newTypeColor },
        is_active: true,
      } as never)
      if (error) toast.error(`Failed: ${error.message}`)
      else {
        toast.success(`Event type "${newTypeName}" created`)
        logAudit("event_type_created", "event_types", null, { name: newTypeName })
        setCreatingType(false)
        setNewTypeName("")
        setNewTypeTemplateId("")
        setNewTypeColor("#6B7280")
        fetchEvents()
      }
    } finally { setSaving(false) }
  }

  async function handleUpdateType(id: string) {
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("event_types").update({
        name: editTypeName.trim(),
        default_template_id: editTypeTemplateId || null,
        color_scheme: { primary: editTypeColor },
      } as never).eq("id", id)
      if (error) toast.error(`Failed: ${error.message}`)
      else {
        toast.success("Event type updated")
        logAudit("event_type_updated", "event_types", id, { name: editTypeName })
        setEditingTypeId(null)
        fetchEvents()
      }
    } finally { setSaving(false) }
  }

  async function handleToggleType(id: string, currentActive: boolean) {
    const supabase = createClient()
    const { error } = await supabase.from("event_types").update({ is_active: !currentActive } as never).eq("id", id)
    if (error) toast.error(`Failed: ${error.message}`)
    else {
      toast.success(`Event type ${currentActive ? "deactivated" : "activated"}`)
      logAudit("event_type_toggled", "event_types", id, { is_active: !currentActive })
      fetchEvents()
    }
  }

  async function handleCreate() {
    if (!newEvent.title.trim() || !newEvent.eventTypeId) {
      toast.error("Title and event type are required")
      return
    }
    setSaving(true)
    try {
      const supabase = createClient()
      const byDay = newEvent.freq === "MONTHLY" && newEvent.nthWeek
        ? `${newEvent.nthWeek}${newEvent.byDay}`
        : newEvent.byDay
      const rule = `FREQ=${newEvent.freq};BYDAY=${byDay}`

      const { error } = await supabase.from("events").insert({
        title: newEvent.title.trim(),
        event_type_id: newEvent.eventTypeId,
        recurrence_rule: rule,
        default_time: newEvent.time || null,
        is_active: true,
      } as never)

      if (error) {
        toast.error(`Failed: ${error.message}`)
      } else {
        toast.success(`"${newEvent.title}" created`)
        logAudit("event_created", "events", null, { title: newEvent.title })
        setCreating(false)
        setNewEvent({ title: "", eventTypeId: "", freq: "WEEKLY", byDay: "FR", nthWeek: "", time: "" })
        fetchEvents()
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(event: EventRow) {
    if (!confirm(`Delete "${event.title}"? This will remove the event and its schedule.`)) return
    const supabase = createClient()
    const { error } = await supabase.from("events").delete().eq("id", event.id)
    if (error) {
      toast.error(`Failed: ${error.message}`)
    } else {
      toast.success(`"${event.title}" deleted`)
      logAudit("event_deleted", "events", event.id, { title: event.title })
      fetchEvents()
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

  const activeTypes = eventTypes.filter(t => t.is_active)
  const inactiveTypes = eventTypes.filter(t => !t.is_active)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground">
          Manage event types, associate templates, and set recurring schedules.
        </p>
      </div>

      {/* ── Event Types ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Event Types</CardTitle>
              <CardDescription>
                Define event categories and link them to email templates.
              </CardDescription>
            </div>
            {!creatingType && (
              <Button size="sm" onClick={() => setCreatingType(true)}>
                <Plus className="size-3.5" />
                Add Type
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {creatingType && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="nt-name">Name *</Label>
                  <Input
                    id="nt-name"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder="e.g., Youth Meeting"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email Template</Label>
                  <Select value={newTypeTemplateId} onValueChange={(val) => setNewTypeTemplateId(val ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="None">{templates.find(t => t.id === newTypeTemplateId)?.name || "None"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <div className="flex items-center gap-2">
                  {["#7C3AED", "#0D9488", "#D97706", "#DB2777", "#059669", "#4F46E5", "#DC2626", "#6B7280"].map(c => (
                    <button key={c} type="button" className={`size-6 rounded-full border-2 transition-transform hover:scale-110 ${newTypeColor === c ? "border-foreground scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} onClick={() => setNewTypeColor(c)} />
                  ))}
                  <Input type="color" value={newTypeColor} onChange={(e) => setNewTypeColor(e.target.value)} className="h-6 w-8 cursor-pointer rounded border-0 p-0" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreateType} disabled={saving || !newTypeName.trim()}>
                  {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                  Create
                </Button>
                <Button size="sm" variant="outline" onClick={() => setCreatingType(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {activeTypes.map(et => {
            const tmpl = templates.find(t => t.id === et.default_template_id)
            const isEditing = editingTypeId === et.id
            return (
              <div key={et.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: et.color_scheme?.primary || "#6B7280" }} />
                {isEditing ? (
                  <div className="flex-1 space-y-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Name</Label>
                        <Input value={editTypeName} onChange={(e) => setEditTypeName(e.target.value)} placeholder="Name" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Email Template</Label>
                        <Select value={editTypeTemplateId} onValueChange={(val) => setEditTypeTemplateId(val ?? "")}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="None">{templates.find(t => t.id === editTypeTemplateId)?.name || "None"}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Color</Label>
                      <div className="flex items-center gap-2">
                        {["#7C3AED", "#0D9488", "#D97706", "#DB2777", "#059669", "#4F46E5", "#DC2626", "#6B7280"].map(c => (
                          <button key={c} type="button" className={`size-5 rounded-full border-2 transition-transform hover:scale-110 ${editTypeColor === c ? "border-foreground scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} onClick={() => setEditTypeColor(c)} />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleUpdateType(et.id)} disabled={saving}>
                        {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingTypeId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{et.name}</p>
                      {tmpl && <p className="text-xs text-muted-foreground truncate">Template: {tmpl.name}</p>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setEditingTypeId(et.id); setEditTypeName(et.name); setEditTypeTemplateId(et.default_template_id || ""); setEditTypeColor(et.color_scheme?.primary || "#6B7280") }}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleToggleType(et.id, true)} className="text-muted-foreground hover:text-destructive" title="Deactivate">
                      <X className="size-3.5" />
                    </Button>
                  </>
                )}
              </div>
            )
          })}

          {inactiveTypes.length > 0 && (
            <div className="pt-2 space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Inactive</p>
              {inactiveTypes.map(et => (
                <div key={et.id} className="flex items-center gap-3 rounded-lg border border-dashed px-3 py-2 opacity-60">
                  <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: et.color_scheme?.primary || "#6B7280" }} />
                  <p className="flex-1 text-sm truncate">{et.name}</p>
                  <Button variant="outline" size="sm" onClick={() => handleToggleType(et.id, false)}>
                    Reactivate
                  </Button>
                </div>
              ))}
            </div>
          )}

          {activeTypes.length === 0 && !creatingType && (
            <p className="text-sm text-muted-foreground text-center py-4">No event types defined yet.</p>
          )}
        </CardContent>
      </Card>

      {/* ── Recurring Events ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="size-5" />
                Recurring Events
              </CardTitle>
              <CardDescription>
                {events.length} event{events.length !== 1 ? "s" : ""} configured
              </CardDescription>
            </div>
            {!creating && (
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus className="size-3.5" />
                Add Event
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {creating && (
            <div className="mb-4 rounded-lg border bg-muted/30 p-4 space-y-3">
              <p className="text-sm font-semibold">New Event</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ne-title">Title *</Label>
                  <Input
                    id="ne-title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Youth Bible Study"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ne-type">Event Type *</Label>
                  <Select
                    value={newEvent.eventTypeId}
                    onValueChange={(val) => setNewEvent((prev) => ({ ...prev, eventTypeId: val ?? "" }))}
                  >
                    <SelectTrigger id="ne-type" className="w-full">
                      <SelectValue placeholder="Select type...">{activeTypes.find((t) => t.id === newEvent.eventTypeId)?.name || "Select type..."}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {activeTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Frequency</Label>
                  <Select
                    value={newEvent.freq}
                    onValueChange={(val) => setNewEvent((prev) => ({ ...prev, freq: val ?? "WEEKLY", nthWeek: val === "WEEKLY" ? "" : prev.nthWeek }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Day</Label>
                  <Select
                    value={newEvent.byDay}
                    onValueChange={(val) => setNewEvent((prev) => ({ ...prev, byDay: val ?? "FR" }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAY_OPTIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {newEvent.freq === "MONTHLY" && (
                  <div className="space-y-1.5">
                    <Label>Which</Label>
                    <Select
                      value={newEvent.nthWeek}
                      onValueChange={(val) => setNewEvent((prev) => ({ ...prev, nthWeek: val ?? "" }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NTH_OPTIONS.map((n) => (
                          <SelectItem key={n.value || "every"} value={n.value || "every"}>{n.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="ne-time">Default Time</Label>
                  <Input
                    id="ne-time"
                    type="time"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent((prev) => ({ ...prev, time: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleCreate} disabled={saving || !newEvent.title.trim() || !newEvent.eventTypeId}>
                  {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                  Create
                </Button>
                <Button size="sm" variant="outline" onClick={() => setCreating(false)} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
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
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditing(event)}
                          >
                            Edit Schedule
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(event)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </>
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
