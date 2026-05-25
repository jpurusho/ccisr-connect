"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { logAudit } from "@/lib/audit"
import { formatPhone } from "@/lib/utils"
import type { Member, Address, WeddingAnniversary } from "@/types/database"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  GitMerge,
  MapPin,
  Phone,
  Heart,
  Users,
  Check,
  Loader2,
} from "lucide-react"

interface FamilyGroup {
  name: string
  families: FamilyRecord[]
}

interface FamilyRecord {
  id: string
  family_name: string
  home_phone: string | null
  is_active: boolean
  members: Pick<Member, "id" | "full_name" | "role_in_family" | "cell_phone" | "email" | "is_active">[]
  address: Pick<Address, "id" | "street" | "city" | "state" | "zip" | "full_address"> | null
  anniversary: Pick<WeddingAnniversary, "id" | "anniversary_month" | "anniversary_day" | "anniversary_year"> | null
}

import { MONTH_NAMES_FULL as MONTH_NAMES } from "@/lib/date-utils"

interface FamilyMergeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function FamilyMergeDialog({ open, onOpenChange, onSuccess }: FamilyMergeDialogProps) {
  const [groups, setGroups] = useState<FamilyGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPrimary, setSelectedPrimary] = useState<Record<string, string>>({})
  const [merging, setMerging] = useState<string | null>(null)

  useEffect(() => {
    if (open) findDuplicateFamilies()
  }, [open])

  async function findDuplicateFamilies() {
    setLoading(true)
    const supabase = createClient()

    const { data: familiesRaw } = await supabase
      .from("families")
      .select("id, family_name, home_phone, is_active")
      .order("family_name")
      .returns<{ id: string; family_name: string; home_phone: string | null; is_active: boolean }[]>()

    if (!familiesRaw || familiesRaw.length === 0) {
      setGroups([])
      setLoading(false)
      return
    }

    const byName = new Map<string, typeof familiesRaw>()
    for (const f of familiesRaw) {
      const key = f.family_name.toLowerCase().trim()
      if (!byName.has(key)) byName.set(key, [])
      byName.get(key)!.push(f)
    }

    const duplicateIds: string[] = []
    const duplicateGroups: { name: string; rawFamilies: typeof familiesRaw }[] = []

    for (const [, fams] of byName) {
      if (fams.length > 1) {
        duplicateGroups.push({ name: fams[0].family_name, rawFamilies: fams })
        for (const f of fams) duplicateIds.push(f.id)
      }
    }

    if (duplicateIds.length === 0) {
      setGroups([])
      setLoading(false)
      return
    }

    type MemberRow = { id: string; family_id: string; full_name: string; role_in_family: string; cell_phone: string | null; email: string | null; is_active: boolean }
    type AddressRow = { id: string; family_id: string; street: string | null; city: string | null; state: string | null; zip: string | null; full_address: string | null }
    type AnnivRow = { id: string; family_id: string; anniversary_month: number; anniversary_day: number; anniversary_year: number | null }

    const [membersRes, addressesRes, anniversariesRes] = await Promise.all([
      supabase
        .from("members")
        .select("id, family_id, full_name, role_in_family, cell_phone, email, is_active")
        .in("family_id", duplicateIds)
        .returns<MemberRow[]>(),
      supabase
        .from("addresses")
        .select("id, family_id, street, city, state, zip, full_address")
        .in("family_id", duplicateIds)
        .eq("is_current", true)
        .returns<AddressRow[]>(),
      supabase
        .from("wedding_anniversaries")
        .select("id, family_id, anniversary_month, anniversary_day, anniversary_year")
        .in("family_id", duplicateIds)
        .returns<AnnivRow[]>(),
    ])

    const membersByFamily = new Map<string, MemberRow[]>()
    for (const m of membersRes.data ?? []) {
      if (!membersByFamily.has(m.family_id)) membersByFamily.set(m.family_id, [])
      membersByFamily.get(m.family_id)!.push(m)
    }

    const addressByFamily = new Map<string, AddressRow>()
    for (const a of addressesRes.data ?? []) {
      addressByFamily.set(a.family_id, a)
    }

    const annivByFamily = new Map<string, AnnivRow>()
    for (const ann of anniversariesRes.data ?? []) {
      annivByFamily.set(ann.family_id, ann)
    }

    const result: FamilyGroup[] = duplicateGroups.map((g) => ({
      name: g.name,
      families: g.rawFamilies.map((f) => {
        const addr = addressByFamily.get(f.id) as FamilyRecord["address"] | undefined
        const anniv = annivByFamily.get(f.id) as FamilyRecord["anniversary"] | undefined
        return {
          id: f.id,
          family_name: f.family_name,
          home_phone: f.home_phone,
          is_active: f.is_active,
          members: (membersByFamily.get(f.id) ?? []) as FamilyRecord["members"],
          address: addr ?? null,
          anniversary: anniv ?? null,
        }
      }),
    }))

    setGroups(result)

    const defaults: Record<string, string> = {}
    for (const g of result) {
      const best = pickBestFamily(g.families)
      defaults[g.name] = best.id
    }
    setSelectedPrimary(defaults)
    setLoading(false)
  }

  function pickBestFamily(families: FamilyRecord[]): FamilyRecord {
    return families.reduce((best, f) => {
      const score = (f.members.length * 3) + (f.address ? 5 : 0) + (f.anniversary ? 3 : 0) + (f.home_phone ? 1 : 0)
      const bestScore = (best.members.length * 3) + (best.address ? 5 : 0) + (best.anniversary ? 3 : 0) + (best.home_phone ? 1 : 0)
      return score > bestScore ? f : best
    })
  }

  async function mergeGroup(group: FamilyGroup) {
    const primaryId = selectedPrimary[group.name]
    if (!primaryId) return

    setMerging(group.name)
    const supabase = createClient()
    const secondaryFamilies = group.families.filter((f) => f.id !== primaryId)
    const primary = group.families.find((f) => f.id === primaryId)!

    try {
      for (const sec of secondaryFamilies) {
        // Move members to primary family
        if (sec.members.length > 0) {
          await supabase
            .from("members")
            .update({ family_id: primaryId } as never)
            .eq("family_id", sec.id)
        }

        // Move address: reassign to primary (keep or mark non-current)
        if (sec.address) {
          await supabase
            .from("addresses")
            .update({
              family_id: primaryId,
              is_current: !primary.address,
            } as never)
            .eq("id", sec.address.id)
          if (!primary.address) primary.address = sec.address
        }

        // Move anniversary: reassign to primary family
        if (sec.anniversary) {
          if (!primary.anniversary) {
            await supabase
              .from("wedding_anniversaries")
              .update({ family_id: primaryId } as never)
              .eq("id", sec.anniversary.id)
            primary.anniversary = sec.anniversary
          } else {
            await supabase
              .from("wedding_anniversaries")
              .delete()
              .eq("id", sec.anniversary.id)
          }
        }

        // Move home_phone if primary doesn't have one
        if (sec.home_phone && !primary.home_phone) {
          await supabase
            .from("families")
            .update({ home_phone: sec.home_phone } as never)
            .eq("id", primaryId)
        }

        // Move any remaining addresses before deleting
        await supabase
          .from("addresses")
          .update({ family_id: primaryId, is_current: false } as never)
          .eq("family_id", sec.id)

        // Move any remaining anniversaries before deleting
        await supabase
          .from("wedding_anniversaries")
          .delete()
          .eq("family_id", sec.id)

        // Delete the empty secondary family
        await supabase.from("families").delete().eq("id", sec.id)

        logAudit("family_merged", "families", primaryId, {
          merged_from: sec.id,
          family_name: group.name,
          members_moved: sec.members.length,
        })
      }

      toast.success(`Merged ${secondaryFamilies.length + 1} "${group.name}" records into one`)
      setGroups((prev) => prev.filter((g) => g.name !== group.name))
      onSuccess?.()
    } catch {
      toast.error("Merge failed — check the console for details")
    } finally {
      setMerging(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <GitMerge className="size-5" />
            Merge Duplicate Families
          </SheetTitle>
          <SheetDescription>
            Families with the same name are shown below. Select which record to keep as primary, then merge.
            Members, addresses, and anniversaries will be consolidated.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="space-y-3 px-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="py-8 text-center px-4">
            <p className="text-muted-foreground">No duplicate families found.</p>
          </div>
        ) : (
          <div className="space-y-6 px-4">
            <p className="text-sm text-muted-foreground">
              {groups.length} duplicate group{groups.length !== 1 ? "s" : ""} found
            </p>

            {groups.map((group) => (
              <div key={group.name} className="rounded-lg border">
                {/* Group header */}
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-muted-foreground" />
                    <span className="font-semibold">{group.name}</span>
                    <Badge variant="outline">{group.families.length} records</Badge>
                  </div>
                  <Button
                    size="sm"
                    disabled={merging === group.name}
                    onClick={() => mergeGroup(group)}
                  >
                    {merging === group.name ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <GitMerge className="size-3.5" />
                    )}
                    Merge
                  </Button>
                </div>

                {/* Family records */}
                <div className="divide-y">
                  {group.families.map((fam) => {
                    const isPrimary = selectedPrimary[group.name] === fam.id
                    return (
                      <div
                        key={fam.id}
                        className={`px-4 py-3 cursor-pointer transition-colors ${
                          isPrimary ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : "hover:bg-muted/30"
                        }`}
                        onClick={() =>
                          setSelectedPrimary((prev) => ({ ...prev, [group.name]: fam.id }))
                        }
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {isPrimary ? (
                            <Badge variant="default" className="text-[10px]">
                              <Check className="size-3 mr-0.5" />
                              Keep
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Will merge into primary
                            </Badge>
                          )}
                          {!fam.is_active && (
                            <Badge variant="outline" className="text-[10px]">Inactive</Badge>
                          )}
                        </div>

                        {/* Address */}
                        {fam.address && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                            <MapPin className="size-3 shrink-0" />
                            <span>{fam.address.full_address || [fam.address.street, fam.address.city, fam.address.state, fam.address.zip].filter(Boolean).join(", ")}</span>
                          </div>
                        )}

                        {/* Home phone */}
                        {fam.home_phone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                            <Phone className="size-3 shrink-0" />
                            <span>Home: {formatPhone(fam.home_phone)}</span>
                          </div>
                        )}

                        {/* Anniversary */}
                        {fam.anniversary && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                            <Heart className="size-3 shrink-0 text-pink-500" />
                            <span>
                              Anniversary: {MONTH_NAMES[fam.anniversary.anniversary_month]}{" "}
                              {fam.anniversary.anniversary_day}
                              {fam.anniversary.anniversary_year ? `, ${fam.anniversary.anniversary_year}` : ""}
                            </span>
                          </div>
                        )}

                        {/* Members */}
                        <div className="mt-2 space-y-1">
                          {fam.members.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">No members</p>
                          ) : (
                            fam.members.map((m) => (
                              <div key={m.id} className="flex items-center gap-2 text-xs">
                                <span
                                  className={`size-1.5 rounded-full ${m.is_active ? "bg-green-500" : "bg-gray-400"}`}
                                />
                                <span className="font-medium">{m.full_name}</span>
                                <Badge variant="secondary" className="text-[10px] capitalize py-0">
                                  {m.role_in_family}
                                </Badge>
                                {m.cell_phone && (
                                  <span className="text-muted-foreground">{formatPhone(m.cell_phone)}</span>
                                )}
                                {m.email && (
                                  <span className="text-muted-foreground truncate max-w-32">{m.email}</span>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <SheetFooter>
          <SheetClose render={<Button variant="outline" />}>Close</SheetClose>
          <Button variant="outline" onClick={findDuplicateFamilies} disabled={loading}>
            Re-scan
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
