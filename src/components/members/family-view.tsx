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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { logAudit } from "@/lib/audit"
import { formatPhone } from "@/lib/utils"
import { MapPin, Phone, Mail, Heart, Cake, Pencil, Loader2 } from "lucide-react"
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
  const [editFamily, setEditFamily] = useState<FamilyWithDetails | null>(null)
  const [editForm, setEditForm] = useState<{
    familyName: string
    homePhone: string
    street: string
    city: string
    state: string
    zip: string
    anniversaryMonth: string
    anniversaryDay: string
    anniversaryYear: string
    members: { id: string; firstName: string; lastName: string; cellPhone: string; email: string; role: string; birthMonth: string; birthDay: string; birthYear: string }[]
  } | null>(null)
  const [saving, setSaving] = useState(false)

  function openEditDialog(family: FamilyWithDetails) {
    const addr = family.addresses.find((a) => a.is_current)
    const anniv = family.wedding_anniversaries[0]
    const roleOrder: Record<string, number> = { husband: 0, wife: 1, child: 2 }
    const sorted = [...family.members].sort((a, b) => (roleOrder[a.role_in_family] ?? 3) - (roleOrder[b.role_in_family] ?? 3))
    setEditForm({
      familyName: family.family_name,
      homePhone: family.home_phone ?? "",
      street: addr?.street ?? "",
      city: addr?.city ?? "",
      state: addr?.state ?? "",
      zip: addr?.zip ?? "",
      anniversaryMonth: anniv?.anniversary_month?.toString() ?? "",
      anniversaryDay: anniv?.anniversary_day?.toString() ?? "",
      anniversaryYear: anniv?.anniversary_year?.toString() ?? "",
      members: sorted.map((m) => ({
        id: m.id,
        firstName: m.first_name,
        lastName: m.last_name,
        cellPhone: m.cell_phone ?? "",
        email: m.email ?? "",
        role: m.role_in_family,
        birthMonth: m.birth_month?.toString() ?? "",
        birthDay: m.birth_day?.toString() ?? "",
        birthYear: m.birth_year?.toString() ?? "",
      })),
    })
    setEditFamily(family)
  }

  async function handleSaveFamily() {
    if (!editFamily || !editForm || !editForm.familyName.trim()) return
    setSaving(true)
    const supabase = createClient()
    const newName = editForm.familyName.trim()
    const oldName = editFamily.family_name
    const nameChanged = newName !== oldName

    // Update family record
    const { error: famErr } = await supabase
      .from("families")
      .update({ family_name: newName, home_phone: editForm.homePhone.trim() || null } as never)
      .eq("id", editFamily.id)

    if (famErr) {
      toast.error(`Failed to update family: ${famErr.message}`)
      setSaving(false)
      return
    }

    // Update/upsert address
    const addr = editFamily.addresses.find((a) => a.is_current)
    const fullAddress = [editForm.street, editForm.city, editForm.state, editForm.zip].filter(Boolean).join(", ")
    if (addr) {
      await supabase.from("addresses").update({
        street: editForm.street.trim() || null,
        city: editForm.city.trim() || null,
        state: editForm.state.trim() || null,
        zip: editForm.zip.trim() || null,
        full_address: fullAddress || null,
      } as never).eq("id", addr.id)
    } else if (fullAddress) {
      await supabase.from("addresses").insert({
        family_id: editFamily.id,
        street: editForm.street.trim() || null,
        city: editForm.city.trim() || null,
        state: editForm.state.trim() || null,
        zip: editForm.zip.trim() || null,
        full_address: fullAddress || null,
        is_current: true,
      } as never)
    }

    // Update each member
    for (const mf of editForm.members) {
      const lastName = nameChanged ? newName : mf.lastName.trim()
      const fullName = `${mf.firstName.trim()} ${lastName}`
      await supabase.from("members").update({
        first_name: mf.firstName.trim(),
        last_name: lastName,
        full_name: fullName,
        role_in_family: mf.role,
        cell_phone: mf.cellPhone.trim() || null,
        email: mf.email.trim() || null,
        birth_month: mf.birthMonth ? parseInt(mf.birthMonth, 10) : null,
        birth_day: mf.birthDay ? parseInt(mf.birthDay, 10) : null,
        birth_year: mf.birthYear ? parseInt(mf.birthYear, 10) : null,
      } as never).eq("id", mf.id)
    }

    // Upsert anniversary
    const annivMonth = editForm.anniversaryMonth ? parseInt(editForm.anniversaryMonth, 10) : null
    const annivDay = editForm.anniversaryDay ? parseInt(editForm.anniversaryDay, 10) : null
    const annivYear = editForm.anniversaryYear ? parseInt(editForm.anniversaryYear, 10) : null
    const existingAnniv = editFamily.wedding_anniversaries[0]
    const husband = editForm.members.find((m) => m.role === "husband")
    const wife = editForm.members.find((m) => m.role === "wife")

    if (annivMonth && annivDay) {
      const annivPayload = {
        family_id: editFamily.id,
        husband_member_id: husband?.id ?? editForm.members[0]?.id,
        wife_member_id: wife?.id ?? editForm.members[1]?.id ?? editForm.members[0]?.id,
        anniversary_month: annivMonth,
        anniversary_day: annivDay,
        anniversary_year: annivYear,
      }
      if (existingAnniv) {
        await supabase.from("wedding_anniversaries").update(annivPayload as never).eq("id", existingAnniv.id)
      } else {
        await supabase.from("wedding_anniversaries").insert(annivPayload as never)
      }
    } else if (existingAnniv && !annivMonth && !annivDay) {
      await supabase.from("wedding_anniversaries").delete().eq("id", existingAnniv.id)
    }

    // Refresh local state
    const { data: refreshed } = await supabase
      .from("families")
      .select("*, members(*), addresses(*), wedding_anniversaries(*)")
      .eq("id", editFamily.id)
      .single()

    if (refreshed) {
      setFamilies((prev) => prev.map((f) => f.id === editFamily.id ? refreshed as FamilyWithDetails : f))
    }

    logAudit("family_edited", "families", editFamily.id, {
      family_name: newName,
      ...(nameChanged ? { old_name: oldName } : {}),
      members_updated: editForm.members.length,
    })
    toast.success(`${newName} family updated`)
    setEditFamily(null)
    setEditForm(null)
    setSaving(false)
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
          <ContextMenu key={family.id}>
          <ContextMenuTrigger>
          <Card className="group">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-1.5 text-lg">
                    {family.family_name}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditDialog(family)
                      }}
                      className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                      title="Edit family"
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
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onSelect={() => openEditDialog(family)}>
              <Pencil className="size-3.5" /> Edit Family
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => router.push(`/members/${family.members[0]?.id}`)}>
              View Members
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => {
              const addr = family.addresses.find((a) => a.is_current)
              if (addr?.full_address) navigator.clipboard.writeText(addr.full_address)
            }}>
              Copy Address
            </ContextMenuItem>
            {family.home_phone && (
              <ContextMenuItem onSelect={() => navigator.clipboard.writeText(family.home_phone!)}>
                Copy Phone
              </ContextMenuItem>
            )}
          </ContextMenuContent>
          </ContextMenu>
        )
      })}
    </div>

    <Sheet open={!!editFamily} onOpenChange={(open) => { if (!open) { setEditFamily(null); setEditForm(null) } }}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Family</SheetTitle>
          <p className="text-sm text-muted-foreground">{editFamily?.family_name}</p>
        </SheetHeader>
        {editForm && (
          <div className="flex-1 space-y-6 px-4 pb-4">
            {/* Family details */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Family</h3>
              <div className="space-y-1.5">
                <Label htmlFor="ef-name">Last Name</Label>
                <Input id="ef-name" value={editForm.familyName} onChange={(e) => setEditForm({ ...editForm, familyName: e.target.value })} />
                {editForm.familyName.trim() !== editFamily!.family_name && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">Updates last name for all members</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ef-phone">Home Phone</Label>
                <Input id="ef-phone" value={editForm.homePhone} onChange={(e) => setEditForm({ ...editForm, homePhone: e.target.value })} placeholder="Home phone" />
              </div>
            </section>

            <Separator />

            {/* Address */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Address</h3>
              <div className="space-y-2">
                <Input value={editForm.street} onChange={(e) => setEditForm({ ...editForm, street: e.target.value })} placeholder="Street" />
                <div className="grid grid-cols-3 gap-2">
                  <Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} placeholder="City" className="col-span-1" />
                  <Input value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} placeholder="State" />
                  <Input value={editForm.zip} onChange={(e) => setEditForm({ ...editForm, zip: e.target.value })} placeholder="ZIP" />
                </div>
              </div>
            </section>

            <Separator />

            {/* Anniversary */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Wedding Anniversary</h3>
              <div className="flex items-center gap-2">
                <Heart className="size-3.5 shrink-0 text-pink-500" />
                <div className="grid flex-1 grid-cols-3 gap-1.5">
                  <Input
                    value={editForm.anniversaryMonth}
                    onChange={(e) => setEditForm({ ...editForm, anniversaryMonth: e.target.value })}
                    placeholder="MM"
                    className="text-center text-sm"
                  />
                  <Input
                    value={editForm.anniversaryDay}
                    onChange={(e) => setEditForm({ ...editForm, anniversaryDay: e.target.value })}
                    placeholder="DD"
                    className="text-center text-sm"
                  />
                  <Input
                    value={editForm.anniversaryYear}
                    onChange={(e) => setEditForm({ ...editForm, anniversaryYear: e.target.value })}
                    placeholder="YYYY"
                    className="text-center text-sm"
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">Leave blank to remove. Used for anniversary cards and reports.</p>
            </section>

            <Separator />

            {/* Members */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Members ({editForm.members.length})
              </h3>
              {editForm.members.map((mf, idx) => (
                <div key={mf.id} className="space-y-2 rounded-xl bg-muted/40 p-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={mf.firstName}
                      onChange={(e) => {
                        const updated = [...editForm.members]
                        updated[idx] = { ...updated[idx], firstName: e.target.value }
                        setEditForm({ ...editForm, members: updated })
                      }}
                      placeholder="First name"
                      className="flex-1 font-medium"
                    />
                    <Select value={mf.role} onValueChange={(v: string | null) => {
                      if (!v) return
                      const updated = [...editForm.members]
                      updated[idx] = { ...updated[idx], role: v }
                      setEditForm({ ...editForm, members: updated })
                    }}>
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="husband">Husband</SelectItem>
                        <SelectItem value="wife">Wife</SelectItem>
                        <SelectItem value="child">Child</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={mf.cellPhone}
                        onChange={(e) => {
                          const updated = [...editForm.members]
                          updated[idx] = { ...updated[idx], cellPhone: e.target.value }
                          setEditForm({ ...editForm, members: updated })
                        }}
                        placeholder="Phone"
                        className="pl-8"
                      />
                    </div>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={mf.email}
                        onChange={(e) => {
                          const updated = [...editForm.members]
                          updated[idx] = { ...updated[idx], email: e.target.value }
                          setEditForm({ ...editForm, members: updated })
                        }}
                        placeholder="Email"
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Cake className="size-3.5 shrink-0 text-purple-500" />
                    <div className="grid flex-1 grid-cols-3 gap-1.5">
                      <Input
                        value={mf.birthMonth}
                        onChange={(e) => {
                          const updated = [...editForm.members]
                          updated[idx] = { ...updated[idx], birthMonth: e.target.value }
                          setEditForm({ ...editForm, members: updated })
                        }}
                        placeholder="MM"
                        className="text-center text-sm"
                      />
                      <Input
                        value={mf.birthDay}
                        onChange={(e) => {
                          const updated = [...editForm.members]
                          updated[idx] = { ...updated[idx], birthDay: e.target.value }
                          setEditForm({ ...editForm, members: updated })
                        }}
                        placeholder="DD"
                        className="text-center text-sm"
                      />
                      <Input
                        value={mf.birthYear}
                        onChange={(e) => {
                          const updated = [...editForm.members]
                          updated[idx] = { ...updated[idx], birthYear: e.target.value }
                          setEditForm({ ...editForm, members: updated })
                        }}
                        placeholder="YYYY"
                        className="text-center text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}
        <SheetFooter>
          <Button variant="outline" onClick={() => { setEditFamily(null); setEditForm(null) }} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSaveFamily} disabled={saving || !editForm?.familyName.trim()}>
            {saving ? <><Loader2 className="size-4 animate-spin" /> Saving...</> : "Save All"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
    </>
  )
}
