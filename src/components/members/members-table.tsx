"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { Member, Family } from "@/types/database"
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
import { ChevronLeft, ChevronRight } from "lucide-react"

type MemberWithFamily = Member & { families: Pick<Family, "family_name"> | null }

interface MembersTableProps {
  searchQuery: string
  filter: "all" | "active" | "inactive" | "newcomers"
}

const PAGE_SIZE = 25

export function MembersTable({ searchQuery, filter }: MembersTableProps) {
  const router = useRouter()
  const [members, setMembers] = useState<MemberWithFamily[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [sortField, setSortField] = useState<"name" | "family">("name")
  const [sortAsc, setSortAsc] = useState(true)

  useEffect(() => {
    async function fetchMembers() {
      setLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from("members")
        .select("*, families(family_name)")
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true })

      if (!error && data) {
        setMembers(data as MemberWithFamily[])
      }
      setLoading(false)
    }
    fetchMembers()
  }, [])

  // Reset page when filter or search changes
  useEffect(() => {
    setPage(0)
  }, [searchQuery, filter])

  const filtered = useMemo(() => {
    let result = members

    // Apply filter
    if (filter === "active") {
      result = result.filter((m) => m.is_active)
    } else if (filter === "inactive") {
      result = result.filter((m) => !m.is_active)
    } else if (filter === "newcomers") {
      result = result.filter((m) => m.is_newcomer)
    }

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (m) =>
          m.full_name.toLowerCase().includes(q) ||
          (m.cell_phone && m.cell_phone.toLowerCase().includes(q)) ||
          (m.email && m.email.toLowerCase().includes(q))
      )
    }

    // Apply sort
    result = [...result].sort((a, b) => {
      let cmp = 0
      if (sortField === "name") {
        cmp = a.full_name.localeCompare(b.full_name)
      } else if (sortField === "family") {
        const af = a.families?.family_name ?? ""
        const bf = b.families?.family_name ?? ""
        cmp = af.localeCompare(bf)
      }
      return sortAsc ? cmp : -cmp
    })

    return result
  }, [members, filter, searchQuery, sortField, sortAsc])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function handleSort(field: "name" | "family") {
    if (sortField === field) {
      setSortAsc((prev) => !prev)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  function sortIndicator(field: "name" | "family") {
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
            <TableHead className="hidden md:table-cell">Role</TableHead>
            <TableHead>Status</TableHead>
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
                {member.cell_phone ?? "-"}
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {member.email ?? "-"}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant="secondary" className="capitalize">
                  {member.role_in_family}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  {member.is_active ? (
                    <Badge variant="default">Active</Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                  {member.is_newcomer && (
                    <Badge variant="secondary">New</Badge>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
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
              // Show first, last, current, and neighbors
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
