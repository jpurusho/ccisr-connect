"use client"

import { Suspense, useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { buildCityList } from "@/lib/city-utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MembersTable } from "@/components/members/members-table"
import { MembersCardView } from "@/components/members/members-card-view"
import { FamilyView } from "@/components/members/family-view"
import { MemberFormDialog } from "@/components/members/member-form-dialog"
import type { Tag } from "@/types/database"
import { Plus, Search, LayoutGrid, Table2, Users, Download, Upload, Merge, GitMerge, UserCheck, UserX, Baby, Home } from "lucide-react"
import { MemberExportDialog } from "@/components/members/member-export"
import { MemberImportDialog } from "@/components/members/member-import"
import { MemberDedupDialog } from "@/components/members/member-dedup"
import { FamilyMergeDialog } from "@/components/members/family-merge"

type FilterValue = "all" | "active" | "inactive" | "newcomers" | "children"

export default function MembersPage() {
  return (
    <Suspense>
      <MembersPageContent />
    </Suspense>
  )
}

function MembersPageContent() {
  const searchParams = useSearchParams()
  const [stats, setStats] = useState<{
    total: number; active: number; inactive: number
    families: number; familiesActive: number; familiesInactive: number
    children: number; childrenActive: number; childrenInactive: number
  } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<FilterValue>(
    (searchParams.get("filter") as FilterValue) || "active"
  )
  const [cityFilter, setCityFilter] = useState<string>(
    searchParams.get("city") || "all"
  )
  const [roleFilter, setRoleFilter] = useState<string>(
    searchParams.get("role") || "all"
  )
  const [tagFilter, setTagFilter] = useState<string>(
    searchParams.get("tag") || "all"
  )
  const [availableCities, setAvailableCities] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [dedupOpen, setDedupOpen] = useState(false)
  const [familyMergeOpen, setFamilyMergeOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [viewTab, setViewTab] = useState(searchParams.get("view") || "table")

  const fetchStats = useCallback(async () => {
    const supabase = createClient()
    const [
      totalRes, activeRes, inactiveRes,
      familiesRes, familiesActiveRes, familiesInactiveRes,
      childrenRes, childrenActiveRes, childrenInactiveRes,
    ] = await Promise.all([
      supabase.from("members").select("*", { count: "exact", head: true }),
      supabase.from("members").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("members").select("*", { count: "exact", head: true }).eq("is_active", false),
      supabase.from("families").select("*", { count: "exact", head: true }),
      supabase.from("families").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("families").select("*", { count: "exact", head: true }).eq("is_active", false),
      supabase.from("members").select("*", { count: "exact", head: true }).eq("role_in_family", "child"),
      supabase.from("members").select("*", { count: "exact", head: true }).eq("role_in_family", "child").eq("is_active", true),
      supabase.from("members").select("*", { count: "exact", head: true }).eq("role_in_family", "child").eq("is_active", false),
    ])
    setStats({
      total: totalRes.count ?? 0,
      active: activeRes.count ?? 0,
      inactive: inactiveRes.count ?? 0,
      families: (familiesRes.count ?? 0),
      familiesActive: familiesActiveRes.count ?? 0,
      familiesInactive: familiesInactiveRes.count ?? 0,
      children: childrenRes.count ?? 0,
      childrenActive: childrenActiveRes.count ?? 0,
      childrenInactive: childrenInactiveRes.count ?? 0,
    })
  }, [])

  const fetchCities = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("addresses")
      .select("city")
      .eq("is_current", true)
      .returns<{ city: string }[]>()
    if (data) {
      setAvailableCities(buildCityList(data.map((a) => a.city)))
    }
  }, [])

  const fetchTags = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("tags")
      .select("*")
      .order("name")
      .returns<Tag[]>()
    if (data) setAvailableTags(data)
  }, [])

  useEffect(() => {
    fetchStats()
    fetchCities()
    fetchTags()
  }, [fetchStats, fetchCities, fetchTags, refreshKey])

  function handleSuccess() {
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Members</h1>
          <p className="text-muted-foreground">
            {stats ? `${stats.total} member${stats.total !== 1 ? "s" : ""} total` : "Loading..."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setFamilyMergeOpen(true)} title="Merge duplicate families">
            <GitMerge className="size-4" />
          </Button>
          <Button variant="outline" onClick={() => setDedupOpen(true)} title="Find duplicate members">
            <Merge className="size-4" />
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="size-4" />
            Import
          </Button>
          <Button variant="outline" onClick={() => setExportOpen(true)}>
            <Download className="size-4" />
            Export
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            Add Member
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {([
            { label: "Families", value: stats.families, sub: `${stats.familiesActive} active / ${stats.familiesInactive} inactive`, icon: Home, color: "text-blue-600 dark:text-blue-400", filterKey: "families" as const },
            { label: "Active", value: stats.active, icon: UserCheck, color: "text-green-600 dark:text-green-400", filterKey: "active" as const },
            { label: "Inactive", value: stats.inactive, icon: UserX, color: "text-gray-500", filterKey: "inactive" as const },
            { label: "Children", value: stats.children, sub: `${stats.childrenActive} active / ${stats.childrenInactive} inactive`, icon: Baby, color: "text-purple-600 dark:text-purple-400", filterKey: "children" as const },
            { label: "Total", value: stats.total, icon: Users, color: "text-foreground", filterKey: "all" as const },
          ]).map((s) => {
            const isActive = s.filterKey === "families"
              ? viewTab === "family" && filter === "all"
              : filter === s.filterKey && viewTab !== "family"
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => {
                  if (s.filterKey === "families") {
                    setFilter("all")
                    setRoleFilter("all")
                    setViewTab("family")
                  } else {
                    setFilter(s.filterKey)
                    setRoleFilter("all")
                    if (viewTab === "family") setViewTab("table")
                  }
                }}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-muted/50 ${
                  isActive ? "ring-2 ring-primary/40 border-primary/30 bg-primary/5" : ""
                }`}
              >
                <s.icon className={`size-4 shrink-0 ${s.color}`} />
                <div className="min-w-0">
                  <p className="text-lg font-semibold leading-tight">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  {s.sub && <p className="text-[10px] text-muted-foreground/70">{s.sub}</p>}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Search and filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, or email..."
            className="pl-9"
          />
        </div>
        <Select
          value={filter}
          onValueChange={(val) => setFilter(val as FilterValue)}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Members</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="children">Children</SelectItem>
            <SelectItem value="newcomers">Newcomers</SelectItem>
          </SelectContent>
        </Select>
        {availableCities.length > 0 && (
          <Select value={cityFilter} onValueChange={(val) => setCityFilter(val ?? "all")}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="All Cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {availableCities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {availableTags.length > 0 && (
          <Select value={tagFilter} onValueChange={(val) => setTagFilter(val ?? "all")}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Tags">
                {tagFilter === "all"
                  ? "All Tags"
                  : availableTags.find((t) => t.id === tagFilter)?.name ?? "All Tags"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {availableTags.map((tag) => (
                <SelectItem key={tag.id} value={tag.id}>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                    {tag.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={roleFilter} onValueChange={(val) => setRoleFilter(val ?? "all")}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="husband">Husband</SelectItem>
            <SelectItem value="wife">Wife</SelectItem>
            <SelectItem value="child">Child</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Views */}
      <Tabs value={viewTab} onValueChange={(val) => setViewTab(val as string)}>
        <TabsList>
          <TabsTrigger value="table">
            <Table2 className="size-4" />
            <span className="hidden sm:inline">Table</span>
          </TabsTrigger>
          <TabsTrigger value="cards">
            <LayoutGrid className="size-4" />
            <span className="hidden sm:inline">Cards</span>
          </TabsTrigger>
          <TabsTrigger value="family">
            <Users className="size-4" />
            <span className="hidden sm:inline">Family</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <MembersTable
            key={`table-${refreshKey}`}
            searchQuery={searchQuery}
            filter={filter}
            cityFilter={cityFilter}
            roleFilter={roleFilter}
            tagFilter={tagFilter}
          />
        </TabsContent>

        <TabsContent value="cards">
          <MembersCardView
            key={`cards-${refreshKey}`}
            searchQuery={searchQuery}
            filter={filter}
            cityFilter={cityFilter}
          />
        </TabsContent>

        <TabsContent value="family">
          <FamilyView
            key={`family-${refreshKey}`}
            searchQuery={searchQuery}
            filter={filter}
            cityFilter={cityFilter}
          />
        </TabsContent>
      </Tabs>

      {/* Add Member Dialog */}
      <MemberFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleSuccess}
      />

      {/* Family Merge Dialog */}
      <FamilyMergeDialog
        open={familyMergeOpen}
        onOpenChange={setFamilyMergeOpen}
        onSuccess={handleSuccess}
      />

      {/* Dedup Dialog */}
      <MemberDedupDialog
        open={dedupOpen}
        onOpenChange={setDedupOpen}
        onSuccess={handleSuccess}
      />

      {/* Import Dialog */}
      <MemberImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={handleSuccess}
      />

      {/* Export Dialog */}
      <MemberExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        filter={filter}
        cityFilter={cityFilter}
        tagFilter={tagFilter}
        searchQuery={searchQuery}
      />
    </div>
  )
}
