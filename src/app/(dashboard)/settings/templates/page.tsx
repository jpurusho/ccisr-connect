"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Save, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { templateRegistry } from "@/lib/template-registry"
import { getIconComponent } from "@/components/ui/icon-picker"

interface TemplateSettings {
  id: string
  name: string
  type: "builtin" | "custom"
  show_in_dashboard: boolean
  display_order: number
  icon_name: string | null
  card_color: string | null
  emoji?: string
}

export default function TemplateSettingsPage() {
  const [templates, setTemplates] = useState<TemplateSettings[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    setLoading(true)
    const supabase = createClient()

    const [eventTypesRes, customTemplatesRes] = await Promise.all([
      supabase
        .from("event_types")
        .select("id, name, comm_type, show_in_dashboard, display_order, icon_name, card_color")
        .not("comm_type", "is", null)
        .order("display_order")
        .returns<{
          id: string
          name: string
          comm_type: string
          show_in_dashboard: boolean | null
          display_order: number | null
          icon_name: string | null
          card_color: string | null
        }[]>(),
      supabase
        .from("email_templates")
        .select("id, name, is_active, body_template")
        .eq("is_default", false)
        .order("name")
        .returns<{
          id: string
          name: string
          is_active: boolean | null
          body_template: string
        }[]>(),
    ])

    const allTemplates: TemplateSettings[] = []

    // Add built-in templates
    // When multiple event_types share comm_type, show only the "primary" (lowest display_order)
    type EventTypeRow = NonNullable<typeof eventTypesRes.data>[0]
    const primaryEventTypes = new Map<string, EventTypeRow>()
    if (eventTypesRes.data) {
      for (const et of eventTypesRes.data) {
        const existing = primaryEventTypes.get(et.comm_type!)
        if (existing) {
          // Keep the one with lower display_order
          if ((et.display_order ?? 999) < (existing.display_order ?? 999)) {
            primaryEventTypes.set(et.comm_type!, et)
          }
        } else {
          primaryEventTypes.set(et.comm_type!, et)
        }
      }

      for (const et of primaryEventTypes.values()) {
        const config = templateRegistry.get(et.comm_type!)
        allTemplates.push({
          id: et.id,
          name: config?.label || et.name,
          type: "builtin",
          show_in_dashboard: et.show_in_dashboard ?? true,
          display_order: et.display_order ?? 999,
          icon_name: et.icon_name,
          card_color: et.card_color,
        })
      }
    }

    // Add custom templates
    if (customTemplatesRes.data) {
      for (const ct of customTemplatesRes.data) {
        let emoji = "📋"
        try {
          const parsed = JSON.parse(ct.body_template)
          emoji = parsed.emoji || "📋"
        } catch { /* ignore */ }

        allTemplates.push({
          id: ct.id,
          name: ct.name,
          type: "custom",
          show_in_dashboard: ct.is_active !== false,
          display_order: 999, // Custom templates don't have display_order yet
          icon_name: null,
          card_color: null,
          emoji,
        })
      }
    }

    // Sort by display_order, then name
    allTemplates.sort((a, b) => {
      if (a.display_order !== b.display_order) return a.display_order - b.display_order
      return a.name.localeCompare(b.name)
    })

    setTemplates(allTemplates)
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()

    try {
      // Update built-in templates in event_types
      const builtinUpdates = templates
        .filter((t) => t.type === "builtin")
        .map((t) =>
          supabase
            .from("event_types")
            .update({
              show_in_dashboard: t.show_in_dashboard,
              display_order: t.display_order,
            } as never)
            .eq("id", t.id)
        )

      // Update custom templates in email_templates
      const customUpdates = templates
        .filter((t) => t.type === "custom")
        .map((t) =>
          supabase
            .from("email_templates")
            .update({ is_active: t.show_in_dashboard } as never)
            .eq("id", t.id)
        )

      const results = await Promise.all([...builtinUpdates, ...customUpdates])

      const errors = results.filter((r) => r.error)
      if (errors.length > 0) {
        toast.error(`Failed to save ${errors.length} template(s)`)
      } else {
        toast.success("Template settings saved successfully")
        fetchTemplates() // Reload to confirm
      }
    } catch (err) {
      toast.error("An error occurred while saving")
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  function toggleVisibility(id: string) {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, show_in_dashboard: !t.show_in_dashboard } : t))
    )
  }

  function updateDisplayOrder(id: string, order: number) {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, display_order: order } : t))
    )
  }

  if (loading) {
    return (
      <div className="container max-w-4xl py-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Template Settings</CardTitle>
          <CardDescription>
            Control which templates appear on the dashboard and their display order
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {templates.map((template) => {
              const Icon = template.icon_name ? getIconComponent(template.icon_name) : null

              return (
                <div
                  key={template.id}
                  className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  {/* Icon/Emoji */}
                  <div className="flex-shrink-0">
                    {template.type === "builtin" && Icon ? (
                      <Icon className="size-5" style={{ color: template.card_color || undefined }} />
                    ) : (
                      <span className="text-lg">{template.emoji}</span>
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{template.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{template.type}</p>
                  </div>

                  {/* Display Order (builtin only) */}
                  {template.type === "builtin" && (
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`order-${template.id}`} className="text-xs text-muted-foreground whitespace-nowrap">
                        Order
                      </Label>
                      <Input
                        id={`order-${template.id}`}
                        type="number"
                        value={template.display_order}
                        onChange={(e) => updateDisplayOrder(template.id, parseInt(e.target.value) || 0)}
                        className="w-20 h-8 text-sm"
                      />
                    </div>
                  )}

                  {/* Visibility Toggle */}
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`toggle-${template.id}`} className="text-xs text-muted-foreground">
                      {template.show_in_dashboard ? "Visible" : "Hidden"}
                    </Label>
                    <Switch
                      id={`toggle-${template.id}`}
                      checked={template.show_in_dashboard}
                      onCheckedChange={() => toggleVisibility(template.id)}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
