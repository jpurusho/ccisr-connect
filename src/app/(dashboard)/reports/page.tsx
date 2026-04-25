"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, Cake, Heart, MapPin, UserPlus } from "lucide-react"
import { canonicalCityName } from "@/lib/city-utils"

interface CityCount {
  city: string
  count: number
}

interface StatConfig {
  label: string
  value: number | null
  icon: typeof Users
  href: string
}

export default function ReportsPage() {
  const router = useRouter()
  const [familyCount, setFamilyCount] = useState<number | null>(null)
  const [memberCount, setMemberCount] = useState<number | null>(null)
  const [childCount, setChildCount] = useState<number | null>(null)
  const [newcomerCount, setNewcomerCount] = useState<number | null>(null)
  const [cityCounts, setCityCounts] = useState<CityCount[] | null>(null)
  const [monthBirthdays, setMonthBirthdays] = useState<{ name: string; date: string }[] | null>(null)
  const [monthAnniversaries, setMonthAnniversaries] = useState<{ names: string; date: string }[] | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const today = new Date()
    const currentMonth = today.getMonth() + 1

    async function fetchReports() {
      // Get newcomer tag ID first
      const { data: newcomerTagRows } = await supabase
        .from("tags").select("id").eq("name", "Newcomer").limit(1).returns<{ id: string }[]>()
      const newcomerTagId = newcomerTagRows?.[0]?.id

      const [famRes, memRes, childRes, newcomerRes, addrRes, bdayRes, annRes] =
        await Promise.all([
          supabase.from("families").select("id", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("members").select("id", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("members").select("id", { count: "exact", head: true }).eq("is_active", true).eq("role_in_family", "child"),
          newcomerTagId
            ? supabase.from("member_tags").select("id", { count: "exact", head: true }).eq("tag_id", newcomerTagId)
            : Promise.resolve({ count: 0, error: null } as { count: number; error: null }),
          supabase.from("addresses").select("city").eq("is_current", true).returns<{ city: string }[]>(),
          supabase.from("members").select("full_name, birth_month, birth_day").eq("is_active", true).eq("birth_month", currentMonth).order("birth_day").returns<{ full_name: string; birth_month: number; birth_day: number }[]>(),
          supabase.from("wedding_anniversaries").select("anniversary_month, anniversary_day, husband:members!husband_member_id(full_name), wife:members!wife_member_id(full_name)").eq("anniversary_month", currentMonth).order("anniversary_day").returns<Record<string, unknown>[]>(),
        ])

      setFamilyCount(famRes.count ?? 0)
      setMemberCount(memRes.count ?? 0)
      setChildCount(childRes.count ?? 0)
      setNewcomerCount(newcomerRes.count ?? 0)

      if (addrRes.data) {
        const counts: Record<string, number> = {}
        addrRes.data.forEach((a) => {
          const city = canonicalCityName(a.city)
          counts[city] = (counts[city] || 0) + 1
        })
        setCityCounts(
          Object.entries(counts)
            .map(([city, count]) => ({ city, count }))
            .sort((a, b) => b.count - a.count)
        )
      }

      if (bdayRes.data) {
        setMonthBirthdays(
          bdayRes.data
            .filter((m) => m.birth_day)
            .map((m) => ({
              name: m.full_name,
              date: `${currentMonth}/${m.birth_day}`,
            }))
        )
      }

      if (annRes.data) {
        setMonthAnniversaries(
          annRes.data.map((a: Record<string, unknown>) => {
            const husband = a.husband as { full_name: string } | null
            const wife = a.wife as { full_name: string } | null
            return {
              names: `${husband?.full_name?.split(" ")[0] ?? "?"} & ${wife?.full_name?.split(" ")[0] ?? "?"}`,
              date: `${a.anniversary_month}/${a.anniversary_day}`,
            }
          })
        )
      }
    }

    fetchReports()
  }, [])

  const monthName = new Date().toLocaleString("en-US", { month: "long" })

  const statCards: StatConfig[] = [
    { label: "Active Families", value: familyCount, icon: Users, href: "/members?view=family&filter=active" },
    { label: "Active Members", value: memberCount, icon: Users, href: "/members?filter=active" },
    { label: "Children", value: childCount, icon: Users, href: "/members?filter=active&role=child" },
    { label: "Pending Newcomers", value: newcomerCount, icon: UserPlus, href: "/members?filter=newcomers" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Membership statistics and reports.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="transition-colors hover:bg-accent cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardDescription>{stat.label}</CardDescription>
                  <stat.icon className="size-4 text-muted-foreground" />
                </div>
                {stat.value !== null ? (
                  <CardTitle className="text-2xl">{stat.value}</CardTitle>
                ) : (
                  <Skeleton className="h-8 w-16" />
                )}
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cake className="size-5 text-purple-600" />
              Birthdays in {monthName}
            </CardTitle>
            <CardDescription>
              {monthBirthdays ? `${monthBirthdays.length} birthday${monthBirthdays.length !== 1 ? "s" : ""}` : "Loading..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!monthBirthdays ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
            ) : monthBirthdays.length === 0 ? (
              <p className="text-sm text-muted-foreground">No birthdays this month.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {monthBirthdays.map((b, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>{b.name}</span>
                    <Badge variant="outline" className="text-purple-600">{b.date}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="size-5 text-amber-600" />
              Anniversaries in {monthName}
            </CardTitle>
            <CardDescription>
              {monthAnniversaries ? `${monthAnniversaries.length} anniversar${monthAnniversaries.length !== 1 ? "ies" : "y"}` : "Loading..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!monthAnniversaries ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
            ) : monthAnniversaries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No anniversaries this month.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {monthAnniversaries.map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>{a.names}</span>
                    <Badge variant="outline" className="text-amber-600">{a.date}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="size-5" />
            Families by City
          </CardTitle>
          <CardDescription>
            Distribution of families across cities — click a city to view members
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!cityCounts ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : cityCounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No address data available.</p>
          ) : (
            <div className="space-y-3">
              {cityCounts.map((c) => {
                const maxCount = cityCounts[0]?.count || 1
                const width = Math.max(8, (c.count / maxCount) * 100)
                return (
                  <div
                    key={c.city}
                    className="space-y-1 cursor-pointer rounded-md p-1.5 -mx-1.5 transition-colors hover:bg-accent"
                    onClick={() =>
                      router.push(
                        `/members?filter=active&city=${encodeURIComponent(c.city)}`
                      )
                    }
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span>{c.city || "Unknown"}</span>
                      <span className="font-medium">{c.count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
