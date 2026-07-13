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
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu"
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
  Files,
  Archive,
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
  auto_close_date: string | null
  theme: { primaryColor?: string; headerGradient?: string; fontFamily?: string; verseTextColor?: string; bodyTextColor?: string; emoji?: string; eventDateText?: string; hostInfo?: string; verse?: string; verseRef?: string; verseBgColor?: string }
  fields: SignupFieldConfig[]
  status: "draft" | "active" | "closed" | "archived"
  visibility: "public_link" | "admin_only"
  member_autocomplete: boolean
  max_submissions: number | null
  allow_duplicates: boolean
  allow_count_selection: boolean
  show_responses: boolean
  notify_on_submit: boolean
  notify_smtp_config_id: string | null
  notify_mailing_list_id: string | null
  rate_limit_per_hour: number | null
  hidden_custom_items: Record<string, string[]>
  muted: boolean
  created_at: string
  response_count?: number
  stats?: { adults: number; kids: number; total: number }
}

const COLOR_PRESETS = [
  "#7C3AED", "#0D9488", "#D97706", "#DB2777", "#059669", "#4F46E5", "#DC2626", "#6B7280",
  "#E11D48", "#0EA5E9", "#8B5CF6", "#F59E0B", "#14B8A6", "#6366F1", "#EC4899", "#10B981",
]

