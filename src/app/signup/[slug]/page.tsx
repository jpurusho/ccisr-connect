"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Loader2, CheckCircle, AlertCircle, Users } from "lucide-react"
import { type SignupFieldConfig, getDefaultValue } from "@/lib/signup/field-registry"
import { type SignupFormTheme, getThemeColors } from "@/lib/signup/theme"

interface FormData {
  id: string
  title: string
  description: string | null
  theme: SignupFormTheme
  fields: SignupFieldConfig[]
  visibility: string
  member_autocomplete: boolean
}

interface MemberResult {
  id: string
  name: string
  maskedPhone?: string
  city?: string
  address?: string
  phone?: string
}

interface ResponseEntry {
  id: string
  data: Record<string, unknown>
  created_at: string
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

export default function PublicSignupPage() {
  const params = useParams()
  const slug = params.slug as string

  const [form, setForm] = useState<FormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [responses, setResponses] = useState<ResponseEntry[]>([])

  // Member lookup state
  const [lookupQuery, setLookupQuery] = useState("")
  const [lookupResults, setLookupResults] = useState<MemberResult[]>([])
  const [lookupLoading, setLookupLoading] = useState(false)
  const [selectedMember, setSelectedMember] = useState<MemberResult | null>(null)

  const fetchForm = useCallback(async () => {
    try {
      const previewParam = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "1" ? "?preview=1" : ""
      const res = await fetch(`/api/signup/${slug}${previewParam}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "Form not found")
        return
      }
      const data = await res.json()
      setForm(data.form)

      // Initialize form values
      const initial: Record<string, unknown> = {}
      for (const field of data.form.fields as SignupFieldConfig[]) {
        initial[field.id] = getDefaultValue(field)
      }
      setValues(initial)

      if (data.responses) setResponses(data.responses)
    } catch {
      setError("Failed to load form")
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => { fetchForm() }, [fetchForm])

  async function handleMemberSearch(query: string, formId: string) {
    setLookupQuery(query)
    if (query.length < 3) {
      setLookupResults([])
      return
    }
    setLookupLoading(true)
    try {
      const res = await fetch("/api/signup/member-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId, query }),
      })
      const data = await res.json()
      setLookupResults(data.results ?? [])
    } catch {
      setLookupResults([])
    } finally {
      setLookupLoading(false)
    }
  }

  function selectMember(member: MemberResult, fields: SignupFieldConfig[]) {
    setSelectedMember(member)
    setLookupResults([])
    setLookupQuery(member.name)

    // Auto-fill related fields
    const updated = { ...values }
    for (const field of fields) {
      if (field.type === "member_lookup") {
        updated[field.id] = member.name
      } else if (field.type === "address" && member.address) {
        const parts = member.address.split(", ")
        updated[field.id] = {
          street: parts[0] || "",
          city: parts[1] || "",
          state: parts[2] || "",
          zip: parts[3] || "",
        }
      } else if (field.type === "phone" && member.phone) {
        updated[field.id] = member.phone
      }
    }
    updated._memberId = member.id
    setValues(updated)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch("/api/signup/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId: form.id,
          data: values,
          honeypot: (document.getElementById("__hp_website") as HTMLInputElement)?.value || "",
        }),
      })

      if (res.ok) {
        setSubmitted(true)
      } else {
        const data = await res.json()
        setSubmitError(data.error || "Submission failed")
      }
    } catch {
      setSubmitError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="text-center space-y-2">
          <AlertCircle className="size-10 mx-auto text-muted-foreground" />
          <p className="text-lg font-medium">{error}</p>
          <p className="text-sm text-muted-foreground">This form may have been closed or does not exist.</p>
        </div>
      </div>
    )
  }

  if (!form) return null

  const colors = getThemeColors(form.theme)
  const emoji = form.theme.emoji || "📋"

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
          <CheckCircle className="size-12 mx-auto mb-4" style={{ color: colors.primary }} />
          <h2 className="text-xl font-bold">Thank you!</h2>
          <p className="mt-2 text-muted-foreground">Your response has been recorded.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="mx-auto w-full max-w-lg">
        {/* Header */}
        <div
          className="rounded-t-xl p-6 text-center"
          style={{ backgroundColor: colors.primary }}
        >
          <p className="text-3xl">{emoji}</p>
          <h1 className="mt-2 text-xl font-bold text-white">{form.title}</h1>
          {form.description && (
            <p className="mt-1 text-sm text-white/80">{form.description}</p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="rounded-b-xl border border-t-0 bg-white p-6 shadow-sm">
          {/* Honeypot - hidden from humans */}
          <div className="absolute -left-[9999px]" aria-hidden="true">
            <input type="text" id="__hp_website" name="website" tabIndex={-1} autoComplete="off" />
          </div>

          <div className="space-y-5">
            {form.fields.map((field) => (
              <FieldRenderer
                key={field.id}
                field={field}
                value={values[field.id]}
                onChange={(v) => setValues((prev) => ({ ...prev, [field.id]: v }))}
                formId={form.id}
                memberAutocomplete={form.member_autocomplete}
                lookupQuery={lookupQuery}
                lookupResults={lookupResults}
                lookupLoading={lookupLoading}
                onLookupSearch={(q) => handleMemberSearch(q, form.id)}
                onMemberSelect={(m) => selectMember(m, form.fields)}
                selectedMember={selectedMember}
              />
            ))}
          </div>

          {submitError && (
            <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <Button
            type="submit"
            className="mt-6 w-full"
            style={{ backgroundColor: colors.primary }}
            disabled={submitting}
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : "Submit"}
          </Button>
        </form>

        {/* Public responses list */}
        {form.visibility === "public_link" && responses.length > 0 && (
          <div className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Users className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">{responses.length} signed up</h3>
            </div>
            <div className="space-y-2">
              {responses.map((r) => (
                <ResponseRow key={r.id} data={r.data} fields={form.fields} colors={colors} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Field Renderer ──────────────────────────────────────────────────────────

function FieldRenderer({
  field,
  value,
  onChange,
  formId,
  memberAutocomplete,
  lookupQuery,
  lookupResults,
  lookupLoading,
  onLookupSearch,
  onMemberSelect,
  selectedMember,
}: {
  field: SignupFieldConfig
  value: unknown
  onChange: (v: unknown) => void
  formId: string
  memberAutocomplete: boolean
  lookupQuery: string
  lookupResults: MemberResult[]
  lookupLoading: boolean
  onLookupSearch: (q: string) => void
  onMemberSelect: (m: MemberResult) => void
  selectedMember: MemberResult | null
}) {
  const labelEl = (
    <Label className="text-sm font-medium">
      {field.label}
      {field.required && <span className="text-red-500 ml-0.5">*</span>}
    </Label>
  )

  switch (field.type) {
    case "text":
      return (
        <div className="space-y-1.5">
          {labelEl}
          <Input
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            maxLength={field.maxLength ?? 1000}
            required={field.required}
          />
          {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
        </div>
      )

    case "email":
      return (
        <div className="space-y-1.5">
          {labelEl}
          <Input
            type="email"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || "email@example.com"}
            required={field.required}
          />
        </div>
      )

    case "phone":
      return (
        <div className="space-y-1.5">
          {labelEl}
          <Input
            type="tel"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || "(555) 123-4567"}
            required={field.required}
          />
        </div>
      )

    case "textarea":
      return (
        <div className="space-y-1.5">
          {labelEl}
          <Textarea
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={field.rows ?? 3}
            maxLength={field.maxLength ?? 2000}
            required={field.required}
          />
          {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
        </div>
      )

    case "select":
      return (
        <div className="space-y-1.5">
          {labelEl}
          <Select value={(value as string) || ""} onValueChange={(v) => onChange(v)}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || "Select..."} />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}{opt.disabled ? " (unavailable)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
        </div>
      )

    case "multi_select":
      return (
        <div className="space-y-1.5">
          {labelEl}
          <div className="space-y-1">
            {field.options.map((opt) => {
              const selected = (value as string[]) || []
              const checked = selected.includes(opt.value)
              return (
                <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      if (checked) {
                        onChange(selected.filter((v) => v !== opt.value))
                      } else {
                        if (field.maxSelections && selected.length >= field.maxSelections) return
                        onChange([...selected, opt.value])
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  {opt.label}
                </label>
              )
            })}
          </div>
        </div>
      )

    case "date":
      return (
        <div className="space-y-1.5">
          {labelEl}
          <Input
            type="date"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            min={field.minDate}
            max={field.maxDate}
            required={field.required}
          />
        </div>
      )

    case "month_picker": {
      const excluded = new Set(field.excludeMonths ?? [])
      return (
        <div className="space-y-1.5">
          {labelEl}
          <Select value={(value as number) ? String(value) : ""} onValueChange={(v) => onChange(parseInt(v ?? "0", 10))}>
            <SelectTrigger>
              <SelectValue placeholder="Select month..." />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)} disabled={excluded.has(i + 1)}>
                  {m}{excluded.has(i + 1) ? " (unavailable)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
        </div>
      )
    }

    case "number":
      return (
        <div className="space-y-1.5">
          {labelEl}
          <Input
            type="number"
            value={(value as number) || ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : 0)}
            min={field.min}
            max={field.max}
            placeholder={field.placeholder}
            required={field.required}
          />
        </div>
      )

    case "checkbox":
      return (
        <div className="flex items-center gap-3">
          <Switch
            checked={(value as boolean) || false}
            onCheckedChange={(v) => onChange(v)}
          />
          <Label className="text-sm">{field.checkboxLabel || field.label}</Label>
        </div>
      )

    case "address": {
      const addr = (value as { street: string; city: string; state: string; zip: string }) || { street: "", city: "", state: "", zip: "" }
      return (
        <div className="space-y-1.5">
          {labelEl}
          <Input
            placeholder="Street address"
            value={addr.street}
            onChange={(e) => onChange({ ...addr, street: e.target.value })}
            required={field.required}
          />
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="City"
              value={addr.city}
              onChange={(e) => onChange({ ...addr, city: e.target.value })}
              required={field.required}
              className="col-span-1"
            />
            <Input
              placeholder="State"
              value={addr.state}
              onChange={(e) => onChange({ ...addr, state: e.target.value })}
              required={field.required}
            />
            <Input
              placeholder="ZIP"
              value={addr.zip}
              onChange={(e) => onChange({ ...addr, zip: e.target.value })}
              required={field.required}
            />
          </div>
        </div>
      )
    }

    case "member_lookup":
      return (
        <div className="space-y-1.5">
          {labelEl}
          <div className="relative">
            <Input
              value={memberAutocomplete ? lookupQuery : (value as string) || ""}
              onChange={(e) => {
                if (memberAutocomplete) {
                  onLookupSearch(e.target.value)
                  onChange(e.target.value)
                } else {
                  onChange(e.target.value)
                }
              }}
              placeholder={field.placeholder || "Start typing your name..."}
              required={field.required}
            />
            {lookupLoading && (
              <Loader2 className="absolute right-2 top-2.5 size-4 animate-spin text-muted-foreground" />
            )}
            {memberAutocomplete && lookupResults.length > 0 && !selectedMember && (
              <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-lg">
                {lookupResults.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted/50 text-left"
                    onClick={() => onMemberSelect(m)}
                  >
                    <span className="font-medium">{m.name}</span>
                    {m.city && <span className="text-xs text-muted-foreground">{m.city}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedMember && (
            <p className="text-xs text-muted-foreground">
              Auto-filled from member directory
            </p>
          )}
          {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
        </div>
      )
  }
}

// ── Response Row (public view) ──────────────────────────────────────────────

function ResponseRow({ data, fields, colors }: { data: Record<string, unknown>; fields: SignupFieldConfig[]; colors: { primary: string; bgLight: string; border: string; textDark: string; textLight: string } }) {
  const nameField = fields.find((f) => f.type === "member_lookup" || (f.type === "text" && f.order === 0))
  const name = nameField ? (data[nameField.id] as string) : "Anonymous"
  const monthField = fields.find((f) => f.type === "month_picker")
  const month = monthField ? MONTHS[(data[monthField.id] as number) - 1] : undefined
  const addrField = fields.find((f) => f.type === "address")
  const addr = addrField ? (data[addrField.id] as { street?: string; city?: string; state?: string; zip?: string } | null) : null
  const addrStr = addr ? [addr.street, addr.city, [addr.state, addr.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ") : undefined
  const phoneField = fields.find((f) => f.type === "phone")
  const phone = phoneField ? (data[phoneField.id] as string) : undefined

  return (
    <div className="rounded-lg border px-4 py-3" style={{ borderColor: colors.border, backgroundColor: colors.bgLight }}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-sm" style={{ color: colors.textDark }}>{name}</span>
        {month && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.primary, color: "#fff" }}>
            {month}
          </span>
        )}
      </div>
      {(addrStr || phone) && (
        <div className="mt-1.5 space-y-0.5">
          {addrStr && <p className="text-xs" style={{ color: colors.textLight }}>{addrStr}</p>}
          {phone && <p className="text-xs" style={{ color: colors.textLight }}>{phone}</p>}
        </div>
      )}
    </div>
  )
}
