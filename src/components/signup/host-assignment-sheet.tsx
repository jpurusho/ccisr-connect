"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { logAudit } from "@/lib/audit"
import { computeOccurrencesForMonth, buildRotationPreview, type AssignmentPreview } from "@/lib/signup/assign-hosts"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, CalendarDays, UserCheck, Shuffle } from "lucide-react"
import { toast } from "sonner"

interface HostAssignmentSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formId: string
  formTitle: string
  matchField: string
  onSuccess?: () => void
}

interface ResponseWithFamily {
  responseId: string
  familyId: string
  familyName: string
  memberName: string
  matchValue: string | number
}

const MONTHS = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

export function HostAssignmentSheet({
  open,
  onOpenChange,
  formId,
  formTitle,
  matchField,
  onSuccess,
}: HostAssignmentSheetProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [targetMonth, setTargetMonth] = useState(() => new Date().getMonth() + 1)
  const [targetYear] = useState(() => new Date().getFullYear())
  const [responses, setResponses] = useState<ResponseWithFamily[]>([])
  const [preview, setPreview] = useState<AssignmentPreview[]>([])
  const [eventId, setEventId] = useState<string | null>(null)
  const [eventTitle, setEventTitle] = useState("")
  const [recurrenceRule, setRecurrenceRule] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)

    async function load() {
      const supabase = createClient()

      // Find linked event type → event
      const { data: etRows } = await supabase
        .from("event_types")
        .select("id")
        .eq("linked_signup_form_id", formId)
        .returns<{ id: string }[]>()

      if (!etRows?.length) {
        toast.error("No event type linked to this form")
        setLoading(false)
        return
      }

      const etId = etRows[0].id
      const { data: events } = await supabase
        .from("events")
        .select("id, title, recurrence_rule")
        .eq("event_type_id", etId)
        .eq("is_active", true)
        .returns<{ id: string; title: string; recurrence_rule: string | null }[]>()

      const evt = events?.find((e) => e.recurrence_rule)
      if (!evt) {
        toast.error("No recurring event found for this event type")
        setLoading(false)
        return
      }

      setEventId(evt.id)
      setEventTitle(evt.title)
      setRecurrenceRule(evt.recurrence_rule)

      // Fetch responses with family resolution
      const { data: respRows } = await supabase
        .from("signup_responses")
        .select("id, data, member_id")
        .eq("form_id", formId)
        .is("assigned_at", null)
        .order("created_at")
        .returns<{ id: string; data: Record<string, unknown>; member_id: string | null }[]>()

      const resolved: ResponseWithFamily[] = []
      for (const r of respRows ?? []) {
        const matchVal = r.data[matchField]
        const matchStr = typeof matchVal === "number" ? matchVal : String(matchVal ?? "")

        if (r.member_id) {
          const { data: member } = await supabase
            .from("members")
            .select("full_name, family_id, families(family_name)")
            .eq("id", r.member_id)
            .returns<{ full_name: string; family_id: string; families: { family_name: string } | null }[]>()
            .single()
          if (member) {
            resolved.push({
              responseId: r.id,
              familyId: member.family_id,
              familyName: member.families?.family_name ?? member.full_name,
              memberName: member.full_name,
              matchValue: matchStr,
            })
          }
        } else {
          // No member_id — try to find family from _memberId in data or use name fields
          const embeddedMemberId = r.data._memberId as string | undefined
          if (embeddedMemberId) {
            const { data: member } = await supabase
              .from("members")
              .select("full_name, family_id, families(family_name)")
              .eq("id", embeddedMemberId)
              .returns<{ full_name: string; family_id: string; families: { family_name: string } | null }[]>()
              .single()
            if (member) {
              resolved.push({
                responseId: r.id,
                familyId: member.family_id,
                familyName: member.families?.family_name ?? member.full_name,
                memberName: member.full_name,
                matchValue: matchStr,
              })
              continue
            }
          }
          // Fallback: use any name-like field from response data
          const nameVal = r.data._memberName as string ?? r.data.name as string ?? r.data.host_name as string ?? ""
          if (nameVal) {
            // Try to find member by name
            const { data: memberMatch } = await supabase
              .from("members")
              .select("full_name, family_id, families(family_name)")
              .ilike("full_name", nameVal)
              .eq("is_active", true)
              .returns<{ full_name: string; family_id: string; families: { family_name: string } | null }[]>()
              .limit(1)
            if (memberMatch?.length) {
              resolved.push({
                responseId: r.id,
                familyId: memberMatch[0].family_id,
                familyName: memberMatch[0].families?.family_name ?? memberMatch[0].full_name,
                memberName: memberMatch[0].full_name,
                matchValue: matchStr,
              })
            } else {
              // Can't resolve family — include with empty familyId so admin sees it
              resolved.push({
                responseId: r.id,
                familyId: "",
                familyName: nameVal,
                memberName: nameVal,
                matchValue: matchStr,
              })
            }
          }
        }
      }

      setResponses(resolved)
      setLoading(false)
    }

    load()
  }, [open, formId, matchField])

  // Recompute preview when month or responses change
  useEffect(() => {
    if (!recurrenceRule || loading || !eventId) return

    async function buildPreview() {
      const evtId = eventId!
      const supabase = createClient()
      const occurrences = computeOccurrencesForMonth(recurrenceRule!, targetYear, targetMonth)
      if (occurrences.length === 0) { setPreview([]); return }

      const startStr = format(occurrences[0], "yyyy-MM-dd")
      const endStr = format(occurrences[occurrences.length - 1], "yyyy-MM-dd")

      // Fetch existing instances for this month
      const { data: existingRows } = await supabase
        .from("event_instances")
        .select("instance_date, host_family_id, signup_response_id")
        .eq("event_id", evtId)
        .gte("instance_date", startStr)
        .lte("instance_date", endStr)
        .returns<{ instance_date: string; host_family_id: string | null; signup_response_id: string | null }[]>()

      const existingInstances = (existingRows ?? []).map((r) => ({
        date: r.instance_date,
        hostFamilyId: r.host_family_id,
        responseId: r.signup_response_id,
      }))

      // Also fetch husband/wife names for existing hosts
      const hostFamilyIds = [...new Set((existingRows ?? []).filter((r) => r.host_family_id).map((r) => r.host_family_id!))]
      const familyNameMap = new Map<string, string>()
      if (hostFamilyIds.length > 0) {
        const { data: members } = await supabase
          .from("members")
          .select("family_id, first_name, role_in_family")
          .in("family_id", hostFamilyIds)
          .in("role_in_family", ["husband", "wife"])
          .eq("is_active", true)
          .returns<{ family_id: string; first_name: string; role_in_family: string }[]>()
        if (members) {
          const byFamily = new Map<string, { husband?: string; wife?: string }>()
          for (const m of members) {
            if (!byFamily.has(m.family_id)) byFamily.set(m.family_id, {})
            byFamily.get(m.family_id)![m.role_in_family as "husband" | "wife"] = m.first_name
          }
          for (const [fid, names] of byFamily) {
            if (names.husband && names.wife) familyNameMap.set(fid, `${names.husband} & ${names.wife}`)
            else familyNameMap.set(fid, names.husband || names.wife || "")
          }
        }
      }

      // Filter responses matching target month
      const monthResponses = responses.filter((r) => {
        if (typeof r.matchValue === "number") return r.matchValue === targetMonth
        const idx = MONTHS.findIndex((m) => m.toLowerCase() === String(r.matchValue).toLowerCase())
        return idx === targetMonth
      })

      const p = buildRotationPreview(occurrences, monthResponses, existingInstances)

      // Resolve names
      const withNames = p.map((item) => {
        if (item.existing && item.familyId) {
          return { ...item, familyName: familyNameMap.get(item.familyId) ?? item.familyId, memberName: null }
        }
        const resp = monthResponses.find((r) => r.responseId === item.responseId)
        return { ...item, familyName: resp?.familyName ?? null, memberName: resp?.memberName ?? null }
      })

      setPreview(withNames)
    }

    buildPreview()
  }, [targetMonth, targetYear, responses, recurrenceRule, loading, eventId])

  function handleShuffle() {
    if (!recurrenceRule) return
    const occurrences = computeOccurrencesForMonth(recurrenceRule, targetYear, targetMonth)

    const monthResponses = responses.filter((r) => {
      if (typeof r.matchValue === "number") return r.matchValue === targetMonth
      const idx = MONTHS.findIndex((m) => m.toLowerCase() === String(r.matchValue).toLowerCase())
      return idx === targetMonth
    })

    // Shuffle the responses
    const shuffled = [...monthResponses].sort(() => Math.random() - 0.5)

    const p = buildRotationPreview(occurrences, shuffled, [])
    const withNames = p.map((item) => {
      const resp = shuffled.find((r) => r.responseId === item.responseId)
      return { ...item, familyName: resp?.familyName ?? null, memberName: resp?.memberName ?? null }
    })
    setPreview(withNames)
  }

  async function handleAssign() {
    if (!eventId) return
    const assignable = preview.filter((p) => !p.existing && p.familyId && p.responseId)
    if (assignable.length === 0) {
      toast.error("No assignments to make")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/signup/assign-hosts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          assignments: assignable.map((a) => ({
            date: a.date,
            familyId: a.familyId,
            responseId: a.responseId,
          })),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(`Failed: ${err.error}`)
        return
      }

      const result = await res.json()
      toast.success(`Assigned ${result.created + result.updated} host${result.created + result.updated > 1 ? "s" : ""} to calendar`)
      logAudit("hosts_assigned_from_signup", "event_instances", eventId, {
        formId,
        month: targetMonth,
        count: result.created + result.updated,
      })
      onSuccess?.()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const assignableCount = preview.filter((p) => !p.existing && p.familyId).length

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Assign Hosts to Calendar</SheetTitle>
          <SheetDescription>
            {formTitle} → {eventTitle || "Loading..."}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 px-4 pb-4">
            {/* Month selector */}
            <div className="flex items-center gap-3">
              <CalendarDays className="size-4 text-muted-foreground" />
              <Select value={String(targetMonth)} onValueChange={(v) => { if (v) setTargetMonth(parseInt(v, 10)) }}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.slice(1).map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m} {targetYear}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={handleShuffle} title="Shuffle rotation order">
                <Shuffle className="size-3.5" />
              </Button>
            </div>

            {/* Responses available */}
            <div className="text-sm text-muted-foreground">
              {responses.filter((r) => {
                if (typeof r.matchValue === "number") return r.matchValue === targetMonth
                const idx = MONTHS.findIndex((m) => m.toLowerCase() === String(r.matchValue).toLowerCase())
                return idx === targetMonth
              }).length} unassigned response{responses.length !== 1 ? "s" : ""} for {MONTHS[targetMonth]}
            </div>

            {/* Preview table */}
            {preview.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No occurrences this month for this event.</p>
            ) : (
              <div className="space-y-2">
                {preview.map((item) => {
                  const isPast = new Date(item.date + "T23:59:59") < new Date()
                  return (
                  <div
                    key={item.date}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                      isPast
                        ? "opacity-40"
                        : item.existing
                        ? "bg-muted/30 border-dashed"
                        : item.familyId
                        ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/40"
                        : "border-dashed"
                    }`}
                  >
                    <div className="min-w-[100px] shrink-0">
                      <p className="text-sm font-medium">
                        {format(new Date(item.date + "T00:00:00"), "EEE, MMM d")}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      {item.familyName ? (
                        <p className="text-sm truncate">{item.familyName}</p>
                      ) : isPast ? (
                        <p className="text-sm text-muted-foreground italic">Past</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Unassigned</p>
                      )}
                      {item.memberName && (
                        <p className="text-[11px] text-muted-foreground truncate">{item.memberName}</p>
                      )}
                    </div>
                    {item.existing && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">Already set</Badge>
                    )}
                    {!item.existing && item.familyId && !isPast && (
                      <UserCheck className="size-3.5 text-green-600 shrink-0" />
                    )}
                    {isPast && !item.existing && (
                      <Badge variant="outline" className="text-[10px] shrink-0 opacity-60">Past</Badge>
                    )}
                  </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <SheetFooter>
          <SheetClose render={<Button variant="outline" />}>Cancel</SheetClose>
          <Button
            onClick={handleAssign}
            disabled={saving || assignableCount === 0}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <UserCheck className="size-4" />}
            Assign {assignableCount} Host{assignableCount !== 1 ? "s" : ""}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
