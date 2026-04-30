"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { logAudit } from "@/lib/audit"
import type { Member, Family, Address, Tag } from "@/types/database"
import { canonicalCityName } from "@/lib/city-utils"
import { formatPhone } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"

type MemberWithFamily = Member & {
  families:
    | (Pick<Family, "family_name"> & {
        addresses: Pick<Address, "city" | "zip" | "is_current">[]
      })
    | null
  member_tags?: { tags: Pick<Tag, "id" | "name" | "color"> | null }[]
}

interface MembersTableProps {
  searchQuery: string
  filter: "all" | "active" | "inactive" | "newcomers" | "children"
  cityFilter?: string
  roleFilter?: string
  tagFilter?: string
  onRefresh?: () => void
}

const PAGE_SIZE = 25

function getMemberCity(member: MemberWithFamily): string {
  const addr = member.families?.addresses?.find((a) => a.is_current)
  return canonicalCityName(addr?.city ?? null)
}

function getMemberTags(member: MemberWithFamily): { id: string; name: string; color: string }[] {
  return (member.member_tags ?? [])
    .map((mt) => mt.tags)
    .filter((t): t is Pick<Tag, "id" | "name" | "color"> => t !== null)
}

export function MembersTable({
  searchQuery,
  filter,
  cityFilter,
  roleFilter,
  tagFilter,
  onRefresh,
}: MembersTableProps) {
  const router = useRouter()
  const [members, setMembers] = useState<MemberWithFamily[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [sortField, setSortField] = useState<"name" | "family" | "city">("name")
  const [sortAsc, setSortAsc] = useState(true)
  const [availableTags, setAvailableTags] = useState<{ id: string; name: string; color: string }[]>([])
  const [tagPopoverMemberId, setTagPopoverMemberId] = useState<string | null>(null)
  const [togglingTagId, setTogglingTagId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMembers() {
      setLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from("members")
        .select("*, families(family_name, addresses(city, zip, is_current)), member_tags(tags(id, name, color))")
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true })

      if (!error && data) {
        setMembers(data as MemberWithFamily[])
      }
      const { data: tags } = await supabase.from("tags").select("id, name, color").order("name")
      if (tags) setAvailableTags(tags)
      setLoading(false)
    }
    fetchMembers()
  }, [])

  useEffect(() => {
    setPage(0)
  }, [searchQuery, filter, cityFilter, roleFilter, tagFilter])

  const filtered = useMemo(() => {
    let result = members

    if (filter === "active") {
      result = result.filter((m) => m.is_active)
    } else if (filter === "inactive") {
      result = result.filter((m) => !m.is_active)
    } else if (filter === "children") {
      result = result.filter((m) => m.role_in_family === "child")
    } else if (filter === "newcomers") {
      result = result.filter((m) =>
        getMemberTags(m).some((t) => t.name.toLowerCase() === "newcomer")
      )
    }

    if (cityFilter && cityFilter !== "all") {
      result = result.filter((m) => getMemberCity(m) === cityFilter)
    }

    if (roleFilter && roleFilter !== "all") {
      result = result.filter((m) => m.role_in_family === roleFilter)
    }

    if (tagFilter && tagFilter !== "all") {
      result = result.filter((m) => getMemberTags(m).some((t) => t.id === tagFilter))
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (m) =>
          m.full_name.toLowerCase().includes(q) ||
          (m.cell_phone && m.cell_phone.toLowerCase().includes(q)) ||
          (m.email && m.email.toLowerCase().includes(q))
      )
    }

    result = [...result].sort((a, b) => {
      let cmp = 0
      if (sortField === "name") {
        cmp = a.full_name.localeCompare(b.full_name)
      } else if (sortField === "family") {
        const af = a.families?.family_name ?? ""
        const bf = b.families?.family_name ?? ""
        cmp = af.localeCompare(bf)
      } else if (sortField === "city") {
        cmp = getMemberCity(a).localeCompare(getMemberCity(b))
      }
      return sortAsc ? cmp : -cmp
    })

    return result
  }, [members, filter, searchQuery, sortField, sortAsc, cityFilter, roleFilter, tagFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function handleSort(field: "name" | "family" | "city") {
    if (sortField === field) {
      setSortAsc((prev) => !prev)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  function sortIndicator(field: "name" | "family" | "city") {
    if (sortField !== field) return null
    return sortAsc ? " ↑" : " ↓"
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No members found.</p>
        {searchQuery && (
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your search or filter.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort("name")}
            >
              Name{sortIndicator("name")}
            </TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort("family")}
            >
              Family{sortIndicator("family")}
            </TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="hidden md:table-cell">Email</TableHead>
            <TableHead
              className="hidden lg:table-cell cursor-pointer select-none"
              onClick={() => handleSort("city")}
            >
              City{sortIndicator("city")}
            </TableHead>
            <TableHead className="hidden md:table-cell">Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden xl:table-cell">Tags</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginated.map((member) => (
            <TableRow
              key={member.id}
              className="cursor-pointer"
              onClick={() => router.push(`/members/${member.id}`)}
            >
              <TableCell className="font-medium">{member.full_name}</TableCell>
              <TableCell className="text-muted-foreground">
                {member.families?.family_name ?? "-"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatPhone(member.cell_phone) || "-"}
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {member.email ?? "-"}
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {getMemberCity(member) !== "Unknown"
                  ? getMemberCity(member)
                  : "-"}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant="secondary" className="capitalize">
                  {member.role_in_family}
                </Badge>
              </TableCell>
              <TableCell>
                <div
                  className="flex items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Switch
                    size="sm"
                    checked={member.is_active}
                    onCheckedChange={async (checked) => {
                      const supabase = createClient()
                      const { error } = await supabase
                        .from("members")
                        .update({ is_active: checked } as never)
                        .eq("id", member.id)
                      if (error) {
                        toast.error(`Failed: ${error.message}`)
                      } else {
                        setMembers((prev) =>
                          prev.map((m) =>
                            m.id === member.id
                              ? { ...m, is_active: checked }
                              : m
                          )
                        )
                        onRefresh?.()
                        logAudit("member_toggled_active", "members", member.id, { is_active: checked, name: member.full_name })
                        toast.success(
                          `${member.full_name} ${checked ? "activated" : "deactivated"}`
                        )
                      }
                    }}
                  />
                  {/* Newcomer shown as tag badge in Tags column */}
                </div>
              </TableCell>
              <TableCell
                className="hidden xl:table-cell relative"
                onClick={(e) => {
                  e.stopPropagation()
                  setTagPopoverMemberId(tagPopoverMemberId === member.id ? null : member.id)
                }}
              >
                <div className="flex flex-wrap gap-1 cursor-pointer min-h-[24px] rounded-md p-0.5 hover:bg-muted/50">
                  {getMemberTags(member).map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))}
                  {getMemberTags(member).length === 0 && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Plus className="size-3" /> Tags
                    </span>
                  )}
                </div>
                {tagPopoverMemberId === member.id && (
                  <div className="absolute right-0 z-50 mt-1 rounded-lg border bg-popover p-2 shadow-lg" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-wrap gap-1.5 max-w-xs">
                      {availableTags.map((tag) => {
                        const hasTag = getMemberTags(member).some((t) => t.id === tag.id)
                        const isToggling = togglingTagId === tag.id
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            disabled={isToggling}
                            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${hasTag ? "text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                            style={hasTag ? { backgroundColor: tag.color } : undefined}
                            onClick={async (e) => {
                              e.stopPropagation()
                              setTogglingTagId(tag.id)
                              const supabase = createClient()
                              const { error } = hasTag
                                ? await supabase.from("member_tags").delete().eq("member_id", member.id).eq("tag_id", tag.id)
                                : await supabase.from("member_tags").insert({ member_id: member.id, tag_id: tag.id } as never)
                              if (error) {
                                toast.error(`Failed to ${hasTag ? "remove" : "add"} tag: ${error.message}`)
                                setTogglingTagId(null)
                                return
                              }
                              logAudit(hasTag ? "tag_removed" : "tag_added", "member_tags", member.id, { tag: tag.name })
                              const { data: updated } = await supabase
                                .from("members")
                                .select("*, families(family_name, addresses(city, zip, is_current)), member_tags(tags(id, name, color))")
                                .eq("id", member.id)
                                .single()
                              if (updated) {
                                setMembers((prev) => prev.map((m) => m.id === member.id ? updated as MemberWithFamily : m))
                              }
                              setTogglingTagId(null)
                            }}
                          >
                            {tag.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}-
            {Math.min((page + 1) * PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft />
            </Button>
            {Array.from({ length: totalPages }).map((_, i) => {
              if (
                i === 0 ||
                i === totalPages - 1 ||
                (i >= page - 1 && i <= page + 1)
              ) {
                return (
                  <Button
                    key={i}
                    variant={i === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(i)}
                  >
                    {i + 1}
                  </Button>
                )
              }
              if (i === page - 2 || i === page + 2) {
                return (
                  <span
                    key={i}
                    className="px-1 text-sm text-muted-foreground"
                  >
                    ...
                  </span>
                )
              }
              return null
            })}
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
    </div>
  )
}
