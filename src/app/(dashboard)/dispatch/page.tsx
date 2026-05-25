"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { logAudit } from "@/lib/audit"
import { sanitizeHtml } from "@/lib/sanitize-html"
import type {
  DispatchQueue,
  DispatchStatus,
  MailingList,
  SmtpConfig,
} from "@/types/database"
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
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Send,
  Eye,
  CheckCircle,
  XCircle,
  X,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Mail,
  Clock,
  Trash2,
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20

const STATUS_TABS = [
  "all",
  "pending",
  "approved",
  "sent",
  "failed",
  "cancelled",
] as const

type StatusTab = (typeof STATUS_TABS)[number]

const STATUS_BADGE_VARIANT: Record<
  DispatchStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  previewed: "secondary",
  approved: "default",
  sending: "default",
  sent: "default",
  failed: "destructive",
  cancelled: "outline",
}

const STATUS_BADGE_CLASS: Record<DispatchStatus, string> = {
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  previewed:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  sending:
    "bg-blue-100 text-blue-800 animate-pulse dark:bg-blue-900/30 dark:text-blue-400",
  sent: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return format(new Date(iso), "MMM d, yyyy h:mm a")
}

function toLocalDateTimeInputs(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const timeStr = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  return { dateStr, timeStr }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DispatchQueuePage() {
  // Data
  const [dispatches, setDispatches] = useState<DispatchQueue[]>([])
  const [mailingLists, setMailingLists] = useState<MailingList[]>([])
  const [smtpConfigs, setSmtpConfigs] = useState<SmtpConfig[]>([])

  // UI state
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [activeTab, setActiveTab] = useState<StatusTab>(() => {
    if (typeof window === "undefined") return "all"
    const params = new URLSearchParams(window.location.search)
    const s = params.get("status")
    if (s && ["all", "pending", "approved", "sent", "failed", "cancelled"].includes(s)) return s as StatusTab
    return "all"
  })
  const [typeFilter, setTypeFilter] = useState<string>(() => {
    if (typeof window === "undefined") return ""
    return new URLSearchParams(window.location.search).get("type") ?? ""
  })

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Preview dialog
  const [previewItem, setPreviewItem] = useState<DispatchQueue | null>(null)

  // Cancel confirmation dialog
  const [cancelTarget, setCancelTarget] = useState<DispatchQueue | null>(null)

  // Send confirmation
  const [sendConfirmTarget, setSendConfirmTarget] = useState<DispatchQueue | null>(null)

  // Batch action in progress
  const [batchLoading, setBatchLoading] = useState(false)

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchDispatches = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from("dispatch_queue")
      .select("*", { count: "exact" })
      .order("scheduled_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (activeTab !== "all") {
      query = query.eq("status", activeTab)
    }
    if (typeFilter) {
      query = query.eq("template_type", typeFilter)
    }

    const { data, count, error } = await query

    if (error) {
      toast.error("Failed to load dispatches", {
        description: error.message,
      })
    } else {
      setDispatches((data as DispatchQueue[]) ?? [])
      setTotal(count ?? 0)
    }

    setLoading(false)
  }, [page, activeTab, typeFilter])

  const fetchFormData = useCallback(async () => {
    const supabase = createClient()
    const [mlRes, smtpRes] = await Promise.all([
      supabase.from("mailing_lists").select("*").order("name"),
      supabase
        .from("smtp_configs")
        .select("*")
        .eq("is_active", true)
        .order("name"),
    ])
    if (mlRes.data) setMailingLists(mlRes.data as MailingList[])
    if (smtpRes.data) setSmtpConfigs(smtpRes.data as SmtpConfig[])
  }, [])

  useEffect(() => {
    void fetchDispatches()
  }, [fetchDispatches])

  useEffect(() => {
    void fetchFormData()
  }, [fetchFormData])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function handleTabChange(tab: StatusTab) {
    setActiveTab(tab)
    setPage(0)
    setSelectedIds(new Set())
  }

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  async function updateStatus(
    id: string,
    status: DispatchStatus,
    extra?: { error_message?: string | null }
  ) {
    const supabase = createClient()
    const updatePayload: { status: DispatchStatus; error_message?: string | null } = { status }
    if (extra?.error_message !== undefined) {
      updatePayload.error_message = extra.error_message
    }
    const { error } = await supabase
      .from("dispatch_queue")
      .update(updatePayload as never)
      .eq("id", id)

    if (error) {
      toast.error("Update failed", { description: error.message })
      return false
    }
    logAudit("dispatch_updated", "dispatch_queue", id, updatePayload)
    return true
  }

  async function handleApprove(item: DispatchQueue) {
    const ok = await updateStatus(item.id, "approved")
    if (ok) {
      toast.success("Dispatch approved")
      logAudit("dispatch_approved", "dispatch_queue", item.id, { subject: item.subject })
      fetchDispatches()
    }
  }

  async function handleCancel(item: DispatchQueue) {
    const ok = await updateStatus(item.id, "cancelled")
    if (ok) {
      toast.success("Dispatch cancelled")
      logAudit("dispatch_cancelled", "dispatch_queue", item.id, { subject: item.subject })
      setCancelTarget(null)
      fetchDispatches()
    }
  }

  async function handleRetry(item: DispatchQueue) {
    const ok = await updateStatus(item.id, "pending", { error_message: null })
    if (ok) {
      toast.success("Dispatch reset to pending")
      fetchDispatches()
    }
  }

  async function handleDeleteDispatch(item: DispatchQueue) {
    if (!confirm(`Permanently delete "${item.subject}"? This cannot be undone.`)) return
    const supabase = createClient()
    const { error } = await supabase.from("dispatch_queue").delete().eq("id", item.id)
    if (error) {
      toast.error(`Delete failed: ${error.message}`)
    } else {
      toast.success("Dispatch deleted")
      logAudit("dispatch_deleted", "dispatch_queue", item.id, { subject: item.subject })
      fetchDispatches()
    }
  }

  async function handleSendNow(item: DispatchQueue) {
    toast.info(`Sending "${item.subject}"...`)
    try {
      const res = await fetch("/api/dispatch/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dispatchId: item.id }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Sent to ${data.recipientCount} recipient(s)`)
      } else {
        toast.error(`Send failed: ${data.error}`)
      }
      fetchDispatches()
    } catch {
      toast.error("Network error while sending")
    }
  }

  // Reschedule dialog state
  const [rescheduleTarget, setRescheduleTarget] = useState<DispatchQueue | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState("")
  const [rescheduleTime, setRescheduleTime] = useState("")

  function openReschedule(item: DispatchQueue) {
    const d = item.scheduled_at ? new Date(item.scheduled_at) : new Date()
    const { dateStr, timeStr } = toLocalDateTimeInputs(d)
    setRescheduleDate(dateStr)
    setRescheduleTime(timeStr)
    setRescheduleTarget(item)
  }

  async function handleReschedule() {
    if (!rescheduleTarget || !rescheduleDate) return
    const scheduledAt = rescheduleTime
      ? new Date(`${rescheduleDate}T${rescheduleTime}`).toISOString()
      : new Date(`${rescheduleDate}T00:00`).toISOString()

    const supabase = createClient()
    const { error } = await supabase
      .from("dispatch_queue")
      .update({ scheduled_at: scheduledAt } as never)
      .eq("id", rescheduleTarget.id)

    if (error) {
      toast.error(`Failed: ${error.message}`)
    } else {
      toast.success(`Rescheduled to ${format(new Date(scheduledAt), "MMM d, yyyy h:mm a")}`)
      logAudit("dispatch_rescheduled", "dispatch_queue", rescheduleTarget.id, { subject: rescheduleTarget.subject, scheduledAt })
      setRescheduleTarget(null)
      fetchDispatches()
    }
  }

  // -------------------------------------------------------------------------
  // Batch actions
  // -------------------------------------------------------------------------

  async function handleBatchApprove() {
    if (selectedIds.size === 0) return
    setBatchLoading(true)
    const supabase = createClient()

    const approvableIds = dispatches
      .filter(
        (d) =>
          selectedIds.has(d.id) &&
          (d.status === "pending" || d.status === "previewed")
      )
      .map((d) => d.id)

    if (approvableIds.length === 0) {
      toast.info("No pending items in selection to approve")
      setBatchLoading(false)
      return
    }

    const { error } = await supabase
      .from("dispatch_queue")
      .update({ status: "approved" } as never)
      .in("id", approvableIds)

    if (error) {
      toast.error("Batch approve failed", { description: error.message })
    } else {
      toast.success(`Approved ${approvableIds.length} dispatch(es)`)
      setSelectedIds(new Set())
      fetchDispatches()
    }
    setBatchLoading(false)
  }

  async function handleBatchCancel() {
    if (selectedIds.size === 0) return
    setBatchLoading(true)
    const supabase = createClient()

    const cancellableIds = dispatches
      .filter(
        (d) =>
          selectedIds.has(d.id) &&
          (d.status === "pending" ||
            d.status === "previewed" ||
            d.status === "approved")
      )
      .map((d) => d.id)

    if (cancellableIds.length === 0) {
      toast.info("No cancellable items in selection")
      setBatchLoading(false)
      return
    }

    const { error } = await supabase
      .from("dispatch_queue")
      .update({ status: "cancelled" } as never)
      .in("id", cancellableIds)

    if (error) {
      toast.error("Batch cancel failed", { description: error.message })
    } else {
      toast.success(`Cancelled ${cancellableIds.length} dispatch(es)`)
      setSelectedIds(new Set())
      fetchDispatches()
    }
    setBatchLoading(false)
  }

  // -------------------------------------------------------------------------
  // Selection helpers
  // -------------------------------------------------------------------------

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === dispatches.length && dispatches.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(dispatches.map((d) => d.id)))
    }
  }

  const allSelected =
    dispatches.length > 0 && selectedIds.size === dispatches.length

  // -------------------------------------------------------------------------
  // Reminder detection
  // -------------------------------------------------------------------------

  function isReminder(item: DispatchQueue): boolean {
    return /^Reminder:/i.test(item.subject)
  }

  const TEMPLATE_TYPE_LABELS: Record<string, { label: string; className: string }> = {
    birthday: { label: "Birthday", className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800" },
    anniversary: { label: "Anniversary", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800" },
    bible_study: { label: "Bible Study", className: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-800" },
    womens_study: { label: "Women's Study", className: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/30 dark:text-pink-400 dark:border-pink-800" },
    bulletin: { label: "Bulletin", className: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800" },
    prayer_meeting: { label: "Prayer", className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800" },
    custom: { label: "Custom", className: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-600" },
  }

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  function renderStatusBadge(status: DispatchStatus) {
    return (
      <Badge
        variant={STATUS_BADGE_VARIANT[status]}
        className={STATUS_BADGE_CLASS[status]}
      >
        {status}
      </Badge>
    )
  }

  function canApprove(status: DispatchStatus) {
    return status === "pending" || status === "previewed"
  }

  function canCancel(status: DispatchStatus) {
    return (
      status === "pending" || status === "previewed" || status === "approved"
    )
  }

  function canRetry(status: DispatchStatus) {
    return status === "failed"
  }

  function canSend(status: DispatchStatus) {
    return status === "approved"
  }

  function canReschedule(status: DispatchStatus) {
    return status === "pending" || status === "previewed" || status === "approved"
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dispatch Queue</h1>
          <p className="text-muted-foreground">
            Preview, approve, and send queued emails. Create dispatches from the Dashboard.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.history.back()}>
          <ChevronLeft className="size-3.5" />
          Back
        </Button>
      </div>

      {/* Tabs + Table */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => handleTabChange(val as StatusTab)}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList variant="line">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab} value={tab} className="capitalize">
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Type filter indicator */}
          {typeFilter && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Filtered:</span>
              <Badge variant="secondary" className="gap-1 pr-1">
                {typeFilter.startsWith("custom:") ? typeFilter.replace("custom:", "Custom: ") : typeFilter.replace("_", " ")}
                <button
                  type="button"
                  onClick={() => { setTypeFilter(""); setPage(0) }}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            </div>
          )}

          {/* Batch actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={batchLoading}
                onClick={handleBatchApprove}
              >
                <CheckCircle data-icon="inline-start" className="size-3.5" />
                Approve Selected
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={batchLoading}
                onClick={handleBatchCancel}
              >
                <XCircle data-icon="inline-start" className="size-3.5" />
                Cancel Selected
              </Button>
            </div>
          )}
        </div>

        {/* All tabs share the same content - filtering happens at the query level */}
        {STATUS_TABS.map((tab) => (
          <TabsContent key={tab} value={tab}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="size-5" />
                  Dispatches
                </CardTitle>
                <CardDescription>
                  {total} dispatch{total !== 1 ? "es" : ""}{" "}
                  {activeTab !== "all" ? `with status "${activeTab}"` : "total"}
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
                    <Mail className="mb-3 size-10 text-muted-foreground/50" />
                    <p className="text-muted-foreground">
                      No dispatches found.
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {activeTab !== "all"
                        ? `There are no ${activeTab} dispatches.`
                        : "Schedule your first dispatch to get started."}
                    </p>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={toggleSelectAll}
                              className="size-4 rounded border-input accent-primary"
                              aria-label="Select all dispatches"
                            />
                          </TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead className="hidden md:table-cell">
                            Scheduled
                          </TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden lg:table-cell">
                            Created
                          </TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dispatches.map((d) => (
                          <TableRow
                            key={d.id}
                            data-state={
                              selectedIds.has(d.id) ? "selected" : undefined
                            }
                          >
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedIds.has(d.id)}
                                onChange={() => toggleSelection(d.id)}
                                className="size-4 rounded border-input accent-primary"
                                aria-label={`Select dispatch: ${d.subject}`}
                              />
                            </TableCell>
                            <TableCell className="max-w-xs font-medium">
                              <span className="truncate block">{d.subject}</span>
                              <div className="flex items-center gap-1 mt-0.5">
                                {d.template_type && TEMPLATE_TYPE_LABELS[d.template_type] && (
                                  <Badge variant="outline" className={`text-[10px] ${TEMPLATE_TYPE_LABELS[d.template_type].className}`}>
                                    {TEMPLATE_TYPE_LABELS[d.template_type].label}
                                  </Badge>
                                )}
                                {isReminder(d) && (
                                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                                    Reminder
                                  </Badge>
                                )}
                              </div>
                              {d.error_message && (
                                <p className="mt-0.5 truncate text-xs text-red-500">
                                  {d.error_message}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                              {formatDate(d.scheduled_at)}
                            </TableCell>
                            <TableCell>
                              {renderStatusBadge(d.status)}
                            </TableCell>
                            <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                              {formatDate(d.created_at)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                {/* Preview */}
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => setPreviewItem(d)}
                                  aria-label="Preview email"
                                >
                                  <Eye className="size-3.5" />
                                </Button>

                                {/* Approve */}
                                {canApprove(d.status) && (
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => handleApprove(d)}
                                    aria-label="Approve dispatch"
                                  >
                                    <CheckCircle className="size-3.5 text-blue-600" />
                                  </Button>
                                )}

                                {/* Cancel */}
                                {canCancel(d.status) && (
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => setCancelTarget(d)}
                                    aria-label="Cancel dispatch"
                                  >
                                    <XCircle className="size-3.5 text-red-500" />
                                  </Button>
                                )}

                                {/* Send Now */}
                                {canSend(d.status) && (
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => setSendConfirmTarget(d)}
                                    aria-label="Send now"
                                    title="Send Now"
                                  >
                                    <Send className="size-3.5 text-green-600" />
                                  </Button>
                                )}

                                {/* Reschedule */}
                                {canReschedule(d.status) && (
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => openReschedule(d)}
                                    aria-label="Reschedule"
                                    title="Reschedule"
                                  >
                                    <Clock className="size-3.5 text-amber-600" />
                                  </Button>
                                )}

                                {/* Retry */}
                                {canRetry(d.status) && (
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => handleRetry(d)}
                                    aria-label="Retry dispatch"
                                  >
                                    <RotateCcw className="size-3.5 text-orange-500" />
                                  </Button>
                                )}

                                {/* Delete */}
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleDeleteDispatch(d)}
                                  aria-label="Delete dispatch"
                                  title="Delete"
                                >
                                  <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
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
          </TabsContent>
        ))}
      </Tabs>

      {/* Preview panel */}
      <Sheet
        open={!!previewItem}
        onOpenChange={(open) => {
          if (!open) setPreviewItem(null)
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Email Preview</SheetTitle>
            <SheetDescription>
              {previewItem?.subject ?? ""}
            </SheetDescription>
          </SheetHeader>
          {previewItem && (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-muted-foreground">Status</span>
                <span>{renderStatusBadge(previewItem.status)}</span>
                <span className="text-muted-foreground">Scheduled</span>
                <span>{formatDate(previewItem.scheduled_at)}</span>
                {previewItem.sent_at && (
                  <>
                    <span className="text-muted-foreground">Sent</span>
                    <span>{formatDate(previewItem.sent_at)}</span>
                  </>
                )}
                {previewItem.error_message && (
                  <>
                    <span className="text-muted-foreground">Error</span>
                    <span className="text-red-500">
                      {previewItem.error_message}
                    </span>
                  </>
                )}
              </div>

              {/* Send configuration (read-only) */}
              <div className="grid gap-3 sm:grid-cols-2 rounded-lg border bg-muted/30 p-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Mailing List</Label>
                  <p className="text-sm">
                    {mailingLists.find((ml) => ml.id === previewItem.mailing_list_id)?.name || (
                      <span className="text-amber-600 text-xs">Not configured</span>
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Send From</Label>
                  <p className="text-sm">
                    {smtpConfigs.find((sc) => sc.id === previewItem.smtp_config_id)?.name || (
                      <span className="text-amber-600 text-xs">Not configured</span>
                    )}
                  </p>
                </div>
                {previewItem.additional_recipients && (
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Additional Recipients</Label>
                    <p className="text-xs">{previewItem.additional_recipients}</p>
                  </div>
                )}
              </div>

              <div
                className="rounded border bg-white p-4 text-black"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewItem.body_html) }}
              />
            </>
          )}
          <SheetFooter>
            {previewItem && canSend(previewItem.status) && (
              <Button
                onClick={() => {
                  setPreviewItem(null)
                  setSendConfirmTarget(previewItem)
                }}
              >
                <Send className="size-3.5" data-icon="inline-start" />
                Send Now
              </Button>
            )}
            <SheetClose render={<Button variant="outline" />}>
              Close
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Cancel confirmation dialog */}
      <Dialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel Dispatch?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel &quot;{cancelTarget?.subject}
              &quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Keep It
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => cancelTarget && handleCancel(cancelTarget)}
            >
              Cancel Dispatch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule panel */}
      <Sheet
        open={!!rescheduleTarget}
        onOpenChange={(open) => {
          if (!open) setRescheduleTarget(null)
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Reschedule Dispatch</SheetTitle>
            <SheetDescription>
              Set a new send date and time for &quot;{rescheduleTarget?.subject}&quot;.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="resched-date">Date</Label>
              <Input
                id="resched-date"
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resched-time">Time</Label>
              <Input
                id="resched-time"
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
              />
            </div>
          </div>
          <SheetFooter>
            <SheetClose render={<Button variant="outline" />}>
              Cancel
            </SheetClose>
            <Button
              onClick={handleReschedule}
              disabled={!rescheduleDate}
            >
              <Clock className="size-3.5" data-icon="inline-start" />
              Save Schedule
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Send confirmation dialog */}
      <Dialog
        open={!!sendConfirmTarget}
        onOpenChange={(open) => {
          if (!open) setSendConfirmTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Send Now?</DialogTitle>
            <DialogDescription>
              Send &quot;{sendConfirmTarget?.subject}&quot; immediately?
              This will deliver to all configured recipients.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm space-y-1.5">
            <p>
              <span className="text-muted-foreground">Mailing list:</span>{" "}
              <strong>{mailingLists.find((m) => m.id === sendConfirmTarget?.mailing_list_id)?.name || "None"}</strong>
            </p>
            <p>
              <span className="text-muted-foreground">Send from:</span>{" "}
              <strong>{smtpConfigs.find((s) => s.id === sendConfirmTarget?.smtp_config_id)?.name || "None"}</strong>
            </p>
            {sendConfirmTarget?.additional_recipients && (
              <p>
                <span className="text-muted-foreground">Extra recipients:</span>{" "}
                <span className="text-xs">{sendConfirmTarget.additional_recipients}</span>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendConfirmTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (sendConfirmTarget) {
                  handleSendNow(sendConfirmTarget)
                  setSendConfirmTarget(null)
                }
              }}
            >
              <Send className="size-3.5" data-icon="inline-start" />
              Confirm Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
