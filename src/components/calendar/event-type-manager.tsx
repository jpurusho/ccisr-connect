"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { logAudit } from "@/lib/audit"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
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
import { Settings2, Plus, Save, Loader2, X } from "lucide-react"
import { CustomSectionsEditor, type CustomSection } from "@/components/dashboard/communication-edit-forms"

interface TypeRow {
  id: string
  name: string
  is_active: boolean
  default_template_id: string | null
  color: string
  info_sections: CustomSection[]
}

interface TemplateOption {
  id: string
  name: string
  is_default?: boolean
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

  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editTemplateId, setEditTemplateId] = useState("")
  const [editColor, setEditColor] = useState("")
  const [editSections, setEditSections] = useState<CustomSection[]>([])
  const [newSections, setNewSections] = useState<CustomSection[]>([])

  const fetchTypes = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const [typesRes, templatesRes] = await Promise.all([
      supabase
        .from("event_types")
        .select("id, name, color_scheme, is_active, default_template_id, info_sections")
        .order("name")
        .returns<{ id: string; name: string; color_scheme: { primary: string } | null; is_active: boolean; default_template_id: string | null; info_sections: CustomSection[] | null }[]>(),
      supabase
        .from("email_templates")
        .select("id, name, is_default")
        .order("name")
        .returns<TemplateOption[]>(),
    ])
    setTypes(
      (typesRes.data ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        is_active: t.is_active,
        default_template_id: t.default_template_id,
        color: t.color_scheme?.primary ?? "#6B7280",
        info_sections: t.info_sections ?? [],
      }))
    )
    setTemplates(templatesRes.data ?? [])
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
        default_template_id: newTemplateId && newTemplateId !== "none" ? newTemplateId : null,
        color_scheme: { primary: newColor },
        info_sections: newSections.length > 0 ? newSections : null,
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
        default_template_id: editTemplateId && editTemplateId !== "none" ? editTemplateId : null,
        color_scheme: { primary: editColor },
        info_sections: editSections.length > 0 ? editSections : null,
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
    logAudit("event_type_toggled", "event_types", id, { is_active: !currentActive })
    fetchTypes()
    onTypesChanged?.()
  }

  const active = types.filter((t) => t.is_active)
  const inactive = types.filter((t) => !t.is_active)

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        <Settings2 className="size-3.5" />
        Event Types
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-[70vh] overflow-y-auto p-0" sideOffset={8}>
        <div className="border-b p-3 pb-2">
          <p className="text-sm font-semibold">Event Types</p>
          <p className="text-xs text-muted-foreground">
            Manage categories and template associations.
          </p>
        </div>

        <div className="p-3 space-y-2">
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
                      <CustomSectionsEditor
                        sections={editSections}
                        onChange={setEditSections}
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

                return (
                  <div key={t.id} className="flex items-center gap-2 rounded-lg border px-2 py-1.5">
                    <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{t.name}</p>
                      {tmpl && <p className="text-[10px] text-muted-foreground truncate">{tmpl.name}</p>}
                    </div>
                    <button
                      type="button"
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                      onClick={() => { setEditId(t.id); setEditName(t.name); setEditTemplateId(t.default_template_id || ""); setEditColor(t.color); setEditSections(t.info_sections ?? []) }}
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
                  <CustomSectionsEditor
                    sections={newSections}
                    onChange={setNewSections}
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
      </PopoverContent>
    </Popover>
  )
}
