"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { logAudit } from "@/lib/audit"
import { generateSlug } from "@/lib/signup/slug"
import { VerseLookup } from "@/components/shared/verse-lookup"
import {
  FIELD_TYPE_META,
  createFieldConfig,
  type SignupFieldConfig,
  type SignupFieldType,
} from "@/lib/signup/field-registry"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  Plus,
  Save,
  Loader2,
  Trash2,
  Copy,
  ExternalLink,
  ClipboardList,
  ChevronUp,
  ChevronDown,
  X,
  Eye,
  Pencil,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────────

interface FormRow {
  id: string
  slug: string
  title: string
  description: string | null
  duration_type: "event_date" | "month" | "date_range"
  event_date: string | null
  target_month: number | null
  target_year: number | null
  start_date: string | null
  end_date: string | null
  theme: { primaryColor?: string; emoji?: string; verse?: string; verseRef?: string; verseBgColor?: string }
  fields: SignupFieldConfig[]
  status: "draft" | "active" | "closed" | "archived"
  visibility: "public_link" | "admin_only"
  member_autocomplete: boolean
  max_submissions: number | null
  allow_duplicates: boolean
  rate_limit_per_hour: number | null
  created_at: string
  response_count?: number
}

const COLOR_PRESETS = ["#7C3AED", "#0D9488", "#D97706", "#DB2777", "#059669", "#4F46E5", "#DC2626", "#6B7280"]

const STATUS_COLORS: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  draft: "secondary",
  closed: "outline",
  archived: "outline",
}

