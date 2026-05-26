"use client"

import { useEffect, useState, useCallback } from "react"
import { format, addDays, isAfter } from "date-fns"
import { createClient } from "@/lib/supabase/client"
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
  dayCodeFromDate,
} from "@/lib/recurrence"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Plus, X, CalendarDays } from "lucide-react"

interface EventFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  initialDate?: Date | null
  eventId?: string | null
  onSuccess?: () => void
}

interface EventTypeOption {
  id: string
  name: string
  color: string
}

interface FamilyOption {
  id: string
  family_name: string
}

const EMPTY_RULE: RecurrenceFields = { freq: "WEEKLY", byDay: "FR", nthWeek: "", except: [], until: "" }

export function EventFormDialog({
  open,
  onOpenChange,
  mode,
  initialDate,
  eventId,
  onSuccess,
}: EventFormDialogProps) {
  const [title, setTitle] = useState("")
  const [eventTypeId, setEventTypeId] = useState("")
  const [time, setTime] = useState("")
  const [recurrenceFreq, setRecurrenceFreq] = useState<"NONE" | "WEEKLY" | "MONTHLY">("WEEKLY")
  const [recurrenceDay, setRecurrenceDay] = useState("FR")
  const [recurrenceNth, setRecurrenceNth] = useState("")
  const [exceptDates, setExceptDates] = useState<string[]>([])
  const [untilDate, setUntilDate] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [hostFamilyId, setHostFamilyId] = useState("")
  const [hostUntil, setHostUntil] = useState("")
  const [description, setDescription] = useState("")
  const [zoomLink, setZoomLink] = useState("")

  const [eventTypes, setEventTypes] = useState<EventTypeOption[]>([])
  const [families, setFamilies] = useState<FamilyOption[]>([])
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const [newExceptDate, setNewExceptDate] = useState("")
  const [rangeFrom, setRangeFrom] = useState("")
  const [rangeTo, setRangeTo] = useState("")

  const resetForm = useCallback(() => {
    setTitle("")
    setEventTypeId("")
    setTime("")
    setRecurrenceFreq("WEEKLY")
    setRecurrenceDay(initialDate ? dayCodeFromDate(initialDate) : "FR")
    setRecurrenceNth("")
    setExceptDates([])
    setUntilDate("")
    setStartDate(initialDate ? format(initialDate, "yyyy-MM-dd") : "")
    setEndDate("")
    setHostFamilyId("")
    setHostUntil("")
    setDescription("")
    setZoomLink("")
    setNewExceptDate("")
    setRangeFrom("")
    setRangeTo("")
    setLoaded(false)
  }, [initialDate])

  useEffect(() => {
    if (!open) return
    resetForm()

    const supabase = createClient()

    async function loadData() {
      const [typesRes, familiesRes] = await Promise.all([
        supabase
          .from("event_types")
          .select("id, name, color_scheme, is_active")
          .eq("is_active", true)
          .order("name")
          .returns<{ id: string; name: string; color_scheme: { primary: string } | null; is_active: boolean }[]>(),
        supabase
          .from("families")
          .select("id, family_name")
          .eq("is_active", true)
          .order("family_name")
          .returns<FamilyOption[]>(),
      ])

      setEventTypes(
        (typesRes.data ?? []).map((t) => ({
          id: t.id,
          name: t.name,
          color: t.color_scheme?.primary ?? "#6B7280",
        }))
      )
      setFamilies(familiesRes.data ?? [])

      if (mode === "edit" && eventId) {
        type EventRow = {
          id: string; title: string; event_type_id: string; description: string | null
          recurrence_rule: string | null; default_time: string | null; zoom_link: string | null
          host_family_id: string | null; host_until: string | null
          start_date: string | null; end_date: string | null; is_active: boolean
        }
        const { data: event } = await supabase
          .from("events")
          .select("*")
          .eq("id", eventId)
          .returns<EventRow[]>()
          .single()

        if (event) {
          setTitle(event.title ?? "")
          setEventTypeId(event.event_type_id ?? "")
          setTime(event.default_time ?? "")
          setDescription(event.description ?? "")
          setZoomLink(event.zoom_link ?? "")
          setHostFamilyId(event.host_family_id ?? "")
          setHostUntil(event.host_until ?? "")
          setStartDate(event.start_date ?? "")
          setEndDate(event.end_date ?? "")

          if (event.recurrence_rule) {
            const parsed = parseRecurrenceRule(event.recurrence_rule)
            setRecurrenceFreq(parsed.freq as "WEEKLY" | "MONTHLY")
            setRecurrenceDay(parsed.byDay)
            setRecurrenceNth(parsed.nthWeek)
            setExceptDates(parsed.except)
            setUntilDate(parsed.until)
          } else {
            setRecurrenceFreq("NONE")
          }
        }
      } else if (mode === "create" && initialDate) {
        setRecurrenceDay(dayCodeFromDate(initialDate))
      }

      setLoaded(true)
    }

    loadData()
  }, [open, mode, eventId, initialDate, resetForm])

  async function handleSave() {
    if (!title.trim()) { toast.error("Title is required"); return }
    if (!eventTypeId) { toast.error("Event type is required"); return }

    setSaving(true)
    try {
      const supabase = createClient()

      let recurrenceRule: string | null = null
      if (recurrenceFreq !== "NONE") {
        recurrenceRule = buildRecurrenceRule({
          freq: recurrenceFreq,
          byDay: recurrenceDay,
          nthWeek: recurrenceNth,
          except: exceptDates,
          until: untilDate,
        })
      }

      const payload = {
        title: title.trim(),
        event_type_id: eventTypeId,
        recurrence_rule: recurrenceRule,
        default_time: time || null,
        description: description.trim() || null,
        zoom_link: zoomLink.trim() || null,
        host_family_id: recurrenceFreq !== "NONE" && hostFamilyId && hostFamilyId !== "none" ? hostFamilyId : null,
        host_until: recurrenceFreq !== "NONE" && hostFamilyId && hostFamilyId !== "none" && hostUntil ? hostUntil : null,
        start_date: recurrenceFreq === "NONE" && startDate ? startDate : null,
        end_date: recurrenceFreq === "NONE" && endDate ? endDate : null,
        is_active: true,
      }

      // Check for conflicts on the same date (one-time events only)
      if (mode === "create" && recurrenceFreq === "NONE" && startDate) {
        const { data: conflicts } = await supabase
          .from("event_instances")
          .select("id, events(title)")
          .eq("instance_date", startDate)
          .returns<{ id: string; events: { title: string } | null }[]>()

        if (conflicts && conflicts.length > 0) {
          const names = conflicts.map((c) => c.events?.title).filter(Boolean).join(", ")
          if (!confirm(`There are existing events on this date: ${names}.\n\nDid you mean to cancel one of those instead? Click OK to create anyway, or Cancel to go back.`)) {
            setSaving(false)
            return
          }
        }
      }

      if (mode === "edit" && eventId) {
        const { error } = await supabase
          .from("events")
          .update(payload as never)
          .eq("id", eventId)

        if (error) { toast.error(`Failed: ${error.message}`); return }
        toast.success(`"${title}" updated`)
        const etName = eventTypes.find((t) => t.id === eventTypeId)?.name
        logAudit("event_updated", "events", eventId, { title: title.trim(), event_type: etName, recurrence: recurrenceFreq !== "NONE" ? recurrenceFreq : undefined })
      } else {
        const { data, error } = await supabase
          .from("events")
          .insert(payload as never)
          .select("id")
          .returns<{ id: string }[]>()
          .single()

        if (error) { toast.error(`Failed: ${error.message}`); return }

        // For one-time events, also create an instance row so it appears in queries
        if (recurrenceFreq === "NONE" && startDate && data?.id) {
          const { error: instError } = await supabase.from("event_instances").insert({
            event_id: data.id,
            instance_date: startDate,
            instance_time: time || null,
            status: "confirmed",
          } as never)
          if (instError) {
            toast.error(`Event created but instance failed: ${instError.message}`)
          }
        }

        toast.success(`"${title}" created`)
        const etName = eventTypes.find((t) => t.id === eventTypeId)?.name
        logAudit("event_created", "events", data?.id ?? null, { title: title.trim(), event_type: etName, recurrence: recurrenceFreq !== "NONE" ? recurrenceFreq : undefined })
      }

      onSuccess?.()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!eventId) return
    if (!confirm(`Delete "${title}"? This removes the event and all its instances.`)) return

    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("events").delete().eq("id", eventId)
      if (error) { toast.error(`Failed: ${error.message}`); return }
      toast.success(`"${title}" deleted`)
      logAudit("event_deleted", "events", eventId, { title })
      onSuccess?.()
    } finally {
      setSaving(false)
    }
  }

  function addException() {
    if (!newExceptDate) return
    if (exceptDates.includes(newExceptDate)) { toast.error("Date already excluded"); return }
    setExceptDates((prev) => [...prev, newExceptDate].sort())
    setNewExceptDate("")
  }

  function removeException(date: string) {
    setExceptDates((prev) => prev.filter((d) => d !== date))
  }

  function addExceptionRange() {
    if (!rangeFrom || !rangeTo) return
    const from = new Date(rangeFrom + "T00:00:00")
    const to = new Date(rangeTo + "T00:00:00")
    if (isAfter(from, to)) { toast.error("Start must be before end"); return }

    const targetDow = DAY_MAP[recurrenceDay]
    const newDates: string[] = []
    let d = new Date(from)
    const diff = (targetDow - d.getDay() + 7) % 7
    d = addDays(d, diff)

    while (!isAfter(d, to)) {
      const iso = format(d, "yyyy-MM-dd")
      if (!exceptDates.includes(iso)) newDates.push(iso)
      d = addDays(d, 7)
    }

    if (newDates.length === 0) { toast.error("No matching dates in range"); return }
    setExceptDates((prev) => [...prev, ...newDates].sort())
    setRangeFrom("")
    setRangeTo("")
    toast.success(`Added ${newDates.length} skip date${newDates.length > 1 ? "s" : ""}`)
  }

  const previewRule = recurrenceFreq !== "NONE"
    ? describeRule(buildRecurrenceRule({ freq: recurrenceFreq, byDay: recurrenceDay, nthWeek: recurrenceNth, except: exceptDates, until: untilDate }))
    : startDate && endDate ? `${startDate} to ${endDate}` : startDate ? `Single day: ${startDate}` : "Set a date"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <CalendarDays className="size-4 text-primary" />
            </div>
            <div>
              <SheetTitle>{mode === "create" ? "Create Event" : "Edit Event"}</SheetTitle>
              {mode === "create" && initialDate && (
                <SheetDescription>
                  {format(initialDate, "EEEE, MMMM d, yyyy")}
                </SheetDescription>
              )}
            </div>
          </div>
        </SheetHeader>

        {!loaded ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Title + Event Type */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ef-title">Title *</Label>
                <Input
                  id="ef-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Friday Bible Study"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Event Type *</Label>
                <Select value={eventTypeId} onValueChange={(v) => setEventTypeId(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type...">
                      {eventTypes.find((t) => t.id === eventTypeId)?.name || "Select type..."}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <span className="flex items-center gap-2">
                          <span className="size-2 rounded-full" style={{ backgroundColor: t.color }} />
                          {t.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Time */}
            <div className="space-y-1.5">
              <Label htmlFor="ef-time">Default Time</Label>
              <Input
                id="ef-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-40"
              />
            </div>

            {/* Recurrence */}
            <div className="space-y-3 rounded-lg border p-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recurrence
              </Label>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Frequency</Label>
                  <Select
                    value={recurrenceFreq}
                    onValueChange={(v) => {
                      const freq = (v ?? "WEEKLY") as "NONE" | "WEEKLY" | "MONTHLY"
                      setRecurrenceFreq(freq)
                      if (freq === "WEEKLY") setRecurrenceNth("")
                      if (freq === "MONTHLY" && !recurrenceNth) setRecurrenceNth("1")
                    }}
                  >
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">One-time / Date Range</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {recurrenceFreq !== "NONE" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Day</Label>
                    <Select value={recurrenceDay} onValueChange={(v) => setRecurrenceDay(v ?? "FR")}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DAY_OPTIONS.map((d) => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {recurrenceFreq === "MONTHLY" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Which week</Label>
                    <Select value={recurrenceNth || "1"} onValueChange={(v) => setRecurrenceNth(v ?? "1")}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {NTH_OPTIONS.filter((n) => n.value).map((n) => (
                          <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {recurrenceFreq === "NONE" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Start Date</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">End Date (optional)</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Leave blank for a single-day event.
                    </p>
                  </div>
                </div>
              )}

              {recurrenceFreq !== "NONE" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">End Date (optional)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={untilDate}
                        onChange={(e) => setUntilDate(e.target.value)}
                        className="w-44"
                      />
                      {untilDate && (
                        <button
                          type="button"
                          className="text-[11px] text-muted-foreground hover:text-foreground"
                          onClick={() => setUntilDate("")}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Exception dates */}
                  <div className="space-y-2">
                    <Label className="text-xs">Skip Dates</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={newExceptDate}
                        onChange={(e) => setNewExceptDate(e.target.value)}
                        className="w-44"
                      />
                      <Button variant="outline" size="sm" onClick={addException} disabled={!newExceptDate}>
                        <Plus className="size-3" />
                        Add
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} className="w-36" />
                      <span className="text-xs text-muted-foreground">to</span>
                      <Input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} className="w-36" />
                      <Button variant="outline" size="sm" onClick={addExceptionRange} disabled={!rangeFrom || !rangeTo}>
                        <Plus className="size-3" />
                        Range
                      </Button>
                    </div>
                    {exceptDates.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {exceptDates.map((date) => (
                          <Badge key={date} variant="secondary" className="gap-1 pr-1">
                            {format(new Date(date + "T00:00:00"), "MMM d, yyyy")}
                            <button type="button" onClick={() => removeException(date)} className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20">
                              <X className="size-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              <p className="text-xs text-muted-foreground">
                {previewRule}{time ? ` at ${formatTime(time)}` : ""}
              </p>
            </div>

            {/* Host Family — only for recurring events */}
            {recurrenceFreq !== "NONE" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Host Family</Label>
                  <Select value={hostFamilyId} onValueChange={(v) => setHostFamilyId(v ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="None">
                        {families.find((f) => f.id === hostFamilyId)?.family_name || "None"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {families.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.family_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {hostFamilyId && hostFamilyId !== "none" && (
                  <div className="space-y-1.5">
                    <Label>Host Until</Label>
                    <Input
                      type="date"
                      value={hostUntil}
                      onChange={(e) => setHostUntil(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      After this date, hosting clears automatically.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Description + Zoom */}
            <div className="space-y-1.5">
              <Label htmlFor="ef-desc">Description</Label>
              <Textarea
                id="ef-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional notes about this event..."
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ef-zoom">Zoom Link</Label>
              <Input
                id="ef-zoom"
                value={zoomLink}
                onChange={(e) => setZoomLink(e.target.value)}
                placeholder="https://zoom.us/j/..."
              />
            </div>
          </div>
        )}

        <SheetFooter>
          {mode === "edit" && (
            <Button variant="destructive" onClick={handleDelete} disabled={saving} className="sm:mr-auto">
              Delete Event
            </Button>
          )}
          <SheetClose render={<Button variant="outline" />}>Cancel</SheetClose>
          <Button onClick={handleSave} disabled={saving || !title.trim() || !eventTypeId}>
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {mode === "create" ? "Create" : "Save Changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
