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
  addressParts?: { street: string; city: string; state: string; zip: string }
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
    if (selectedMember && query !== selectedMember.name) {
      setSelectedMember(null)
    }
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
      } else if (field.type === "address" && member.addressParts) {
        updated[field.id] = member.addressParts
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
    <div className="min-h-screen bg-slate-50 py-8 px-4 text-gray-900">
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

        {/* Bible verse / quote */}
        {form.theme.verse && (
          <div
            className="border border-t-0 px-5 py-4 text-center"
            style={{
              backgroundColor: form.theme.verseBgColor || colors.bgLight,
              borderColor: colors.border,
            }}
          >
            <p className="text-sm italic leading-relaxed" style={{ color: colors.textDark }}>
              &ldquo;{form.theme.verse}&rdquo;
            </p>
            {form.theme.verseRef && (
              <p className="mt-1.5 text-xs font-medium" style={{ color: colors.primary }}>
                — {form.theme.verseRef}
              </p>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className={`${form.theme.verse ? "border border-t-0" : "rounded-b-xl border border-t-0"} bg-white p-6 shadow-sm rounded-b-xl`}>
          {/* Honeypot - hidden from humans */}
          <div className="absolute -left-[9999px]" aria-hidden="true">
            <input type="text" id="__hp_website" name="website" tabIndex={-1} autoComplete="off" />
          </div>

          <div className="space-y-5">
            {form.fields.map((field) => (
              <FieldRenderer
                key={field.id}
                field={field}
                allFields={form.fields}
                value={values[field.id]}
                onChange={(v) => setValues((prev) => ({ ...prev, [field.id]: v }))}
                responses={responses}
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

          {/* Signed up list — inline within form */}
          {form.visibility === "public_link" && responses.length > 0 && (
            <SignupList
              responses={responses}
              fields={form.fields}
              colors={colors}
              formId={form.id}
              onRemoved={(id) => setResponses((prev) => prev.filter((r) => r.id !== id))}
            />
          )}

          {submitError && (
            <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-3 flex items-center justify-between gap-2">
              <span className="text-sm text-red-700">{submitError}</span>
              <button type="button" onClick={() => setSubmitError(null)} className="text-red-400 hover:text-red-600 shrink-0">
                <span className="text-lg leading-none">×</span>
              </button>
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

      </div>
    </div>
  )
}

// ── Collapsible Signup List ──────────────────────────────────────────────────

function SignupList({ responses, fields, colors, formId, onRemoved }: { responses: ResponseEntry[]; fields: SignupFieldConfig[]; colors: ReturnType<typeof getThemeColors>; formId: string; onRemoved: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [verifyPhone, setVerifyPhone] = useState("")
  const [verifyTarget, setVerifyTarget] = useState<{ id: string; phone: string } | null>(null)

  const phoneField = fields.find((f) => f.type === "phone")
  const monthField = fields.find((f) => f.type === "month_picker")
  const currentMonth = new Date().getMonth() + 1

  function initiateRemove(responseId: string, data: Record<string, unknown>) {
    const phone = phoneField ? (data[phoneField.id] as string) : ""
    const month = monthField ? (data[monthField.id] as number) : 0
    if (month > 0 && month < currentMonth) return // can't remove past months
    if (phone) {
      setVerifyTarget({ id: responseId, phone })
      setVerifyPhone("")
    } else {
      doRemove(responseId)
    }
  }

  async function doRemove(responseId: string) {
    setRemoving(responseId)
    setVerifyTarget(null)
    try {
      const res = await fetch("/api/signup/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseId, formId }),
      })
      if (res.ok) onRemoved(responseId)
    } finally {
      setRemoving(null)
    }
  }

  function confirmVerify() {
    if (!verifyTarget) return
    const clean = (s: string) => s.replace(/\D/g, "").slice(-4)
    if (clean(verifyPhone) === clean(verifyTarget.phone)) {
      doRemove(verifyTarget.id)
    } else {
      alert("Phone number doesn't match. Please enter the last 4 digits of the phone used to sign up.")
    }
  }

  return (
    <div className="mt-6 rounded-xl border bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 transition-colors hover:bg-slate-50"
      >
        <Users className="size-4" style={{ color: colors.primary }} />
        <span className="text-sm font-semibold text-gray-900">{responses.length} signed up</span>
        <svg
          className={`size-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="border-t max-h-64 overflow-y-auto">
          <div className="p-2 space-y-1.5">
            {responses.map((r) => {
              const month = monthField ? (r.data[monthField.id] as number) : 0
              const isPast = month > 0 && month < currentMonth
              return (
                <ResponseRow
                  key={r.id}
                  data={r.data}
                  fields={fields}
                  colors={colors}
                  removing={removing === r.id}
                  canRemove={!isPast}
                  onRemove={() => initiateRemove(r.id, r.data)}
                />
              )
            })}
          </div>
        </div>
      )}
      {/* Phone verification dialog */}
      {verifyTarget && (
        <div className="border-t bg-amber-50 p-3 space-y-2">
          <p className="text-xs text-amber-800 font-medium">Enter the last 4 digits of your phone to confirm removal:</p>
          <div className="flex gap-2">
            <input
              type="tel"
              value={verifyPhone}
              onChange={(e) => setVerifyPhone(e.target.value)}
              placeholder="Last 4 digits"
              maxLength={4}
              className="flex-1 rounded-md border border-amber-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
            <button
              type="button"
              onClick={confirmVerify}
              className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setVerifyTarget(null)}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Field Renderer ──────────────────────────────────────────────────────────

function FieldRenderer({
  field,
  allFields,
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
  responses,
}: {
  field: SignupFieldConfig
  allFields: SignupFieldConfig[]
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
  responses: ResponseEntry[]
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
            className="text-gray-900"
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
      const currentMonth = new Date().getMonth() + 1
      const nameField = allFields.find((f) => f.type === "member_lookup" || (f.type === "text" && f.order === 0))
      const takenMap = new Map<number, string>()
      for (const r of responses) {
        const m = r.data[field.id] as number
        if (typeof m === "number" && m > 0) {
          const who = nameField ? (r.data[nameField.id] as string) : ""
          takenMap.set(m, who || "Taken")
        }
      }

      return (
        <div className="space-y-1.5">
          {labelEl}
          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((m, i) => {
              const month = i + 1
              const isExcluded = excluded.has(month)
              const isPast = month < currentMonth
              const isTaken = takenMap.has(month)
              const takenBy = takenMap.get(month)
              const isSelected = (value as number) === month
              const isDisabled = isExcluded || isPast || isTaken

              let className = "rounded-lg border px-3 py-2 text-sm text-center transition-all "
              let statusText = ""

              if (isSelected) {
                className += "border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold ring-2 ring-emerald-200"
              } else if (isExcluded) {
                className += "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                statusText = "Break"
              } else if (isPast && isTaken) {
                className += "border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
                statusText = takenBy || "Done"
              } else if (isPast) {
                className += "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                statusText = "Past"
              } else if (isTaken) {
                className += "border-blue-200 bg-blue-50 text-blue-600 cursor-not-allowed"
                statusText = takenBy || "Taken"
              } else {
                className += "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer"
                statusText = "Open"
              }

              return (
                <button
                  key={month}
                  type="button"
                  disabled={isDisabled}
                  className={className}
                  onClick={() => !isDisabled && onChange(isSelected ? 0 : month)}
                >
                  <span className="block font-medium">{m.slice(0, 3)}</span>
                  <span className={`block text-[10px] mt-0.5 ${isSelected ? "text-emerald-600" : ""}`}>
                    {isSelected ? "Selected" : statusText}
                  </span>
                </button>
              )
            })}
          </div>
          {field.helpText && <p className="text-xs text-muted-foreground mt-1">{field.helpText}</p>}
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
            className="text-gray-900"
          />
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="City"
              value={addr.city}
              onChange={(e) => onChange({ ...addr, city: e.target.value })}
              required={field.required}
              className="text-gray-900"
            />
            <Input
              placeholder="State"
              value={addr.state}
              onChange={(e) => onChange({ ...addr, state: e.target.value })}
              required={field.required}
              className="text-gray-900"
            />
            <Input
              placeholder="ZIP"
              value={addr.zip}
              onChange={(e) => onChange({ ...addr, zip: e.target.value })}
              required={field.required}
              className="text-gray-900"
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
              className="text-gray-900"
            />
            {lookupLoading && (
              <Loader2 className="absolute right-2 top-2.5 size-4 animate-spin text-muted-foreground" />
            )}
            {memberAutocomplete && lookupResults.length > 0 && (!selectedMember || lookupQuery !== selectedMember.name) && (
              <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
                {lookupResults.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2.5 text-sm hover:bg-slate-100 text-left border-b border-gray-100 last:border-b-0"
                    onClick={() => onMemberSelect(m)}
                  >
                    <span className="font-medium text-gray-900">{m.name}</span>
                    {m.city && <span className="text-xs text-gray-500">{m.city}</span>}
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

function ResponseRow({ data, fields, colors, removing, canRemove, onRemove }: { data: Record<string, unknown>; fields: SignupFieldConfig[]; colors: { primary: string; bgLight: string; border: string; textDark: string; textLight: string }; removing: boolean; canRemove: boolean; onRemove: () => void }) {
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
        <div className="flex items-center gap-2">
          {month && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.primary, color: "#fff" }}>
              {month}
            </span>
          )}
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              disabled={removing}
              className="text-gray-400 hover:text-red-500 transition-colors p-0.5"
              title="Remove signup"
            >
              {removing ? <Loader2 className="size-3.5 animate-spin" /> : <span className="text-xs">✕</span>}
            </button>
          )}
        </div>
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
