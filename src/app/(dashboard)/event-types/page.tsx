"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { logAudit } from "@/lib/audit"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Plus, Save, Loader2, Link2 } from "lucide-react"
import { IconPicker, getIconComponent, ICON_OPTIONS } from "@/components/ui/icon-picker"
import { CustomSectionsEditor, type CustomSection } from "@/components/dashboard/communication-edit-forms"
import type { SignupFieldMap, SignupFieldMapping } from "@/lib/signup/auto-fill"
import type { SignupFieldConfig } from "@/lib/signup/field-registry"

interface TypeRow {
  id: string
  name: string
  icon: string | null
  is_active: boolean
  default_template_id: string | null
  color: string
  info_sections: CustomSection[]
  show_info_in_bulletin: boolean
  linked_signup_form_id: string | null
  signup_field_map: SignupFieldMap | null
}

interface TemplateOption {
  id: string
  name: string
  is_default?: boolean
}

interface SignupFormOption {
  id: string
  title: string
  slug: string
  fields: SignupFieldConfig[]
}

const COLOR_PRESETS = ["#7C3AED", "#0D9488", "#D97706", "#DB2777", "#059669", "#4F46E5", "#DC2626", "#6B7280"]

export default function EventTypesPage() {
  const [types, setTypes] = useState<TypeRow[]>([])
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [signupForms, setSignupForms] = useState<SignupFormOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formName, setFormName] = useState("")
  const [formColor, setFormColor] = useState("#6B7280")
  const [formIcon, setFormIcon] = useState("CalendarDays")
  const [formTemplateId, setFormTemplateId] = useState("")
  const [formSections, setFormSections] = useState<CustomSection[]>([])
  const [formShowInfoInBulletin, setFormShowInfoInBulletin] = useState(false)
  const [formLinkedFormId, setFormLinkedFormId] = useState("")
  const [formFieldMap, setFormFieldMap] = useState<SignupFieldMap | null>(null)

  const fetchTypes = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const [typesRes, templatesRes, formsRes] = await Promise.all([
      supabase
        .from("event_types")
        .select("id, name, icon, color_scheme, is_active, default_template_id, info_sections, show_info_in_bulletin, linked_signup_form_id, signup_field_map")
        .order("name")
        .returns<{ id: string; name: string; icon: string | null; color_scheme: { primary: string } | null; is_active: boolean; default_template_id: string | null; info_sections: CustomSection[] | null; show_info_in_bulletin: boolean; linked_signup_form_id: string | null; signup_field_map: SignupFieldMap | null }[]>(),
      supabase
        .from("email_templates")
        .select("id, name, is_default")
        .order("name")
        .returns<TemplateOption[]>(),
      supabase
        .from("signup_forms")
        .select("id, title, slug, fields")
        .in("status", ["active", "closed"])
        .order("title")
        .returns<SignupFormOption[]>(),
    ])
    setTypes(
      (typesRes.data ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        icon: t.icon,
        is_active: t.is_active,
        default_template_id: t.default_template_id,
        color: t.color_scheme?.primary ?? "#6B7280",
        info_sections: t.info_sections ?? [],
        show_info_in_bulletin: t.show_info_in_bulletin,
        linked_signup_form_id: t.linked_signup_form_id,
        signup_field_map: t.signup_field_map,
      }))
    )
    setTemplates(templatesRes.data ?? [])
    setSignupForms(formsRes.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchTypes() }, [fetchTypes])

  function openCreate() {
    setEditId(null)
    setFormName("")
    setFormColor("#6B7280")
    setFormIcon("CalendarDays")
    setFormTemplateId("")
    setFormSections([])
    setFormShowInfoInBulletin(false)
    setFormLinkedFormId("")
    setFormFieldMap(null)
    setSheetOpen(true)
  }

  function openEdit(t: TypeRow) {
    setEditId(t.id)
    setFormName(t.name)
    setFormColor(t.color)
    setFormIcon(t.icon || "CalendarDays")
    setFormTemplateId(t.default_template_id || "")
    setFormSections(t.info_sections ?? [])
    setFormShowInfoInBulletin(t.show_info_in_bulletin)
    setFormLinkedFormId(t.linked_signup_form_id || "")
    setFormFieldMap(t.signup_field_map)
    setSheetOpen(true)
  }

  async function handleSave() {
    if (!formName.trim()) { toast.error("Name is required"); return }
    setSaving(true)
    try {
      const supabase = createClient()
      const payload = {
        name: formName.trim(),
        icon: formIcon || null,
        default_template_id: formTemplateId && formTemplateId !== "none" ? formTemplateId : null,
        color_scheme: { primary: formColor },
        info_sections: formSections.length > 0 ? formSections : null,
        show_info_in_bulletin: formShowInfoInBulletin,
        linked_signup_form_id: formLinkedFormId && formLinkedFormId !== "none" ? formLinkedFormId : null,
        signup_field_map: formFieldMap,
      }
      if (editId) {
        const { error } = await supabase.from("event_types").update(payload as never).eq("id", editId)
        if (error) { toast.error(`Failed: ${error.message}`); return }
        toast.success(`"${formName}" updated`)
        logAudit("event_type_updated", "event_types", editId, payload)
      } else {
        const { error } = await supabase.from("event_types").insert({ ...payload, is_active: true } as never)
        if (error) { toast.error(`Failed: ${error.message}`); return }
        toast.success(`"${formName}" created`)
        logAudit("event_type_created", "event_types", null, payload)
      }
      setSheetOpen(false)
      fetchTypes()
    } finally { setSaving(false) }
  }

  async function handleToggle(id: string, currentActive: boolean) {
    const supabase = createClient()
    const { error } = await supabase.from("event_types").update({ is_active: !currentActive } as never).eq("id", id)
    if (error) { toast.error(`Failed: ${error.message}`); return }
    toast.success(currentActive ? "Deactivated" : "Activated")
    logAudit("event_type_toggled", "event_types", id, { is_active: !currentActive })
    fetchTypes()
  }

  async function handleDelete(id: string, name: string) {
    const supabase = createClient()
    const { count } = await supabase.from("events").select("id", { count: "exact", head: true }).eq("event_type_id", id)
    if ((count ?? 0) > 0) {
      toast.error(`Cannot delete — ${count} event${count! > 1 ? "s" : ""} use this type. Deactivate instead.`)
      return
    }
    if (!confirm(`Delete "${name}" permanently?`)) return
    const { error } = await supabase.from("event_types").delete().eq("id", id)
    if (error) { toast.error(`Failed: ${error.message}`); return }
    toast.success(`"${name}" deleted`)
    logAudit("event_type_deleted", "event_types", id, { name })
    setSheetOpen(false)
    fetchTypes()
  }

  const active = types.filter((t) => t.is_active)
  const inactive = types.filter((t) => !t.is_active)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Event Types</h1>
          <p className="mt-1 text-muted-foreground">
            Manage event categories, template links, and bulletin settings.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          New Event Type
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((t) => {
              const TypeIcon = getIconComponent(t.icon)
              const tmpl = templates.find((tp) => tp.id === t.default_template_id)
              const form = signupForms.find((sf) => sf.id === t.linked_signup_form_id)
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openEdit(t)}
                  className="group relative flex flex-col gap-3 rounded-xl border p-4 text-left transition-all hover:shadow-md hover:border-primary/30"
                  style={{ borderLeftWidth: 4, borderLeftColor: t.color }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex size-10 items-center justify-center rounded-lg shrink-0"
                      style={{ backgroundColor: t.color + "18", color: t.color }}
                    >
                      <TypeIcon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{t.name}</p>
                      {tmpl && (
                        <p className="text-xs text-muted-foreground truncate">{tmpl.name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {form && (
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <Link2 className="size-2.5" />
                        {form.title}
                      </Badge>
                    )}
                    {t.info_sections.length > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        {t.info_sections.length} section{t.info_sections.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                    {t.show_info_in_bulletin && (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200">
                        In Bulletin
                      </Badge>
                    )}
                  </div>
                </button>
              )
            })}

            {/* Add new card */}
            <button
              type="button"
              onClick={openCreate}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-muted-foreground transition-all hover:border-primary/40 hover:text-primary"
            >
              <Plus className="size-6" />
              <span className="text-sm font-medium">New Event Type</span>
            </button>
          </div>

          {inactive.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">Inactive</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {inactive.map((t) => {
                  const TypeIcon = getIconComponent(t.icon)
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 rounded-xl border border-dashed p-3 opacity-60"
                    >
                      <span
                        className="flex size-8 items-center justify-center rounded-md shrink-0"
                        style={{ backgroundColor: t.color + "18", color: t.color }}
                      >
                        <TypeIcon className="size-4" />
                      </span>
                      <p className="flex-1 text-sm font-medium truncate">{t.name}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleToggle(t.id, false)}
                      >
                        Reactivate
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit / Create Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editId ? "Edit Event Type" : "New Event Type"}</SheetTitle>
            <SheetDescription>
              {editId ? "Update settings for this event type." : "Create a new event type for scheduling and communications."}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Youth Group"
              />
            </div>

            {/* Color + Icon */}
            <div className="space-y-1.5">
              <Label>Color &amp; Icon</Label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`size-7 rounded-full border-2 transition-transform hover:scale-110 ${formColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setFormColor(c)}
                    />
                  ))}
                </div>
                <IconPicker value={formIcon} onChange={setFormIcon} />
              </div>
            </div>

            {/* Template */}
            <div className="space-y-1.5">
              <Label>Linked Template</Label>
              <Select value={formTemplateId || "none"} onValueChange={(v) => setFormTemplateId(v === "none" ? "" : (v ?? ""))}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {templates.map((tp) => (
                    <SelectItem key={tp.id} value={tp.id}>{tp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Info Sections */}
            <div className="space-y-1.5">
              <Label>Info Sections</Label>
              <CustomSectionsEditor
                sections={formSections}
                onChange={setFormSections}
              />
            </div>

            {/* Show in bulletin */}
            <div className="flex items-center gap-2 rounded-lg border p-3">
              <input
                type="checkbox"
                id="show-info-bulletin"
                checked={formShowInfoInBulletin}
                onChange={(e) => setFormShowInfoInBulletin(e.target.checked)}
                className="size-4 rounded"
              />
              <Label htmlFor="show-info-bulletin" className="cursor-pointer">
                Include info sections in bulletin
              </Label>
            </div>

            {/* Signup form link */}
            <SignupLinkEditor
              forms={signupForms}
              selectedFormId={formLinkedFormId}
              fieldMap={formFieldMap}
              onFormChange={setFormLinkedFormId}
              onFieldMapChange={setFormFieldMap}
            />

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button onClick={handleSave} disabled={saving || !formName.trim()}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {editId ? "Save Changes" : "Create"}
              </Button>
              {editId && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const t = types.find((x) => x.id === editId)
                      if (t) { handleToggle(t.id, t.is_active); setSheetOpen(false) }
                    }}
                  >
                    {types.find((x) => x.id === editId)?.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto text-destructive hover:text-destructive"
                    onClick={() => handleDelete(editId, formName)}
                  >
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ── Signup Link Editor ─────────────────────────────────────────────────────

const CARD_FIELD_OPTIONS: { value: SignupFieldMapping["card_field"]; label: string }[] = [
  { value: "host_name", label: "Host Name" },
  { value: "host_address", label: "Host Address" },
  { value: "host_city", label: "City" },
  { value: "host_phone", label: "Phone" },
]

function SignupLinkEditor({
  forms,
  selectedFormId,
  fieldMap,
  onFormChange,
  onFieldMapChange,
}: {
  forms: SignupFormOption[]
  selectedFormId: string
  fieldMap: SignupFieldMap | null
  onFormChange: (id: string) => void
  onFieldMapChange: (map: SignupFieldMap | null) => void
}) {
  const selectedForm = forms.find((f) => f.id === selectedFormId)
  const fields = selectedForm?.fields ?? []
  const matchableFields = fields.filter((f) => f.type === "month_picker" || f.type === "date")
  const mappableFields = fields.filter((f) => f.type === "member_lookup" || f.type === "text" || f.type === "address" || f.type === "phone")

  function handleFormSelect(formId: string) {
    onFormChange(formId)
    if (formId && formId !== "none") {
      const form = forms.find((f) => f.id === formId)
      if (form) {
        const matchField = form.fields.find((f) => f.type === "month_picker" || f.type === "date")
        const memberField = form.fields.find((f) => f.type === "member_lookup")
        const addressField = form.fields.find((f) => f.type === "address")
        const phoneField = form.fields.find((f) => f.type === "phone")
        const mappings: SignupFieldMapping[] = []
        if (memberField) mappings.push({ signup_field: memberField.id, card_field: "host_name" })
        if (addressField) mappings.push({ signup_field: addressField.id, card_field: "host_address" })
        if (phoneField) mappings.push({ signup_field: phoneField.id, card_field: "host_phone" })
        onFieldMapChange({
          match_field: matchField?.id ?? "",
          location_index: 0,
          mappings,
        })
      }
    } else {
      onFieldMapChange(null)
    }
  }

  function updateMapping(idx: number, key: keyof SignupFieldMapping, value: string) {
    if (!fieldMap) return
    const updated = [...fieldMap.mappings]
    updated[idx] = { ...updated[idx], [key]: value }
    onFieldMapChange({ ...fieldMap, mappings: updated })
  }

  function addMapping() {
    if (!fieldMap) return
    onFieldMapChange({
      ...fieldMap,
      mappings: [...fieldMap.mappings, { signup_field: "", card_field: "host_name" }],
    })
  }

  function removeMapping(idx: number) {
    if (!fieldMap) return
    onFieldMapChange({
      ...fieldMap,
      mappings: fieldMap.mappings.filter((_, i) => i !== idx),
    })
  }

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center gap-1.5">
        <Link2 className="size-3.5 text-muted-foreground" />
        <Label>Linked Signup Form</Label>
      </div>
      <Select value={selectedFormId || "none"} onValueChange={(v) => handleFormSelect(v ?? "none")}>
        <SelectTrigger>
          <SelectValue placeholder="None">
            {selectedForm?.title || "None"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          {forms.map((f) => (
            <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedForm && fieldMap && (
        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Match Field (month/date)</Label>
            <Select value={fieldMap.match_field} onValueChange={(v) => onFieldMapChange({ ...fieldMap, match_field: v ?? "" })}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue>{fields.find((f) => f.id === fieldMap.match_field)?.label || "Select..."}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {matchableFields.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.label} ({f.type})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Field Mappings</Label>
            {fieldMap.mappings.map((m, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Select value={m.signup_field} onValueChange={(v) => updateMapping(i, "signup_field", v ?? "")}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue>{mappableFields.find((f) => f.id === m.signup_field)?.label || "Field..."}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {mappableFields.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.label} ({f.type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">&rarr;</span>
                <Select value={m.card_field} onValueChange={(v) => updateMapping(i, "card_field", (v ?? "host_name") as SignupFieldMapping["card_field"])}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue>{CARD_FIELD_OPTIONS.find((o) => o.value === m.card_field)?.label || "Card..."}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CARD_FIELD_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon-sm" onClick={() => removeMapping(i)} className="text-muted-foreground hover:text-destructive shrink-0">
                  &times;
                </Button>
              </div>
            ))}
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={addMapping}>
              <Plus className="size-3" /> Add mapping
            </Button>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Location Index (multi-location cards)</Label>
            <Input
              type="number"
              min={0}
              max={5}
              value={fieldMap.location_index ?? 0}
              onChange={(e) => onFieldMapChange({ ...fieldMap, location_index: parseInt(e.target.value) || 0 })}
              className="h-8 w-20 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  )
}
