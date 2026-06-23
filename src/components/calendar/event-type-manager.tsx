"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { logAudit } from "@/lib/audit"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Settings2, Plus, Save, Loader2, X, Link2 } from "lucide-react"
import { IconPicker, getIconComponent } from "@/components/ui/icon-picker"
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

export function EventTypeManager({ onTypesChanged }: { onTypesChanged?: () => void }) {
  const [types, setTypes] = useState<TypeRow[]>([])
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [newTemplateId, setNewTemplateId] = useState("")
  const [newColor, setNewColor] = useState("#6B7280")
  const [newIcon, setNewIcon] = useState("CalendarDays")

  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editTemplateId, setEditTemplateId] = useState("")
  const [editColor, setEditColor] = useState("")
  const [editIcon, setEditIcon] = useState("")
  const [editSections, setEditSections] = useState<CustomSection[]>([])
  const [editShowInfoInBulletin, setEditShowInfoInBulletin] = useState(false)
  const [newSections, setNewSections] = useState<CustomSection[]>([])
  const [newShowInfoInBulletin, setNewShowInfoInBulletin] = useState(false)

  const [signupForms, setSignupForms] = useState<SignupFormOption[]>([])
  const [editLinkedFormId, setEditLinkedFormId] = useState("")
  const [editFieldMap, setEditFieldMap] = useState<SignupFieldMap | null>(null)
  const [newLinkedFormId, setNewLinkedFormId] = useState("")
  const [newFieldMap, setNewFieldMap] = useState<SignupFieldMap | null>(null)

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

  async function handleCreate() {
    if (!newName.trim()) { toast.error("Name is required"); return }
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("event_types").insert({
        name: newName.trim(),
        icon: newIcon || null,
        default_template_id: newTemplateId && newTemplateId !== "none" ? newTemplateId : null,
        color_scheme: { primary: newColor },
        info_sections: newSections.length > 0 ? newSections : null,
        show_info_in_bulletin: newShowInfoInBulletin,
        linked_signup_form_id: newLinkedFormId && newLinkedFormId !== "none" ? newLinkedFormId : null,
        signup_field_map: newFieldMap,
        is_active: true,
      } as never)
      if (error) { toast.error(`Failed: ${error.message}`); return }
      toast.success(`"${newName}" created`)
      logAudit("event_type_created", "event_types", null, { name: newName })
      setCreating(false)
      setNewName("")
      setNewTemplateId("")
      setNewColor("#6B7280")
      setNewSections([])
      setNewShowInfoInBulletin(false)
      setNewLinkedFormId("")
      setNewFieldMap(null)
      fetchTypes()
      onTypesChanged?.()
    } finally { setSaving(false) }
  }

  async function handleUpdate(id: string) {
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("event_types").update({
        name: editName.trim(),
        icon: editIcon || null,
        default_template_id: editTemplateId && editTemplateId !== "none" ? editTemplateId : null,
        color_scheme: { primary: editColor },
        info_sections: editSections.length > 0 ? editSections : null,
        show_info_in_bulletin: editShowInfoInBulletin,
        linked_signup_form_id: editLinkedFormId && editLinkedFormId !== "none" ? editLinkedFormId : null,
        signup_field_map: editFieldMap,
      } as never).eq("id", id)
      if (error) { toast.error(`Failed: ${error.message}`); return }
      toast.success("Updated")
      logAudit("event_type_updated", "event_types", id, { name: editName })
      setEditId(null)
      fetchTypes()
      onTypesChanged?.()
    } finally { setSaving(false) }
  }

  async function handleToggle(id: string, currentActive: boolean) {
    const supabase = createClient()
    const { error } = await supabase.from("event_types").update({ is_active: !currentActive } as never).eq("id", id)
    if (error) { toast.error(`Failed: ${error.message}`); return }
    toast.success(currentActive ? "Deactivated" : "Activated")
    const typeName = types.find((t) => t.id === id)?.name
    logAudit("event_type_toggled", "event_types", id, { name: typeName, is_active: !currentActive })
    fetchTypes()
    onTypesChanged?.()
  }

  const [dialogOpen, setDialogOpen] = useState(false)
  const active = types.filter((t) => t.is_active)
  const inactive = types.filter((t) => !t.is_active)

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setDialogOpen(!dialogOpen)}>
        <Settings2 className="size-3.5" />
        Event Types
      </Button>
      {dialogOpen && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-xl border bg-popover p-4 shadow-lg sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold">Event Types</h2>
              <p className="text-xs text-muted-foreground">Manage categories, template associations, and info sections.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setDialogOpen(false)}>Close</Button>
          </div>

          <div className="space-y-3">
          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-4">Loading...</p>
          ) : (
            <>
              {active.map((t) => {
                const tmpl = templates.find((tp) => tp.id === t.default_template_id)
                const isEditing = editId === t.id

                if (isEditing) {
                  return (
                    <div key={t.id} className="space-y-2 rounded-lg border bg-muted/30 p-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Name"
                        className="h-8 text-xs"
                      />
                      <Select value={editTemplateId} onValueChange={(v) => setEditTemplateId(v ?? "")}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Template">
                            {templates.find((tp) => tp.id === editTemplateId)?.name || "None"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {templates.map((tp) => (
                            <SelectItem key={tp.id} value={tp.id}>{tp.name}{tp.is_default === false ? " (custom)" : ""}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {COLOR_PRESETS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              className={`size-5 rounded-full border-2 transition-transform hover:scale-110 ${editColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                              style={{ backgroundColor: c }}
                              onClick={() => setEditColor(c)}
                            />
                          ))}
                        </div>
                        <IconPicker value={editIcon} onChange={setEditIcon} />
                      </div>
                      <CustomSectionsEditor
                        sections={editSections}
                        onChange={setEditSections}
                      />
                      <div className="flex items-center gap-2 rounded-lg border p-3 bg-muted/30">
                        <input
                          type="checkbox"
                          id={`show-info-bulletin-${t.id}`}
                          checked={editShowInfoInBulletin}
                          onChange={(e) => setEditShowInfoInBulletin(e.target.checked)}
                          className="size-4 rounded"
                        />
                        <Label htmlFor={`show-info-bulletin-${t.id}`} className="text-sm cursor-pointer">
                          Include info sections in bulletin
                        </Label>
                      </div>
                      <SignupLinkEditor
                        forms={signupForms}
                        selectedFormId={editLinkedFormId}
                        fieldMap={editFieldMap}
                        onFormChange={setEditLinkedFormId}
                        onFieldMapChange={setEditFieldMap}
                      />
                      <div className="flex gap-1.5">
                        <Button size="sm" className="h-7 text-xs" onClick={() => handleUpdate(t.id)} disabled={saving}>
                          {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                          Save
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditId(null)}>Cancel</Button>
                      </div>
                    </div>
                  )
                }

                const TypeIcon = getIconComponent(t.icon)
                return (
                  <div key={t.id} className="flex items-center gap-2 rounded-lg border px-2 py-1.5">
                    <span className="flex size-6 items-center justify-center rounded-md shrink-0" style={{ backgroundColor: t.color + "20", color: t.color }}>
                      <TypeIcon className="size-3.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate flex items-center gap-1">
                        {t.name}
                        {t.linked_signup_form_id && <Link2 className="size-2.5 text-primary" />}
                      </p>
                      {tmpl && <p className="text-[10px] text-muted-foreground truncate">{tmpl.name}</p>}
                    </div>
                    <button
                      type="button"
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                      onClick={() => { setEditId(t.id); setEditName(t.name); setEditIcon(t.icon || "CalendarDays"); setEditTemplateId(t.default_template_id || ""); setEditColor(t.color); setEditSections(t.info_sections ?? []); setEditShowInfoInBulletin(t.show_info_in_bulletin); setEditLinkedFormId(t.linked_signup_form_id || ""); setEditFieldMap(t.signup_field_map) }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-muted-foreground/50 hover:text-destructive"
                      onClick={() => handleToggle(t.id, true)}
                      title="Deactivate"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                )
              })}

              {inactive.length > 0 && (
                <div className="pt-1 space-y-1">
                  <p className="text-[10px] text-muted-foreground font-medium">Inactive</p>
                  {inactive.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 rounded-lg border border-dashed px-2 py-1 opacity-60">
                      <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                      <p className="flex-1 text-xs truncate">{t.name}</p>
                      <button
                        type="button"
                        className="text-[10px] text-primary hover:underline"
                        onClick={() => handleToggle(t.id, false)}
                      >
                        Reactivate
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Create new */}
              {creating ? (
                <div className="space-y-2 rounded-lg border bg-muted/30 p-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="New type name"
                    className="h-8 text-xs"
                  />
                  <Select value={newTemplateId} onValueChange={(v) => setNewTemplateId(v ?? "")}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Template">
                        {templates.find((tp) => tp.id === newTemplateId)?.name || "None"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {templates.map((tp) => (
                        <SelectItem key={tp.id} value={tp.id}>{tp.name}{tp.is_default === false ? " (custom)" : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {COLOR_PRESETS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={`size-5 rounded-full border-2 transition-transform hover:scale-110 ${newColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                          style={{ backgroundColor: c }}
                          onClick={() => setNewColor(c)}
                        />
                      ))}
                    </div>
                    <IconPicker value={newIcon} onChange={setNewIcon} />
                  </div>
                  <CustomSectionsEditor
                    sections={newSections}
                    onChange={setNewSections}
                  />
                  <div className="flex items-center gap-2 rounded-lg border p-3 bg-muted/30">
                    <input
                      type="checkbox"
                      id="new-show-info-bulletin"
                      checked={newShowInfoInBulletin}
                      onChange={(e) => setNewShowInfoInBulletin(e.target.checked)}
                      className="size-4 rounded"
                    />
                    <Label htmlFor="new-show-info-bulletin" className="text-sm cursor-pointer">
                      Include info sections in bulletin
                    </Label>
                  </div>
                  <SignupLinkEditor
                    forms={signupForms}
                    selectedFormId={newLinkedFormId}
                    fieldMap={newFieldMap}
                    onFormChange={setNewLinkedFormId}
                    onFieldMapChange={setNewFieldMap}
                  />
                  <div className="flex gap-1.5">
                    <Button size="sm" className="h-7 text-xs" onClick={handleCreate} disabled={saving || !newName.trim()}>
                      {saving ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                      Create
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCreating(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <Plus className="size-3" />
                  Add Type
                </button>
              )}
            </>
          )}
        </div>
        </div>
      )}
    </>
  )
}

// ── Signup Link Editor (inline sub-component) ─────────────────────────────

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
    <div className="space-y-2 rounded-md border border-dashed p-2">
      <div className="flex items-center gap-1.5">
        <Link2 className="size-3 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Linked Signup Form</span>
      </div>
      <Select value={selectedFormId || "none"} onValueChange={(v) => handleFormSelect(v ?? "none")}>
        <SelectTrigger className="h-7 text-xs">
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
        <div className="space-y-2 pl-1">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Match Field (month/date)</Label>
            <Select value={fieldMap.match_field} onValueChange={(v) => onFieldMapChange({ ...fieldMap, match_field: v ?? "" })}>
              <SelectTrigger className="h-6 text-[11px]">
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
            <Label className="text-[10px] text-muted-foreground">Field Mappings</Label>
            {fieldMap.mappings.map((m, i) => (
              <div key={i} className="flex items-center gap-1">
                <Select value={m.signup_field} onValueChange={(v) => updateMapping(i, "signup_field", v ?? "")}>
                  <SelectTrigger className="h-6 text-[11px] flex-1">
                    <SelectValue>{mappableFields.find((f) => f.id === m.signup_field)?.label || "Field..."}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {mappableFields.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.label} ({f.type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[10px] text-muted-foreground">→</span>
                <Select value={m.card_field} onValueChange={(v) => updateMapping(i, "card_field", (v ?? "host_name") as SignupFieldMapping["card_field"])}>
                  <SelectTrigger className="h-6 text-[11px] flex-1">
                    <SelectValue>{CARD_FIELD_OPTIONS.find((o) => o.value === m.card_field)?.label || "Card..."}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CARD_FIELD_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button type="button" onClick={() => removeMapping(i)} className="text-muted-foreground hover:text-destructive">
                  <X className="size-3" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addMapping}
              className="flex items-center gap-1 text-[10px] text-primary hover:underline"
            >
              <Plus className="size-2.5" /> Add mapping
            </button>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Location Index (for multi-location cards)</Label>
            <Input
              type="number"
              min={0}
              max={5}
              value={fieldMap.location_index ?? 0}
              onChange={(e) => onFieldMapChange({ ...fieldMap, location_index: parseInt(e.target.value) || 0 })}
              className="h-6 w-16 text-[11px]"
            />
          </div>
        </div>
      )}
    </div>
  )
}
