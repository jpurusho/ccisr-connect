"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { format } from "date-fns"
import type { SignupFieldConfig } from "@/lib/signup/field-registry"
import { type SignupFormTheme, getThemeColors } from "@/lib/signup/theme"

interface FormData {
  id: string
  title: string
  description: string | null
  theme: SignupFormTheme
  fields: SignupFieldConfig[]
}

interface ResponseEntry {
  id: string
  data: Record<string, unknown>
  created_at: string
  member_id?: string | null
}

interface AuditLogEntry {
  id: string
  entity_id: string | null
  changes: {
    formId: string
    formTitle: string
    ipHash: string
    verificationMethod: string
    responseData: Record<string, unknown>
    memberId?: string | null
    removedAt: string
  }
  created_at: string
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

function calculateAttendanceStats(
  responses: ResponseEntry[],
  fields: SignupFieldConfig[]
): { adults: number; kids: number; total: number } {
  let adults = 0
  let kids = 0

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

  return { adults, kids, total: adults + kids }
}

export default function SignupResponsesPage() {
  const params = useParams()
  const slug = params.slug as string

  const [form, setForm] = useState<FormData | null>(null)
  const [responses, setResponses] = useState<ResponseEntry[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<string>("created_at")
  const [sortAsc, setSortAsc] = useState(false)
  const [showAuditLogs, setShowAuditLogs] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/signup/${slug}`)
        if (!res.ok) {
          setError("Form not found")
          return
        }
        const data = await res.json()
        setForm(data.form)
        setResponses(data.responses || [])

        // Fetch audit logs
        const auditRes = await fetch(`/api/signup/${slug}/audit`)
        if (auditRes.ok) {
          const auditData = await auditRes.json()
          setAuditLogs(auditData.logs || [])
        }
      } catch {
        setError("Failed to load data")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (error || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-600">{error || "Form not found"}</div>
      </div>
    )
  }

  const colors = getThemeColors(form.theme)
  const nameField = form.fields.find((f) => f.type === "member_lookup" || (f.type === "text" && f.order === 0))
  const claimFields = form.fields.filter((f) => f.type === "claim_select")
  const monthField = form.fields.find((f) => f.type === "month_picker")
  const numberFields = form.fields.filter((f) => f.type === "number")
  const notesField = form.fields.find((f) => f.type === "textarea")
  const stats = calculateAttendanceStats(responses, form.fields)

  function toggleSort(field: string) {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  function getSortValue(response: ResponseEntry): string | number {
    if (sortField === "created_at") return new Date(response.created_at).getTime()
    if (sortField === "name") {
      return nameField ? String(response.data[nameField.id] || "") : ""
    }
    if (!form) return ""
    const field = form.fields.find((f) => f.id === sortField)
    if (!field) return ""
    const val = response.data[field.id]
    if (field.type === "month_picker" && typeof val === "number") return val
    if (typeof val === "string") return val
    if (Array.isArray(val)) return val.join(", ")
    if (typeof val === "object" && val) {
      const entries = Object.entries(val as Record<string, unknown>).filter(([, v]) => v)
      return entries.map(([item]) => item).join(", ")
    }
    return ""
  }

  const sortedResponses = [...responses].sort((a, b) => {
    const aVal = getSortValue(a)
    const bVal = getSortValue(b)
    if (aVal < bVal) return sortAsc ? -1 : 1
    if (aVal > bVal) return sortAsc ? 1 : -1
    return 0
  })

  function formatClaimedItems(data: Record<string, unknown>, field: SignupFieldConfig): string {
    const val = data[field.id]
    if (!val) return "—"
    if (Array.isArray(val)) {
      return val.map((item) => {
        const opt = field.type === "claim_select" && "options" in field
          ? (field as { options: { value: string; label: string }[] }).options.find((o) => o.value === item)
          : null
        return opt?.label ?? item
      }).join(", ")
    }
    if (typeof val === "object") {
      const entries = Object.entries(val as Record<string, unknown>).filter(([, v]) => v)
      return entries.map(([item, v]) => {
        const opt = field.type === "claim_select" && "options" in field
          ? (field as { options: { value: string; label: string }[] }).options.find((o) => o.value === item)
          : null
        const label = opt?.label ?? item
        const count = typeof v === "number" ? v : 1
        return count > 1 ? `${label} (×${count})` : label
      }).join(", ")
    }
    return "—"
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bgLight }}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: colors.primary }}>{form.title}</h1>
          {form.description && <p className="text-gray-600">{form.description}</p>}
        </div>

        {/* Summary Stats */}
        <div className="bg-white rounded-lg shadow-sm border p-4 md:p-6 mb-6" style={{ borderColor: colors.border }}>
          <h2 className="text-lg font-semibold mb-3" style={{ color: colors.textDark }}>Summary</h2>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="text-xl md:text-2xl font-bold" style={{ color: colors.primary }}>{responses.length}</div>
              <div className="text-xs md:text-sm text-gray-600">Signups</div>
            </div>
            {stats.total > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <div className="text-xl md:text-2xl font-bold" style={{ color: colors.primary }}>{stats.adults}</div>
                  <div className="text-xs md:text-sm text-gray-600">Adults</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xl md:text-2xl font-bold" style={{ color: colors.primary }}>{stats.kids}</div>
                  <div className="text-xs md:text-sm text-gray-600">Kids</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xl md:text-2xl font-bold" style={{ color: colors.primary }}>{stats.total}</div>
                  <div className="text-xs md:text-sm text-gray-600">Total</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Audit Log - Recent Removals */}
        {auditLogs.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border mb-6" style={{ borderColor: colors.border }}>
            <button
              onClick={() => setShowAuditLogs(!showAuditLogs)}
              className="w-full p-4 md:p-6 text-left flex items-center justify-between hover:bg-gray-50"
            >
              <div>
                <h2 className="text-lg font-semibold" style={{ color: colors.textDark }}>
                  Recent Removals ({auditLogs.length})
                </h2>
                <p className="text-xs text-gray-500 mt-1">Track who removed their signup</p>
              </div>
              <span className="text-gray-400 text-xl">{showAuditLogs ? "−" : "+"}</span>
            </button>

            {showAuditLogs && (
              <div className="border-t px-4 md:px-6 pb-4" style={{ borderColor: colors.border }}>
                <div className="space-y-3 mt-4">
                  {auditLogs.map((log) => {
                    const nameField = form?.fields.find((f) => f.type === "member_lookup" || (f.type === "text" && f.order === 0))
                    const removedName = nameField ? String(log.changes.responseData[nameField.id] || "Anonymous") : "Anonymous"
                    const wasMemberLinked = !!log.changes.memberId
                    const verificationUsed = log.changes.verificationMethod || "none"

                    return (
                      <div
                        key={log.id}
                        className="border rounded-lg p-3 bg-gray-50"
                        style={{ borderColor: colors.border }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium truncate" style={{ color: colors.textDark }}>
                                {removedName}
                              </span>
                              {wasMemberLinked && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  Member
                                </span>
                              )}
                              {verificationUsed === "phone" && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  Verified
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Removed {format(new Date(log.changes.removedAt), "MMM d, h:mm a")}
                            </div>

                            {/* Show what was removed */}
                            {claimFields.length > 0 && (
                              <div className="mt-2 text-xs text-gray-600">
                                {claimFields.map((field) => {
                                  const items = formatClaimedItems(log.changes.responseData, field)
                                  if (items === "—") return null
                                  return (
                                    <div key={field.id} className="mt-1">
                                      <span className="font-medium">{field.label}:</span> {items}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden" style={{ borderColor: colors.border }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b" style={{ borderColor: colors.border }}>
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 w-12">#</th>
                  <th
                    className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      Name
                      {sortField === "name" && (
                        <span className="text-xs">{sortAsc ? "▲" : "▼"}</span>
                      )}
                    </div>
                  </th>
                  {monthField && (
                    <th
                      className="hidden sm:table-cell text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleSort(monthField.id)}
                    >
                      <div className="flex items-center gap-1">
                        {monthField.label}
                        {sortField === monthField.id && (
                          <span className="text-xs">{sortAsc ? "▲" : "▼"}</span>
                        )}
                      </div>
                    </th>
                  )}
                  {numberFields.map((field) => (
                    <th key={field.id} className="hidden md:table-cell text-center py-3 px-4 font-semibold text-gray-700">
                      {field.label}
                    </th>
                  ))}
                  {claimFields.map((field) => (
                    <th
                      key={field.id}
                      className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleSort(field.id)}
                    >
                      <div className="flex items-center gap-1">
                        {field.label}
                        {sortField === field.id && (
                          <span className="text-xs">{sortAsc ? "▲" : "▼"}</span>
                        )}
                      </div>
                    </th>
                  ))}
                  {notesField && (
                    <th className="hidden xl:table-cell text-left py-3 px-4 font-semibold text-gray-700">
                      {notesField.label}
                    </th>
                  )}
                  <th
                    className="hidden lg:table-cell text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleSort("created_at")}
                  >
                    <div className="flex items-center gap-1">
                      Signed Up
                      {sortField === "created_at" && (
                        <span className="text-xs">{sortAsc ? "▲" : "▼"}</span>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedResponses.length === 0 ? (
                  <tr>
                    <td colSpan={100} className="text-center py-8 text-gray-500">
                      No signups yet
                    </td>
                  </tr>
                ) : (
                  sortedResponses.map((response, idx) => {
                    const name = nameField ? String(response.data[nameField.id] || "Anonymous") : "Anonymous"
                    const month = monthField ? (response.data[monthField.id] as number) : null
                    const isMemberLinked = !!response.member_id

                    return (
                      <tr key={response.id} className="border-b hover:bg-gray-50" style={{ borderColor: colors.border }}>
                        <td className="py-3 px-4 text-gray-500 font-medium">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium" style={{ color: colors.textDark }}>{name}</span>
                            {isMemberLinked && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Member
                              </span>
                            )}
                          </div>
                        </td>
                        {monthField && (
                          <td className="hidden sm:table-cell py-3 px-4">
                            {month && month > 0 ? (
                              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: colors.primary }}>
                                {MONTHS[month - 1]}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        )}
                        {numberFields.map((field) => {
                          const val = response.data[field.id] as number
                          return (
                            <td key={field.id} className="hidden md:table-cell py-3 px-4 text-center text-gray-600">
                              {typeof val === "number" && val > 0 ? val : "—"}
                            </td>
                          )
                        })}
                        {claimFields.map((field) => (
                          <td key={field.id} className="py-3 px-4 text-gray-600">
                            {formatClaimedItems(response.data, field)}
                          </td>
                        ))}
                        {notesField && (
                          <td className="hidden xl:table-cell py-3 px-4 text-gray-600 text-xs italic max-w-xs truncate">
                            {response.data[notesField.id] ? String(response.data[notesField.id]) : "—"}
                          </td>
                        )}
                        <td className="hidden lg:table-cell py-3 px-4 text-gray-500 text-xs">
                          {format(new Date(response.created_at), "MMM d, h:mm a")}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          Generated on {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}
        </div>
      </div>
    </div>
  )
}
