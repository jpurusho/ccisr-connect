"use client"

import { useEffect, useState, useCallback } from "react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { logAudit } from "@/lib/audit"
import { formatTime } from "@/lib/recurrence"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
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
import { Loader2, CalendarDays, XCircle, MapPin } from "lucide-react"

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

interface EventLocationRow {
  id: string
  label: string
  host_family_id: string | null
  address: string | null
  phone: string | null
}

interface LocationHostState {
  locationId: string
  label: string
  hostFamilyId: string
  addressOverride: string
  phoneOverride: string
  status: "draft" | "confirmed" | "cancelled"
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
  const [locationOverride, setLocationOverride] = useState("")
  const [notes, setNotes] = useState("")
  const [status, setStatus] = useState<"draft" | "confirmed" | "cancelled">("confirmed")

  const [families, setFamilies] = useState<FamilyOption[]>([])
  const [eventLocations, setEventLocations] = useState<EventLocationRow[]>([])
  const [locationHosts, setLocationHosts] = useState<LocationHostState[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const hasMultipleLocations = eventLocations.length > 1

  const resetForm = useCallback(() => {
    setHostFamilyId("")
    setInstanceTime("")
    setLocationOverride("")
    setNotes("")
    setStatus("confirmed")
    setEventLocations([])
    setLocationHosts([])
    setLoading(true)
  }, [])

  useEffect(() => {
    if (!open) return
    resetForm()

    const supabase = createClient()

    async function loadData() {
      const [famsRes, locsRes] = await Promise.all([
        supabase
          .from("families")
          .select("id, family_name")
          .eq("is_active", true)
          .order("family_name")
          .returns<FamilyOption[]>(),
        supabase
          .from("event_locations")
          .select("id, label, host_family_id, address, phone")
          .eq("event_id", eventId)
          .eq("is_active", true)
          .order("sort_order")
          .returns<EventLocationRow[]>(),
      ])

      setFamilies(famsRes.data ?? [])
      const locs = locsRes.data ?? []
      setEventLocations(locs)

      if (instanceId) {
        type Row = {
          instance_time: string | null
          host_family_id: string | null
          location_override: string | null
          notes: string | null
          status: "draft" | "confirmed" | "cancelled"
        }
        const { data } = await supabase
          .from("event_instances")
          .select("instance_time, host_family_id, location_override, notes, status")
          .eq("id", instanceId)
          .returns<Row[]>()
          .single()

        if (data) {
          setHostFamilyId(data.host_family_id ?? "")
          setInstanceTime(data.instance_time ?? "")
          setLocationOverride(data.location_override ?? "")
          setNotes(data.notes ?? "")
          setStatus(data.status)
        }

        // Load per-location overrides
        if (locs.length > 1) {
          type LocOverride = {
            location_id: string
            host_family_id: string | null
            address_override: string | null
            phone_override: string | null
            status: "draft" | "confirmed" | "cancelled"
          }
          const { data: locOverrides } = await supabase
            .from("event_instance_locations")
            .select("location_id, host_family_id, address_override, phone_override, status")
            .eq("instance_id", instanceId)
            .returns<LocOverride[]>()

          const overrideMap = new Map((locOverrides ?? []).map((o) => [o.location_id, o]))

          setLocationHosts(locs.map((loc) => {
            const override = overrideMap.get(loc.id)
            return {
              locationId: loc.id,
              label: loc.label,
              hostFamilyId: override?.host_family_id ?? loc.host_family_id ?? "",
              addressOverride: override?.address_override ?? "",
              phoneOverride: override?.phone_override ?? "",
              status: override?.status ?? "confirmed",
            }
          }))
        }
      } else {
        type EventRow = { default_time: string | null; host_family_id: string | null; host_until: string | null }
        const { data: evt } = await supabase
          .from("events")
          .select("default_time, host_family_id, host_until")
          .eq("id", eventId)
          .returns<EventRow[]>()
          .single()

        if (evt) {
          setInstanceTime(evt.default_time ?? "")
          const expired = evt.host_until ? new Date(evt.host_until + "T23:59:59") < new Date() : false
          if (!expired && evt.host_family_id) setHostFamilyId(evt.host_family_id)
        }
        setStatus("confirmed")

        // Initialize location hosts from defaults
        if (locs.length > 1) {
          setLocationHosts(locs.map((loc) => ({
            locationId: loc.id,
            label: loc.label,
            hostFamilyId: loc.host_family_id ?? "",
            addressOverride: "",
            phoneOverride: "",
            status: "confirmed",
          })))
        }
      }

      setLoading(false)
    }

    loadData()
  }, [open, instanceId, eventId, resetForm])

  function updateLocationHost(locId: string, field: keyof LocationHostState, value: string) {
    setLocationHosts((prev) =>
      prev.map((lh) => lh.locationId === locId ? { ...lh, [field]: value } : lh)
    )
  }

  async function handleSave() {
    setSaving(true)
    try {
      const supabase = createClient()

      const payload = {
        instance_time: instanceTime || null,
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

      // Save per-location host overrides (multi-location events)
      if (hasMultipleLocations && savedInstanceId && locationHosts.length > 0) {
        // Delete existing and re-insert
        await supabase
          .from("event_instance_locations")
          .delete()
          .eq("instance_id", savedInstanceId)

        const locRows = locationHosts
          .filter((lh) => lh.hostFamilyId || lh.addressOverride || lh.phoneOverride || lh.status !== "confirmed")
          .map((lh) => ({
            instance_id: savedInstanceId,
            location_id: lh.locationId,
            host_family_id: lh.hostFamilyId && lh.hostFamilyId !== "none" ? lh.hostFamilyId : null,
            address_override: lh.addressOverride.trim() || null,
            phone_override: lh.phoneOverride.trim() || null,
            status: lh.status,
          }))

        if (locRows.length > 0) {
          await supabase
            .from("event_instance_locations")
            .insert(locRows as never)
        }
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <CalendarDays className="size-4 text-primary" />
            </div>
            <div>
              <DialogTitle>Edit Occurrence</DialogTitle>
              <DialogDescription>{eventTitle} — {dateLabel}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {!hasMultipleLocations && (
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
              )}
              <div className="space-y-1.5">
                <Label htmlFor="ie-time">Time</Label>
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

            {/* Per-location host assignment (multi-location events like Bible Study) */}
            {hasMultipleLocations && locationHosts.length > 0 && (
              <div className="space-y-3">
                <Label className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  Host per Location
                </Label>
                {locationHosts.map((lh) => (
                  <div key={lh.locationId} className="rounded-md border p-3 space-y-2">
                    <p className="text-xs font-semibold text-primary">{lh.label}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Host Family</Label>
                        <Select
                          value={lh.hostFamilyId}
                          onValueChange={(v) => updateLocationHost(lh.locationId, "hostFamilyId", v ?? "")}
                        >
                          <SelectTrigger className="h-8 text-xs w-full">
                            <SelectValue placeholder="None">
                              {families.find((f) => f.id === lh.hostFamilyId)?.family_name || "None"}
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
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Status</Label>
                        <Select
                          value={lh.status}
                          onValueChange={(v) => updateLocationHost(lh.locationId, "status", v ?? "confirmed")}
                        >
                          <SelectTrigger className="h-8 text-xs w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="confirmed">Active</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Input
                      placeholder="Address override (optional)"
                      value={lh.addressOverride}
                      onChange={(e) => updateLocationHost(lh.locationId, "addressOverride", e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                ))}
              </div>
            )}

            {!hasMultipleLocations && (
              <div className="space-y-1.5">
                <Label htmlFor="ie-location">Location</Label>
                <Input
                  id="ie-location"
                  value={locationOverride}
                  onChange={(e) => setLocationOverride(e.target.value)}
                  placeholder="Leave blank to use default"
                />
              </div>
            )}

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

        <DialogFooter>
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
          <DialogClose render={<Button variant="outline" size="sm" />}>Close</DialogClose>
          <Button size="sm" onClick={handleSave} disabled={saving || loading}>
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