// Traffic light colors for status badges
function getStatusStyle(status: string): { bg: string; text: string; border: string } {
  switch (status) {
    case "active":
      return { bg: "bg-emerald-100 dark:bg-emerald-950", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-300 dark:border-emerald-800" }
    case "closed":
      return { bg: "bg-red-100 dark:bg-red-950", text: "text-red-700 dark:text-red-400", border: "border-red-300 dark:border-red-800" }
    case "archived":
      return { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-400", border: "border-gray-300 dark:border-gray-700" }
    case "draft":
    default:
      return { bg: "bg-amber-100 dark:bg-amber-950", text: "text-amber-700 dark:text-amber-400", border: "border-amber-300 dark:border-amber-800" }
  }
}

const MONTHS_LIST = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

// ── Helper: Calculate attendance statistics ───────────────────────────────────

function calculateAttendanceStats(
  responses: Array<{ data: Record<string, unknown> }>,
  fields: SignupFieldConfig[]
): { adults: number; kids: number; total: number } {
  let adults = 0
  let kids = 0

  // Look for number fields with labels containing "adult" or "kid"/"child"
  const numberFields = fields.filter((f) => f.type === "number")

  for (const response of responses) {
    for (const field of numberFields) {
      const value = response.data[field.id] as number
      if (typeof value === "number" && value > 0) {
        const label = field.label.toLowerCase()
        if (label.includes("adult") || label.includes("grown")) {
          adults += value
        } else if (label.includes("kid") || label.includes("child") || label.includes("youth") || label.includes("teen")) {
          kids += value
        }
      }
    }
  }

  return {
    adults,
    kids,
    total: adults + kids,
  }
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function SignupsPage() {
  const router = useRouter()
  const [forms, setForms] = useState<FormRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingForm, setEditingForm] = useState<FormRow | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const fetchForms = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: formsData } = await supabase
      .from("signup_forms")
      .select("id, slug, title, description, duration_type, event_date, target_month, target_year, start_date, end_date, auto_close_date, theme, fields, status, visibility, member_autocomplete, max_submissions, allow_duplicates, allow_count_selection, show_responses, rate_limit_per_hour, hidden_custom_items, muted, created_at")
      .order("created_at", { ascending: false })

    if (formsData) {
      // Get response data (including form_id and data fields)
      const { data: responses } = await supabase
        .from("signup_responses")
        .select("form_id, data")
        .returns<{ form_id: string; data: Record<string, unknown> }[]>()

      // Group responses by form_id and calculate stats
      const responsesByForm: Record<string, Array<{ data: Record<string, unknown> }>> = {}
      if (responses) {
        for (const r of responses) {
          if (!responsesByForm[r.form_id]) {
            responsesByForm[r.form_id] = []
          }
          responsesByForm[r.form_id].push({ data: r.data })
        }
      }

      setForms(
        (formsData as unknown as FormRow[]).map((f) => {
          const formResponses = responsesByForm[f.id] || []
          const stats = formResponses.length > 0 ? calculateAttendanceStats(formResponses, f.fields ?? []) : undefined

          return {
            ...f,
            theme: f.theme ?? {},
            fields: f.fields ?? [],
            response_count: formResponses.length,
            stats,
          }
        })
      )
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchForms() }, [fetchForms])

  function handleCreate() {
    setEditingForm(null)
    setDialogOpen(true)
  }

  async function handleEdit(form: FormRow) {
    setEditingForm(form)
    setDialogOpen(true)
  }

  async function handleDelete(form: FormRow) {
    const responseCount = form.response_count ?? 0
    const message = responseCount > 0
      ? `⚠️ Delete "${form.title}"?\n\n` +
        `This will permanently delete:\n` +
        `• ${responseCount} response${responseCount > 1 ? 's' : ''}\n` +
        `• All custom items added by users\n` +
        `• All associated data\n\n` +
        `This action CANNOT be undone!`
      : `Delete "${form.title}"?\n\nThis action cannot be undone.`

    if (!confirm(message)) return

    const supabase = createClient()
    const { error } = await supabase.from("signup_forms").delete().eq("id", form.id)
    if (error) {
      toast.error(`Failed: ${error.message}`)
    } else {
      toast.success("Form deleted")
      logAudit("signup_form_deleted", "signup_forms", form.id, {
        title: form.title,
        responseCount,
        fieldCount: form.fields.length,
      })
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

  async function toggleMuted(form: FormRow) {
    const newMuted = !form.muted
    const supabase = createClient()
    const { error } = await supabase
      .from("signup_forms")
      .update({ muted: newMuted } as never)
      .eq("id", form.id)
    if (error) {
      toast.error(`Failed: ${error.message}`)
      return
    }
    toast.success(newMuted ? "Form muted (read-only)" : "Form unmuted")
    logAudit("signup_form_muted_changed", "signup_forms", form.id, { title: form.title, muted: newMuted })
    setForms((prev) => prev.map((f) => f.id === form.id ? { ...f, muted: newMuted } : f))
  }

  async function handleArchive(form: FormRow) {
    const newStatus = form.status === "archived" ? "draft" : "archived"
    const supabase = createClient()
    const { error } = await supabase
      .from("signup_forms")
      .update({ status: newStatus } as never)
      .eq("id", form.id)
    if (error) {
      toast.error(`Failed: ${error.message}`)
      return
    }
    toast.success(newStatus === "archived" ? "Form archived" : "Form unarchived")
    logAudit("signup_form_status_changed", "signup_forms", form.id, { title: form.title, from: form.status, to: newStatus })
    setForms((prev) => prev.map((f) => f.id === form.id ? { ...f, status: newStatus } : f))
  }

  async function handleDuplicate(form: FormRow) {
    const supabase = createClient()

    // Generate new slug and title
    const newTitle = `${form.title} (Copy)`
    const baseSlug = form.slug.replace(/-copy(-\d+)?$/, "")
    let newSlug = `${baseSlug}-copy`

    // Check if slug exists, append number if needed
    const { data: existingSlugs } = await supabase
      .from("signup_forms")
      .select("slug")
      .like("slug", `${baseSlug}-copy%`)
      .returns<{ slug: string }[]>()

    if (existingSlugs && existingSlugs.length > 0) {
      const numbers = existingSlugs
        .map((s) => {
          const match = s.slug.match(/-copy-(\d+)$/)
          return match ? parseInt(match[1], 10) : 1
        })
      const maxNum = Math.max(...numbers)
      newSlug = `${baseSlug}-copy-${maxNum + 1}`
    }

    // Create duplicate form (without responses)
    const payload = {
      title: newTitle,
      slug: newSlug,
      description: form.description,
      duration_type: form.duration_type,
      event_date: form.event_date,
      target_month: form.target_month,
      target_year: form.target_year,
      start_date: form.start_date,
      end_date: form.end_date,
      auto_close_date: form.auto_close_date,
      theme: form.theme,
      fields: form.fields,
      status: "draft" as const,
      visibility: form.visibility,
      member_autocomplete: form.member_autocomplete,
      max_submissions: form.max_submissions,
      allow_duplicates: form.allow_duplicates,
      allow_count_selection: form.allow_count_selection,
      show_responses: form.show_responses,
      muted: false,
      notify_on_submit: false,
      notify_smtp_config_id: null,
      notify_mailing_list_id: null,
      rate_limit_per_hour: form.rate_limit_per_hour,
      hidden_custom_items: {},
    }

    const { data, error } = await supabase
      .from("signup_forms")
      .insert(payload as never)
      .select()
      .returns<FormRow[]>()
      .single()

    if (error) {
      toast.error(`Failed to duplicate: ${error.message}`)
    } else if (data) {
      toast.success(`Form duplicated as "${newTitle}"`)
      logAudit("signup_form_duplicated", "signup_forms", data.id, {
        originalId: form.id,
        originalTitle: form.title,
        newTitle,
      })
      fetchForms()
    }
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
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Switch
              checked={showArchived}
              onCheckedChange={setShowArchived}
              id="show-archived"
            />
            <Label htmlFor="show-archived" className="text-sm cursor-pointer">
              Show Archived
            </Label>
          </div>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="size-3.5" />
            New Form
          </Button>
        </div>
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
          {forms
            .filter((form) => showArchived || form.status !== "archived")
            .map((form) => (
            <ContextMenu key={form.id}>
              <ContextMenuTrigger>
            <Card className="relative group">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {form.theme.emoji && <span className="text-base">{form.theme.emoji}</span>}
                      <h3 className="text-sm font-medium truncate">{form.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${getStatusStyle(form.status).bg} ${getStatusStyle(form.status).text} ${getStatusStyle(form.status).border}`}
                      >
                        {form.status}
                      </Badge>
                      {form.muted && (
                        <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700 bg-amber-50">
                          Muted
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {form.response_count} response{form.response_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {form.stats && form.stats.total > 0 && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                        {form.stats.adults > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-semibold text-primary">{form.stats.adults}</span>
                            <span className="text-[10px] text-muted-foreground">Adult{form.stats.adults !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                        {form.stats.kids > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-semibold text-primary">{form.stats.kids}</span>
                            <span className="text-[10px] text-muted-foreground">Kid{form.stats.kids !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                        {(form.stats.adults > 0 || form.stats.kids > 0) && (
                          <>
                            <span className="text-[10px] text-muted-foreground">•</span>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-semibold text-primary">{form.stats.total}</span>
                              <span className="text-[10px] text-muted-foreground">Total</span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 text-xs ${form.muted ? "text-emerald-600" : "text-amber-600"}`}
                    onClick={() => toggleMuted(form)}
                    title={form.muted ? "Unmute (enable interactions)" : "Mute (read-only)"}
                  >
                    {form.muted ? "Unmute" : "Mute"}
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
                  <Button variant="ghost" size="icon-sm" className="h-7 w-7" onClick={() => handleDuplicate(form)} title="Duplicate form">
                    <Files className="size-3" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="h-7 w-7" onClick={() => handleArchive(form)} title={form.status === "archived" ? "Unarchive" : "Archive"}>
                    <Archive className="size-3" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="h-7 w-7 text-destructive" onClick={() => handleDelete(form)} title="Delete">
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => handleEdit(form)}>
                  <Pencil className="size-3.5" /> Edit
                </ContextMenuItem>
                <ContextMenuItem onClick={() => router.push(`/signups/${form.id}`)}>
                  <Eye className="size-3.5" /> View Responses
                </ContextMenuItem>
                <ContextMenuItem onClick={() => window.open(`/signup/${form.slug}/responses`, "_blank")}>
                  <ExternalLink className="size-3.5" /> View Response Table
                </ContextMenuItem>
                <ContextMenuItem onClick={() => copyLink(form.slug)}>
                  <Copy className="size-3.5" /> Copy Link
                </ContextMenuItem>
                <ContextMenuItem onClick={() => previewForm(form.slug)}>
                  <ExternalLink className="size-3.5" /> Preview
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleDuplicate(form)}>
                  <Files className="size-3.5" /> Duplicate Form
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => toggleStatus(form)}>
                  {form.status === "active" ? "Deactivate" : "Activate"}
                </ContextMenuItem>
                <ContextMenuItem onClick={() => toggleMuted(form)}>
                  {form.muted ? "Unmute (Enable Interactions)" : "Mute (Read-Only)"}
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleArchive(form)}>
                  <Archive className="size-3.5" /> {form.status === "archived" ? "Unarchive" : "Archive"}
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem variant="destructive" onClick={() => handleDelete(form)}>
                  <Trash2 className="size-3.5" /> Delete
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>
      )}

      {/* Inline Create/Edit Form */}
      {dialogOpen && (
        <Card className="border-primary/30 ring-1 ring-primary/20">
          <CardContent className="p-4 sm:p-6">
            <FormEditor
              editForm={editingForm}
              existingResponses={editingForm ? forms.find(f => f.id === editingForm.id)?.response_count ?? 0 : 0}
              onSaved={() => { setDialogOpen(false); fetchForms() }}
              onCancel={() => { setDialogOpen(false); setEditingForm(null) }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Form Editor (inline) ──────────────────────────────────────────────────────

function FormEditor({
  editForm,
  existingResponses,
  onSaved,
  onCancel,
}: {
  editForm: FormRow | null
  existingResponses: number
  onSaved: () => void
  onCancel: () => void
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
  const [autoCloseDate, setAutoCloseDate] = useState("")
  const [status, setStatus] = useState<"draft" | "active" | "closed" | "archived">("draft")
  const [visibility, setVisibility] = useState<"public_link" | "admin_only">("admin_only")
  const [memberAutocomplete, setMemberAutocomplete] = useState(false)
  const [maxSubmissions, setMaxSubmissions] = useState<string>("")
  const [allowDuplicates, setAllowDuplicates] = useState(false)
  const [allowCountSelection, setAllowCountSelection] = useState(false)
  const [showResponses, setShowResponses] = useState(true)
  const [muted, setMuted] = useState(false)
  const [notifyOnSubmit, setNotifyOnSubmit] = useState(false)
  const [notifySmtpConfigId, setNotifySmtpConfigId] = useState("")
  const [notifyMailingListId, setNotifyMailingListId] = useState("")
  const [rateLimitPerHour, setRateLimitPerHour] = useState<string>("10")
  const [smtpConfigs, setSmtpConfigs] = useState<{ id: string; from_email: string }[]>([])
  const [mailingLists, setMailingLists] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.from("smtp_configs").select("id, from_email").then(({ data }) => { if (data) setSmtpConfigs(data) })
    supabase.from("mailing_lists").select("id, name").order("name").then(({ data }) => { if (data) setMailingLists(data) })
  }, [])
  const [primaryColor, setPrimaryColor] = useState("#7C3AED")
  const [emoji, setEmoji] = useState("")
  const [headerGradient, setHeaderGradient] = useState("")
  const [fontFamily, setFontFamily] = useState("")
  const [verseTextColor, setVerseTextColor] = useState("")
  const [bodyTextColor, setBodyTextColor] = useState("")
  const [eventDateText, setEventDateText] = useState("")
  const [hostInfo, setHostInfo] = useState("")
  const [verse, setVerse] = useState("")
  const [verseRef, setVerseRef] = useState("")
  const [verseBgColor, setVerseBgColor] = useState("")
  const [fields, setFields] = useState<SignupFieldConfig[]>([])
  const [customItemsByField, setCustomItemsByField] = useState<Record<string, Set<string>>>({})
  const [hiddenCustomItems, setHiddenCustomItems] = useState<Record<string, string[]>>({})

  // Load responses and extract custom items when editing
  useEffect(() => {
    if (!editForm || !existingResponses) return
    const supabase = createClient()
    supabase
      .from("signup_responses")
      .select("data")
      .eq("form_id", editForm.id)
      .returns<{ data: Record<string, unknown> }[]>()
      .then(({ data: responses }) => {
        if (!responses) return
        const customItems: Record<string, Set<string>> = {}
        const hiddenItems = editForm.hidden_custom_items || {}

        for (const field of editForm.fields) {
          if (field.type === "claim_select" && field.allowCustom) {
            const predefinedValues = new Set(field.options.map(o => o.value))
            const predefinedLowerValues = new Set(field.options.map(o => o.value.toLowerCase()))
            const predefinedLowerLabels = new Set(field.options.map(o => o.label.toLowerCase()))
            const hiddenForField = new Set(hiddenItems[field.id] || [])
            customItems[field.id] = new Set()

            for (const response of responses) {
              const items = response.data[field.id]
              if (Array.isArray(items)) {
                for (const item of items) {
                  if (typeof item === "string") {
                    const itemClean = item.trim()
                    const itemLower = itemClean.toLowerCase()
                    const isOfficial = predefinedValues.has(itemClean) ||
                                      predefinedLowerValues.has(itemLower) ||
                                      predefinedLowerLabels.has(itemLower)
                    if (!isOfficial && !hiddenForField.has(itemClean)) {
                      customItems[field.id].add(itemClean)
                    }
                  }
                }
              }
            }
          }
        }
        setCustomItemsByField(customItems)
      })
  }, [editForm, existingResponses])

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
      setAutoCloseDate(editForm.auto_close_date || "")
      setStatus(editForm.status)
      setVisibility(editForm.visibility)
      setMemberAutocomplete(editForm.member_autocomplete)
      setMaxSubmissions(editForm.max_submissions ? String(editForm.max_submissions) : "")
      setAllowDuplicates(editForm.allow_duplicates)
      setAllowCountSelection(editForm.allow_count_selection ?? false)
      setShowResponses(editForm.show_responses ?? true)
      setMuted(editForm.muted ?? false)
      setNotifyOnSubmit(editForm.notify_on_submit ?? false)
      setNotifySmtpConfigId(editForm.notify_smtp_config_id || "")
      setNotifyMailingListId(editForm.notify_mailing_list_id || "")
      setRateLimitPerHour(editForm.rate_limit_per_hour ? String(editForm.rate_limit_per_hour) : "10")
      setPrimaryColor(editForm.theme.primaryColor || "#7C3AED")
      setHeaderGradient(editForm.theme.headerGradient || "")
      setFontFamily(editForm.theme.fontFamily || "")
      setVerseTextColor(editForm.theme.verseTextColor || "")
      setBodyTextColor(editForm.theme.bodyTextColor || "")
      setEmoji(editForm.theme.emoji || "")
      setEventDateText(editForm.theme.eventDateText || "")
      setHostInfo(editForm.theme.hostInfo || "")
      setVerse(editForm.theme.verse || "")
      setVerseRef(editForm.theme.verseRef || "")
      setVerseBgColor(editForm.theme.verseBgColor || "")
      setFields(editForm.fields || [])
      setHiddenCustomItems(editForm.hidden_custom_items || {})
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
      setAutoCloseDate("")
      setStatus("draft")
      setVisibility("admin_only")
      setMemberAutocomplete(false)
      setMaxSubmissions("")
      setAllowDuplicates(false)
      setAllowCountSelection(false)
      setShowResponses(true)
      setMuted(false)
      setPrimaryColor("#7C3AED")
      setEmoji("")
      setFields([])
      setHiddenCustomItems({})
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

    // Warn about destructive changes when form has responses
    if (isEdit && editForm && existingResponses > 0) {
      const warnings: string[] = []

      // Check for removed fields
      const oldFieldIds = new Set(editForm.fields.map(f => f.id))
      const newFieldIds = new Set(fields.map(f => f.id))
      const removedFields = editForm.fields.filter(f => !newFieldIds.has(f.id))
      if (removedFields.length > 0) {
        warnings.push(`• ${removedFields.length} field${removedFields.length > 1 ? 's' : ''} will be removed: ${removedFields.map(f => f.label).join(", ")}`)
      }

      // Check for removed custom items in claim_select fields
      let removedCustomCount = 0
      for (const field of fields) {
        if (field.type === "claim_select" && customItemsByField[field.id]) {
          const oldField = editForm.fields.find(f => f.id === field.id)
          if (oldField && oldField.type === "claim_select") {
            const newOptionValues = new Set(field.options.map(o => o.value))
            const oldCustomItems = customItemsByField[field.id]
            for (const customItem of oldCustomItems) {
              if (!newOptionValues.has(customItem)) {
                removedCustomCount++
              }
            }
          }
        }
      }
      if (removedCustomCount > 0) {
        warnings.push(`• ${removedCustomCount} custom item${removedCustomCount > 1 ? 's' : ''} will no longer be editable (they remain in ${existingResponses} existing response${existingResponses > 1 ? 's' : ''})`)
      }

      // Check for removed predefined options in claim_select fields
      for (const field of fields) {
        if (field.type === "claim_select") {
          const oldField = editForm.fields.find(f => f.id === field.id)
          if (oldField && oldField.type === "claim_select") {
            const newOptionValues = new Set(field.options.map(o => o.value))
            const removedOptions = oldField.options.filter(o => !newOptionValues.has(o.value))
            if (removedOptions.length > 0) {
              warnings.push(`• ${removedOptions.length} predefined option${removedOptions.length > 1 ? 's' : ''} removed from "${field.label}": ${removedOptions.map(o => o.label).join(", ")}`)
            }
          }
        }
      }

      if (warnings.length > 0) {
        const proceed = confirm(
          `⚠️ Warning: This form has ${existingResponses} existing response${existingResponses > 1 ? 's' : ''}.\n\n` +
          `The following changes will affect existing data:\n\n${warnings.join("\n")}\n\n` +
          `Data in existing responses will be preserved but may become inaccessible.\n\n` +
          `Continue with update?`
        )
        if (!proceed) {
          setSaving(false)
          return
        }
      }
    }

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
        auto_close_date: autoCloseDate || null,
        theme: { primaryColor, headerGradient: headerGradient || undefined, fontFamily: fontFamily || undefined, verseTextColor: verseTextColor || undefined, bodyTextColor: bodyTextColor || undefined, emoji: emoji || undefined, eventDateText: eventDateText || undefined, hostInfo: hostInfo || undefined, verse: verse || undefined, verseRef: verseRef || undefined, verseBgColor: verseBgColor || undefined },
        fields,
        status,
        visibility,
        member_autocomplete: memberAutocomplete,
        max_submissions: maxSubmissions ? parseInt(maxSubmissions, 10) : null,
        allow_duplicates: allowDuplicates,
        allow_count_selection: allowCountSelection,
        show_responses: showResponses,
        muted,
        notify_on_submit: notifyOnSubmit,
        notify_smtp_config_id: notifySmtpConfigId || null,
        notify_mailing_list_id: notifyMailingListId || null,
        rate_limit_per_hour: rateLimitPerHour ? parseInt(rateLimitPerHour, 10) : 10,
        hidden_custom_items: hiddenCustomItems,
      }

      if (isEdit) {
        const { error } = await supabase.from("signup_forms").update(payload as never).eq("id", editForm.id)
        if (error) { toast.error(`Failed: ${error.message}`); return }
        toast.success("Form updated")

        // Enhanced audit log with field changes
        const removedFieldIds = editForm.fields.filter(f => !fields.find(nf => nf.id === f.id)).map(f => f.id)
        const addedFieldIds = fields.filter(f => !editForm.fields.find(of => of.id === f.id)).map(f => f.id)
        logAudit("signup_form_updated", "signup_forms", editForm.id, {
          title: title.trim(),
          responseCount: existingResponses,
          fieldCount: { before: editForm.fields.length, after: fields.length },
          removedFields: removedFieldIds.length > 0 ? editForm.fields.filter(f => removedFieldIds.includes(f.id)).map(f => ({ id: f.id, label: f.label, type: f.type })) : undefined,
          addedFields: addedFieldIds.length > 0 ? fields.filter(f => addedFieldIds.includes(f.id)).map(f => ({ id: f.id, label: f.label, type: f.type })) : undefined,
        })
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

  function removeCustomItemFromField(fieldId: string, customValue: string) {
    // Remove from display
    setCustomItemsByField((prev) => {
      const updated = new Set(prev[fieldId])
      updated.delete(customValue)
      if (updated.size === 0) {
        const { [fieldId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [fieldId]: updated }
    })

    // Add to hidden items so it doesn't reappear
    setHiddenCustomItems((prev) => {
      const fieldHidden = prev[fieldId] || []
      if (fieldHidden.includes(customValue)) return prev
      return { ...prev, [fieldId]: [...fieldHidden, customValue] }
    })
  }

  return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{isEdit ? "Edit Form" : "New Signup Form"}</h2>
            <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          </div>
          {/* Title & Description */}
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. Sunday Service Signup"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="auto-generated"
                className="font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description shown on the form"
              rows={2}
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>Duration Type</Label>
            <Select value={durationType} onValueChange={(v) => setDurationType(v as typeof durationType)}>
              <SelectTrigger className="w-48">
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

          {/* Auto Close Date */}
          <div className="space-y-2">
            <Label>Auto Close Date (Optional)</Label>
            <Input
              type="date"
              value={autoCloseDate}
              onChange={(e) => setAutoCloseDate(e.target.value)}
              className="h-8 text-xs w-fit"
            />
            <p className="text-xs text-muted-foreground">
              Form will automatically close on this date. Leave empty to keep form open indefinitely.
            </p>
          </div>

          {/* Status & Visibility */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Visibility</Label>
              <Select value={visibility} onValueChange={(v) => setVisibility(v as typeof visibility)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin_only">Admin Only</SelectItem>
                  <SelectItem value="public_link">Public Link</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Rate Limit / hr</Label>
              <Input
                type="number"
                value={rateLimitPerHour}
                onChange={(e) => setRateLimitPerHour(e.target.value)}
                placeholder="10"
                min={1}
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Switch checked={memberAutocomplete} onCheckedChange={setMemberAutocomplete} id="member-auto" />
              <Label htmlFor="member-auto">Member Autocomplete</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={allowDuplicates} onCheckedChange={setAllowDuplicates} id="allow-dup" />
              <Label htmlFor="allow-dup">Allow Duplicates</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={allowCountSelection} onCheckedChange={setAllowCountSelection} id="allow-count" />
              <Label htmlFor="allow-count" className="flex items-center gap-1">
                Allow Count Selection
                <span className="text-xs text-muted-foreground">— Users can claim multiple of an item</span>
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={showResponses} onCheckedChange={setShowResponses} id="show-resp" />
              <Label htmlFor="show-resp">Show Signups Publicly</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={muted} onCheckedChange={setMuted} id="muted" />
              <Label htmlFor="muted" className="flex items-center gap-1">
                Mute (Read-Only Mode)
                <span className="text-xs text-muted-foreground">— Users can view but not interact</span>
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Label className="shrink-0">Max Submissions</Label>
              <Input
                type="number"
                value={maxSubmissions}
                onChange={(e) => setMaxSubmissions(e.target.value)}
                placeholder="Unlim"
                className="w-20"
                min={1}
              />
            </div>
          </div>

          {/* Notifications */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Switch checked={notifyOnSubmit} onCheckedChange={setNotifyOnSubmit} id="notify-submit" />
              <Label htmlFor="notify-submit">Notify on new submission</Label>
            </div>
            {notifyOnSubmit && (
              <div className="grid gap-3 sm:grid-cols-2 pl-6">
                <div className="space-y-1.5">
                  <Label className="text-xs">Send From</Label>
                  <Select value={notifySmtpConfigId} onValueChange={(v) => setNotifySmtpConfigId(v ?? "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account...">
                        {smtpConfigs.find((s) => s.id === notifySmtpConfigId)?.from_email || "Select account..."}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {smtpConfigs.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.from_email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Notify Recipients</Label>
                  <Select value={notifyMailingListId} onValueChange={(v) => setNotifyMailingListId(v ?? "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Admins (default)">
                        {mailingLists.find((m) => m.id === notifyMailingListId)?.name || "Admins (default)"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Admins (default)</SelectItem>
                      {mailingLists.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <Label>Theme</Label>
            <div className="flex items-center gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`size-6 rounded-full border-2 transition-transform hover:scale-110 ${primaryColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setPrimaryColor(c)}
                  />
                ))}
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="size-6 cursor-pointer rounded-full border-0 p-0 appearance-none bg-transparent"
                  title="Custom color"
                />
              </div>
              <div className="mt-2 space-y-1.5">
                <div className="flex flex-wrap gap-1">
                  {["🙏", "🙌", "🤲", "🛐", "✝️", "⛪", "📖", "🕊️", "🕯️", "📿", "💒", "🫶", "❤️", "🎂", "🎵", "👶", "🎓", "🔥", "⭐", "✨", "☀️", "🌙", "☕", "🍽️", "🎁", "🌲", "⛺", "🌍", "📢", "📅", "👑", "🤝", "📋", "🏆"].map((e) => (
                    <button
                      key={e}
                      type="button"
                      className={`size-8 rounded-md text-lg flex items-center justify-center transition-all hover:scale-110 ${emoji === e ? "ring-2 ring-primary bg-primary/10 scale-110" : "hover:bg-muted"}`}
                      onClick={() => setEmoji(e)}
                    >
                      {e}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value)}
                    placeholder="Or type custom..."
                    className="w-24 text-center"
                    maxLength={2}
                  />
                  <span className="text-xs text-muted-foreground">Form emoji</span>
                </div>
              </div>
            </div>
          </div>

          {/* Event Info (shown in form header) */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Event Date (shown to users)</Label>
              <Input
                value={eventDateText}
                onChange={(e) => setEventDateText(e.target.value)}
                placeholder="e.g., Friday, June 13 at 6:30 PM"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Host / Location (shown to users)</Label>
              <Input
                value={hostInfo}
                onChange={(e) => setHostInfo(e.target.value)}
                placeholder="e.g., Samuel & Salomi — Dublin"
              />
            </div>
          </div>

          {/* Header Gradient */}
          <div className="space-y-1.5">
            <Label className="text-xs">Header Style</Label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setHeaderGradient("")} className={`size-8 rounded-lg border-2 transition-transform hover:scale-110 ${!headerGradient ? "border-foreground scale-110" : "border-transparent"}`} style={{ backgroundColor: primaryColor }} title="Solid color" />
              {[
                { label: "Sunset", value: `linear-gradient(135deg, ${primaryColor}, #F59E0B)` },
                { label: "Ocean", value: `linear-gradient(135deg, ${primaryColor}, #0EA5E9)` },
                { label: "Berry", value: `linear-gradient(135deg, ${primaryColor}, #EC4899)` },
                { label: "Forest", value: `linear-gradient(135deg, ${primaryColor}, #10B981)` },
                { label: "Night", value: `linear-gradient(135deg, #1e1b4b, ${primaryColor})` },
                { label: "Warm", value: `linear-gradient(135deg, #DC2626, #F59E0B)` },
                { label: "Cool", value: `linear-gradient(135deg, #6366F1, #06B6D4)` },
                { label: "Royal", value: `linear-gradient(135deg, #7C3AED, #2563EB)` },
              ].map((g) => (
                <button key={g.label} type="button" onClick={() => setHeaderGradient(g.value)} className={`size-8 rounded-lg border-2 transition-transform hover:scale-110 ${headerGradient === g.value ? "border-foreground scale-110" : "border-transparent"}`} style={{ background: g.value }} title={g.label} />
              ))}
            </div>
          </div>

          {/* Font & Text Colors */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Font</Label>
              <Select value={fontFamily} onValueChange={(v) => setFontFamily(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Default (System)</SelectItem>
                  <SelectItem value="'Georgia', serif">Georgia (Serif)</SelectItem>
                  <SelectItem value="'Merriweather', Georgia, serif">Merriweather</SelectItem>
                  <SelectItem value="'Nunito', sans-serif">Nunito (Rounded)</SelectItem>
                  <SelectItem value="'Playfair Display', serif">Playfair Display</SelectItem>
                  <SelectItem value="'Inter', sans-serif">Inter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Verse Text Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={verseTextColor || "#1e293b"} onChange={(e) => setVerseTextColor(e.target.value)} className="size-8 cursor-pointer rounded border-0 p-0" />
                <span className="text-xs text-muted-foreground">{verseTextColor || "Auto"}</span>
                {verseTextColor && <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setVerseTextColor("")}>Reset</button>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Body Text Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={bodyTextColor || "#1e293b"} onChange={(e) => setBodyTextColor(e.target.value)} className="size-8 cursor-pointer rounded border-0 p-0" />
                <span className="text-xs text-muted-foreground">{bodyTextColor || "Auto"}</span>
                {bodyTextColor && <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setBodyTextColor("")}>Reset</button>}
              </div>
            </div>
          </div>

          {/* Bible Verse / Quote */}
          <div className="space-y-1.5">
            <Label>Verse / Quote (optional)</Label>
            <Input
              value={verse}
              onChange={(e) => setVerse(e.target.value)}
              placeholder="e.g., Do not neglect to show hospitality..."
            />
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Input
                value={verseRef}
                onChange={(e) => setVerseRef(e.target.value)}
                placeholder="Reference (e.g., Hebrews 13:2)"
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Fields ({fields.length})</Label>
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
                  customItems={field.type === "claim_select" ? customItemsByField[field.id] : undefined}
                  onUpdate={(updates) => updateField(index, updates)}
                  onRemove={() => removeField(index)}
                  onMove={(dir) => moveField(index, dir)}
                  onRemoveCustomItem={removeCustomItemFromField}
                />
              ))}
            </div>

            {/* Add Field */}
            <Select onValueChange={(v) => addField(v as SignupFieldType)}>
              <SelectTrigger className="h-9 border-dashed w-48">
                <SelectValue placeholder="+ Add field..." />
              </SelectTrigger>
              <SelectContent className="min-w-[280px]">
                {FIELD_TYPE_META.map((meta) => (
                  <SelectItem key={meta.type} value={meta.type}>
                    <span className="font-medium">{meta.label}</span>
                    <span className="text-muted-foreground"> — {meta.description}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button onClick={handleSave} disabled={saving || !title.trim()}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {isEdit ? "Update Form" : "Create Form"}
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
  )
}

// ── Field Editor ───────────────────────────────────────────────────────────────

function FieldEditor({
  field,
  index,
  total,
  customItems,
  onUpdate,
  onRemove,
  onMove,
  onRemoveCustomItem,
}: {
  field: SignupFieldConfig
  index: number
  total: number
  customItems?: Set<string>
  onUpdate: (updates: Partial<SignupFieldConfig>) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
  onRemoveCustomItem?: (fieldId: string, customValue: string) => void
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
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <Switch
              checked={!field.hidden}
              onCheckedChange={(v) => onUpdate({ hidden: !v })}
              className="scale-75"
            />
            <span className="text-[10px] text-muted-foreground">Show</span>
          </div>
          <div className="flex items-center gap-1">
            <Switch
              checked={field.required}
              onCheckedChange={(v) => onUpdate({ required: v })}
              className="scale-75"
            />
            <span className="text-[10px] text-muted-foreground">Req</span>
          </div>
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

      {field.type === "claim_select" && (
        <div className="space-y-2">
          <ClaimOptionsEditor
            options={field.options}
            customItems={customItems}
            fieldId={field.id}
            onChange={(opts) => onUpdate({ options: opts } as Partial<SignupFieldConfig>)}
            onRemoveCustomItem={onRemoveCustomItem}
          />
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={field.allowCustom}
                onCheckedChange={(v) => onUpdate({ allowCustom: v } as Partial<SignupFieldConfig>)}
                id={`allow-custom-${field.id}`}
              />
              <Label htmlFor={`allow-custom-${field.id}`} className="text-[10px]">Allow Custom Items</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={field.allowCountSelection ?? false}
                onCheckedChange={(v) => onUpdate({ allowCountSelection: v } as Partial<SignupFieldConfig>)}
                id={`allow-count-${field.id}`}
              />
              <Label htmlFor={`allow-count-${field.id}`} className="text-[10px]">Allow Count Selection</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={field.allowCapacityIncrease ?? false}
                onCheckedChange={(v) => onUpdate({ allowCapacityIncrease: v } as Partial<SignupFieldConfig>)}
                id={`allow-cap-increase-${field.id}`}
              />
              <Label htmlFor={`allow-cap-increase-${field.id}`} className="text-[10px]">Users Can Increase Count</Label>
            </div>
            <div className="flex items-center gap-1">
              <Label className="text-[10px] text-muted-foreground">Max picks</Label>
              <Input
                type="number"
                value={field.maxSelections ?? ""}
                onChange={(e) => onUpdate({ maxSelections: e.target.value ? parseInt(e.target.value, 10) : undefined } as Partial<SignupFieldConfig>)}
                className="h-6 text-xs w-14"
                placeholder="∞"
                min={1}
              />
            </div>
          </div>
        </div>
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

// ── Claim Options Editor (for claim_select) ──────────────────────────────────

function ClaimOptionsEditor({
  options,
  customItems,
  fieldId,
  onChange,
  onRemoveCustomItem,
}: {
  options: { value: string; label: string; capacity: number }[]
  customItems?: Set<string>
  fieldId: string
  onChange: (opts: { value: string; label: string; capacity: number }[]) => void
  onRemoveCustomItem?: (fieldId: string, customValue: string) => void
}) {
  const hasLimits = options.some((o) => o.capacity < 50)

  function toggleLimits(enabled: boolean) {
    if (enabled) {
      onChange(options.map((o) => ({ ...o, capacity: o.capacity >= 50 ? 2 : o.capacity })))
    } else {
      onChange(options.map((o) => ({ ...o, capacity: 99 })))
    }
  }

  function addOption() {
    const num = options.length + 1
    onChange([...options, { value: `item${num}`, label: `Item ${num}`, capacity: hasLimits ? 2 : 99 }])
  }

  function removeOption(index: number) {
    onChange(options.filter((_, i) => i !== index))
  }

  function updateOption(index: number, label: string) {
    onChange(options.map((o, i) => i === index ? { value: label.toLowerCase().replace(/[^a-z0-9]+/g, "_") || o.value, label, capacity: o.capacity } : o))
  }

  function updateCapacity(index: number, cap: number) {
    onChange(options.map((o, i) => i === index ? { ...o, capacity: Math.max(1, cap) } : o))
  }

  function promoteCustomItem(customValue: string) {
    // Add custom item to official options
    onChange([...options, { value: customValue, label: customValue, capacity: hasLimits ? 2 : 99 }])
    // Remove from custom items display
    onRemoveCustomItem?.(fieldId, customValue)
  }

  return (
    <div className="space-y-1.5 pl-3 border-l-2 border-muted">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium">Items</p>
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={hasLimits} onChange={(e) => toggleLimits(e.target.checked)} className="rounded" />
          Limit per item
        </label>
      </div>
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={opt.label}
            onChange={(e) => updateOption(i, e.target.value)}
            className="h-7 text-sm flex-1"
            placeholder="Item name"
          />
          {hasLimits && (
            <Input
              type="number"
              value={opt.capacity}
              onChange={(e) => updateCapacity(i, parseInt(e.target.value) || 1)}
              className="h-7 text-sm w-16 text-center"
              min={1}
              title="Max capacity per item"
            />
          )}
          <button type="button" onClick={() => removeOption(i)} className="p-1 text-muted-foreground hover:text-destructive">
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addOption}
        className="text-[10px] text-primary hover:underline"
      >
        + Add item
      </button>

      {customItems && customItems.size > 0 && (
        <div className="mt-3 pt-3 border-t space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium">Custom items from responses ({customItems.size})</p>
          <p className="text-[10px] text-muted-foreground">These were added by users. Click "Add to list" to make them official options.</p>
          {Array.from(customItems).map((item) => (
            <div key={item} className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 px-2 py-1.5 rounded">
              <span className="text-sm flex-1 text-amber-900 dark:text-amber-100">{item}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] text-primary hover:text-primary"
                onClick={() => promoteCustomItem(item)}
              >
                Add to list
              </Button>
              <button
                type="button"
                className="p-1 text-muted-foreground hover:text-destructive"
                onClick={() => onRemoveCustomItem?.(fieldId, item)}
                title="Remove custom item"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
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
