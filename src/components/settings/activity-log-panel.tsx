"use client"

import React, { useEffect, useState, useCallback } from "react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Activity,
  Trash2,
  AlertTriangle,
  ArrowUpDown,
} from "lucide-react"
import { format } from "date-fns"

interface AuditRecord {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  changes: Record<string, unknown> | null
  created_at: string
}

const PAGE_SIZE = 20

const ACTION_COLORS: Record<string, string> = {
  dispatch_created: "default",
  dispatch_scheduled: "secondary",
  dispatch_reminder_sent: "outline",
  dispatch_approved: "default",
  dispatch_cancelled: "destructive",
  member_created: "default",
  member_updated: "secondary",
  member_deleted: "destructive",
  smtp_config_created: "default",
  smtp_config_deleted: "destructive",
  mailing_list_created: "default",
  mailing_list_deleted: "destructive",
  template_created: "default",
  template_updated: "secondary",
  email_sent: "default",
}

const ENTITY_TYPES = ["all", "dispatch_queue", "members", "families", "addresses", "smtp_configs", "app_users", "mailing_lists", "email_templates", "composed_instances", "events", "event_types", "event_instances", "tags", "member_tags", "mailing_list_members"]
const ENTITY_LABELS: Record<string, string> = {
  all: "All", dispatch_queue: "Dispatches", members: "Members", families: "Families",
  addresses: "Addresses", smtp_configs: "SMTP", app_users: "Users", mailing_lists: "Mailing Lists",
  email_templates: "Templates", composed_instances: "Instances",
  events: "Events", event_types: "Event Types", event_instances: "Instances",
  tags: "Tags", member_tags: "Tags", mailing_list_members: "List Members",
}

function formatAuditDetails(action: string, changes: Record<string, unknown> | null): string {
  if (!changes) return "—"
  const parts: string[] = []

  const name = changes.name || changes.member || changes.family || changes.subject || changes.email
  if (name) parts.push(String(name))

  for (const [key, val] of Object.entries(changes)) {
    if (["name", "member", "family", "subject", "email"].includes(key) && parts.length > 0 && parts[0] === String(val)) continue
    if (val && typeof val === "object" && "from" in (val as Record<string, unknown>) && "to" in (val as Record<string, unknown>)) {
      const obj = val as { from: unknown; to: unknown }
      parts.push(`${key}: ${obj.from ?? "empty"} → ${obj.to ?? "empty"}`)
    } else if (key === "address_updated" && val) {
      parts.push("address updated")
    } else if (key === "notes_changed" && val) {
      parts.push("notes changed")
    } else if (key === "family_changed" && val) {
      parts.push("family reassigned")
    } else if (key === "is_active" && typeof val === "boolean") {
      parts.push(val ? "activated" : "deactivated")
    } else if (key === "count" && typeof val === "number") {
      parts.push(`${val} item${val !== 1 ? "s" : ""}`)
    } else if (key === "scheduledAt" && typeof val === "string") {
      try { parts.push(`at ${format(new Date(val), "MMM d, h:mm a")}`) } catch { parts.push(`at ${val}`) }
    } else if (key === "commType" || key === "type" || key === "role" || key === "list" || key === "tag_name" || key === "color" || key === "from" || key === "to") {
      if (typeof val === "string" && val) parts.push(`${key}: ${val}`)
    } else if (typeof val === "string" && val && !["isReminder", "weekStart"].includes(key)) {
      parts.push(`${key}: ${val}`)
    }
  }

  return parts.length > 0 ? parts.join(" · ") : "—"
}

