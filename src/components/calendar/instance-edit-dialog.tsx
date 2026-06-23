"use client"

import { useEffect, useState, useCallback } from "react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { logAudit } from "@/lib/audit"
import { formatTime } from "@/lib/recurrence"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, CalendarDays, XCircle } from "lucide-react"

interface InstanceEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  instanceId: string | null
  instanceDate: string
  eventTitle: string
  onSuccess: () => void
}

interface FamilyOption {
  id: string
  family_name: string
}

export function InstanceEditDialog({
  open,
  onOpenChange,
  eventId,
  instanceId,
  instanceDate,
  eventTitle,
  onSuccess,
}: InstanceEditDialogProps) {
  const [hostFamilyId, setHostFamilyId] = useState("")
  const [instanceTime, setInstanceTime] = useState("")
  const [instanceEndTime, setInstanceEndTime] = useState("")
  const [locationOverride, setLocationOverride] = useState("")
  const [notes, setNotes] = useState("")
  const [status, setStatus] = useState<"draft" | "confirmed" | "cancelled">("confirmed")

  const [families, setFamilies] = useState<FamilyOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const resetForm = useCallback(() => {
    setHostFamilyId("")
    setInstanceTime("")
    setInstanceEndTime("")
    setLocationOverride("")
    setNotes("")
    setStatus("confirmed")
    setLoading(true)
  }, [])

  useEffect(() => {
    if (!open) return
    resetForm()

    const supabase = createClient()

    async function loadData() {
      const { data: famsData } = await supabase
        .from("families")
        .select("id, family_name")
        .eq("is_active", true)
        .order("family_name")
        .returns<FamilyOption[]>()

      setFamilies(famsData ?? [])

      if (instanceId) {
        type Row = {
          instance_time: string | null
          instance_end_time: string | null
          host_family_id: string | null
          location_override: string | null
          notes: string | null
          status: "draft" | "confirmed" | "cancelled"
        }
        const { data } = await supabase
          .from("event_instances")
          .select("instance_time, instance_end_time, host_family_id, location_override, notes, status")
          .eq("id", instanceId)
          .returns<Row[]>()
          .single()

        if (data) {
          setHostFamilyId(data.host_family_id ?? "")
          setInstanceTime(data.instance_time ?? "")
          setInstanceEndTime(data.instance_end_time ?? "")
          setLocationOverride(data.location_override ?? "")
          setNotes(data.notes ?? "")
          setStatus(data.status)
        }
      } else {
        type EventRow = { default_time: string | null; default_end_time: string | null; host_family_id: string | null; host_until: string | null }
        const { data: evt } = await supabase
          .from("events")
          .select("default_time, default_end_time, host_family_id, host_until")
          .eq("id", eventId)
          .returns<EventRow[]>()
          .single()

        if (evt) {
          setInstanceTime(evt.default_time ?? "")
          setInstanceEndTime(evt.default_end_time ?? "")
          const expired = evt.host_until ? new Date(evt.host_until + "T23:59:59") < new Date() : false
          if (!expired && evt.host_family_id) setHostFamilyId(evt.host_family_id)
        }
        setStatus("confirmed")
      }

      setLoading(false)
    }

    loadData()
  }, [open, instanceId, eventId, resetForm])

  async function handleSave() {
    setSaving(true)
    try {
      const supabase = createClient()

      const payload = {
        instance_time: instanceTime || null,
        instance_end_time: instanceEndTime || null,
        host_family_id: hostFamilyId && hostFamilyId !== "none" ? hostFamilyId : null,
        location_override: locationOverride.trim() || null,
        notes: notes.trim() || null,
        status,
      }

      let savedInstanceId = instanceId

      if (instanceId) {
        const { error } = await supabase
          .from("event_instances")
          .update(payload as never)
          .eq("id", instanceId)

        if (error) { toast.error(`Failed: ${error.message}`); return }
      } else {
        const { data, error } = await supabase
          .from("event_instances")
          .insert({ event_id: eventId, instance_date: instanceDate, ...payload } as never)
          .select("id")
          .returns<{ id: string }[]>()
          .single()

        if (error) { toast.error(`Failed: ${error.message}`); return }
        savedInstanceId = data?.id ?? null
      }

      toast.success(instanceId ? "Occurrence updated" : "Occurrence saved")
      logAudit(
        instanceId ? "instance_updated" : "instance_created",
        "event_instances",
        savedInstanceId,
        { event_id: eventId, date: instanceDate }
      )
      onSuccess()
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel this occurrence? The event will be skipped on this date.")) return
    setSaving(true)
    try {
      const supabase = createClient()

      if (instanceId) {
        const { error } = await supabase
          .from("event_instances")
          .update({ status: "cancelled" } as never)
          .eq("id", instanceId)
        if (error) { toast.error(`Failed: ${error.message}`); return }
      } else {
        const { error } = await supabase
          .from("event_instances")
          .insert({ event_id: eventId, instance_date: instanceDate, status: "cancelled" } as never)
        if (error) { toast.error(`Failed: ${error.message}`); return }
      }

      toast.success("Occurrence cancelled")
      logAudit("instance_cancelled", "event_instances", instanceId, { event_id: eventId, date: instanceDate })
      onSuccess()
    } finally {
      setSaving(false)
    }
  }

  const dateLabel = (() => {
    try { return format(new Date(instanceDate + "T00:00:00"), "EEEE, MMMM d, yyyy") } catch { return instanceDate }
  })()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <CalendarDays className="size-4 text-primary" />
            </div>
            <div>
              <SheetTitle>Edit Occurrence</SheetTitle>
              <SheetDescription>{eventTitle} — {dateLabel}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
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
              <div className="space-y-1.5">
                <Label htmlFor="ie-time">Start Time</Label>
                <Input
                  id="ie-time"
                  type="time"
                  value={instanceTime}
                  onChange={(e) => setInstanceTime(e.target.value)}
                />
                {instanceTime && (
                  <p className="text-[11px] text-muted-foreground">{formatTime(instanceTime)}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ie-end-time">End Time</Label>
              <Input
                id="ie-end-time"
                type="time"
                value={instanceEndTime}
                onChange={(e) => setInstanceEndTime(e.target.value)}
              />
              {instanceEndTime && (
                <p className="text-[11px] text-muted-foreground">{formatTime(instanceEndTime)}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ie-location">Location</Label>
              <Input
                id="ie-location"
                value={locationOverride}
                onChange={(e) => setLocationOverride(e.target.value)}
                placeholder="Leave blank to use default"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ie-notes">Notes</Label>
              <Textarea
                id="ie-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Contact: (555) 123-4567"
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus((v ?? "confirmed") as typeof status)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="draft">Tentative</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <SheetFooter>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCancel}
            disabled={saving}
            className="sm:mr-auto"
          >
            <XCircle className="size-3.5" />
            Cancel Occurrence
          </Button>
          <SheetClose render={<Button variant="outline" size="sm" />}>Close</SheetClose>
          <Button size="sm" onClick={handleSave} disabled={saving || loading}>
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
