"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { Member, Family, Address } from "@/types/database"
import { canonicalCityName } from "@/lib/city-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Phone, Mail, MapPin, Cake } from "lucide-react"
import { MONTH_NAMES_FULL as MONTH_NAMES } from "@/lib/date-utils"

type MemberWithFamily = Member & {
  families:
    | (Pick<Family, "family_name"> & {
        addresses: Pick<Address, "city" | "full_address" | "is_current">[]
      })
    | null
  member_tags?: { tags: { id: string; name: string; color: string } | null }[]
}

function getMemberCity(m: MemberWithFamily): string {
  const addr = m.families?.addresses?.find((a) => a.is_current)
  return canonicalCityName(addr?.city ?? null)
}

interface MembersCardViewProps {
  searchQuery: string
  filter: "all" | "active" | "inactive" | "newcomers" | "children"
  cityFilter?: string
}

export function MembersCardView({ searchQuery, filter, cityFilter }: MembersCardViewProps) {
  const router = useRouter()
  const [members, setMembers] = useState<MemberWithFamily[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMembers() {
      setLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from("members")
        .select("*, families(family_name, addresses(city, full_address, is_current)), member_tags(tags(id, name, color))")
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true })

      if (!error && data) {
        setMembers(data as MemberWithFamily[])
      }
      setLoading(false)
    }
    fetchMembers()
  }, [])

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
        (m.member_tags ?? []).some((mt) => mt.tags?.name?.toLowerCase() === "newcomer")
      )
    }

    if (cityFilter && cityFilter !== "all") {
      result = result.filter((m) => getMemberCity(m) === cityFilter)
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

    return result
  }, [members, filter, searchQuery, cityFilter])

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {filtered.map((member) => (
        <Card
          key={member.id}
          className="cursor-pointer transition-shadow hover:shadow-md"
          onClick={() => router.push(`/members/${member.id}`)}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <CardTitle className="truncate text-lg">
                  {member.full_name}
                </CardTitle>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {member.families?.family_name ?? "No family"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span
                  className={`inline-block size-2.5 rounded-full ${
                    member.is_active ? "bg-green-500" : "bg-gray-400"
                  }`}
                  title={member.is_active ? "Active" : "Inactive"}
                />
                {/* Newcomer shown via tags */}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {member.cell_phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="size-3.5 shrink-0" />
                  <span className="truncate">{member.cell_phone}</span>
                </div>
              )}
              {member.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="size-3.5 shrink-0" />
                  <span className="truncate">{member.email}</span>
                </div>
              )}
              {member.birth_month && member.birth_day && (
                <div className="flex items-center gap-2 text-sm">
                  <Cake className="size-3.5 shrink-0 text-purple-500" />
                  <span className="font-medium text-purple-600 dark:text-purple-400">
                    {MONTH_NAMES[member.birth_month]} {member.birth_day}
                  </span>
                </div>
              )}
              {(() => {
                const addr = member.families?.addresses?.find((a) => a.is_current)
                const display = addr?.full_address || (getMemberCity(member) !== "Unknown" ? getMemberCity(member) : null)
                return display ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" />
                    <span className="truncate">{display}</span>
                  </div>
                ) : null
              })()}
              <div className="pt-1">
                <Badge variant="secondary" className="capitalize">
                  {member.role_in_family}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
