"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { logAudit } from "@/lib/audit"
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
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Mail,
  Activity,
  Trash2,
  AlertTriangle,
  ArrowUpDown,
} from "lucide-react"
import { format } from "date-fns"

// ── Dispatch types ────────────────────────────────────────────────────────

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

// ── Audit log types ───────────────────────────────────────────────────────

interface AuditRecord {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  changes: Record<string, unknown> | null
  created_at: string
}

const ACTION_COLORS: Record<string, string> = {
  dispatch_created: "default",
  dispatch_scheduled: "secondary",
  dispatch_reminder_sent: "outline",
  dispatch_approved: "default",
  dispatch_cancelled: "destructive",
  dispatch_updated: "secondary",
  member_created: "default",
  member_updated: "secondary",
  member_deleted: "destructive",
  member_toggled_active: "outline",
  family_created: "default",
  smtp_config_created: "default",
  smtp_config_updated: "secondary",
  smtp_config_deleted: "destructive",
  smtp_config_toggled: "outline",
  user_invited: "default",
  user_toggled_active: "outline",
  user_role_changed: "secondary",
  mailing_list_created: "default",
  mailing_list_updated: "secondary",
  mailing_list_deleted: "destructive",
  template_created: "default",
  template_updated: "secondary",
}

const ENTITY_TYPES = [
  "all",
  "dispatch_queue",
  "members",
  "families",
  "smtp_configs",
  "app_users",
  "mailing_lists",
  "email_templates",
]

const ENTITY_TYPE_LABELS: Record<string, string> = {
  all: "All Entities",
  dispatch_queue: "Dispatches",
  members: "Members",
  families: "Families",
  smtp_configs: "SMTP Configs",
  app_users: "Users",
  mailing_lists: "Mailing Lists",
  email_templates: "Templates",
}

// ── Component ─────────────────────────────────────────────────────────────

