"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { logAudit } from "@/lib/audit"
import { sanitizeHtml } from "@/lib/sanitize-html"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  History,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Trash2,
  AlertTriangle,
} from "lucide-react"
import { format } from "date-fns"
import type { DispatchStatus } from "@/types/database"

interface DispatchRecord {
  id: string
  subject: string
  body_html: string
  status: string
  template_type: string | null
  scheduled_at: string
  sent_at: string | null
  created_at: string
  error_message: string | null
}

const PAGE_SIZE = 20

const STATUS_COLORS: Record<string, string> = {
  sent: "default",
  failed: "destructive",
  cancelled: "outline",
  pending: "secondary",
  approved: "secondary",
  sending: "secondary",
  previewed: "outline",
}

export default function HistoryPage() {
  const [dispatches, setDispatches] = useState<DispatchRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewSubject, setPreviewSubject] = useState("")
  const [purgeOpen, setPurgeOpen] = useState(false)
  const [purging, setPurging] = useState(false)

  const fetchDispatches = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    let query = supabase
      .from("dispatch_queue")
      .select("id, subject, body_html, status, template_type, scheduled_at, sent_at, created_at, error_message", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (search.trim()) query = query.ilike("subject", `%${search.trim()}%`)
    if (statusFilter !== "all") query = query.eq("status", statusFilter as DispatchStatus)
    if (dateFrom) query = query.gte("created_at", dateFrom)
    if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59")

    const { data, count } = await query
    if (data) setDispatches(data)
    setTotal(count ?? 0)
    setLoading(false)
  }, [page, search, statusFilter, dateFrom, dateTo])

  useEffect(() => { fetchDispatches() }, [fetchDispatches])
  useEffect(() => { setPage(0) }, [search, statusFilter, dateFrom, dateTo])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  async function handlePurge() {
    setPurging(true)
    const supabase = createClient()
    let query = supabase.from("dispatch_queue").delete()
    if (statusFilter !== "all") query = query.eq("status", statusFilter as DispatchStatus)
    else query = query.gte("created_at", "1970-01-01")
    const { error } = await query
    const { toast } = await import("sonner")
    if (error) {
      toast.error(`Purge failed: ${error.message}`)
    } else {
      toast.success("Dispatches purged")
      await logAudit("dispatches_purged", "dispatch_queue", null, { statusFilter })
      fetchDispatches()
    }
    setPurging(false)
    setPurgeOpen(false)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by subject..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
          </div>
          {(dateFrom || dateTo || statusFilter !== "all" || search) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("all"); setDateFrom(""); setDateTo("") }}>Clear</Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><History className="size-5" />Dispatches</CardTitle>
              <CardDescription>{total} dispatch{total !== 1 ? "es" : ""}</CardDescription>
            </div>
            {total > 0 && (
              <Button variant="outline" size="sm" onClick={() => setPurgeOpen(true)} className="text-destructive">
                <Trash2 className="size-3.5" data-icon="inline-start" />Purge
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : dispatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="size-10 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No dispatches found.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead className="hidden md:table-cell">Scheduled</TableHead>
                    <TableHead className="hidden md:table-cell">Sent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-16">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dispatches.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium max-w-xs">
                        <span className="truncate block">{d.subject}</span>
                        {d.template_type && (
                          <span className="text-[10px] text-muted-foreground">{d.template_type.replace(/_/g, " ")}</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{format(new Date(d.scheduled_at), "MMM d, yyyy h:mm a")}</TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{d.sent_at ? format(new Date(d.sent_at), "MMM d, yyyy h:mm a") : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={(STATUS_COLORS[d.status] as "default" | "destructive" | "outline" | "secondary") || "secondary"}>{d.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon-sm" onClick={() => { setPreviewSubject(d.subject); setPreviewHtml(d.body_html) }} title="Preview email">
                          <Eye className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="icon-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)} title="Previous page"><ChevronLeft /></Button>
                    <Button variant="outline" size="icon-sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} title="Next page"><ChevronRight /></Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!previewHtml} onOpenChange={() => setPreviewHtml(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Email Preview</SheetTitle>
            <p className="text-sm text-muted-foreground">{previewSubject}</p>
          </SheetHeader>
          {previewHtml && <div className="rounded border bg-white p-4" dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewHtml) }} />}
          <SheetFooter>
            <SheetClose render={<Button variant="outline" />}>
              Close
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={purgeOpen} onOpenChange={setPurgeOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="size-5 text-destructive" />Purge Dispatches</DialogTitle>
            <DialogDescription>This will permanently delete {statusFilter !== "all" ? `all "${statusFilter}" dispatches` : "all dispatches"}.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurgeOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handlePurge} disabled={purging}>{purging ? "Purging..." : "Purge"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
