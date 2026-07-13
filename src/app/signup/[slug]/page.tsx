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
  allow_count_selection?: boolean
  show_responses?: boolean
  hidden_custom_items?: Record<string, string[]>
  muted?: boolean
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

// Calculate attendance statistics from responses
function calculateAttendanceStats(
  responses: ResponseEntry[],
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-gray-900">
        <div className="w-full max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
          <CheckCircle className="size-12 mx-auto mb-4" style={{ color: colors.primary }} />
          <h2 className="text-xl font-bold text-gray-900">Thank you!</h2>
          <p className="mt-2 text-gray-600">Your response has been recorded.</p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setSubmitted(false)
                setSelectedMember(null)
                setLookupQuery("")
                const initial: Record<string, unknown> = {}
                for (const field of form.fields) initial[field.id] = getDefaultValue(field)
                setValues(initial)
                fetchForm()
              }}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: colors.primary }}
            >
              Submit Another Response
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) window.history.back()
                else window.close()
              }}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Calculate attendance statistics from responses
  const stats = calculateAttendanceStats(responses, form.fields)

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 text-gray-900 overflow-x-hidden">
      <div className="mx-auto w-full max-w-lg md:max-w-2xl overflow-hidden">
        {/* Header */}
        <div
          className="rounded-t-xl p-6 text-center"
          style={{ background: form.theme.headerGradient || colors.primary }}
        >
          <p className="text-3xl">{emoji}</p>
          <h1 className="mt-2 text-xl font-bold text-white">{form.title}</h1>
          {form.description && (
            <p className="mt-1 text-sm text-white/80">{form.description}</p>
          )}
          {(form.theme.eventDateText || form.theme.hostInfo) && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm text-white/90">
              {form.theme.eventDateText && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
                  📅 {form.theme.eventDateText}
                </span>
              )}
              {form.theme.hostInfo && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(form.theme.hostInfo)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-medium hover:bg-white/30 transition-colors cursor-pointer"
                >
                  🏠 {form.theme.hostInfo}
                </a>
              )}
            </div>
          )}
        </div>

        {/* Muted banner */}
        {form.muted && (
          <div className="border border-t-0 bg-amber-50 border-amber-200 px-5 py-3 text-center" style={{ borderColor: colors.border }}>
            <p className="text-sm font-medium text-amber-900">
              📋 This form is currently in read-only mode. You can view signups but cannot make changes.
            </p>
          </div>
        )}

        {/* Statistics Card */}
        {responses.length > 0 && stats.total > 0 && (
          <div className="border border-t-0 bg-white px-5 py-4" style={{ borderColor: colors.border }}>
            <div className="flex items-center justify-center gap-6">
              {stats.adults > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: colors.primary }}>{stats.adults}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Adult{stats.adults !== 1 ? 's' : ''}</div>
                </div>
              )}
              {stats.kids > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: colors.primary }}>{stats.kids}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Kid{stats.kids !== 1 ? 's' : ''}</div>
                </div>
              )}
              {stats.total > 0 && (stats.adults > 0 || stats.kids > 0) && (
                <div className="h-10 w-px bg-border" />
              )}
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: colors.primary }}>{stats.total}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Total</div>
              </div>
            </div>
          </div>
        )}

        {/* Bible verse / quote */}
        {form.theme.verse && (
          <div
            className="border border-t-0 px-5 py-4 text-center"
            style={{
              backgroundColor: form.theme.verseBgColor || colors.bgLight,
              borderColor: colors.border,
            }}
          >
            <p className="text-sm italic leading-relaxed" style={{ color: form.theme.verseTextColor || colors.textDark }}>
              &ldquo;{form.theme.verse}&rdquo;
            </p>
            {form.theme.verseRef && (
              <p className="mt-1.5 text-xs font-medium" style={{ color: form.theme.verseTextColor || colors.primary }}>
                — {form.theme.verseRef}
              </p>
            )}
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className={`${form.theme.verse ? "border border-t-0" : "rounded-b-xl border border-t-0"} bg-white p-6 shadow-sm rounded-b-xl`}
          style={{
            fontFamily: form.theme.fontFamily || undefined,
            color: form.theme.bodyTextColor || undefined,
          }}
        >
          {/* Honeypot - hidden from humans */}
          <div className="absolute -left-[9999px]" aria-hidden="true">
            <input type="text" id="__hp_website" name="website" tabIndex={-1} autoComplete="off" />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {form.fields.filter((f) => !f.hidden).map((field) => {
              const wideTypes = ["textarea", "claim_select", "address", "multi_select"]
              const isWide = wideTypes.includes(field.type)
              return (
              <div key={field.id} className={isWide ? "md:col-span-2" : ""}>
              <FieldRenderer
                field={field}
                allFields={form.fields}
                value={values[field.id]}
                onChange={(v) => setValues((prev) => ({ ...prev, [field.id]: v }))}
                responses={responses}
                formId={form.id}
                form={form}
                memberAutocomplete={form.member_autocomplete}
                lookupQuery={lookupQuery}
                lookupResults={lookupResults}
                lookupLoading={lookupLoading}
                onLookupSearch={(q) => handleMemberSearch(q, form.id)}
                onMemberSelect={(m) => selectMember(m, form.fields)}
                selectedMember={selectedMember}
                hiddenCustomItems={form.hidden_custom_items}
                colors={colors}
                disabled={form.muted || false}
              />
              </div>
              )
            })}
          </div>

          {/* Signed up list — inline within form (only if show_responses enabled) */}
          {form.show_responses !== false && form.visibility === "public_link" && responses.length > 0 && (
            <SignupList
              responses={responses}
              fields={form.fields}
              colors={colors}
              formId={form.id}
              slug={slug}
              muted={form.muted || false}
              onRemoved={(id) => setResponses((prev) => prev.filter((r) => r.id !== id))}
              onRefresh={(newResponses, newFields) => {
                setResponses(newResponses)
                setForm((prev) => prev ? { ...prev, fields: newFields } : prev)
              }}
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

          <div className="mt-6 flex gap-3">
            <Button
              type="submit"
              className="flex-1"
              style={{ backgroundColor: colors.primary }}
              disabled={form.muted || submitting || (() => {
                const monthField = form.fields.find((f) => f.type === "month_picker")
                if (!monthField || !monthField.required) return false
                const excluded = new Set((monthField as { excludeMonths?: number[] }).excludeMonths ?? [])
                const currentMonth = new Date().getMonth() + 1
                const takenMonths = new Set(responses.map((r) => r.data[monthField.id] as number).filter((m) => typeof m === "number" && m > 0))
                const hasOpen = Array.from({ length: 12 }, (_, i) => i + 1).some((m) => m >= currentMonth && !excluded.has(m) && !takenMonths.has(m))
                return !hasOpen
              })()}
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : form.muted ? "Form is Read-Only" : "Submit"}
            </Button>
            {responses.length > 0 && (
              <Button
                type="button"
                variant="outline"
                className="flex-shrink-0 bg-white hover:bg-gray-50"
                style={{ borderColor: colors.primary, color: colors.primary }}
                onClick={() => window.open(`/signup/${slug}/responses`, "_blank")}
              >
                View All Signups
              </Button>
            )}
          </div>
        </form>

      </div>
    </div>
  )
}

// ── Items Table ──────────────────────────────────────────────────────────────

function ItemsTable({ responses, fields, claimField, colors, showUnpicked }: { responses: ResponseEntry[]; fields: SignupFieldConfig[]; claimField: SignupFieldConfig; colors: ReturnType<typeof getThemeColors>; showUnpicked: boolean }) {
  const nameField = fields.find((f) => f.type === "member_lookup" || (f.type === "text" && f.order === 0))

  // Type-safe access to claim_select options
  if (claimField.type !== "claim_select") return null
  const options = claimField.options

  // Build maps for official options
  const optionValues = new Set(options.map((o) => o.value))
  const optionByLowerValue = new Map(options.map((o) => [o.value.toLowerCase(), o]))
  const optionByLowerLabel = new Map(options.map((o) => [o.label.toLowerCase(), o]))

  // Build item → people map (aggregating by canonical option value)
  const itemMap = new Map<string, { people: { name: string; count: number }[]; totalCount: number; option: typeof claimField.options[0] | null }>()

  for (const response of responses) {
    const items = response.data[claimField.id]
    const name = nameField ? (response.data[nameField.id] as string) || "Anonymous" : "Anonymous"

    if (Array.isArray(items)) {
      for (const item of items) {
        if (typeof item === "string") {
          const itemClean = item.trim()
          const itemLower = itemClean.toLowerCase()

          let canonicalValue = itemClean
          let option = null

          if (optionValues.has(itemClean)) {
            option = options.find((o) => o.value === itemClean) || null
          } else {
            const matchedOption = optionByLowerValue.get(itemLower) || optionByLowerLabel.get(itemLower)
            if (matchedOption) {
              canonicalValue = matchedOption.value
              option = matchedOption
            }
          }

          if (!itemMap.has(canonicalValue)) {
            itemMap.set(canonicalValue, { people: [], totalCount: 0, option })
          }
          const entry = itemMap.get(canonicalValue)!
          entry.people.push({ name, count: 1 })
          entry.totalCount += 1
        }
      }
    } else if (items && typeof items === "object" && !Array.isArray(items)) {
      for (const [itemValue, count] of Object.entries(items as Record<string, number>)) {
        if (typeof count !== "number" || count <= 0) continue
        const itemClean = itemValue.trim()
        const itemLower = itemClean.toLowerCase()

        let canonicalValue = itemClean
        let option = null

        if (optionValues.has(itemClean)) {
          option = options.find((o) => o.value === itemClean) || null
        } else {
          const matchedOption = optionByLowerValue.get(itemLower) || optionByLowerLabel.get(itemLower)
          if (matchedOption) {
            canonicalValue = matchedOption.value
            option = matchedOption
          }
        }

        if (!itemMap.has(canonicalValue)) {
          itemMap.set(canonicalValue, { people: [], totalCount: 0, option })
        }
        const entry = itemMap.get(canonicalValue)!
        entry.people.push({ name, count })
        entry.totalCount += count
      }
    }
  }

  if (showUnpicked) {
    // Show items that haven't been picked
    const unpickedOptions = options.filter((opt) => !itemMap.has(opt.value))

    if (unpickedOptions.length === 0) {
      return (
        <div className="p-6 text-center text-sm text-gray-500">
          All items have been claimed!
        </div>
      )
    }

    return (
      <div className="p-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: colors.border }}>
              <th className="text-left py-2 px-2 font-semibold text-gray-700">Item</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-700 w-24">Capacity</th>
            </tr>
          </thead>
          <tbody>
            {unpickedOptions.sort((a, b) => a.label.localeCompare(b.label)).map((opt) => (
              <tr key={opt.value} className="border-b" style={{ borderColor: colors.border }}>
                <td className="py-2 px-2 text-gray-600">{opt.label}</td>
                <td className="py-2 px-2 text-center text-gray-500 text-xs">
                  {((opt as { current_capacity?: number }).current_capacity ?? opt.capacity) < 50 ? `0/${(opt as { current_capacity?: number }).current_capacity ?? opt.capacity}` : "Available"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Show picked items
  const sortedItems = Array.from(itemMap.entries()).sort((a, b) => {
    const labelA = a[1].option?.label || a[0]
    const labelB = b[1].option?.label || b[0]
    return labelA.localeCompare(labelB)
  })

  if (sortedItems.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-gray-500">
        No items have been signed up yet.
      </div>
    )
  }

  return (
    <div className="p-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ borderColor: colors.border }}>
            <th className="text-left py-2 px-2 font-semibold text-gray-700">Item</th>
            <th className="text-center py-2 px-2 font-semibold text-gray-700 w-20">Claimed</th>
            <th className="text-left py-2 px-2 font-semibold text-gray-700">People</th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map(([canonicalValue, { people, totalCount, option }]) => {
            const label = option?.label || canonicalValue
            const currentCapacity = (option as { current_capacity?: number } | null)?.current_capacity ?? option?.capacity
            const isFull = currentCapacity && totalCount >= currentCapacity

            return (
              <tr key={canonicalValue} className="border-b" style={{ borderColor: colors.border }}>
                <td className="py-2 px-2 font-medium" style={{ color: colors.textDark }}>{label}</td>
                <td className="py-2 px-2 text-center">
                  <span className={`text-xs font-medium ${isFull ? "text-red-600" : "text-gray-600"}`}>
                    {currentCapacity && currentCapacity < 50 ? `${totalCount}/${currentCapacity}` : totalCount}
                  </span>
                </td>
                <td className="py-2 px-2 text-gray-600">
                  {people.map((p, i) => (
                    <span key={i}>{i > 0 && ", "}{p.name}{p.count > 1 && ` (×${p.count})`}</span>
                  ))}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── By Person View ───────────────────────────────────────────────────────────

function ByPersonView({ responses, fields, claimFields, colors }: { responses: ResponseEntry[]; fields: SignupFieldConfig[]; claimFields: SignupFieldConfig[]; colors: ReturnType<typeof getThemeColors> }) {
  const nameField = fields.find((f) => f.type === "member_lookup" || (f.type === "text" && f.order === 0))

  // Build person → items map
  const personMap = new Map<string, Map<string, string[]>>() // person → (fieldLabel → [items])

  for (const response of responses) {
    const name = (nameField ? (response.data[nameField.id] as string) : null) || "Anonymous"

    for (const claimField of claimFields) {
      if (claimField.type !== "claim_select") continue

      const items = response.data[claimField.id]
      if (Array.isArray(items) && items.length > 0) {
        if (!personMap.has(name)) {
          personMap.set(name, new Map())
        }
        const fieldMap = personMap.get(name)!
        if (!fieldMap.has(claimField.label)) {
          fieldMap.set(claimField.label, [])
        }
        fieldMap.get(claimField.label)!.push(...items.filter((item): item is string => typeof item === "string"))
      } else if (items && typeof items === "object" && !Array.isArray(items)) {
        const countItems = Object.entries(items as Record<string, number>)
          .filter(([, count]) => typeof count === "number" && count > 0)
          .map(([item, count]) => count > 1 ? `${item} (×${count})` : item)
        if (countItems.length > 0) {
          if (!personMap.has(name)) {
            personMap.set(name, new Map())
          }
          const fieldMap = personMap.get(name)!
          if (!fieldMap.has(claimField.label)) {
            fieldMap.set(claimField.label, [])
          }
          fieldMap.get(claimField.label)!.push(...countItems)
        }
      }
    }
  }

  const sortedPeople = Array.from(personMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))

  if (sortedPeople.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-gray-500">
        No items have been signed up yet.
      </div>
    )
  }

  return (
    <div className="p-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ borderColor: colors.border }}>
            <th className="text-left py-2 px-2 font-semibold text-gray-700">Person</th>
            <th className="text-left py-2 px-2 font-semibold text-gray-700">Items</th>
          </tr>
        </thead>
        <tbody>
          {sortedPeople.map(([person, fieldMap]) => {
            // Build a string showing all items grouped by field
            const itemsText = Array.from(fieldMap.entries())
              .map(([fieldLabel, items]) => {
                if (claimFields.length > 1) {
                  return `${fieldLabel}: ${items.join(", ")}`
                }
                return items.join(", ")
              })
              .join(" • ")

            return (
              <tr key={person} className="border-b" style={{ borderColor: colors.border }}>
                <td className="py-2 px-2 font-medium" style={{ color: colors.textDark }}>{person}</td>
                <td className="py-2 px-2 text-gray-600">{itemsText}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Collapsible Signup List ──────────────────────────────────────────────────

function SignupList({ responses, fields, colors, formId, slug, muted, onRemoved, onRefresh }: { responses: ResponseEntry[]; fields: SignupFieldConfig[]; colors: ReturnType<typeof getThemeColors>; formId: string; slug: string; muted: boolean; onRemoved: (id: string) => void; onRefresh: (responses: ResponseEntry[], fields: SignupFieldConfig[]) => void }) {
  const [open, setOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<"all" | "items" | "unpicked" | "person">("all")
  const [removing, setRemoving] = useState<string | null>(null)
  const [verifyPhone, setVerifyPhone] = useState("")
  const [verifyTarget, setVerifyTarget] = useState<{ id: string; phone: string } | null>(null)
  const [removeError, setRemoveError] = useState("")

  async function refetchData() {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/signup/${slug}`)
      if (res.ok) {
        const data = await res.json()
        if (data.responses && data.form?.fields) {
          onRefresh(data.responses, data.form.fields)
        }
      }
    } catch { /* silent */ } finally {
      setRefreshing(false)
    }
  }

  const phoneField = fields.find((f) => f.type === "phone")
  const monthField = fields.find((f) => f.type === "month_picker")
  const claimFields = fields.filter((f) => f.type === "claim_select")
  const currentMonth = new Date().getMonth() + 1

  function initiateRemove(responseId: string, data: Record<string, unknown>) {
    if (muted) return // can't remove when form is muted
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

  async function doRemove(responseId: string, phoneLast4?: string) {
    setRemoving(responseId)
    setVerifyTarget(null)
    try {
      const res = await fetch("/api/signup/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseId, formId, phoneLast4 }),
      })
      if (res.ok) {
        onRemoved(responseId)
        setRemoveError("")
      } else {
        const data = await res.json().catch(() => ({}))
        setRemoveError(data.error || "Failed to remove")
      }
    } finally {
      setRemoving(null)
    }
  }

  function confirmVerify() {
    if (!verifyTarget) return
    const clean = (s: string) => s.replace(/\D/g, "").slice(-4)
    if (clean(verifyPhone) === clean(verifyTarget.phone)) {
      setRemoveError("")
      doRemove(verifyTarget.id, clean(verifyPhone))
    } else {
      setRemoveError("Phone number doesn't match. Enter the last 4 digits.")
    }
  }

  return (
    <div className="mt-6 rounded-xl border bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => {
          const willOpen = !open
          setOpen(willOpen)
          if (willOpen) refetchData()
        }}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 transition-colors hover:bg-slate-50"
      >
        {refreshing ? <Loader2 className="size-4 animate-spin" style={{ color: colors.primary }} /> : <Users className="size-4" style={{ color: colors.primary }} />}
        <span className="text-sm font-semibold" style={{ color: colors.primary }}>{responses.length} signed up</span>
        <svg
          className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          style={{ color: colors.primary }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          {/* Tabs */}
          <div className="border-t flex border-b">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "all"
                  ? "border-b-2 text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              style={activeTab === "all" ? { borderBottomColor: colors.primary, color: colors.primary } : {}}
            >
              All Signups
            </button>
            {claimFields.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab("items")}
                  className={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === "items"
                      ? "border-b-2 text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  style={activeTab === "items" ? { borderBottomColor: colors.primary, color: colors.primary } : {}}
                >
                  By Item
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("unpicked")}
                  className={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === "unpicked"
                      ? "border-b-2 text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  style={activeTab === "unpicked" ? { borderBottomColor: colors.primary, color: colors.primary } : {}}
                >
                  Unpicked
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("person")}
                  className={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === "person"
                      ? "border-b-2 text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  style={activeTab === "person" ? { borderBottomColor: colors.primary, color: colors.primary } : {}}
                >
                  By Person
                </button>
              </>
            )}
          </div>

          {/* Tab Content */}
          <div className="max-h-64 overflow-y-auto">
            {activeTab === "all" ? (
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
                      canRemove={!isPast && !muted}
                      onRemove={() => initiateRemove(r.id, r.data)}
                    />
                  )
                })}
              </div>
            ) : activeTab === "items" ? (
              <div className="space-y-4">
                {claimFields.map((claimField) => (
                  <div key={claimField.id}>
                    <div className="px-3 pt-3 pb-2 border-b" style={{ borderColor: colors.border }}>
                      <h3 className="text-sm font-semibold" style={{ color: colors.textDark }}>
                        {claimField.label}
                      </h3>
                    </div>
                    <ItemsTable
                      responses={responses}
                      fields={fields}
                      claimField={claimField}
                      colors={colors}
                      showUnpicked={false}
                    />
                  </div>
                ))}
              </div>
            ) : activeTab === "unpicked" ? (
              <div className="space-y-4">
                {claimFields.map((claimField) => (
                  <div key={claimField.id}>
                    <div className="px-3 pt-3 pb-2 border-b" style={{ borderColor: colors.border }}>
                      <h3 className="text-sm font-semibold" style={{ color: colors.textDark }}>
                        {claimField.label}
                      </h3>
                    </div>
                    <ItemsTable
                      responses={responses}
                      fields={fields}
                      claimField={claimField}
                      colors={colors}
                      showUnpicked={true}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <ByPersonView
                responses={responses}
                fields={fields}
                claimFields={claimFields}
                colors={colors}
              />
            )}
          </div>
        </>
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
          {removeError && <p className="text-xs text-red-600 mt-1">{removeError}</p>}
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
  form,
  memberAutocomplete,
  lookupQuery,
  lookupResults,
  lookupLoading,
  onLookupSearch,
  onMemberSelect,
  selectedMember,
  responses,
  hiddenCustomItems,
  colors,
  disabled,
}: {
  field: SignupFieldConfig
  allFields: SignupFieldConfig[]
  value: unknown
  onChange: (v: unknown) => void
  formId: string
  form: FormData
  memberAutocomplete: boolean
  lookupQuery: string
  lookupResults: MemberResult[]
  lookupLoading: boolean
  onLookupSearch: (q: string) => void
  onMemberSelect: (m: MemberResult) => void
  selectedMember: MemberResult | null
  responses: ResponseEntry[]
  hiddenCustomItems?: Record<string, string[]>
  colors: ReturnType<typeof getThemeColors>
  disabled: boolean
}) {
  const labelEl = (
    <Label className="text-sm font-medium text-gray-700">
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
            disabled={disabled}
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
            disabled={disabled}
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
            disabled={disabled}
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
                    className="size-4 rounded border-2 text-white accent-current cursor-pointer"
                    style={{
                      accentColor: colors.primary,
                      borderColor: checked ? colors.primary : "#9CA3AF",
                    }}
                  />
                  {opt.label}
                </label>
              )
            })}
          </div>
        </div>
      )

    case "claim_select": {
      const useCountSelection = field.allowCountSelection ?? false

      // For count selection: value is { itemValue: count }
      // For checkbox selection: value is string[]
      const selected = useCountSelection ? (value as Record<string, number> || {}) : (value as string[] || [])

      // Build maps for case-insensitive matching
      const optionValues = new Set(field.options.map((o) => o.value))
      const optionByLowerValue = new Map(field.options.map((o) => [o.value.toLowerCase(), o.value]))
      const optionByLowerLabel = new Map(field.options.map((o) => [o.label.toLowerCase(), o.value]))

      // Count claims by canonical option value (aggregating case variations)
      const claimCounts: Record<string, number> = {}
      const hiddenForField = new Set(hiddenCustomItems?.[field.id] || [])
      const customItems = new Map<string, number>()

      for (const r of responses) {
        const items = r.data[field.id]

        // Handle both formats: old array format and new count format
        if (Array.isArray(items)) {
          // Old checkbox format: array of strings
          for (const item of items) {
            if (typeof item === "string") {
              const itemClean = item.trim()
              const itemLower = itemClean.toLowerCase()
              const canonicalValue = optionValues.has(itemClean) ? itemClean :
                                    optionByLowerValue.get(itemLower) ||
                                    optionByLowerLabel.get(itemLower)
              if (canonicalValue) {
                claimCounts[canonicalValue] = (claimCounts[canonicalValue] || 0) + 1
              } else if (!hiddenForField.has(itemClean)) {
                customItems.set(itemClean, (customItems.get(itemClean) || 0) + 1)
              }
            }
          }
        } else if (items && typeof items === "object") {
          // New count format: { itemValue: count }
          for (const [item, count] of Object.entries(items)) {
            if (typeof count === "number" && count > 0) {
              const itemClean = item.trim()
              const itemLower = itemClean.toLowerCase()
              const canonicalValue = optionValues.has(itemClean) ? itemClean :
                                    optionByLowerValue.get(itemLower) ||
                                    optionByLowerLabel.get(itemLower)
              if (canonicalValue) {
                claimCounts[canonicalValue] = (claimCounts[canonicalValue] || 0) + count
              } else if (!hiddenForField.has(itemClean)) {
                customItems.set(itemClean, (customItems.get(itemClean) || 0) + count)
              }
            }
          }
        }
      }

      const selectedCount = useCountSelection ? Object.keys(selected).length : (selected as string[]).length
      const atMax = !!(field.maxSelections && selectedCount >= field.maxSelections)
      return (
        <div className="space-y-1.5">
          {labelEl}
          {useCountSelection ? (
            // Count selection mode: show number inputs
            <div className="space-y-2">
              {field.options.map((opt) => {
                const taken = claimCounts[opt.value] || 0
                const currentCapacity = opt.current_capacity ?? opt.capacity
                const available = currentCapacity - taken
                const currentCount = (selected as Record<string, number>)[opt.value] || 0
                const canIncrease = field.allowCapacityIncrease ?? false
                const maxAllowed = Math.min(available + currentCount, currentCapacity)
                const isFull = available <= 0 && currentCount === 0

                return (
                  <div key={opt.value} className={`flex items-center gap-3 p-2 border rounded-lg ${disabled || (isFull && !canIncrease) ? "opacity-50 bg-gray-50" : "bg-white"}`}>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{opt.label}</div>
                      <div className="text-xs text-muted-foreground">
                        <span>
                          {currentCapacity < 50 ? `${taken}/${currentCapacity} claimed` : `${taken} claimed`}
                          {available > 0 && ` • ${available} available`}
                          {isFull && canIncrease && " • full"}
                        </span>
                        {canIncrease && !disabled && (
                          <span className="flex items-center gap-1.5 mt-1">
                            <button
                              type="button"
                              onClick={async () => {
                                const newCap = currentCapacity + 1
                                try {
                                  const res = await fetch("/api/signup/update-capacity", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      formId: form.id,
                                      fieldId: field.id,
                                      itemValue: opt.value,
                                      newCapacity: newCap,
                                    }),
                                  })
                                  if (res.ok) {
                                    opt.current_capacity = newCap
                                    onChange({ ...(value as object) })
                                  }
                                } catch (e) {
                                  console.error("Failed to update capacity", e)
                                }
                              }}
                              className="text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              + Add Slot
                            </button>
                            {currentCapacity > taken && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const newCap = currentCapacity - 1
                                  try {
                                    const res = await fetch("/api/signup/update-capacity", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        formId: form.id,
                                        fieldId: field.id,
                                        itemValue: opt.value,
                                        newCapacity: newCap,
                                      }),
                                    })
                                    if (res.ok) {
                                      opt.current_capacity = newCap
                                      onChange({ ...(value as object) })
                                    }
                                  } catch (e) {
                                    console.error("Failed to update capacity", e)
                                  }
                                }}
                                className="text-[11px] font-medium text-red-600 hover:text-red-800 hover:underline"
                              >
                                − Reduce Slot
                              </button>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={disabled || currentCount <= 0}
                        onClick={() => {
                          const newSelected = { ...(selected as Record<string, number>) }
                          const newCount = currentCount - 1
                          if (newCount <= 0) {
                            delete newSelected[opt.value]
                          } else {
                            newSelected[opt.value] = newCount
                          }
                          onChange(newSelected)
                        }}
                        className="size-7 rounded border border-gray-300 flex items-center justify-center text-lg font-bold hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={currentCount || ""}
                        min={0}
                        max={canIncrease ? undefined : maxAllowed}
                        disabled={disabled || (isFull && !canIncrease)}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0
                          const clamped = canIncrease ? Math.max(0, val) : Math.min(Math.max(0, val), maxAllowed)
                          const newSelected = { ...(selected as Record<string, number>) }
                          if (clamped <= 0) {
                            delete newSelected[opt.value]
                          } else {
                            newSelected[opt.value] = clamped
                          }
                          onChange(newSelected)
                        }}
                        className="w-14 text-center border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="0"
                      />
                      <button
                        type="button"
                        disabled={disabled || (!canIncrease && (isFull || currentCount >= maxAllowed))}
                        onClick={async () => {
                          const needsExpand = currentCount >= available + currentCount
                          if (canIncrease && needsExpand) {
                            const newCap = currentCapacity + 1
                            try {
                              const res = await fetch("/api/signup/update-capacity", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  formId: form.id,
                                  fieldId: field.id,
                                  itemValue: opt.value,
                                  newCapacity: newCap,
                                }),
                              })
                              if (!res.ok) return
                              opt.current_capacity = newCap
                            } catch (e) {
                              console.error("Failed to update capacity", e)
                              return
                            }
                          }
                          const newSelected = { ...(selected as Record<string, number>) }
                          newSelected[opt.value] = currentCount + 1
                          onChange(newSelected)
                        }}
                        className="size-7 rounded border border-gray-300 flex items-center justify-center text-lg font-bold hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            // Checkbox mode: original behavior
            <div className="space-y-1">
              {field.options.map((opt) => {
                const taken = claimCounts[opt.value] || 0
                const full = taken >= opt.capacity
                const checked = (selected as string[]).includes(opt.value)
                return (
                  <label key={opt.value} className={`flex items-center gap-2 text-sm ${(full && !checked) || disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled || (full && !checked) || (atMax && !checked)}
                      onChange={() => {
                        if (checked) {
                          onChange((selected as string[]).filter((v) => v !== opt.value))
                        } else {
                          onChange([...(selected as string[]), opt.value])
                        }
                      }}
                      className="size-4 rounded border-2 text-white accent-current cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        accentColor: colors.primary,
                        borderColor: checked ? colors.primary : "#9CA3AF",
                      }}
                    />
                    <span>{opt.label}</span>
                    {taken > 0 && (
                      <span className={`text-xs ${full ? "text-red-500" : "text-gray-400"}`}>
                        {opt.capacity < 50 ? `(${taken}/${opt.capacity})` : `(${taken} signed up)`}
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          )}
          {!useCountSelection && customItems.size > 0 && (
            <>
              <div className="border-t my-2" />
              {Array.from(customItems.entries()).map(([item, count]) => {
                  const checked = (selected as string[]).includes(item)
                  return (
                    <label key={item} className={`flex items-center gap-2 text-sm ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled || (atMax && !checked)}
                        onChange={() => {
                          if (checked) onChange((selected as string[]).filter((v) => v !== item))
                          else onChange([...(selected as string[]), item])
                        }}
                        className="size-4 rounded border-2 text-white accent-current cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          accentColor: colors.primary,
                          borderColor: checked ? colors.primary : "#9CA3AF",
                        }}
                      />
                      <span>{item}</span>
                      <span className="text-xs text-gray-400">({count} signed up)</span>
                    </label>
                )
              })}
            </>
          )}
          {field.allowCustom && !disabled && !useCountSelection && (
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                placeholder="Add your own item..."
                disabled={disabled}
                className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    const val = (e.target as HTMLInputElement).value.trim()
                    if (val && !(selected as string[]).includes(val) && !atMax) {
                      onChange([...(selected as string[]), val])
                      ;(e.target as HTMLInputElement).value = ""
                    }
                  }
                }}
              />
              <button
                type="button"
                className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium hover:bg-gray-50"
                onClick={(e) => {
                  const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement
                  const val = input?.value.trim()
                  if (val && !(selected as string[]).includes(val) && !atMax) {
                    onChange([...(selected as string[]), val])
                    input.value = ""
                  }
                }}
              >
                Add
              </button>
            </div>
          )}
          {useCountSelection ? (
            // Show summary for count selection
            Object.keys(selected as Record<string, number>).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {Object.entries(selected as Record<string, number>).map(([item, count]) => (
                  <span key={item} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                    {item} × {count}
                    <button type="button" onClick={() => {
                      const newSelected = { ...(selected as Record<string, number>) }
                      delete newSelected[item]
                      onChange(newSelected)
                    }} className="text-gray-400 hover:text-red-500">
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )
          ) : (
            // Show checkbox selections
            (selected as string[]).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {(selected as string[]).map((item) => (
                  <span key={item} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                    {item}
                    <button type="button" onClick={() => onChange((selected as string[]).filter((v) => v !== item))} className="text-gray-400 hover:text-red-500">
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )
          )}
          {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
        </div>
      )
    }

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
            onChange={(e) => onChange(e.target.value ? Math.max(0, Number(e.target.value)) : 0)}
            min={field.min ?? 0}
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
            style={(value as boolean) ? { backgroundColor: colors.primary } : {}}
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
  const claimField = fields.find((f) => f.type === "claim_select")
  const claimedRaw = claimField ? data[claimField.id] : undefined
  const claimedItems: string[] | undefined = Array.isArray(claimedRaw)
    ? claimedRaw
    : claimedRaw && typeof claimedRaw === "object"
      ? Object.entries(claimedRaw as Record<string, number>)
          .filter(([, count]) => typeof count === "number" && count > 0)
          .map(([item, count]) => count > 1 ? `${item}::${count}` : item)
      : undefined
  const numberFields = fields.filter((f) => f.type === "number")
  const attendees = numberFields.map((f) => ({ label: f.label, value: data[f.id] as number })).filter((a) => a.value > 0)

  return (
    <div className="rounded-lg border px-4 py-3" style={{ borderColor: colors.border, backgroundColor: colors.bgLight }}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-sm" style={{ color: colors.textDark }}>{name}</span>
        <div className="flex items-center gap-2">
          {attendees.length > 0 && (
            <span className="text-xs text-gray-500">
              {attendees.map((a) => `${a.value}`).join("+")}
            </span>
          )}
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
      {(claimedItems?.length || addrStr || phone) && (
        <div className="mt-1.5 space-y-0.5">
          {claimedItems && claimedItems.length > 0 && (
            <p className="text-xs font-medium" style={{ color: colors.primary }}>
              Bringing: {claimedItems.map((item) => {
                const [value, countStr] = item.split("::")
                const count = countStr ? parseInt(countStr) : 1
                const opt = claimField && "options" in claimField ? (claimField as { options: { value: string; label: string }[] }).options.find((o) => o.value === value) : null
                const label = opt?.label ?? value
                return count > 1 ? `${label} (×${count})` : label
              }).join(", ")}
            </p>
          )}
          {addrStr && <p className="text-xs" style={{ color: colors.textLight }}>{addrStr}</p>}
          {phone && <p className="text-xs" style={{ color: colors.textLight }}>{phone}</p>}
        </div>
      )}
    </div>
  )
}
