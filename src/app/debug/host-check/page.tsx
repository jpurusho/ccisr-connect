"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

export default function HostCheckPage() {
  const [eventTitle, setEventTitle] = useState("Bible Study")
  const [checkDate, setCheckDate] = useState("2024-11-20")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  async function check() {
    setLoading(true)
    setResult(null)

    try {
      const supabase = createClient()

      // Find event by title
      const { data: events } = await supabase
        .from("events")
        .select("id, title, host_family_id, host_until")
        .ilike("title", `%${eventTitle}%`)
        .limit(5)

      if (!events || events.length === 0) {
        setResult({ error: "No events found matching that title" })
        return
      }

      const event = events[0]

      // Get instance for the date
      const { data: instance } = await supabase
        .from("event_instances")
        .select("id, host_family_id, instance_date, status")
        .eq("event_id", event.id)
        .eq("instance_date", checkDate)
        .maybeSingle()

      // Determine which host is active
      let activeHostId: string | null = null
      let source = ""

      if (instance?.host_family_id) {
        activeHostId = instance.host_family_id
        source = "Instance Override"
      } else if (event.host_family_id) {
        if (event.host_until) {
          const untilDate = new Date(event.host_until + "T23:59:59")
          const targetDate = new Date(checkDate + "T00:00:00")
          if (targetDate <= untilDate) {
            activeHostId = event.host_family_id
            source = `Event-level (expires ${event.host_until})`
          } else {
            source = `Event-level EXPIRED on ${event.host_until}`
          }
        } else {
          activeHostId = event.host_family_id
          source = "Event-level (no expiration)"
        }
      } else {
        source = "No host assigned"
      }

      // Get host family details
      let hostDetails = null
      if (activeHostId) {
        const { data: family } = await supabase
          .from("families")
          .select("family_name, addresses(full_address, is_current, created_at, updated_at)")
          .eq("id", activeHostId)
          .single()

        hostDetails = family
      }

      // Get event-level host details for comparison
      let eventHostDetails = null
      if (event.host_family_id && event.host_family_id !== activeHostId) {
        const { data: family } = await supabase
          .from("families")
          .select("family_name, addresses(full_address, is_current, created_at)")
          .eq("id", event.host_family_id)
          .single()

        eventHostDetails = family
      }

      // Check audit log
      const { data: auditLogs } = await supabase
        .from("audit_log")
        .select("action, created_at, changes")
        .or(`entity_id.eq.${event.id}${instance ? `,entity_id.eq.${instance.id}` : ""}`)
        .order("created_at", { ascending: false })
        .limit(10)

      setResult({
        event,
        instance,
        activeHostId,
        source,
        hostDetails,
        eventHostDetails,
        auditLogs,
      })
    } catch (error) {
      setResult({ error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Host Family Diagnostic Tool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Event Title</Label>
              <Input
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Bible Study"
              />
            </div>
            <div className="space-y-2">
              <Label>Date to Check</Label>
              <Input
                type="date"
                value={checkDate}
                onChange={(e) => setCheckDate(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={check} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Check Host Assignment
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            {result.error ? (
              <div className="text-red-600">{result.error}</div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Event</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>Title:</strong> {result.event.title}</p>
                    <p><strong>Event-level host_family_id:</strong> {result.event.host_family_id || "None"}</p>
                    <p><strong>Host Until:</strong> {result.event.host_until || "No expiration"}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Instance ({checkDate})</h3>
                  <div className="space-y-1 text-sm">
                    {result.instance ? (
                      <>
                        <p><strong>Instance exists:</strong> Yes</p>
                        <p><strong>Instance host_family_id:</strong> {result.instance.host_family_id || "None"}</p>
                        <p><strong>Status:</strong> {result.instance.status}</p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">No instance record for this date</p>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">Resolution</h3>
                  <p><strong>Source:</strong> {result.source}</p>
                  <p><strong>Active Host ID:</strong> {result.activeHostId || "None"}</p>
                </div>

                {result.hostDetails && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Active Host Details</h3>
                    <div className="space-y-1 text-sm">
                      <p><strong>Name:</strong> {result.hostDetails.family_name}</p>
                      {result.hostDetails.addresses?.map((addr: any, i: number) => (
                        <div key={i} className="ml-4">
                          <p><strong>Address:</strong> {addr.full_address}</p>
                          <p><strong>Is Current:</strong> {addr.is_current ? "Yes" : "No"}</p>
                          <p className="text-xs text-muted-foreground">Created: {addr.created_at}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.eventHostDetails && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                    <h3 className="font-semibold text-lg mb-2">Event-Level Host (for comparison)</h3>
                    <div className="space-y-1 text-sm">
                      <p><strong>Name:</strong> {result.eventHostDetails.family_name}</p>
                      {result.eventHostDetails.addresses?.map((addr: any, i: number) => (
                        <div key={i} className="ml-4">
                          <p><strong>Address:</strong> {addr.full_address}</p>
                          <p><strong>Is Current:</strong> {addr.is_current ? "Yes" : "No"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.auditLogs && result.auditLogs.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Recent Changes (Audit Log)</h3>
                    <div className="space-y-2">
                      {result.auditLogs.map((log: any, i: number) => (
                        <div key={i} className="text-xs p-2 bg-gray-50 dark:bg-gray-900 rounded">
                          <p><strong>{log.action}</strong> at {new Date(log.created_at).toLocaleString()}</p>
                          {log.changes && (
                            <pre className="mt-1 text-[10px] overflow-x-auto">
                              {JSON.stringify(log.changes, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
