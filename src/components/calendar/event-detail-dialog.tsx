"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { statusLabel } from "@/lib/date-utils"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CalendarDays,
  Clock,
  MapPin,
  Mail,
  StickyNote,
  Video,
  Cake,
  Heart,
  Users,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  ExternalLink,
  Ban,
  RotateCcw,
  PauseCircle,
  X,
} from "lucide-react"
import { toast } from "sonner"
import type { CalendarEvent } from "./types"

interface EventDetailDialogProps {
  event: CalendarEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (event: CalendarEvent) => void
  onEditInstance?: (event: CalendarEvent) => void
  onDelete?: (event: CalendarEvent) => void
  onCancelInstance?: (event: CalendarEvent) => void
  onRestoreInstance?: (event: CalendarEvent) => void
  onViewDispatchEmail?: (event: CalendarEvent) => void
  onDateUpdated?: () => void
}

const ET_TO_COMM: Record<string, string> = {
  birthday: "birthday",
  anniversary: "anniversary",
  friday_bible_study: "bible_study",
  wednesday_womens_study: "womens_study",
  monthly_prayer: "prayer_meeting",
  bulletin: "bulletin",
}

const statusColors: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  draft: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function daysInMonth(month: number): number {
  return new Date(2024, month, 0).getDate()
}

function DateEditInline({ event, onSaved }: { event: CalendarEvent; onSaved: () => void }) {
  const currentMonth = event.date.getMonth() + 1
  const currentDay = event.date.getDate()
  const [month, setMonth] = useState(currentMonth)
  const [day, setDay] = useState(currentDay)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)

  const maxDay = daysInMonth(month)
  const changed = month !== currentMonth || day !== currentDay

  async function save() {
    setSaving(true)
    const supabase = createClient()

    if (event.kind === "birthday" && event.memberId) {
      const { error } = await supabase
        .from("members")
        .update({ birth_month: month, birth_day: day } as never)
        .eq("id", event.memberId)
      if (error) {
        toast.error("Failed to update birthday")
      } else {
        toast.success("Birthday updated")
        setEditing(false)
        onSaved()
      }
    } else if (event.kind === "anniversary" && event.anniversaryId) {
      const { error } = await supabase
        .from("wedding_anniversaries")
        .update({ anniversary_month: month, anniversary_day: day } as never)
        .eq("id", event.anniversaryId)
      if (error) {
        toast.error("Failed to update anniversary")
      } else {
        toast.success("Anniversary updated")
        setEditing(false)
        onSaved()
      }
    }
    setSaving(false)
  }

  if (!editing) {
    return (
      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
        <Pencil className="size-3.5" />
        Edit Date
      </Button>
    )
  }

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Change date:</p>
      <div className="flex items-center gap-2">
        <Select value={String(month)} onValueChange={(v) => { setMonth(Number(v)); if (day > daysInMonth(Number(v))) setDay(daysInMonth(Number(v))) }}>
          <SelectTrigger className="h-8 text-xs w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(day)} onValueChange={(v) => setDay(Number(v))}>
          <SelectTrigger className="h-8 text-xs w-16">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: maxDay }, (_, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" className="h-7 text-xs" onClick={save} disabled={!changed || saving}>
          {saving ? <Loader2 className="size-3 animate-spin" /> : "Save"}
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditing(false); setMonth(currentMonth); setDay(currentDay) }}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ── Break Manager (for recurring events) ────────────────────────────────────

interface BreakRecord {
  id: string
  start_date: string
  end_date: string
  message: string | null
  location_id: string | null
}

interface EventLocation {
  id: string
  label: string
}

