"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { History, Search, Eye, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"

interface DispatchRecord {
  id: string
  subject: string
  body_html: string
  status: string
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
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewSubject, setPreviewSubject] = useState("")

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from("dispatch_queue")
      .select("id, subject, body_html, status, scheduled_at, sent_at, created_at, error_message", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (search.trim()) {
      query = query.ilike("subject", `%${search.trim()}%`)
    }

    const { data, count } = await query
    if (data) setDispatches(data)
    setTotal(count ?? 0)
    setLoading(false)
  }, [page, search])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  useEffect(() => {
    setPage(0)
  }, [search])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dispatch History</h1>
        <p className="text-muted-foreground">
          View all past email dispatches and their status.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by subject..."
          className="pl-9"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-5" />
            Dispatches
          </CardTitle>
          <CardDescription>
            {total} dispatch{total !== 1 ? "es" : ""} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : dispatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="size-10 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No dispatches found.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Emails you send will appear here.
              </p>
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
                      <TableCell className="font-medium max-w-xs truncate">
                        {d.subject}
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {format(new Date(d.scheduled_at), "MMM d, yyyy h:mm a")}
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {d.sent_at
                          ? format(new Date(d.sent_at), "MMM d, yyyy h:mm a")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_COLORS[d.status] as "default" | "destructive" | "outline" | "secondary" || "secondary"}>
                          {d.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setPreviewSubject(d.subject)
                            setPreviewHtml(d.body_html)
                          }}
                        >
                          <Eye className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!previewHtml} onOpenChange={() => setPreviewHtml(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>{previewSubject}</DialogDescription>
          </DialogHeader>
          {previewHtml && (
            <div
              className="rounded border bg-white p-4"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