export default function HistoryPage() {
  // -- Dispatches tab state --
  const [dispatches, setDispatches] = useState<DispatchRecord[]>([])
  const [dLoading, setDLoading] = useState(true)
  const [dTotal, setDTotal] = useState(0)
  const [dPage, setDPage] = useState(0)
  const [dSearch, setDSearch] = useState("")
  const [dDateFrom, setDDateFrom] = useState("")
  const [dDateTo, setDDateTo] = useState("")
  const [dStatusFilter, setDStatusFilter] = useState("all")
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewSubject, setPreviewSubject] = useState("")

  // -- Activity log tab state --
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([])
  const [aLoading, setALoading] = useState(true)
  const [aTotal, setATotal] = useState(0)
  const [aPage, setAPage] = useState(0)
  const [aSearch, setASearch] = useState("")
  const [aEntityFilter, setAEntityFilter] = useState("all")
  const [aDateFrom, setADateFrom] = useState("")
  const [aDateTo, setADateTo] = useState("")
  const [aSortAsc, setASortAsc] = useState(false)

  // -- Purge state --
  const [purgeDialog, setPurgeDialog] = useState<{
    open: boolean
    mode: "filtered" | "all"
    target: "audit" | "dispatch"
  }>({ open: false, mode: "all", target: "audit" })
  const [purging, setPurging] = useState(false)

  // -- User display names cache --
  const [userNames, setUserNames] = useState<Record<string, string>>({})

  // -- Fetch dispatches --
  const fetchDispatches = useCallback(async () => {
    setDLoading(true)
    const supabase = createClient()

    let query = supabase
      .from("dispatch_queue")
      .select(
        "id, subject, body_html, status, scheduled_at, sent_at, created_at, error_message",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(dPage * PAGE_SIZE, (dPage + 1) * PAGE_SIZE - 1)

    if (dSearch.trim()) {
      query = query.ilike("subject", `%${dSearch.trim()}%`)
    }
    if (dStatusFilter !== "all") {
      query = query.eq("status", dStatusFilter)
    }
    if (dDateFrom) {
      query = query.gte("created_at", dDateFrom)
    }
    if (dDateTo) {
      query = query.lte("created_at", dDateTo + "T23:59:59")
    }

    const { data, count } = await query
    if (data) setDispatches(data)
    setDTotal(count ?? 0)
    setDLoading(false)
  }, [dPage, dSearch, dStatusFilter, dDateFrom, dDateTo])

  // -- Fetch audit logs --
  const fetchAuditLogs = useCallback(async () => {
    setALoading(true)
    const supabase = createClient()

    let query = supabase
      .from("audit_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: aSortAsc })
      .range(aPage * PAGE_SIZE, (aPage + 1) * PAGE_SIZE - 1)

    if (aSearch.trim()) {
      query = query.or(
        `action.ilike.%${aSearch.trim()}%,entity_type.ilike.%${aSearch.trim()}%`
      )
    }
    if (aEntityFilter !== "all") {
      query = query.eq("entity_type", aEntityFilter)
    }
    if (aDateFrom) {
      query = query.gte("created_at", aDateFrom)
    }
    if (aDateTo) {
      query = query.lte("created_at", aDateTo + "T23:59:59")
    }

    const { data, count } = await query
    if (data) {
      setAuditLogs(data as AuditRecord[])

      const userIds = [
        ...new Set(
          (data as AuditRecord[])
            .map((r) => r.user_id)
            .filter(Boolean) as string[]
        ),
      ]
      const unknownIds = userIds.filter((id) => !userNames[id])
      if (unknownIds.length > 0) {
        const { data: users } = await supabase
          .from("app_users")
          .select("id, display_name, email")
          .in("id", unknownIds)
          .returns<{ id: string; display_name: string | null; email: string }[]>()
        if (users) {
          const newNames: Record<string, string> = { ...userNames }
          for (const u of users) {
            newNames[u.id] = u.display_name || u.email
          }
          setUserNames(newNames)
        }
      }
    }
    setATotal(count ?? 0)
    setALoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aPage, aSearch, aEntityFilter, aDateFrom, aDateTo, aSortAsc])

  useEffect(() => {
    fetchDispatches()
  }, [fetchDispatches])

  useEffect(() => {
    fetchAuditLogs()
  }, [fetchAuditLogs])

  useEffect(() => {
    setDPage(0)
  }, [dSearch, dStatusFilter, dDateFrom, dDateTo])

  useEffect(() => {
    setAPage(0)
  }, [aSearch, aEntityFilter, aDateFrom, aDateTo])

  const dTotalPages = Math.max(1, Math.ceil(dTotal / PAGE_SIZE))
  const aTotalPages = Math.max(1, Math.ceil(aTotal / PAGE_SIZE))

  // -- Purge handler --
  async function handlePurge() {
    setPurging(true)
    const { toast } = await import("sonner")
    const supabase = createClient()

    if (purgeDialog.target === "dispatch") {
      let query = supabase.from("dispatch_queue").delete()
      if (purgeDialog.mode === "filtered" && dSearch.trim()) {
        query = query.ilike("subject", `%${dSearch.trim()}%`)
      } else {
        query = query.gte("created_at", "1970-01-01")
      }
      const { error } = await query
      if (error) {
        toast.error(`Purge failed: ${error.message}`)
      } else {
        toast.success(purgeDialog.mode === "all" ? "All dispatches purged" : "Filtered dispatches purged")
        await logAudit("dispatches_purged", "dispatch_queue", null, { mode: purgeDialog.mode })
        fetchDispatches()
      }
    } else {
      let query = supabase.from("audit_log").delete()
      if (purgeDialog.mode === "filtered") {
        if (aEntityFilter !== "all") query = query.eq("entity_type", aEntityFilter)
        if (aDateFrom) query = query.gte("created_at", aDateFrom)
        if (aDateTo) query = query.lte("created_at", aDateTo + "T23:59:59")
        if (aSearch.trim()) query = query.or(`action.ilike.%${aSearch.trim()}%,entity_type.ilike.%${aSearch.trim()}%`)
      } else {
        query = query.gte("created_at", "1970-01-01")
      }
      const { error } = await query
      if (error) {
        toast.error(`Purge failed: ${error.message}`)
      } else {
        toast.success(purgeDialog.mode === "all" ? "All activity logs purged" : "Filtered activity logs purged")
        await logAudit("audit_log_purged", "audit_log", null, { mode: purgeDialog.mode })
        fetchAuditLogs()
      }
    }

    setPurging(false)
    setPurgeDialog({ open: false, mode: "all", target: "audit" })
  }

  // -- Shared pagination component --
  function PaginationBar({
    page,
    totalPages,
    onPrev,
    onNext,
  }: {
    page: number
    totalPages: number
    onPrev: () => void
    onNext: () => void
  }) {
    if (totalPages <= 1) return null
    return (
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {page + 1} of {totalPages}
        </p>
        <div className="flex gap-1">
          <Button variant="outline" size="icon-sm" disabled={page === 0} onClick={onPrev}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon-sm" disabled={page >= totalPages - 1} onClick={onNext}>
            <ChevronRight />
          </Button>
        </div>
      </div>
    )
  }

  function formatDetails(changes: Record<string, unknown> | null): string {
    if (!changes) return "—"
    return Object.entries(changes)
      .filter(([, v]) => typeof v === "string" || typeof v === "number" || typeof v === "boolean")
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ") || "—"
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">History</h1>
        <p className="text-muted-foreground">
          Dispatch history and activity audit log.
        </p>
      </div>

      <Tabs defaultValue="dispatches">
        <TabsList>
          <TabsTrigger value="dispatches">
            <Mail className="size-4" />
            <span className="hidden sm:inline">Dispatches</span>
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="size-4" />
            <span className="hidden sm:inline">Activity Log</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Dispatches Tab ──────────────────────────────────── */}
        <TabsContent value="dispatches">
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="relative min-w-0 flex-1 sm:max-w-xs">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={dSearch}
                  onChange={(e) => setDSearch(e.target.value)}
                  placeholder="Search by subject..."
                  className="pl-9"
                />
              </div>
              <Select value={dStatusFilter} onValueChange={(val) => setDStatusFilter(val ?? "all")}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue />
                </SelectTrigger>
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
                  <Input type="date" value={dDateFrom} onChange={(e) => setDDateFrom(e.target.value)} className="w-36" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Input type="date" value={dDateTo} onChange={(e) => setDDateTo(e.target.value)} className="w-36" />
                </div>
                {(dDateFrom || dDateTo || dStatusFilter !== "all" || dSearch) && (
                  <Button variant="ghost" size="sm" onClick={() => { setDSearch(""); setDStatusFilter("all"); setDDateFrom(""); setDDateTo("") }}>
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <History className="size-5" />
                      Dispatches
                    </CardTitle>
                    <CardDescription>
                      {dTotal} dispatch{dTotal !== 1 ? "es" : ""} total
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {dTotal > 0 && dSearch && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPurgeDialog({ open: true, mode: "filtered", target: "dispatch" })}
                      >
                        <Trash2 className="size-3.5" data-icon="inline-start" />
                        Purge Filtered
                      </Button>
                    )}
                    {dTotal > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPurgeDialog({ open: true, mode: "all", target: "dispatch" })}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" data-icon="inline-start" />
                        Purge All
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {dLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
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
                            <TableCell className="font-medium max-w-xs truncate">{d.subject}</TableCell>
                            <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                              {format(new Date(d.scheduled_at), "MMM d, yyyy h:mm a")}
                            </TableCell>
                            <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                              {d.sent_at ? format(new Date(d.sent_at), "MMM d, yyyy h:mm a") : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={(STATUS_COLORS[d.status] as "default" | "destructive" | "outline" | "secondary") || "secondary"}>
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
                    <PaginationBar page={dPage} totalPages={dTotalPages} onPrev={() => setDPage((p) => p - 1)} onNext={() => setDPage((p) => p + 1)} />
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Activity Log Tab ────────────────────────────────── */}
        <TabsContent value="activity">
          <div className="space-y-4">
            {/* Filters row */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="relative min-w-0 flex-1 sm:max-w-xs">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={aSearch}
                  onChange={(e) => setASearch(e.target.value)}
                  placeholder="Search action or entity..."
                  className="pl-9"
                />
              </div>
              <Select value={aEntityFilter} onValueChange={(val) => setAEntityFilter(val ?? "all")}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((et) => (
                    <SelectItem key={et} value={et}>
                      {ENTITY_TYPE_LABELS[et] || et}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Input
                    type="date"
                    value={aDateFrom}
                    onChange={(e) => setADateFrom(e.target.value)}
                    className="w-36"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Input
                    type="date"
                    value={aDateTo}
                    onChange={(e) => setADateTo(e.target.value)}
                    className="w-36"
                  />
                </div>
                {(aDateFrom || aDateTo || aEntityFilter !== "all" || aSearch) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setASearch("")
                      setAEntityFilter("all")
                      setADateFrom("")
                      setADateTo("")
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="size-5" />
                      Activity Log
                    </CardTitle>
                    <CardDescription>
                      {aTotal} entr{aTotal !== 1 ? "ies" : "y"}
                      {aEntityFilter !== "all" && ` in ${ENTITY_TYPE_LABELS[aEntityFilter]}`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {aTotal > 0 && (aEntityFilter !== "all" || aDateFrom || aDateTo || aSearch) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPurgeDialog({ open: true, mode: "filtered", target: "audit" })}
                      >
                        <Trash2 className="size-3.5" data-icon="inline-start" />
                        Purge Filtered
                      </Button>
                    )}
                    {aTotal > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPurgeDialog({ open: true, mode: "all", target: "audit" })}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" data-icon="inline-start" />
                        Purge All
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {aLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Activity className="size-10 text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No activity recorded.</p>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead
                            className="cursor-pointer select-none"
                            onClick={() => setASortAsc((prev) => !prev)}
                          >
                            <span className="flex items-center gap-1">
                              Timestamp
                              <ArrowUpDown className="size-3" />
                            </span>
                          </TableHead>
                          <TableHead className="hidden sm:table-cell">User</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead className="hidden md:table-cell">Entity</TableHead>
                          <TableHead className="hidden lg:table-cell">Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {format(new Date(log.created_at), "MMM d, h:mm a")}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm">
                              {log.user_id ? userNames[log.user_id] ?? "..." : "System"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={(ACTION_COLORS[log.action] as "default" | "secondary" | "outline" | "destructive") || "secondary"}
                              >
                                {log.action.replace(/_/g, " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                              {ENTITY_TYPE_LABELS[log.entity_type] || log.entity_type}
                              {log.entity_id && (
                                <span className="ml-1 text-xs opacity-50">
                                  {log.entity_id.slice(0, 8)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-xs truncate">
                              {formatDetails(log.changes)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <PaginationBar page={aPage} totalPages={aTotalPages} onPrev={() => setAPage((p) => p - 1)} onNext={() => setAPage((p) => p + 1)} />
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Preview Dialog ────────────────────────────────────── */}
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

      {/* ── Purge Confirmation Dialog ─────────────────────────── */}
      <Dialog
        open={purgeDialog.open}
        onOpenChange={(open) => setPurgeDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              Confirm Purge
            </DialogTitle>
            <DialogDescription>
              {purgeDialog.target === "dispatch"
                ? purgeDialog.mode === "all"
                  ? "This will permanently delete ALL dispatch records. This action cannot be undone."
                  : `This will permanently delete the filtered dispatch records. This action cannot be undone.`
                : purgeDialog.mode === "all"
                  ? "This will permanently delete ALL activity log entries. This action cannot be undone."
                  : `This will permanently delete the ${aTotal} filtered log entries. This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPurgeDialog({ open: false, mode: "all", target: "audit" })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handlePurge}
              disabled={purging}
            >
              {purging ? "Purging..." : purgeDialog.mode === "all" ? "Purge All" : "Purge Filtered"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
