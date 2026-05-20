"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { logAudit } from "@/lib/audit"
import { type SignupFieldConfig } from "@/lib/signup/field-registry"
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowLeft,
  ArrowUpDown,
  Download,
  Search,
  Trash2,
  Users,
  Copy,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface FormInfo {
  id: string
  title: string
  slug: string
  fields: SignupFieldConfig[]
  status: string
  visibility: string
}

interface ResponseRow {
  id: string
  data: Record<string, unknown>
  member_id: string | null
  created_at: string
}

const MONTHS = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

export default function SignupResponsesPage() {
  const params = useParams()
  const router = useRouter()
  const formId = params.id as string

  const [form, setForm] = useState<FormInfo | null>(null)
  const [responses, setResponses] = useState<ResponseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortAsc, setSortAsc] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const formRes = await supabase
      .from("signup_forms")
      .select("id, title, slug, fields, status, visibility")
      .eq("id", formId)
      .returns<FormInfo[]>()
      .single()

    const respRes = await supabase
      .from("signup_responses")
      .select("id, data, member_id, created_at")
      .eq("form_id", formId)
      .order("created_at", { ascending: false })
      .returns<ResponseRow[]>()

    if (formRes.data) setForm(formRes.data)
    if (respRes.data) setResponses(respRes.data)
    setLoading(false)
  }, [formId])

  useEffect(() => { fetchData() }, [fetchData])

  async function confirmDelete() {
    if (!deleteTarget) return
    const supabase = createClient()
    const { error } = await supabase.from("signup_responses").delete().eq("id", deleteTarget)
    if (error) {
      toast.error(`Failed: ${error.message}`)
    } else {
      toast.success("Response deleted")
      logAudit("signup_response_deleted", "signup_responses", deleteTarget, { formId })
      setResponses((prev) => prev.filter((r) => r.id !== deleteTarget))
    }
    setDeleteTarget(null)
  }

  function exportCsv() {
    if (!form || responses.length === 0) return
    const fields = form.fields
    const headers = ["#", ...fields.map((f) => f.label), "Submitted"]
    const rows = responses.map((r, i) => {
      const cells = fields.map((f) => {
        const val = r.data[f.id]
        if (f.type === "month_picker" && typeof val === "number") return MONTHS[val] || ""
        if (f.type === "address" && typeof val === "object" && val) {
          const a = val as { street?: string; city?: string; state?: string; zip?: string }
          return [a.street, a.city, a.state, a.zip].filter(Boolean).join(", ")
        }
        if (Array.isArray(val)) return val.join("; ")
        return String(val ?? "")
      })
      return [String(i + 1), ...cells, format(new Date(r.created_at), "MMM d, yyyy h:mm a")]
    })

    const csv = [headers, ...rows].map((row) => row.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${form.slug}-responses.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function getDisplayValue(field: SignupFieldConfig, val: unknown): string {
    if (val == null || val === "") return "—"
    if (field.type === "month_picker" && typeof val === "number") return MONTHS[val] || "—"
    if (field.type === "checkbox") return val ? "Yes" : "No"
    if (field.type === "address" && typeof val === "object") {
      const a = val as { street?: string; city?: string; state?: string; zip?: string }
      return [a.street, a.city, a.state, a.zip].filter(Boolean).join(", ") || "—"
    }
    if (Array.isArray(val)) return val.join(", ")
    return String(val)
  }

  function toggleSort(fieldId: string) {
    if (sortField === fieldId) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(fieldId)
      setSortAsc(true)
    }
  }

  function getSortValue(r: ResponseRow, fieldId: string): string | number {
    if (fieldId === "_submitted") return r.created_at
    const val = r.data[fieldId]
    if (typeof val === "number") return val
    if (typeof val === "string") return val.toLowerCase()
    if (typeof val === "object" && val) return JSON.stringify(val).toLowerCase()
    return ""
  }

  let filtered = search.trim()
    ? responses.filter((r) =>
        Object.values(r.data).some((v) =>
          String(v ?? "").toLowerCase().includes(search.toLowerCase())
        )
      )
    : [...responses]

  if (sortField) {
    filtered = [...filtered].sort((a, b) => {
      const av = getSortValue(a, sortField)
      const bv = getSortValue(b, sortField)
      if (av < bv) return sortAsc ? -1 : 1
      if (av > bv) return sortAsc ? 1 : -1
      return 0
    })
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!form) {
    return (
      <div className="p-6 text-center text-muted-foreground">Form not found</div>
    )
  }

  const signupUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/signup/${form.slug}`

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => router.push("/signups")} title="Back to signups">
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{form.title}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant={form.status === "active" ? "default" : "secondary"}>{form.status}</Badge>
            <span className="text-xs text-muted-foreground">{responses.length} responses</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(signupUrl)
              toast.success("Link copied")
            }}
          >
            <Copy className="size-3.5" />
            Copy Link
          </Button>
          {form.status === "active" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(signupUrl, "_blank")}
            >
              <ExternalLink className="size-3.5" />
              Open
            </Button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search responses..."
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            const supabase = createClient()
            await supabase.from("signup_rate_limits").delete().eq("form_id", formId)
            toast.success("Rate limits cleared")
          }}
          title="Clear rate limit counters for this form"
        >
          Reset Limits
        </Button>
        {responses.length > 0 && (
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="size-3.5" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4" />
            Responses
          </CardTitle>
          <CardDescription>{filtered.length} of {responses.length} shown</CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {responses.length === 0 ? "No responses yet" : "No matches"}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    {form.fields.map((f) => (
                      <TableHead key={f.id} className="min-w-[120px] cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort(f.id)}>
                        <span className="flex items-center gap-1">
                          {f.label}
                          {sortField === f.id && <ArrowUpDown className="size-3" />}
                        </span>
                      </TableHead>
                    ))}
                    <TableHead className="min-w-[140px] cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("_submitted")}>
                      <span className="flex items-center gap-1">
                        Submitted
                        {sortField === "_submitted" && <ArrowUpDown className="size-3" />}
                      </span>
                    </TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r, i) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      {form.fields.map((f) => (
                        <TableCell key={f.id} className="text-sm">
                          {getDisplayValue(f, r.data[f.id])}
                        </TableCell>
                      ))}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(r.created_at), "MMM d, h:mm a")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteTarget(r.id)}
                          title="Delete"
                        >
                          <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Response</DialogTitle>
            <DialogDescription>Are you sure you want to delete this signup response? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
