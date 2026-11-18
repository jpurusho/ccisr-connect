"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function ListFormsPage() {
  const [loading, setLoading] = useState(true)
  const [forms, setForms] = useState<any[]>([])
  const [eventTypes, setEventTypes] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const [formsRes, eventTypesRes] = await Promise.all([
        supabase
          .from("signup_forms")
          .select("id, name, slug, created_at, is_active")
          .order("created_at", { ascending: false }),

        supabase
          .from("event_types")
          .select("id, name, comm_type, linked_signup_form_id")
      ])

      setForms(formsRes.data || [])
      setEventTypes(eventTypesRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Loader2 className="animate-spin" />
      </div>
    )
  }

  const bibleStudyET = eventTypes.find(et => et.comm_type === "bible_study")

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Signup Forms</CardTitle>
        </CardHeader>
        <CardContent>
          {forms.length === 0 ? (
            <p className="text-muted-foreground">No signup forms found</p>
          ) : (
            <div className="space-y-4">
              {forms.map((form) => (
                <div key={form.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{form.name}</h3>
                      <p className="text-sm text-muted-foreground">Slug: {form.slug}</p>
                      <p className="text-xs text-muted-foreground mt-1">ID: {form.id}</p>
                      <p className="text-xs text-muted-foreground">
                        Created: {new Date(form.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      {form.is_active ? (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">Inactive</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bible Study Event Type</CardTitle>
        </CardHeader>
        <CardContent>
          {bibleStudyET ? (
            <div className="space-y-2">
              <p><strong>Name:</strong> {bibleStudyET.name}</p>
              <p><strong>Comm Type:</strong> {bibleStudyET.comm_type}</p>
              <p><strong>Linked Form ID:</strong> {bibleStudyET.linked_signup_form_id || "None"}</p>

              {bibleStudyET.linked_signup_form_id && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded">
                  <p className="text-sm font-semibold text-red-800 dark:text-red-300">⚠️ Broken Link Detected</p>
                  <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                    Linked form ID {bibleStudyET.linked_signup_form_id} does not exist in signup_forms table
                  </p>
                </div>
              )}

              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">💡 Fix Options</p>
                <ol className="text-xs text-blue-700 dark:text-blue-400 mt-2 space-y-1 list-decimal list-inside">
                  <li>Go to Event Types page → Edit "San Ramon Bible Study"</li>
                  <li>Link to an existing signup form (see list above)</li>
                  <li>Or create a new signup form for Bible Study hosting</li>
                  <li>Configure field mapping: hostName, address, city, phone</li>
                </ol>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Bible Study event type not found</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
