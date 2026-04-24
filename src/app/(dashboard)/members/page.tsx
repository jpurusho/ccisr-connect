"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
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
import { Plus, Search, LayoutGrid, Table2, Users } from "lucide-react"

type FilterValue = "all" | "active" | "inactive" | "newcomers"

export default function MembersPage() {
  const [memberCount, setMemberCount] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<FilterValue>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchCount = useCallback(async () => {
    const supabase = createClient()
    const { count } = await supabase
      .from("members")
      .select("*", { count: "exact", head: true })
    setMemberCount(count ?? 0)
  }, [])

  useEffect(() => {
    fetchCount()
  }, [fetchCount, refreshKey])

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
            {memberCount !== null
              ? `${memberCount} member${memberCount !== 1 ? "s" : ""} total`
              : "Loading..."}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          Add Member
        </Button>
      </div>

      {/* Search and filter */}
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
            <SelectItem value="newcomers">Newcomers</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Views */}
      <Tabs defaultValue="table">
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
          />
        </TabsContent>

        <TabsContent value="cards">
          <MembersCardView
            key={`cards-${refreshKey}`}
            searchQuery={searchQuery}
            filter={filter}
          />
        </TabsContent>

        <TabsContent value="family">
          <FamilyView
            key={`family-${refreshKey}`}
            searchQuery={searchQuery}
            filter={filter}
          />
        </TabsContent>
      </Tabs>

      {/* Add Member Dialog */}
      <MemberFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
