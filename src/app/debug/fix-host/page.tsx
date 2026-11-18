"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, CheckCircle } from "lucide-react"
import { toast } from "sonner"

export default function FixHostPage() {
  const [loading, setLoading] = useState(true)
  const [families, setFamilies] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [selectedEvent, setSelectedEvent] = useState("")
  const [selectedFamily, setSelectedFamily] = useState("")
  const [hostUntil, setHostUntil] = useState("2024-12-31")
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const [familiesRes, eventsRes] = await Promise.all([
        supabase
          .from("families")
          .select(`
            id,
            family_name,
            members!inner(first_name, role_in_family, is_active)
          `)
          .eq("is_active", true)
          .order("family_name"),

        supabase
          .from("events")
          .select("id, title, host_family_id, host_until, event_types(name, comm_type)")
          .eq("event_types.comm_type", "bible_study")
          .eq("is_active", true)
      ])

      // Format families with member names for easier searching
      const formattedFamilies = (familiesRes.data || []).map((fam: any) => {
        const activeMembers = (fam.members || [])
          .filter((m: any) => m.is_active && ['husband', 'wife'].includes(m.role_in_family))
          .map((m: any) => m.first_name)
          .filter(Boolean)

        return {
          id: fam.id,
          family_name: fam.family_name,
          member_names: activeMembers.length > 0 ? activeMembers.join(" & ") : "",
        }
      })

      setFamilies(formattedFamilies)
      setEvents(eventsRes.data || [])

      // Auto-select Bible Study event if found
      if (eventsRes.data && eventsRes.data.length > 0) {
        setSelectedEvent(eventsRes.data[0].id)
        setSelectedFamily(eventsRes.data[0].host_family_id || "")
        setHostUntil(eventsRes.data[0].host_until || "2024-12-31")
      }

      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    if (!selectedEvent) {
      toast.error("Select an event")
      return
    }

    setSaving(true)
    setSuccess(false)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("events")
        .update({
          host_family_id: selectedFamily || null,
          host_until: hostUntil || null,
        })
        .eq("id", selectedEvent)

      if (error) throw error

      toast.success("Host updated successfully!")
      setSuccess(true)

      // Reload to show updated values
      const { data } = await supabase
        .from("events")
        .select("host_family_id, host_until")
        .eq("id", selectedEvent)
        .single()

      if (data) {
        setSelectedFamily(data.host_family_id || "")
        setHostUntil(data.host_until || "")
      }
    } catch (error) {
      toast.error(`Failed: ${error}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    )
  }

  const selectedEventData = events.find(e => e.id === selectedEvent)

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Fix Bible Study Host Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">⚠️ Why is this needed?</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              When signup forms are paused (e.g., winter break), you need to set a default host at the event level.
              This ensures the correct host address appears in emails until signup forms resume.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Event</Label>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event...">
                    {selectedEventData?.title || "Select event..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {events.map((evt) => (
                    <SelectItem key={evt.id} value={evt.id}>
                      {evt.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedEventData && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded text-xs">
                <p><strong>Current Host:</strong> {
                  selectedEventData.host_family_id
                    ? families.find(f => f.id === selectedEventData.host_family_id)?.family_name || "Unknown"
                    : "None (will use signup auto-fill)"
                }</p>
                <p><strong>Host Until:</strong> {selectedEventData.host_until || "No expiration"}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Set Host Family</Label>
              <Select value={selectedFamily} onValueChange={setSelectedFamily}>
                <SelectTrigger>
                  <SelectValue placeholder="None (use signup auto-fill)">
                    {selectedFamily
                      ? (() => {
                          const fam = families.find(f => f.id === selectedFamily) as any
                          if (!fam) return "None"
                          return fam.member_names
                            ? `${fam.member_names} (${fam.family_name})`
                            : fam.family_name
                        })()
                      : "None (use signup auto-fill)"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (use signup auto-fill)</SelectItem>
                  {families.map((fam: any) => (
                    <SelectItem key={fam.id} value={fam.id}>
                      {fam.member_names
                        ? `${fam.member_names} (${fam.family_name})`
                        : fam.family_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Set a default host, or leave as "None" to use signup form auto-fill
              </p>
            </div>

            {selectedFamily && (
              <div className="space-y-2">
                <Label>Host Until (Optional)</Label>
                <Input
                  type="date"
                  value={hostUntil}
                  onChange={(e) => setHostUntil(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  After this date, hosting assignment will clear (reverts to signup auto-fill)
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving || !selectedEvent}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Host Assignment
            </Button>

            {success && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Saved!</span>
              </div>
            )}
          </div>

          <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">💡 What happens next?</p>
            <ul className="text-xs text-green-700 dark:text-green-400 mt-2 space-y-1 list-disc list-inside">
              <li>This host will be used for ALL future Bible Study dates (until expiration)</li>
              <li>When signup forms resume, you can clear this to go back to signup auto-fill</li>
              <li>You can also override specific dates using "Edit Date" in the calendar</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
