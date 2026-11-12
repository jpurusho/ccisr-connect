"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, Loader2, AlertTriangle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { templateRegistry } from "@/lib/template-registry"

interface EventType {
  id: string
  name: string
  comm_type: string | null
  default_template_id: string | null
  show_in_dashboard: boolean
  display_order: number
  icon_name: string | null
  card_color: string | null
  // Joined data
  custom_template_name?: string
  event_count: number
}

interface CustomTemplate {
  id: string
  name: string
}

type FormMode = "create" | "edit"

export default function EventTypesPage() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [formMode, setFormMode] = useState<FormMode>("create")
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null)

  // Form state
  const [formName, setFormName] = useState("")
  const [formTemplateType, setFormTemplateType] = useState<"builtin" | "custom" | "none">("none")
  const [formBuiltinTemplate, setFormBuiltinTemplate] = useState("")
  const [formCustomTemplate, setFormCustomTemplate] = useState("")
  const [formShowInDashboard, setFormShowInDashboard] = useState(true)
  const [formDisplayOrder, setFormDisplayOrder] = useState(0)

  const builtinTemplates = templateRegistry.getAll().map((t) => ({
    type: t.type,
    label: t.label,
  }))

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const supabase = createClient()

    const [eventTypesRes, customTemplatesRes, eventsCountRes] = await Promise.all([
      supabase
        .from("event_types")
        .select("id, name, comm_type, default_template_id, show_in_dashboard, display_order, icon_name, card_color")
        .order("display_order")
        .returns<{
          id: string
          name: string
          comm_type: string | null
          default_template_id: string | null
          show_in_dashboard: boolean | null
          display_order: number | null
          icon_name: string | null
          card_color: string | null
        }[]>(),
      supabase
        .from("email_templates")
        .select("id, name")
        .eq("is_default", false)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("events")
        .select("event_type_id")
        .gte("start_date", new Date().toISOString().split("T")[0]),
    ])

    if (eventTypesRes.error) {
      toast.error("Failed to load event types")
      console.error(eventTypesRes.error)
    }

    if (customTemplatesRes.error) {
      toast.error("Failed to load custom templates")
      console.error(customTemplatesRes.error)
    }

    // Count events per event_type
    const eventCounts: Record<string, number> = {}
    if (eventsCountRes.data) {
      for (const evt of eventsCountRes.data) {
        eventCounts[evt.event_type_id] = (eventCounts[evt.event_type_id] || 0) + 1
      }
    }

    // Get custom template names
    const templateNames: Record<string, string> = {}
    if (customTemplatesRes.data) {
      for (const ct of customTemplatesRes.data) {
        templateNames[ct.id] = ct.name
      }
    }

    const enriched: EventType[] = (eventTypesRes.data || []).map((et) => ({
      id: et.id,
      name: et.name,
      comm_type: et.comm_type,
      default_template_id: et.default_template_id,
      show_in_dashboard: et.show_in_dashboard ?? true,
      display_order: et.display_order ?? 999,
      icon_name: et.icon_name,
      card_color: et.card_color,
      custom_template_name: et.default_template_id ? templateNames[et.default_template_id] : undefined,
      event_count: eventCounts[et.id] || 0,
    }))

    setEventTypes(enriched)
    setCustomTemplates(customTemplatesRes.data || [])
    setLoading(false)
  }

  function openCreateDialog() {
    setFormMode("create")
    setFormName("")
    setFormTemplateType("none")
    setFormBuiltinTemplate("")
    setFormCustomTemplate("")
    setFormShowInDashboard(true)
    setFormDisplayOrder(
      eventTypes.length > 0 ? Math.max(...eventTypes.map((t) => t.display_order)) + 10 : 10
    )
    setDialogOpen(true)
  }

  function openEditDialog(eventType: EventType) {
    setFormMode("edit")
    setSelectedEventType(eventType)
    setFormName(eventType.name)

    if (eventType.comm_type) {
      setFormTemplateType("builtin")
      setFormBuiltinTemplate(eventType.comm_type)
      setFormCustomTemplate("")
    } else if (eventType.default_template_id) {
      setFormTemplateType("custom")
      setFormBuiltinTemplate("")
      setFormCustomTemplate(eventType.default_template_id)
    } else {
      setFormTemplateType("none")
      setFormBuiltinTemplate("")
      setFormCustomTemplate("")
    }

    setFormShowInDashboard(eventType.show_in_dashboard)
    setFormDisplayOrder(eventType.display_order)
    setDialogOpen(true)
  }

  function openDeleteDialog(eventType: EventType) {
    setSelectedEventType(eventType)
    setDeleteDialogOpen(true)
  }

  async function handleSave() {
    if (!formName.trim()) {
      toast.error("Name is required")
      return
    }

    setSaving(true)
    const supabase = createClient()

    const data: any = {
      name: formName.trim(),
      show_in_dashboard: formShowInDashboard,
      display_order: formDisplayOrder,
    }

    // Set template association
    if (formTemplateType === "builtin") {
      data.comm_type = formBuiltinTemplate || null
      data.default_template_id = null
    } else if (formTemplateType === "custom") {
      data.comm_type = null
      data.default_template_id = formCustomTemplate || null
    } else {
      data.comm_type = null
      data.default_template_id = null
    }

    try {
      if (formMode === "create") {
        const { error } = await supabase.from("event_types").insert(data)
        if (error) throw error
        toast.success("Event type created successfully")
      } else {
        const { error } = await supabase
          .from("event_types")
          .update(data)
          .eq("id", selectedEventType!.id)
        if (error) throw error
        toast.success("Event type updated successfully")
      }

      setDialogOpen(false)
      fetchData()
    } catch (err) {
      console.error(err)
      toast.error("Failed to save event type")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selectedEventType) return

    setSaving(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("event_types")
        .delete()
        .eq("id", selectedEventType.id)

      if (error) throw error

      toast.success("Event type deleted successfully")
      setDeleteDialogOpen(false)
      fetchData()
    } catch (err) {
      console.error(err)
      toast.error("Failed to delete event type")
    } finally {
      setSaving(false)
    }
  }

  function getTemplateLabel(eventType: EventType): string {
    if (eventType.comm_type) {
      const builtin = builtinTemplates.find((t) => t.type === eventType.comm_type)
      return builtin ? `${builtin.label} (built-in)` : `${eventType.comm_type} (built-in)`
    }
    if (eventType.custom_template_name) {
      return `${eventType.custom_template_name} (custom)`
    }
    return "No template"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Event Types</CardTitle>
              <CardDescription>
                Manage event types and their associated templates. Event types appear in the calendar and dashboard.
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="size-4 mr-2" />
              New Event Type
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {eventTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No event types yet. Create one to get started.
              </p>
            ) : (
              eventTypes.map((et) => (
                <div
                  key={et.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium">{et.name}</h3>
                      {et.show_in_dashboard ? (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                          Visible
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          Hidden
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <p className="text-sm text-muted-foreground">
                        Template: {getTemplateLabel(et)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Order: {et.display_order}
                      </p>
                      {et.event_count > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {et.event_count} upcoming {et.event_count === 1 ? "event" : "events"}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(et)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(et)}
                      disabled={et.event_count > 0}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {formMode === "create" ? "Create Event Type" : "Edit Event Type"}
            </DialogTitle>
            <DialogDescription>
              Event types appear in the calendar and can be linked to dashboard templates.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Youth Group"
              />
            </div>

            {/* Template Type */}
            <div className="space-y-2">
              <Label htmlFor="template-type">Template Association</Label>
              <Select value={formTemplateType} onValueChange={(v: any) => setFormTemplateType(v)}>
                <SelectTrigger id="template-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template (calendar only)</SelectItem>
                  <SelectItem value="builtin">Built-in template</SelectItem>
                  <SelectItem value="custom">Custom template</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Built-in templates have predefined forms. Custom templates are user-created.
              </p>
            </div>

            {/* Built-in Template Selector */}
            {formTemplateType === "builtin" && (
              <div className="space-y-2">
                <Label htmlFor="builtin-template">Built-in Template *</Label>
                <Select value={formBuiltinTemplate} onValueChange={(v) => setFormBuiltinTemplate(v || "")}>
                  <SelectTrigger id="builtin-template">
                    <SelectValue placeholder="Select template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {builtinTemplates.map((t) => (
                      <SelectItem key={t.type} value={t.type}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Custom Template Selector */}
            {formTemplateType === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="custom-template">Custom Template *</Label>
                <Select value={formCustomTemplate} onValueChange={(v) => setFormCustomTemplate(v || "")}>
                  <SelectTrigger id="custom-template">
                    <SelectValue placeholder="Select template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customTemplates.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No custom templates available
                      </SelectItem>
                    ) : (
                      customTemplates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {customTemplates.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Create custom templates at /templates first
                  </p>
                )}
              </div>
            )}

            {/* Show in Dashboard */}
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="show-dashboard">Show in Dashboard</Label>
                <p className="text-xs text-muted-foreground">
                  {formTemplateType === "none"
                    ? "Only affects generic event cards (no template required)"
                    : "Display this event type as a card on the dashboard"
                  }
                </p>
              </div>
              <Switch
                id="show-dashboard"
                checked={formShowInDashboard}
                onCheckedChange={setFormShowInDashboard}
              />
            </div>

            {/* Display Order */}
            <div className="space-y-2">
              <Label htmlFor="display-order">Display Order</Label>
              <Input
                id="display-order"
                type="number"
                value={formDisplayOrder}
                onChange={(e) => setFormDisplayOrder(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Lower numbers appear first on the dashboard
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                formMode === "create" ? "Create" : "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event Type?</DialogTitle>
            <DialogDescription>
              {selectedEventType?.event_count && selectedEventType.event_count > 0 ? (
                <div className="flex items-start gap-2 text-orange-600">
                  <AlertTriangle className="size-5 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Cannot delete this event type</p>
                    <p className="text-sm">
                      This event type has {selectedEventType.event_count} upcoming{" "}
                      {selectedEventType.event_count === 1 ? "event" : "events"}. Delete or reassign those events first.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  Are you sure you want to delete <strong>{selectedEventType?.name}</strong>?
                  This action cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            {(!selectedEventType?.event_count || selectedEventType.event_count === 0) && (
              <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