export default function ActivityLogPanel() {
  const [logs, setLogs] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState("")
  const [entityFilter, setEntityFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [sortAsc, setSortAsc] = useState(false)
  const [userNames, setUserNames] = useState<Record<string, string>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [purgeOpen, setPurgeOpen] = useState(false)
  const [purging, setPurging] = useState(false)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    let query = supabase.from("audit_log").select("*", { count: "exact" })
      .order("created_at", { ascending: sortAsc })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (search.trim()) query = query.or(`action.ilike.%${search.trim()}%,entity_type.ilike.%${search.trim()}%`)
    if (entityFilter !== "all") query = query.eq("entity_type", entityFilter)
    if (dateFrom) query = query.gte("created_at", dateFrom)
    if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59")

    const { data, count } = await query
    if (data) {
      setLogs(data as AuditRecord[])
      const ids = [...new Set((data as AuditRecord[]).map((r) => r.user_id).filter(Boolean) as string[])]
      const unknown = ids.filter((id) => !userNames[id])
      if (unknown.length > 0) {
        const { data: users } = await supabase.from("app_users").select("id, display_name, email").in("id", unknown)
          .returns<{ id: string; display_name: string | null; email: string }[]>()
        if (users) {
          const names = { ...userNames }
          for (const u of users) names[u.id] = u.display_name || u.email
          setUserNames(names)
        }
      }
    }
    setTotal(count ?? 0)
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, entityFilter, dateFrom, dateTo, sortAsc])

  useEffect(() => { fetchLogs() }, [fetchLogs])
  useEffect(() => { setPage(0) }, [search, entityFilter, dateFrom, dateTo])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  async function handlePurge() {
    setPurging(true)
    const supabase = createClient()
    const { error } = await supabase.from("audit_log").delete().gte("created_at", "1970-01-01")
    if (error) {
      const { toast } = await import("sonner")
      toast.error(`Purge failed: ${error.message}`)
    } else {
      const { toast } = await import("sonner")
      toast.success("Activity log purged")
      await logAudit("audit_log_purged", "audit_log", null, {})
      fetchLogs()
    }
    setPurging(false)
    setPurgeOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-9" />
        </div>
        <Select value={entityFilter} onValueChange={(v) => setEntityFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((et) => (<SelectItem key={et} value={et}>{ENTITY_LABELS[et] || et}</SelectItem>))}
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
          {(dateFrom || dateTo || entityFilter !== "all" || search) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setEntityFilter("all"); setDateFrom(""); setDateTo("") }}>Clear</Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Activity className="size-5" />Activity Log</CardTitle>
              <CardDescription>{total} entries</CardDescription>
            </div>
            {total > 0 && (
              <Button variant="outline" size="sm" onClick={() => setPurgeOpen(true)} className="text-destructive">
                <Trash2 className="size-3.5" data-icon="inline-start" />Purge All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : logs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No activity recorded.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => setSortAsc((p) => !p)}>
                      <span className="flex items-center gap-1">Timestamp <ArrowUpDown className="size-3" /></span>
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="hidden md:table-cell">Entity</TableHead>
                    <TableHead className="hidden lg:table-cell">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <React.Fragment key={log.id}>
                      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{format(new Date(log.created_at), "MMM d, h:mm a")}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{log.user_id ? userNames[log.user_id] ?? "..." : "System"}</TableCell>
                        <TableCell>
                          <Badge variant={(ACTION_COLORS[log.action] as "default" | "secondary" | "outline" | "destructive") || "secondary"}>
                            {log.action.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{ENTITY_LABELS[log.entity_type] || log.entity_type}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-sm truncate" title={log.changes ? formatAuditDetails(log.action, log.changes) : undefined}>
                          {formatAuditDetails(log.action, log.changes)}
                        </TableCell>
                      </TableRow>
                      {expandedId === log.id && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-muted/30 p-3">
                            <div className="space-y-1 text-xs">
                              <p><span className="font-medium">Action:</span> {log.action}</p>
                              <p><span className="font-medium">Entity:</span> {log.entity_type}{log.entity_id ? ` (${log.entity_id})` : ""}</p>
                              <p><span className="font-medium">Time:</span> {format(new Date(log.created_at), "PPpp")}</p>
                              {log.user_id && <p><span className="font-medium">User:</span> {userNames[log.user_id] ?? log.user_id}</p>}
                              {log.changes && (
                                <div className="mt-2">
                                  <p className="font-medium mb-1">Changes:</p>
                                  <pre className="rounded bg-background border p-2 text-xs overflow-x-auto whitespace-pre-wrap">
                                    {JSON.stringify(log.changes, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="icon-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft /></Button>
                    <Button variant="outline" size="icon-sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}><ChevronRight /></Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={purgeOpen} onOpenChange={setPurgeOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="size-5 text-destructive" />Purge All Activity</DialogTitle>
            <DialogDescription>This will permanently delete all activity log entries.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurgeOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handlePurge} disabled={purging}>{purging ? "Purging..." : "Purge All"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
