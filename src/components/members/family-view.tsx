"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { Member, Family, Address, WeddingAnniversary } from "@/types/database"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { logAudit } from "@/lib/audit"
import { formatPhone } from "@/lib/utils"
import { MapPin, Phone, Mail, Heart, Cake, Pencil } from "lucide-react"

type FamilyWithDetails = Family & {
  members: Member[]
  addresses: Address[]
  wedding_anniversaries: WeddingAnniversary[]
}

interface FamilyViewProps {
  searchQuery: string
  filter: "all" | "active" | "inactive" | "newcomers" | "children"
  cityFilter?: string
}

import { MONTH_NAMES_FULL as MONTH_NAMES } from "@/lib/date-utils"
import { canonicalCityName } from "@/lib/city-utils"

export function FamilyView({ searchQuery, filter, cityFilter }: FamilyViewProps) {
  const router = useRouter()
  const [families, setFamilies] = useState<FamilyWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [renameFamily, setRenameFamily] = useState<FamilyWithDetails | null>(null)
  const [newFamilyName, setNewFamilyName] = useState("")
  const [renaming, setRenaming] = useState(false)

  async function handleRename() {
    if (!renameFamily || !newFamilyName.trim()) return
    setRenaming(true)
    const supabase = createClient()
    const trimmed = newFamilyName.trim()
    const oldName = renameFamily.family_name

    const { error: famErr } = await supabase
      .from("families")
      .update({ family_name: trimmed } as never)
      .eq("id", renameFamily.id)

    if (famErr) {
      toast.error(`Failed to rename family: ${famErr.message}`)
      setRenaming(false)
      return
    }

    // Update last_name and full_name for all members
    const updates = renameFamily.members.map((m) => ({
      id: m.id,
      last_name: trimmed,
      full_name: `${m.first_name} ${trimmed}`,
    }))

    for (const u of updates) {
      await supabase
        .from("members")
        .update({ last_name: u.last_name, full_name: u.full_name } as never)
        .eq("id", u.id)
    }

    setFamilies((prev) =>
      prev.map((f) =>
        f.id === renameFamily.id
          ? {
              ...f,
              family_name: trimmed,
              members: f.members.map((m) => ({
                ...m,
                last_name: trimmed,
                full_name: `${m.first_name} ${trimmed}`,
              })),
            }
          : f
      )
    )

    logAudit("family_renamed", "families", renameFamily.id, {
      old_name: oldName,
      new_name: trimmed,
      members_updated: updates.length,
    })
    toast.success(`Renamed "${oldName}" → "${trimmed}" (${updates.length} member${updates.length !== 1 ? "s" : ""} updated)`)
    setRenameFamily(null)
    setRenaming(false)
  }

  useEffect(() => {
    async function fetchFamilies() {
      setLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from("families")
        .select(
          "*, members(*), addresses(*), wedding_anniversaries(*)"
        )
        .order("family_name", { ascending: true })

      if (!error && data) {
        setFamilies(data as FamilyWithDetails[])
      }
      setLoading(false)
    }
    fetchFamilies()
  }, [])

  const filtered = useMemo(() => {
    let result = families

    // Filter based on member status within families
    if (filter === "active") {
      result = result.filter((f) => f.is_active)
    } else if (filter === "inactive") {
      result = result.filter((f) => !f.is_active)
    } else if (filter === "children") {
      result = result.filter((f) => f.members.some((m) => m.role_in_family === "child"))
    } else if (filter === "newcomers") {
      result = result.filter((f) =>
        f.members.some((m) => m.is_newcomer)
      )
    }

    if (cityFilter && cityFilter !== "all") {
      result = result.filter((f) => {
        const addr = f.addresses?.find((a) => a.is_current)
        return canonicalCityName(addr?.city ?? null) === cityFilter
      })
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (f) =>
          f.family_name.toLowerCase().includes(q) ||
          f.members.some(
            (m) =>
              m.full_name.toLowerCase().includes(q) ||
              (m.cell_phone && m.cell_phone.toLowerCase().includes(q)) ||
              (m.email && m.email.toLowerCase().includes(q))
          )
      )
    }

    return result
  }, [families, filter, searchQuery, cityFilter])

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-56 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No families found.</p>
        {searchQuery && (
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your search or filter.
          </p>
        )}
      </div>
    )
  }

  return (
    <>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {filtered.map((family) => {
        const currentAddress = family.addresses.find((a) => a.is_current)
        const anniversary = family.wedding_anniversaries[0]

        // Sort members: husband first, then wife, then children
        const roleOrder: Record<string, number> = {
          husband: 0,
          wife: 1,
          child: 2,
        }
        const sortedMembers = [...family.members].sort(
          (a, b) =>
            (roleOrder[a.role_in_family] ?? 3) -
            (roleOrder[b.role_in_family] ?? 3)
        )

        return (
          <Card key={family.id} className="group">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-1.5 text-lg">
                    {family.family_name}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setNewFamilyName(family.family_name)
                        setRenameFamily(family)
                      }}
                      className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                      title="Rename family"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  </CardTitle>
                  {currentAddress?.full_address && (
                    <CardDescription className="mt-1 flex items-start gap-1.5">
                      <MapPin className="mt-0.5 size-3.5 shrink-0" />
                      <span>{currentAddress.full_address}</span>
                    </CardDescription>
                  )}
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <span className="text-xs text-muted-foreground">
                    {family.is_active ? "Active" : "Inactive"}
                  </span>
                  <Switch
                    size="sm"
                    checked={family.is_active}
                    onCheckedChange={async (checked) => {
                      const supabase = createClient()
                      const { error: famErr } = await supabase
                        .from("families")
                        .update({ is_active: checked } as never)
                        .eq("id", family.id)
                      if (famErr) {
                        toast.error(`Failed: ${famErr.message}`)
                        return
                      }
                      const { error: memErr } = await supabase
                        .from("members")
                        .update({ is_active: checked } as never)
                        .eq("family_id", family.id)
                      if (memErr) {
                        await supabase
                          .from("families")
                          .update({ is_active: !checked } as never)
                          .eq("id", family.id)
                        toast.error(`Failed to update members: ${memErr.message}`)
                        return
                      }
                      setFamilies((prev) =>
                        prev.map((f) =>
                          f.id === family.id
                            ? {
                                ...f,
                                is_active: checked,
                                members: f.members.map((m) => ({ ...m, is_active: checked })),
                              }
                            : f
                        )
                      )
                      logAudit("family_toggled_active", "families", family.id, {
                        is_active: checked,
                        name: family.family_name,
                        memberCount: family.members.length,
                      })
                      toast.success(
                        `${family.family_name} family ${checked ? "activated" : "deactivated"} (${family.members.length} members)`
                      )
                    }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {family.home_phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="size-3.5 shrink-0" />
                    <span>{formatPhone(family.home_phone)}</span>
                  </div>
                )}

                {/* Family members */}
                <div className="space-y-2">
                  {sortedMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-start justify-between gap-2 rounded-md p-2 transition-colors hover:bg-muted/50 cursor-pointer"
                      onClick={() => router.push(`/members/${member.id}`)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-block size-2 rounded-full ${
                              member.is_active
                                ? "bg-green-500"
                                : "bg-gray-400"
                            }`}
                          />
                          <span className="truncate text-sm font-medium">
                            {member.full_name}
                          </span>
                          <Badge
                            variant="secondary"
                            className="shrink-0 capitalize"
                          >
                            {member.role_in_family}
                          </Badge>
                          {/* Newcomer shown via tags */}
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 pl-3.5 text-xs text-muted-foreground">
                          {member.birth_month && member.birth_day && (
                            <span className="flex items-center gap-1 font-medium text-purple-600 dark:text-purple-400">
                              <Cake className="size-3" />
                              {MONTH_NAMES[member.birth_month]} {member.birth_day}
                            </span>
                          )}
                          {member.cell_phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="size-3" />
                              {member.cell_phone}
                            </span>
                          )}
                          {member.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="size-3" />
                              {member.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Anniversary */}
                {anniversary && (
                  <div className="flex items-center gap-2 rounded-md border border-pink-200 bg-pink-50 px-3 py-2 text-sm dark:border-pink-900 dark:bg-pink-950/30">
                    <Heart className="size-4 shrink-0 text-pink-500" />
                    <span className="font-medium text-pink-700 dark:text-pink-400">
                      Anniversary: {MONTH_NAMES[anniversary.anniversary_month]}{" "}
                      {anniversary.anniversary_day}
                      {anniversary.anniversary_year
                        ? `, ${anniversary.anniversary_year}`
                        : ""}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>

    <Dialog open={!!renameFamily} onOpenChange={(open) => { if (!open) setRenameFamily(null) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Family</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-family-name">New family name</Label>
            <Input
              id="new-family-name"
              value={newFamilyName}
              onChange={(e) => setNewFamilyName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleRename() }}
              placeholder="Enter new family name"
            />
          </div>
          {renameFamily && (
            <p className="text-sm text-muted-foreground">
              This will update the last name for {renameFamily.members.length} member{renameFamily.members.length !== 1 ? "s" : ""}:
              {" "}{renameFamily.members.map((m) => m.first_name).join(", ")}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setRenameFamily(null)} disabled={renaming}>
            Cancel
          </Button>
          <Button onClick={handleRename} disabled={renaming || !newFamilyName.trim() || newFamilyName.trim() === renameFamily?.family_name}>
            {renaming ? "Renaming..." : "Rename"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