function BreakManager({ eventId, onBreakChanged }: { eventId: string; onBreakChanged?: () => void }) {
  const [breaks, setBreaks] = useState<BreakRecord[]>([])
  const [locations, setLocations] = useState<EventLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [message, setMessage] = useState("")
  const [locationId, setLocationId] = useState<string>("all")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadBreaks()
  }, [eventId])

  async function loadBreaks() {
    setLoading(true)
    const supabase = createClient()
    const [breaksRes, locsRes] = await Promise.all([
      supabase
        .from("event_breaks")
        .select("id, start_date, end_date, message, location_id, event_locations(label)")
        .eq("event_id", eventId)
        .order("start_date", { ascending: true })
        .returns<(BreakRecord & { event_locations: { label: string } | null })[]>(),
      supabase
        .from("event_locations")
        .select("id, label")
        .eq("event_id", eventId)
        .order("sort_order")
        .returns<EventLocation[]>(),
    ])
    setBreaks((breaksRes.data ?? []).map((b) => ({ ...b, loc_label: b.event_locations?.label ?? null })) as (BreakRecord & { loc_label?: string | null })[])
    setLocations(locsRes.data ?? [])
    setLoading(false)
  }

  async function handleSaveBreak() {
    if (!startDate || !endDate) { toast.error("Start and end dates are required"); return }
    if (endDate < startDate) { toast.error("End date must be after start date"); return }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from("event_breaks").insert({
      event_id: eventId,
      start_date: startDate,
      end_date: endDate,
      message: message.trim() || null,
      location_id: locationId === "all" ? null : locationId,
    } as never)
    if (error) {
      toast.error(`Failed: ${error.message}`)
    } else {
      toast.success("Break scheduled")
      setShowForm(false)
      setStartDate("")
      setEndDate("")
      setMessage("")
      setLocationId("all")
      loadBreaks()
      onBreakChanged?.()
    }
    setSaving(false)
  }

  async function handleDeleteBreak(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from("event_breaks").delete().eq("id", id)
    if (error) {
      toast.error(`Failed: ${error.message}`)
    } else {
      toast.success("Break removed")
      setBreaks((prev) => prev.filter((b) => b.id !== id))
      onBreakChanged?.()
    }
  }

  if (loading) return null

  return (
    <div className="space-y-2">
      {breaks.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-2 dark:border-amber-800 dark:bg-amber-950/20">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Scheduled Breaks</p>
          {breaks.map((brk) => (
            <div key={brk.id} className="flex items-center justify-between gap-2 text-sm">
              <div>
                <span className="font-medium">
                  {format(new Date(brk.start_date + "T00:00:00"), "MMM d")} – {format(new Date(brk.end_date + "T00:00:00"), "MMM d, yyyy")}
                </span>
                {brk.location_id && (
                  <span className="ml-1.5 text-xs rounded bg-amber-200/60 px-1.5 py-0.5 dark:bg-amber-800/40">
                    {(brk as BreakRecord & { loc_label?: string | null }).loc_label ?? "Location"}
                  </span>
                )}
                {!brk.location_id && locations.length > 0 && (
                  <span className="ml-1.5 text-xs text-amber-700 dark:text-amber-400">All locations</span>
                )}
                {brk.message && <span className="ml-2 text-muted-foreground text-xs">({brk.message})</span>}
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteBreak(brk.id)} title="Remove break">
                <X className="size-3.5 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="rounded-lg border p-3 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Schedule a Break</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          {locations.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">Location</Label>
              <Select value={locationId} onValueChange={(v) => setLocationId(v ?? "all")}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Message (optional)</Label>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g., Summer break"
              className="h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={handleSaveBreak} disabled={saving}>
              {saving ? <Loader2 className="size-3 animate-spin" /> : "Save Break"}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
          <PauseCircle className="size-3.5" />
          Schedule Break
        </Button>
      )}
    </div>
  )
}

export function EventDetailDialog({
  event,
  open,
  onOpenChange,
  onEdit,
  onEditInstance,
  onDelete,
  onCancelInstance,
  onRestoreInstance,
  onViewDispatchEmail,
  onDateUpdated,
}: EventDetailDialogProps) {
  if (!event) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {event.kind === "birthday" && (
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/40">
                <Cake className="size-4 text-purple-600 dark:text-purple-400" />
              </div>
            )}
            {event.kind === "anniversary" && (
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <Heart className="size-4 text-amber-600 dark:text-amber-400" />
              </div>
            )}
            {event.kind === "event" && (
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${event.color}20` }}
              >
                <CalendarDays
                  className="size-4"
                  style={{ color: event.color }}
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <DialogTitle>{event.title}</DialogTitle>
            </div>
          </div>
          {event.kind === "event" && event.eventTypeName && (
            <div className="mt-1">
              <Badge variant="secondary">{event.eventTypeName}</Badge>
              {event.status && (
                <span
                  className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[event.status] ?? ""}`}
                >
                  {statusLabel(event.status)}
                </span>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="space-y-3">
          {/* Date */}
          <div className="flex items-start gap-3 text-sm">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>{format(event.date, "EEEE, MMMM d, yyyy")}</span>
          </div>

          {/* Time */}
          {event.time && (
            <div className="flex items-start gap-3 text-sm">
              <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>{event.time}</span>
            </div>
          )}

          {/* Host family */}
          {event.hostFamily && (
            <div className="flex items-start gap-3 text-sm">
              <Users className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <span className="font-medium">
                  Host: {event.hostFamily.name}
                </span>
                {event.hostFamily.address && (
                  <p className="mt-0.5 text-muted-foreground">
                    {event.hostFamily.address}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Location override */}
          {event.location && (
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>{event.location}</span>
            </div>
          )}

          {/* Zoom link */}
          {event.zoomLink && (
            <div className="flex items-start gap-3 text-sm">
              <Video className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <a
                href={event.zoomLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                Join via Zoom
              </a>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              {event.description}
            </div>
          )}

          {/* Info sections from event type */}
          {event.infoSections && event.infoSections.length > 0 && (
            <div className="space-y-2">
              {event.infoSections.map((section, si) => (
                <div
                  key={si}
                  className="rounded-lg border p-3 space-y-1.5"
                  style={section.color ? { borderColor: section.color + "40", backgroundColor: section.color + "08" } : undefined}
                >
                  <p className="text-sm font-medium">
                    {section.emoji && <span className="mr-1.5">{section.emoji}</span>}
                    {section.title}
                  </p>
                  {section.entries.filter((e) => e.label || e.name).map((entry, ei) => (
                    <div key={ei} className="flex text-sm gap-2">
                      {entry.label && <span className="text-muted-foreground shrink-0">{entry.label}:</span>}
                      <span>{entry.name}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          {event.notes && (
            <div className="flex items-start gap-3 text-sm">
              <StickyNote className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">{event.notes}</span>
            </div>
          )}

          {/* Break management for recurring events */}
          {event.kind === "event" && event.eventId && event.recurrenceRule && (
            <BreakManager eventId={event.eventId} onBreakChanged={onDateUpdated} />
          )}

          {/* Birthday-specific info */}
          {event.kind === "birthday" && (
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-950/30">
              <p className="text-sm font-medium text-purple-900 dark:text-purple-200">
                Birthday Celebration
              </p>
              <p className="mt-0.5 text-sm text-purple-700 dark:text-purple-300">
                {event.title} - {format(event.date, "MMMM d")}
              </p>
              {event.memberId && (
                <DateEditInline event={event} onSaved={() => onDateUpdated?.()} />
              )}
            </div>
          )}

          {/* Anniversary-specific info */}
          {event.kind === "anniversary" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                Wedding Anniversary
              </p>
              <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-300">
                {event.title} - {format(event.date, "MMMM d")}
              </p>
              {event.anniversaryId && (
                <DateEditInline event={event} onSaved={() => onDateUpdated?.()} />
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          {event.kind === "event" && event.eventId && (
            <>
              {event.status === "cancelled" && event.instanceId ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRestoreInstance?.(event)}
                  className="sm:mr-auto"
                >
                  <RotateCcw className="size-3.5" />
                  Restore
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete?.(event)}
                  className="sm:mr-auto"
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              )}
              {event.status !== "cancelled" && event.instanceId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCancelInstance?.(event)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <Ban className="size-3.5" />
                  Cancel This Week
                </Button>
              )}
              {event.status !== "cancelled" && event.eventTypeName && ET_TO_COMM[event.eventTypeName] && (
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/dashboard?card=${ET_TO_COMM[event.eventTypeName]}`} />}
                >
                  <Mail className="size-3.5" />
                  Compose
                </Button>
              )}
              {event.status !== "cancelled" && event.recurrenceRule && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditInstance?.(event)}
                >
                  <Pencil className="size-3.5" />
                  Edit Date
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit?.(event)}
              >
                <CalendarDays className="size-3.5" />
                {event.recurrenceRule ? "Edit Series" : "Edit"}
              </Button>
            </>
          )}
          {event.kind === "birthday" && event.memberId && (
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/members/${event.memberId}`} />}
            >
              <ExternalLink className="size-3.5" />
              View Member
            </Button>
          )}
          {event.kind === "dispatch" && event.dispatchStatus === "sent" && onViewDispatchEmail && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDispatchEmail(event)}
            >
              <Eye className="size-3.5" />
              View Email
            </Button>
          )}
          <DialogClose render={<Button variant="outline" size="sm" />}>
            Close
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
