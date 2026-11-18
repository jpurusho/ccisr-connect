"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react"

interface DiagnosticResult {
  step: string
  status: "pass" | "fail" | "warning"
  message: string
  data?: any
}

export default function SignupAutoFillDiagnostic() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<DiagnosticResult[]>([])

  async function runDiagnostic() {
    setLoading(true)
    setResults([])
    const diagnosticResults: DiagnosticResult[] = []

    try {
      const supabase = createClient()

      // Step 1: Find Bible Study event type
      const { data: eventTypes } = await supabase
        .from("event_types")
        .select("id, name, comm_type, linked_signup_form_id, signup_field_map")
        .eq("comm_type", "bible_study")

      if (!eventTypes || eventTypes.length === 0) {
        diagnosticResults.push({
          step: "1. Find Bible Study Event Type",
          status: "fail",
          message: "No event type with comm_type='bible_study' found",
        })
        setResults(diagnosticResults)
        setLoading(false)
        return
      }

      const eventType = eventTypes[0]
      diagnosticResults.push({
        step: "1. Find Bible Study Event Type",
        status: "pass",
        message: `Found: ${eventType.name}`,
        data: {
          id: eventType.id,
          name: eventType.name,
          linked_signup_form_id: eventType.linked_signup_form_id,
          signup_field_map: eventType.signup_field_map,
        },
      })

      // Step 2: Check if signup form is linked
      if (!eventType.linked_signup_form_id) {
        diagnosticResults.push({
          step: "2. Check Signup Form Linkage",
          status: "fail",
          message: "❌ No signup form linked to this event type",
          data: {
            fix: "Go to Event Types page → Edit 'Bible Study' → Link a signup form",
          },
        })
        setResults(diagnosticResults)
        setLoading(false)
        return
      }

      // Get signup form details
      const { data: signupForm } = await supabase
        .from("signup_forms")
        .select("id, name, form_structure")
        .eq("id", eventType.linked_signup_form_id)
        .single()

      if (!signupForm) {
        diagnosticResults.push({
          step: "2. Check Signup Form Linkage",
          status: "fail",
          message: `Linked form ID ${eventType.linked_signup_form_id} not found`,
        })
        setResults(diagnosticResults)
        setLoading(false)
        return
      }

      diagnosticResults.push({
        step: "2. Check Signup Form Linkage",
        status: "pass",
        message: `✅ Linked to: ${signupForm.name}`,
        data: {
          form_id: signupForm.id,
          form_name: signupForm.name,
        },
      })

      // Step 3: Validate field mapping
      if (!eventType.signup_field_map || Object.keys(eventType.signup_field_map).length === 0) {
        diagnosticResults.push({
          step: "3. Validate Field Mapping",
          status: "fail",
          message: "❌ No field mapping configured",
          data: {
            fix: "Field mapping should map signup form fields to: hostName, address, city, phone",
            example: {
              hostName: "volunteer_name",
              address: "volunteer_address",
            },
          },
        })
        setResults(diagnosticResults)
        setLoading(false)
        return
      }

      const fieldMap = eventType.signup_field_map as Record<string, string>
      const hasHostName = "hostName" in fieldMap
      const hasAddress = "address" in fieldMap

      if (!hasHostName || !hasAddress) {
        diagnosticResults.push({
          step: "3. Validate Field Mapping",
          status: "warning",
          message: `⚠️ Field mapping incomplete. Has hostName: ${hasHostName}, Has address: ${hasAddress}`,
          data: {
            current_mapping: fieldMap,
            required: ["hostName", "address"],
            recommended: ["hostName", "address", "city", "phone"],
          },
        })
      } else {
        diagnosticResults.push({
          step: "3. Validate Field Mapping",
          status: "pass",
          message: "✅ Field mapping configured",
          data: fieldMap,
        })
      }

      // Step 4: Check November signup responses
      const { data: novemberResponses } = await supabase
        .from("signup_responses")
        .select("id, created_at, month_value, year_value, response_data, member_id, members(full_name)")
        .eq("form_id", signupForm.id)
        .eq("month_value", 11)
        .eq("year_value", 2024)
        .order("created_at", { ascending: false })

      if (!novemberResponses || novemberResponses.length === 0) {
        diagnosticResults.push({
          step: "4. Check November Signup Responses",
          status: "fail",
          message: "❌ No signup responses for November 2024",
          data: {
            fix: "Someone needs to fill out the signup form for November, or check if responses were entered with wrong month_value",
          },
        })
        setResults(diagnosticResults)
        setLoading(false)
        return
      }

      diagnosticResults.push({
        step: "4. Check November Signup Responses",
        status: "pass",
        message: `✅ Found ${novemberResponses.length} response(s)`,
        data: novemberResponses.map((r: any) => ({
          id: r.id,
          created: new Date(r.created_at).toLocaleDateString(),
          member: r.members?.full_name || "Unknown",
          response_data: r.response_data,
        })),
      })

      // Step 5: Validate response data matches field mapping
      const firstResponse = novemberResponses[0]
      const responseData = firstResponse.response_data as Record<string, any>
      const mappedHostName = fieldMap.hostName
      const mappedAddress = fieldMap.address

      const hostNameValue = responseData[mappedHostName]
      const addressValue = responseData[mappedAddress]

      if (!hostNameValue || !addressValue) {
        diagnosticResults.push({
          step: "5. Validate Response Data",
          status: "fail",
          message: `❌ Response data missing mapped fields`,
          data: {
            field_map_expects: {
              hostName: mappedHostName,
              address: mappedAddress,
            },
            response_data_has: Object.keys(responseData),
            actual_values: {
              [mappedHostName]: hostNameValue || "MISSING",
              [mappedAddress]: addressValue || "MISSING",
            },
            fix: "Field mapping keys don't match actual response data keys. Update the field mapping.",
          },
        })
      } else {
        diagnosticResults.push({
          step: "5. Validate Response Data",
          status: "pass",
          message: `✅ Response data contains required fields`,
          data: {
            hostName: hostNameValue,
            address: addressValue,
            full_response: responseData,
          },
        })
      }

      // Step 6: Check current event instance for Nov 22
      const { data: bibleStudyEvent } = await supabase
        .from("events")
        .select("id, title, host_family_id, host_until")
        .eq("event_type_id", eventType.id)
        .limit(1)
        .single()

      if (bibleStudyEvent) {
        const { data: nov22Instance } = await supabase
          .from("event_instances")
          .select("id, host_family_id, instance_date, status")
          .eq("event_id", bibleStudyEvent.id)
          .eq("instance_date", "2024-11-22")
          .maybeSingle()

        let instanceStatus = "warning"
        let instanceMessage = ""

        if (!nov22Instance) {
          instanceMessage = "⚠️ No instance record for Nov 22 yet"
        } else if (nov22Instance.host_family_id) {
          instanceMessage = `✅ Instance has host override set (manual fix applied)`
        } else if (bibleStudyEvent.host_family_id) {
          const expired = bibleStudyEvent.host_until
            ? new Date(bibleStudyEvent.host_until + "T23:59:59") < new Date("2024-11-22T00:00:00")
            : false
          if (expired) {
            instanceMessage = `⚠️ Event-level host expired on ${bibleStudyEvent.host_until}`
            instanceStatus = "warning"
          } else {
            instanceMessage = `✅ Event-level host set (expires: ${bibleStudyEvent.host_until || "never"})`
            instanceStatus = "pass"
          }
        } else {
          instanceMessage = "⚠️ No host set (should auto-fill from signup)"
          instanceStatus = "warning"
        }

        diagnosticResults.push({
          step: "6. Check Nov 22 Instance Status",
          status: instanceStatus as any,
          message: instanceMessage,
          data: {
            event_title: bibleStudyEvent.title,
            event_host_family_id: bibleStudyEvent.host_family_id,
            event_host_until: bibleStudyEvent.host_until,
            instance_exists: !!nov22Instance,
            instance_host_family_id: nov22Instance?.host_family_id,
          },
        })
      }

      setResults(diagnosticResults)
    } catch (error) {
      diagnosticResults.push({
        step: "Error",
        status: "fail",
        message: String(error),
      })
      setResults(diagnosticResults)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Signup Auto-Fill Diagnostic</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This tool checks why Bible Study host auto-fill from signup forms may not be working for November.
          </p>

          <Button onClick={runDiagnostic} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Run Full Diagnostic
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Diagnostic Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, i) => (
                <div key={i} className="border-l-4 pl-4 py-2" style={{
                  borderColor: result.status === "pass" ? "#10b981" : result.status === "fail" ? "#ef4444" : "#f59e0b"
                }}>
                  <div className="flex items-start gap-2">
                    {result.status === "pass" && <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />}
                    {result.status === "fail" && <XCircle className="h-5 w-5 text-red-600 mt-0.5" />}
                    {result.status === "warning" && <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />}
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{result.step}</h3>
                      <p className="text-sm mt-1">{result.message}</p>
                      {result.data && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            View details
                          </summary>
                          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
