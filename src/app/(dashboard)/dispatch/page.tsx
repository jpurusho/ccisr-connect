"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Send,
  Eye,
  CheckCircle,
  XCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Plus,
  Mail,
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
  const [activeTab, setActiveTab] = useState<StatusTab>("all")

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Preview dialog
  const [previewItem, setPreviewItem] = useState<DispatchQueue | null>(null)

  // Cancel confirmation dialog
  const [cancelTarget, setCancelTarget] = useState<DispatchQueue | null>(null)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  // Batch action in progress
  const [batchLoading, setBatchLoading] = useState(false)

  // Form refs for create dialog
  const subjectRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const [formMailingList, setFormMailingList] = useState("")
  const [formSmtpConfig, setFormSmtpConfig] = useState("")
  const scheduleDateRef = useRef<HTMLInputElement>(null)
  const scheduleTimeRef = useRef<HTMLInputElement>(null)

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
  }, [page, activeTab])

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
    fetchDispatches()
  }, [fetchDispatches])

  useEffect(() => {
    fetchFormData()
  }, [fetchFormData])

  // Reset page & selection when changing tabs
  useEffect(() => {
    setPage(0)
    setSelectedIds(new Set())
  }, [activeTab])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

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
    return true
  }

  async function handleApprove(item: DispatchQueue) {
    const ok = await updateStatus(item.id, "approved")
    if (ok) {
      toast.success("Dispatch approved")
      fetchDispatches()
    }
  }

  async function handleCancel(item: DispatchQueue) {
    const ok = await updateStatus(item.id, "cancelled")
    if (ok) {
      toast.success("Dispatch cancelled")
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
  // Create dispatch
  // -------------------------------------------------------------------------

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)

    const subject = subjectRef.current?.value?.trim()
    const bodyHtml = bodyRef.current?.value?.trim()
    const dateVal = scheduleDateRef.current?.value
    const timeVal = scheduleTimeRef.current?.value

    if (!subject || !bodyHtml || !formMailingList || !formSmtpConfig) {
      toast.error("Please fill in all required fields")
      setCreating(false)
      return
    }

    let scheduledAt: string | null = null
    if (dateVal && timeVal) {
      scheduledAt = new Date(`${dateVal}T${timeVal}`).toISOString()
    } else if (dateVal) {
      scheduledAt = new Date(`${dateVal}T00:00`).toISOString()
    }

    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from("dispatch_queue").insert({
      subject,
      body_html: bodyHtml,
      mailing_list_id: formMailingList,
      smtp_config_id: formSmtpConfig,
      scheduled_at: scheduledAt,
      status: "pending",
      created_by: user?.id ?? null,
      email_template_id: null,
      event_instance_id: null,
      approved_by: null,
      sent_at: null,
      error_message: null,
    } as never)

    if (error) {
      toast.error("Failed to create dispatch", {
        description: error.message,
      })
    } else {
      toast.success("Dispatch scheduled")
      setCreateOpen(false)
      setFormMailingList("")
      setFormSmtpConfig("")
      fetchDispatches()
    }

    setCreating(false)
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

  // Default schedule date: tomorrow at 9 AM
  const defaultSchedule = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(9, 0, 0, 0)
    return toLocalDateTimeInputs(d)
  })()

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dispatch Queue</h1>
          <p className="text-muted-foreground">
            Manage scheduled email dispatches — preview, approve, or cancel.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger
            render={
              <Button>
                <Plus data-icon="inline-start" className="size-4" />
                Schedule Dispatch
              </Button>
            }
          />
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Schedule a New Dispatch</DialogTitle>
              <DialogDescription>
                Compose an email dispatch. It will be created with
                &quot;pending&quot; status.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreate} className="grid gap-4">
              {/* Subject */}
              <div className="grid gap-1.5">
                <Label htmlFor="dispatch-subject">Subject *</Label>
                <Input
                  ref={subjectRef}
                  id="dispatch-subject"
                  placeholder="Email subject line"
                  required
                />
              </div>

              {/* Body HTML */}
              <div className="grid gap-1.5">
                <Label htmlFor="dispatch-body">Body HTML *</Label>
                <Textarea
                  ref={bodyRef}
                  id="dispatch-body"
                  placeholder="<h1>Hello!</h1><p>Your email content here...</p>"
                  rows={6}
                  required
                />
              </div>

              {/* Mailing list */}
              <div className="grid gap-1.5">
                <Label>Mailing List *</Label>
                <Select
                  value={formMailingList}
                  onValueChange={(val) => setFormMailingList(val ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a mailing list" />
                  </SelectTrigger>
                  <SelectContent>
                    {mailingLists.map((ml) => (
                      <SelectItem key={ml.id} value={ml.id}>
                        {ml.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* SMTP config */}
              <div className="grid gap-1.5">
                <Label>SMTP Config *</Label>
                <Select
                  value={formSmtpConfig}
                  onValueChange={(val) => setFormSmtpConfig(val ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select SMTP configuration" />
                  </SelectTrigger>
                  <SelectContent>
                    {smtpConfigs.map((sc) => (
                      <SelectItem key={sc.id} value={sc.id}>
                        {sc.name} ({sc.from_email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Schedule date + time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="dispatch-date">Date</Label>
                  <Input
                    ref={scheduleDateRef}
                    id="dispatch-date"
                    type="date"
                    defaultValue={defaultSchedule.dateStr}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="dispatch-time">Time</Label>
                  <Input
                    ref={scheduleTimeRef}
                    id="dispatch-time"
                    type="time"
                    defaultValue={defaultSchedule.timeStr}
                  />
                </div>
              </div>

              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Cancel
                </DialogClose>
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create Dispatch"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs + Table */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as StatusTab)}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList variant="line">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab} value={tab} className="capitalize">
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>

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
                            <TableCell className="max-w-xs truncate font-medium">
                              {d.subject}
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

      {/* Preview dialog */}
      <Dialog
        open={!!previewItem}
        onOpenChange={(open) => {
          if (!open) setPreviewItem(null)
        }}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              {previewItem?.subject ?? ""}
            </DialogDescription>
          </DialogHeader>
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
              <div
                className="rounded border bg-white p-4 text-black"
                dangerouslySetInnerHTML={{ __html: previewItem.body_html }}
              />
            </>
          )}
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>

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
    </div>
  )
}