const MONTHS_LIST = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function SignupsPage() {
  const router = useRouter()
  const [forms, setForms] = useState<FormRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingForm, setEditingForm] = useState<FormRow | null>(null)

  const fetchForms = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: formsData } = await supabase
      .from("signup_forms")
      .select("id, slug, title, description, duration_type, event_date, target_month, target_year, start_date, end_date, theme, fields, status, visibility, member_autocomplete, max_submissions, allow_duplicates, rate_limit_per_hour, created_at")
      .order("created_at", { ascending: false })

    if (formsData) {
      // Get response counts
      const { data: counts } = await supabase
        .from("signup_responses")
        .select("form_id")
        .returns<{ form_id: string }[]>()

      const countMap: Record<string, number> = {}
      if (counts) {
        for (const r of counts) {
          countMap[r.form_id] = (countMap[r.form_id] || 0) + 1
        }
      }

      setForms(
        (formsData as unknown as FormRow[]).map((f) => ({
          ...f,
          theme: f.theme ?? {},
          fields: f.fields ?? [],
          response_count: countMap[f.id] || 0,
        }))
      )
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchForms() }, [fetchForms])

  function handleCreate() {
    setEditingForm(null)
    setDialogOpen(true)
  }

  function handleEdit(form: FormRow) {
    setEditingForm(form)
    setDialogOpen(true)
  }

  async function handleDelete(form: FormRow) {
    if (!confirm(`Delete "${form.title}"? This will also delete all responses.`)) return
    const supabase = createClient()
    const { error } = await supabase.from("signup_forms").delete().eq("id", form.id)
    if (error) {
      toast.error(`Failed: ${error.message}`)
    } else {
      toast.success("Form deleted")
      logAudit("signup_form_deleted", "signup_forms", form.id, { title: form.title })
      setForms((prev) => prev.filter((f) => f.id !== form.id))
    }
  }

  function copyLink(slug: string) {
    const url = `${window.location.origin}/signup/${slug}`
    navigator.clipboard.writeText(url)
    toast.success("Link copied to clipboard")
  }

  function previewForm(slug: string) {
    window.open(`/signup/${slug}?preview=1`, "_blank")
  }

  async function toggleStatus(form: FormRow) {
    const newStatus = form.status === "active" ? "closed" : "active"
    const supabase = createClient()
    const { error } = await supabase
      .from("signup_forms")
      .update({ status: newStatus } as never)
      .eq("id", form.id)
    if (error) {
      toast.error(`Failed: ${error.message}`)
      return
    }
    toast.success(newStatus === "active" ? "Form activated" : "Form deactivated")
    logAudit("signup_form_status_changed", "signup_forms", form.id, { title: form.title, from: form.status, to: newStatus })
    setForms((prev) => prev.map((f) => f.id === form.id ? { ...f, status: newStatus } : f))
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="size-5" />
            Signup Forms
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create and manage public signup forms
          </p>
        </div>
        <Button size="sm" onClick={handleCreate}>
          <Plus className="size-3.5" />
          New Form
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : forms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="size-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No signup forms yet</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Create a form to collect signups, RSVPs, or registrations
            </p>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="size-3.5" />
              Create First Form
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <Card key={form.id} className="relative group">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {form.theme.emoji && <span className="text-base">{form.theme.emoji}</span>}
                      <h3 className="text-sm font-medium truncate">{form.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={STATUS_COLORS[form.status] || "secondary"} className="text-[10px]">
                        {form.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {form.response_count} response{form.response_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  {form.theme.primaryColor && (
                    <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: form.theme.primaryColor }} />
                  )}
                </div>

                <div className="text-[11px] text-muted-foreground truncate">
                  /signup/{form.slug}
                </div>

                <div className="text-[10px] text-muted-foreground">
                  Created {format(new Date(form.created_at), "MMM d, yyyy")}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 pt-1 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 text-xs ${form.status === "active" ? "text-amber-600" : "text-emerald-600"}`}
                    onClick={() => toggleStatus(form)}
                  >
                    {form.status === "active" ? "Deactivate" : "Activate"}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleEdit(form)}>
                    <Pencil className="size-3" />
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => router.push(`/signups/${form.id}`)}>
                    <Eye className="size-3" />
                    Responses
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="h-7 w-7" onClick={() => previewForm(form.slug)} title="Preview">
                    <ExternalLink className="size-3" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="h-7 w-7" onClick={() => copyLink(form.slug)} title="Copy link">
                    <Copy className="size-3" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="h-7 w-7 text-destructive" onClick={() => handleDelete(form)} title="Delete">
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editForm={editingForm}
        onSaved={() => { setDialogOpen(false); fetchForms() }}
      />
    </div>
  )
}

// ── Form Dialog ────────────────────────────────────────────────────────────────

function FormDialog({
  open,
  onOpenChange,
  editForm,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editForm: FormRow | null
  onSaved: () => void
}) {
  const isEdit = !!editForm

  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [slug, setSlug] = useState("")
  const [durationType, setDurationType] = useState<"event_date" | "month" | "date_range">("date_range")
  const [eventDate, setEventDate] = useState("")
  const [targetMonth, setTargetMonth] = useState<number>(1)
  const [targetYear, setTargetYear] = useState<number>(new Date().getFullYear())
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [status, setStatus] = useState<"draft" | "active" | "closed">("draft")
  const [visibility, setVisibility] = useState<"public_link" | "admin_only">("admin_only")
  const [memberAutocomplete, setMemberAutocomplete] = useState(false)
  const [maxSubmissions, setMaxSubmissions] = useState<string>("")
  const [allowDuplicates, setAllowDuplicates] = useState(false)
  const [rateLimitPerHour, setRateLimitPerHour] = useState<string>("10")
  const [primaryColor, setPrimaryColor] = useState("#7C3AED")
  const [emoji, setEmoji] = useState("")
  const [verse, setVerse] = useState("")
  const [verseRef, setVerseRef] = useState("")
  const [verseBgColor, setVerseBgColor] = useState("")
  const [fields, setFields] = useState<SignupFieldConfig[]>([])

  // Populate form when editForm changes
  useEffect(() => {
    if (editForm) {
      setTitle(editForm.title)
      setDescription(editForm.description || "")
      setSlug(editForm.slug)
      setDurationType(editForm.duration_type)
      setEventDate(editForm.event_date || "")
      setTargetMonth(editForm.target_month || 1)
      setTargetYear(editForm.target_year || new Date().getFullYear())
      setStartDate(editForm.start_date || "")
      setEndDate(editForm.end_date || "")
      setStatus(editForm.status === "archived" ? "closed" : editForm.status)
      setVisibility(editForm.visibility)
      setMemberAutocomplete(editForm.member_autocomplete)
      setMaxSubmissions(editForm.max_submissions ? String(editForm.max_submissions) : "")
      setAllowDuplicates(editForm.allow_duplicates)
      setRateLimitPerHour(editForm.rate_limit_per_hour ? String(editForm.rate_limit_per_hour) : "10")
      setPrimaryColor(editForm.theme.primaryColor || "#7C3AED")
      setEmoji(editForm.theme.emoji || "")
      setVerse(editForm.theme.verse || "")
      setVerseRef(editForm.theme.verseRef || "")
      setVerseBgColor(editForm.theme.verseBgColor || "")
      setFields(editForm.fields || [])
    } else {
      setTitle("")
      setDescription("")
      setSlug(generateSlug())
      setDurationType("date_range")
      setEventDate("")
      setTargetMonth(1)
      setTargetYear(new Date().getFullYear())
      setStartDate("")
      setEndDate("")
      setStatus("draft")
      setVisibility("admin_only")
      setMemberAutocomplete(false)
      setMaxSubmissions("")
      setAllowDuplicates(false)
      setPrimaryColor("#7C3AED")
      setEmoji("")
      setFields([])
    }
  }, [editForm, open])

  function handleTitleChange(val: string) {
    setTitle(val)
    if (!isEdit) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || generateSlug())
    }
  }

  async function handleSave() {
    if (!title.trim()) { toast.error("Title is required"); return }
    if (!slug.trim()) { toast.error("Slug is required"); return }

    setSaving(true)
    try {
      const supabase = createClient()
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        slug: slug.trim(),
        duration_type: durationType,
        event_date: durationType === "event_date" ? eventDate || null : null,
        target_month: durationType === "month" ? targetMonth : null,
        target_year: durationType === "month" ? targetYear : null,
        start_date: durationType === "date_range" ? startDate || null : null,
        end_date: durationType === "date_range" ? endDate || null : null,
        theme: { primaryColor, emoji: emoji || undefined, verse: verse || undefined, verseRef: verseRef || undefined, verseBgColor: verseBgColor || undefined },
        fields,
        status,
        visibility,
        member_autocomplete: memberAutocomplete,
        max_submissions: maxSubmissions ? parseInt(maxSubmissions, 10) : null,
        allow_duplicates: allowDuplicates,
        rate_limit_per_hour: rateLimitPerHour ? parseInt(rateLimitPerHour, 10) : 10,
      }

      if (isEdit) {
        const { error } = await supabase.from("signup_forms").update(payload as never).eq("id", editForm.id)
        if (error) { toast.error(`Failed: ${error.message}`); return }
        toast.success("Form updated")
        logAudit("signup_form_updated", "signup_forms", editForm.id, { title: title.trim() })
      } else {
        const { error } = await supabase.from("signup_forms").insert(payload as never)
        if (error) { toast.error(`Failed: ${error.message}`); return }
        toast.success("Form created")
        logAudit("signup_form_created", "signup_forms", null, { title: title.trim() })
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  function addField(type: SignupFieldType) {
    setFields((prev) => [...prev, createFieldConfig(type, prev.length)])
  }

  function updateField(index: number, updates: Partial<SignupFieldConfig>) {
    setFields((prev) => prev.map((f, i) => i === index ? { ...f, ...updates } as SignupFieldConfig : f))
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index).map((f, i) => ({ ...f, order: i })))
  }

  function moveField(index: number, direction: -1 | 1) {
    setFields((prev) => {
      const newIndex = index + direction
      if (newIndex < 0 || newIndex >= prev.length) return prev
      const arr = [...prev]
      ;[arr[index], arr[newIndex]] = [arr[newIndex], arr[index]]
      return arr.map((f, i) => ({ ...f, order: i }))
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Form" : "New Signup Form"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the form configuration" : "Create a new public signup form"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title & Description */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. Sunday Service Signup"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Slug</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="auto-generated"
                className="h-8 text-sm font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description shown on the form"
              rows={2}
              className="text-sm"
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label className="text-xs">Duration Type</Label>
            <Select value={durationType} onValueChange={(v) => setDurationType(v as typeof durationType)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="event_date">Single Event Date</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="date_range">Date Range</SelectItem>
              </SelectContent>
            </Select>

            {durationType === "event_date" && (
              <Input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="h-8 text-xs w-fit"
              />
            )}
            {durationType === "month" && (
              <div className="flex gap-2">
                <Select value={String(targetMonth)} onValueChange={(v) => setTargetMonth(parseInt(v ?? "1", 10))}>
                  <SelectTrigger className="h-8 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS_LIST.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={targetYear}
                  onChange={(e) => setTargetYear(parseInt(e.target.value, 10))}
                  className="h-8 text-xs w-20"
                />
              </div>
            )}
            {durationType === "date_range" && (
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 text-xs"
                />
                <span className="text-xs text-muted-foreground self-center">to</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            )}
          </div>

          {/* Status & Visibility */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Visibility</Label>
              <Select value={visibility} onValueChange={(v) => setVisibility(v as typeof visibility)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin_only">Admin Only</SelectItem>
                  <SelectItem value="public_link">Public Link</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Toggles */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2">
              <Switch checked={memberAutocomplete} onCheckedChange={setMemberAutocomplete} id="member-auto" />
              <Label htmlFor="member-auto" className="text-xs">Member Autocomplete</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={allowDuplicates} onCheckedChange={setAllowDuplicates} id="allow-dup" />
              <Label htmlFor="allow-dup" className="text-xs">Allow Duplicates</Label>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max Submissions</Label>
              <Input
                type="number"
                value={maxSubmissions}
                onChange={(e) => setMaxSubmissions(e.target.value)}
                placeholder="Unlimited"
                className="h-8 text-xs"
                min={1}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Rate Limit / hr</Label>
              <Input
                type="number"
                value={rateLimitPerHour}
                onChange={(e) => setRateLimitPerHour(e.target.value)}
                placeholder="10"
                className="h-8 text-xs"
                min={1}
              />
            </div>
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <Label className="text-xs">Theme</Label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`size-5 rounded-full border-2 transition-transform hover:scale-110 ${primaryColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setPrimaryColor(c)}
                  />
                ))}
              </div>
              <Input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="Emoji"
                className="h-8 text-sm w-16"
                maxLength={2}
              />
            </div>
          </div>

          {/* Bible Verse / Quote */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Verse / Quote (optional)</Label>
            <Input
              value={verse}
              onChange={(e) => setVerse(e.target.value)}
              placeholder="e.g., Do not neglect to show hospitality..."
              className="h-8 text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={verseRef}
                onChange={(e) => setVerseRef(e.target.value)}
                placeholder="Reference (e.g., Hebrews 13:2)"
                className="h-8 text-xs"
              />
              <Input
                type="color"
                value={verseBgColor || "#D6F5E0"}
                onChange={(e) => setVerseBgColor(e.target.value)}
                className="h-8 w-full"
                title="Verse background color"
              />
            </div>
            <VerseLookup onSelect={(text, ref) => { setVerse(text); setVerseRef(ref) }} />
          </div>

          {/* Fields Builder */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Fields ({fields.length})</Label>
            </div>

            {fields.length === 0 && (
              <p className="text-xs text-muted-foreground py-2 text-center border border-dashed rounded-lg">
                No fields yet. Add fields below.
              </p>
            )}

            <div className="space-y-2">
              {fields.map((field, index) => (
                <FieldEditor
                  key={field.id}
                  field={field}
                  index={index}
                  total={fields.length}
                  onUpdate={(updates) => updateField(index, updates)}
                  onRemove={() => removeField(index)}
                  onMove={(dir) => moveField(index, dir)}
                />
              ))}
            </div>

            {/* Add Field */}
            <Select onValueChange={(v) => addField(v as SignupFieldType)}>
              <SelectTrigger className="h-8 text-xs border-dashed">
                <SelectValue placeholder="+ Add field..." />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPE_META.map((meta) => (
                  <SelectItem key={meta.type} value={meta.type}>
                    {meta.label} — {meta.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Save */}
          <div className="flex gap-2 pt-2 border-t">
            <Button size="sm" onClick={handleSave} disabled={saving || !title.trim()}>
              {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
              {isEdit ? "Update" : "Create"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Field Editor ───────────────────────────────────────────────────────────────

function FieldEditor({
  field,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
}: {
  field: SignupFieldConfig
  index: number
  total: number
  onUpdate: (updates: Partial<SignupFieldConfig>) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
}) {
  const meta = FIELD_TYPE_META.find((m) => m.type === field.type)

  return (
    <div className="rounded-lg border bg-muted/20 p-2 space-y-2">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground font-mono shrink-0">{meta?.label}</span>
        <Input
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="h-7 text-xs flex-1"
          placeholder="Field label"
        />
        <div className="flex items-center gap-1 shrink-0">
          <Switch
            checked={field.required}
            onCheckedChange={(v) => onUpdate({ required: v })}
            className="scale-75"
          />
          <span className="text-[10px] text-muted-foreground">Req</span>
        </div>
        <div className="flex shrink-0">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronUp className="size-3.5" />
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronDown className="size-3.5" />
          </button>
        </div>
        <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive p-0.5">
          <X className="size-3.5" />
        </button>
      </div>

      {/* Type-specific options */}
      {(field.type === "select" || field.type === "multi_select") && (
        <OptionsEditor
          options={"options" in field ? field.options : []}
          onChange={(opts) => onUpdate({ options: opts } as Partial<SignupFieldConfig>)}
        />
      )}

      {field.type === "text" && (
        <div className="flex items-center gap-2">
          <Label className="text-[10px] text-muted-foreground">Max length</Label>
          <Input
            type="number"
            value={field.maxLength ?? ""}
            onChange={(e) => onUpdate({ maxLength: e.target.value ? parseInt(e.target.value, 10) : undefined } as Partial<SignupFieldConfig>)}
            className="h-6 text-xs w-20"
            placeholder="None"
          />
        </div>
      )}

      {field.type === "textarea" && (
        <div className="flex items-center gap-2">
          <Label className="text-[10px] text-muted-foreground">Max length</Label>
          <Input
            type="number"
            value={field.maxLength ?? ""}
            onChange={(e) => onUpdate({ maxLength: e.target.value ? parseInt(e.target.value, 10) : undefined } as Partial<SignupFieldConfig>)}
            className="h-6 text-xs w-20"
            placeholder="None"
          />
        </div>
      )}

      {field.type === "number" && (
        <div className="flex items-center gap-2">
          <Label className="text-[10px] text-muted-foreground">Min</Label>
          <Input
            type="number"
            value={field.min ?? ""}
            onChange={(e) => onUpdate({ min: e.target.value ? parseInt(e.target.value, 10) : undefined } as Partial<SignupFieldConfig>)}
            className="h-6 text-xs w-16"
          />
          <Label className="text-[10px] text-muted-foreground">Max</Label>
          <Input
            type="number"
            value={field.max ?? ""}
            onChange={(e) => onUpdate({ max: e.target.value ? parseInt(e.target.value, 10) : undefined } as Partial<SignupFieldConfig>)}
            className="h-6 text-xs w-16"
          />
        </div>
      )}

      {field.type === "month_picker" && (
        <MonthExcludeEditor
          excludeMonths={field.excludeMonths ?? []}
          onChange={(months) => onUpdate({ excludeMonths: months } as Partial<SignupFieldConfig>)}
        />
      )}
    </div>
  )
}

// ── Options Editor (for select/multi_select) ───────────────────────────────────

function OptionsEditor({
  options,
  onChange,
}: {
  options: { value: string; label: string }[]
  onChange: (opts: { value: string; label: string }[]) => void
}) {
  function addOption() {
    const num = options.length + 1
    onChange([...options, { value: `option${num}`, label: `Option ${num}` }])
  }

  function removeOption(index: number) {
    onChange(options.filter((_, i) => i !== index))
  }

  function updateOption(index: number, label: string) {
    onChange(options.map((o, i) => i === index ? { value: label.toLowerCase().replace(/[^a-z0-9]+/g, "_") || o.value, label } : o))
  }

  function moveOption(index: number, dir: -1 | 1) {
    const newIndex = index + dir
    if (newIndex < 0 || newIndex >= options.length) return
    const arr = [...options]
    const temp = arr[index]
    arr[index] = arr[newIndex]
    arr[newIndex] = temp
    onChange(arr)
  }

  return (
    <div className="space-y-1 pl-2 border-l-2 border-muted">
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-1">
          <Input
            value={opt.label}
            onChange={(e) => updateOption(i, e.target.value)}
            className="h-6 text-xs flex-1"
          />
          <button type="button" onClick={() => moveOption(i, -1)} disabled={i === 0} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
            <ChevronUp className="size-3" />
          </button>
          <button type="button" onClick={() => moveOption(i, 1)} disabled={i === options.length - 1} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
            <ChevronDown className="size-3" />
          </button>
          <button type="button" onClick={() => removeOption(i)} className="p-0.5 text-muted-foreground hover:text-destructive">
            <X className="size-3" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addOption}
        className="text-[10px] text-primary hover:underline"
      >
        + Add option
      </button>
    </div>
  )
}

// ── Month Exclude Editor ───────────────────────────────────────────────────────

function MonthExcludeEditor({
  excludeMonths,
  onChange,
}: {
  excludeMonths: number[]
  onChange: (months: number[]) => void
}) {
  function toggle(month: number) {
    if (excludeMonths.includes(month)) {
      onChange(excludeMonths.filter((m) => m !== month))
    } else {
      onChange([...excludeMonths, month])
    }
  }

  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-muted-foreground">Exclude months</Label>
      <div className="flex flex-wrap gap-1">
        {MONTHS_LIST.map((name, i) => {
          const month = i + 1
          const excluded = excludeMonths.includes(month)
          return (
            <button
              key={month}
              type="button"
              onClick={() => toggle(month)}
              className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                excluded
                  ? "bg-destructive/10 border-destructive/30 text-destructive line-through"
                  : "border-border text-foreground hover:bg-muted"
              }`}
            >
              {name.slice(0, 3)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
