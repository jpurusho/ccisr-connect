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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Database,
  Table2,
  RefreshCw,
  HardDrive,
  Rows3,
  Loader2,
} from "lucide-react"

interface TableStat {
  table_name: string
  row_count: number
}

interface ColumnInfo {
  column_name: string
  data_type: string
  is_nullable: string
  column_default: string | null
  character_maximum_length: number | null
}

const FREE_TIER_DB_MB = 500
const FREE_TIER_STORAGE_GB = 1

const TABLE_DESCRIPTIONS: Record<string, string> = {
  families: "Family units",
  members: "Individual members",
  member_tags: "Tag assignments",
  tags: "Tag definitions",
  addresses: "Family addresses",
  wedding_anniversaries: "Anniversary records",
  event_types: "Event categories",
  events: "Scheduled events",
  event_instances: "Per-date event overrides",
  email_templates: "Email template definitions",
  composed_instances: "Weekly email drafts",
  dispatch_queue: "Email dispatch records",
  mailing_lists: "Mailing list definitions",
  mailing_list_members: "Mailing list recipients",
  smtp_configs: "SMTP account configs",
  app_users: "Application users",
  audit_log: "Activity audit trail",
}

export function DatabaseStatsPanel() {
  const [tables, setTables] = useState<TableStat[]>([])
  const [dbSize, setDbSize] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [schemaTable, setSchemaTable] = useState<string | null>(null)
  const [schemaColumns, setSchemaColumns] = useState<ColumnInfo[]>([])
  const [schemaLoading, setSchemaLoading] = useState(false)

  const fetchStats = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error("Not authenticated")
        return
      }

      const res = await fetch("/api/admin/database-stats", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || "Failed to fetch stats")
        return
      }

      const data = await res.json()
      setTables(data.tables ?? [])
      setDbSize(data.dbSize ?? null)
    } catch {
      toast.error("Failed to fetch database stats")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  async function viewSchema(tableName: string) {
    setSchemaTable(tableName)
    setSchemaColumns([])
    setSchemaLoading(true)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const res = await fetch("/api/admin/database-stats", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ table: tableName }),
      })

      if (res.ok) {
        const data = await res.json()
        setSchemaColumns(data.columns ?? [])
      }
    } catch {
      toast.error("Failed to fetch schema")
    } finally {
      setSchemaLoading(false)
    }
  }

  const totalRows = tables.reduce((sum, t) => sum + t.row_count, 0)
  const sortedTables = [...tables].sort((a, b) => b.row_count - a.row_count)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">
            Supabase free tier usage and database statistics.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchStats(true)}
          disabled={refreshing}
        >
          {refreshing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Refresh
        </Button>
      </div>

      {/* Usage summary cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Table2 className="size-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tables.length}</p>
                <p className="text-xs text-muted-foreground">Tables</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-green-500/10">
                <Rows3 className="size-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalRows.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total rows</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10">
                <HardDrive className="size-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dbSize || "—"}</p>
                <p className="text-xs text-muted-foreground">
                  of {FREE_TIER_DB_MB} MB free tier
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Free tier limits */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="size-4" />
            Supabase Free Tier Limits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Database</p>
              <p className="font-semibold">{FREE_TIER_DB_MB} MB</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">File Storage</p>
              <p className="font-semibold">{FREE_TIER_STORAGE_GB} GB</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Monthly Active Users</p>
              <p className="font-semibold">50,000</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Edge Function Invocations</p>
              <p className="font-semibold">500K / month</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tables list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Table2 className="size-4" />
            Tables
          </CardTitle>
          <CardDescription>
            Click a table to view its schema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {sortedTables.map((t) => (
                <button
                  key={t.table_name}
                  type="button"
                  onClick={() => viewSchema(t.table_name)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60"
                >
                  <Table2 className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 font-medium font-mono text-xs">{t.table_name}</span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {TABLE_DESCRIPTIONS[t.table_name] ?? ""}
                  </span>
                  <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">
                    {t.row_count.toLocaleString()} rows
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schema dialog */}
      <Dialog open={!!schemaTable} onOpenChange={(open) => { if (!open) setSchemaTable(null) }}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">{schemaTable}</DialogTitle>
            <DialogDescription>
              {schemaTable && TABLE_DESCRIPTIONS[schemaTable]
                ? `${TABLE_DESCRIPTIONS[schemaTable]} — ${tables.find((t) => t.table_name === schemaTable)?.row_count.toLocaleString() ?? 0} rows`
                : `${tables.find((t) => t.table_name === schemaTable)?.row_count.toLocaleString() ?? 0} rows`}
            </DialogDescription>
          </DialogHeader>
          {schemaLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : schemaColumns.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Could not load schema. The information_schema may not be accessible via RLS.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-semibold">Column</th>
                    <th className="pb-2 pr-4 font-semibold">Type</th>
                    <th className="pb-2 pr-4 font-semibold">Nullable</th>
                    <th className="pb-2 font-semibold">Default</th>
                  </tr>
                </thead>
                <tbody>
                  {schemaColumns.map((col) => (
                    <tr key={col.column_name} className="border-b last:border-0">
                      <td className="py-1.5 pr-4 font-mono font-medium">{col.column_name}</td>
                      <td className="py-1.5 pr-4 text-muted-foreground font-mono">
                        {col.data_type}
                        {col.character_maximum_length ? `(${col.character_maximum_length})` : ""}
                      </td>
                      <td className="py-1.5 pr-4">
                        {col.is_nullable === "YES" ? (
                          <span className="text-muted-foreground">nullable</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">required</span>
                        )}
                      </td>
                      <td className="py-1.5 font-mono text-muted-foreground max-w-40 truncate">
                        {col.column_default ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </div>
  )
}
