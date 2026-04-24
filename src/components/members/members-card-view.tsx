"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { Member, Family } from "@/types/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Phone, Mail } from "lucide-react"

type MemberWithFamily = Member & { families: Pick<Family, "family_name"> | null }

interface MembersCardViewProps {
  searchQuery: string
  filter: "all" | "active" | "inactive" | "newcomers"
}

export function MembersCardView({ searchQuery, filter }: MembersCardViewProps) {
  const router = useRouter()
  const [members, setMembers] = useState<MemberWithFamily[]>([])
  const [loading, setLoading] = useState(true)

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

  const filtered = useMemo(() => {
    let result = members

    if (filter === "active") {
      result = result.filter((m) => m.is_active)
    } else if (filter === "inactive") {
      result = result.filter((m) => !m.is_active)
    } else if (filter === "newcomers") {
      result = result.filter((m) => m.is_newcomer)
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
  }, [members, filter, searchQuery])

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
                {member.is_newcomer && (
                  <Badge variant="secondary">New</Badge>
                )}
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
