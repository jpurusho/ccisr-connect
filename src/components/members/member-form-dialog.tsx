"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { logAudit } from "@/lib/audit"
import type { Member, Family, FamilyRole, FamilyInsert, MemberInsert, Tag } from "@/types/database"
import { formatPhone } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface MemberFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member?: Member | null
  onSuccess?: () => void
}

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2000, i).toLocaleString("en-US", { month: "long" }),
}))

const DAYS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}))

const ROLES: { value: FamilyRole; label: string }[] = [
  { value: "husband", label: "Husband" },
  { value: "wife", label: "Wife" },
  { value: "child", label: "Child" },
]

export function MemberFormDialog({
  open,
  onOpenChange,
  member,
  onSuccess,
}: MemberFormDialogProps) {
  const isEditing = !!member

  // Form state
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [newFamilyName, setNewFamilyName] = useState("")
  const [isNewFamily, setIsNewFamily] = useState(false)
  const [roleInFamily, setRoleInFamily] = useState<FamilyRole>("husband")
  const [cellPhone, setCellPhone] = useState("")
  const [email, setEmail] = useState("")
  const [birthMonth, setBirthMonth] = useState<string>("")
  const [birthDay, setBirthDay] = useState<string>("")
  const [birthYear, setBirthYear] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [isNewcomer, setIsNewcomer] = useState(false)
  const [notes, setNotes] = useState("")

  // Address (family-level)
  const [street, setStreet] = useState("")
  const [city, setCity] = useState("")
  const [addrState, setAddrState] = useState("")
  const [zip, setZip] = useState("")
  const [homePhone, setHomePhone] = useState("")
  const [addressDirty, setAddressDirty] = useState(false)

  // Tags
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set())

  // Families for dropdown
  const [families, setFamilies] = useState<Family[]>([])
  const [loadingFamilies, setLoadingFamilies] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function validateField(field: string, value: string): string | null {
    if (field === "firstName" && !value.trim()) return "First name is required"
    if (field === "lastName" && !value.trim()) return "Last name is required"
    if (field === "email" && value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "Invalid email format"
    return null
  }

  function onBlurValidate(field: string, value: string) {
    const err = validateField(field, value)
    setFieldErrors((prev) => {
      const next = { ...prev }
      if (err) next[field] = err
      else delete next[field]
      return next
    })
  }

  const fetchFamilies = useCallback(async () => {
    setLoadingFamilies(true)
    const supabase = createClient()
    const [famRes, tagRes] = await Promise.all([
      supabase.from("families").select("*").order("family_name", { ascending: true }),
      supabase.from("tags").select("*").order("name").returns<Tag[]>(),
    ])
    if (famRes.data) setFamilies(famRes.data)
    if (tagRes.data) setAvailableTags(tagRes.data)
    setLoadingFamilies(false)
  }, [])

  // Load families when dialog opens, before pre-filling form
  useEffect(() => {
    if (open) {
      fetchFamilies()
    }
  }, [open, fetchFamilies])

  async function loadFamilyAddress(fId: string) {
    const supabase = createClient()
    const [addrRes, famRes] = await Promise.all([
      supabase
        .from("addresses")
        .select("street, city, state, zip")
        .eq("family_id", fId)
        .eq("is_current", true)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("families")
        .select("home_phone")
        .eq("id", fId)
        .single(),
    ])
    const addr = addrRes.data as { street: string | null; city: string | null; state: string | null; zip: string | null } | null
    setStreet(addr?.street ?? "")
    setCity(addr?.city ?? "")
    setAddrState(addr?.state ?? "")
    setZip(addr?.zip ?? "")
    setAddressDirty(false)
    const fam = famRes.data as { home_phone: string | null } | null
    setHomePhone(fam?.home_phone ?? "")
  }

  // Pre-fill form when editing — only after families are loaded
  useEffect(() => {
    if (open && member && !loadingFamilies) {
      setFirstName(member.first_name)
      setLastName(member.last_name)
      setFamilyId(member.family_id)
      setNewFamilyName("")
      setIsNewFamily(false)
      setRoleInFamily(member.role_in_family)
      setCellPhone(member.cell_phone ?? "")
      setEmail(member.email ?? "")
      setBirthMonth(member.birth_month ? String(member.birth_month) : "")
      setBirthDay(member.birth_day ? String(member.birth_day) : "")
      setBirthYear(member.birth_year ? String(member.birth_year) : "")
      setIsActive(member.is_active)
      setIsNewcomer(member.is_newcomer)
      setNotes(member.notes ?? "")
      loadFamilyAddress(member.family_id)
      // Fetch current tags for this member
      const supabase = createClient()
      supabase
        .from("member_tags")
        .select("tag_id")
        .eq("member_id", member.id)
        .returns<{ tag_id: string }[]>()
        .then(({ data }) => {
          setSelectedTagIds(new Set((data ?? []).map((t) => t.tag_id)))
        })
    } else if (open && !member) {
      setFirstName("")
      setLastName("")
      setFamilyId(null)
      setNewFamilyName("")
      setIsNewFamily(false)
      setRoleInFamily("husband")
      setCellPhone("")
      setEmail("")
      setBirthMonth("")
      setBirthDay("")
      setBirthYear("")
      setIsActive(true)
      setIsNewcomer(false)
      setNotes("")
      setStreet("")
      setCity("")
      setAddrState("")
      setZip("")
      setHomePhone("")
      setAddressDirty(false)
      setSelectedTagIds(new Set())
      setFieldErrors({})
    }
  }, [open, member, loadingFamilies])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const errors: Record<string, string> = {}
    if (!firstName.trim()) errors.firstName = "First name is required"
    if (!lastName.trim()) errors.lastName = "Last name is required"
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = "Invalid email format"
    if (!familyId && !newFamilyName.trim()) errors.family = "Select a family or enter a new one"
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      toast.error("Please fix the highlighted fields.")
      return
    }

    setSaving(true)

    try {
      const supabase = createClient()
      let resolvedFamilyId = familyId

      // Create new family if needed
      if (isNewFamily && newFamilyName.trim()) {
        const { data: existingMatch } = await supabase
          .from("families")
          .select("id, family_name")
          .ilike("family_name", newFamilyName.trim())
          .limit(1)
          .maybeSingle()

        if (existingMatch && !confirm(
          `A family named "${(existingMatch as { family_name: string }).family_name}" already exists. Create a new one anyway?`
        )) {
          resolvedFamilyId = (existingMatch as { id: string }).id
        } else {
          const familyPayload: FamilyInsert = {
            family_name: newFamilyName.trim(),
            is_active: true,
            home_phone: null,
            notes: null,
          }
          const { data: newFamily, error: familyError } = await supabase
            .from("families")
            .insert(familyPayload as never)
            .select()
            .single()

          if (familyError || !newFamily) {
            toast.error("Failed to create family: " + (familyError?.message ?? "Unknown error"))
            setSaving(false)
            return
          }
          resolvedFamilyId = (newFamily as Family).id
          logAudit("family_created", "families", null, { family_name: newFamilyName.trim() })
        }
      }

      if (!resolvedFamilyId) {
        toast.error("No family selected.")
        setSaving(false)
        return
      }

      const fullName = `${firstName.trim()} ${lastName.trim()}`
      const memberData: MemberInsert = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: fullName,
        family_id: resolvedFamilyId,
        role_in_family: roleInFamily,
        cell_phone: cellPhone.trim() || null,
        email: email.trim() || null,
        birth_month: birthMonth ? parseInt(birthMonth, 10) : null,
        birth_day: birthDay ? parseInt(birthDay, 10) : null,
        birth_year: birthYear.trim() ? parseInt(birthYear.trim(), 10) : null,
        is_active: isActive,
        is_newcomer: isNewcomer,
        newcomer_acknowledged: member?.newcomer_acknowledged ?? false,
        newcomer_date: isNewcomer && !member?.newcomer_date
          ? new Date().toISOString().split("T")[0]
          : member?.newcomer_date ?? null,
        notes: notes.trim() || null,
      }

      let resolvedMemberId: string | null = member?.id ?? null

      if (isEditing && member) {
        const { error } = await supabase
          .from("members")
          .update(memberData as unknown as never)
          .eq("id", member.id)

        if (error) {
          toast.error("Failed to update member: " + error.message)
          setSaving(false)
          return
        }
        toast.success("Member updated successfully.")
        const changedFields: Record<string, unknown> = { name: fullName }
        if (member.first_name !== firstName.trim()) changedFields.first_name = { from: member.first_name, to: firstName.trim() }
        if (member.last_name !== lastName.trim()) changedFields.last_name = { from: member.last_name, to: lastName.trim() }
        if (member.email !== (email.trim() || null)) changedFields.email = { from: member.email, to: email.trim() || null }
        if (member.cell_phone !== (cellPhone.trim() || null)) changedFields.cell_phone = { from: member.cell_phone, to: cellPhone.trim() || null }
        if (member.role_in_family !== roleInFamily) changedFields.role_in_family = { from: member.role_in_family, to: roleInFamily }
        if (member.family_id !== resolvedFamilyId) changedFields.family_changed = true
        if (member.is_active !== isActive) changedFields.is_active = { from: member.is_active, to: isActive }
        if (member.is_newcomer !== isNewcomer) changedFields.is_newcomer = { from: member.is_newcomer, to: isNewcomer }
        if ((member.notes ?? "") !== notes.trim()) changedFields.notes_changed = true
        if (addressDirty) changedFields.address_updated = true
        logAudit("member_updated", "members", member.id, changedFields)

        // Clean up orphaned old family if member was moved
        if (member.family_id !== resolvedFamilyId) {
          const { count } = await supabase
            .from("members")
            .select("*", { count: "exact", head: true })
            .eq("family_id", member.family_id)
          if (count === 0) {
            // Migrate address and home_phone to new family before deleting old one
            const { data: oldAddr } = await supabase
              .from("addresses")
              .select("id")
              .eq("family_id", member.family_id)
              .eq("is_current", true)
              .limit(1)
              .maybeSingle()
            if (oldAddr) {
              const { data: newAddr } = await supabase
                .from("addresses")
                .select("id")
                .eq("family_id", resolvedFamilyId!)
                .eq("is_current", true)
                .limit(1)
                .maybeSingle()
              if (!newAddr) {
                await supabase
                  .from("addresses")
                  .update({ family_id: resolvedFamilyId } as never)
                  .eq("id", (oldAddr as { id: string }).id)
              }
            }
            const { data: oldFam } = await supabase
              .from("families")
              .select("home_phone")
              .eq("id", member.family_id)
              .single()
            const oldPhone = (oldFam as unknown as { home_phone: string | null } | null)?.home_phone
            if (oldPhone) {
              const { data: newFam } = await supabase
                .from("families")
                .select("home_phone")
                .eq("id", resolvedFamilyId!)
                .single()
              if (!(newFam as unknown as { home_phone: string | null } | null)?.home_phone) {
                await supabase
                  .from("families")
                  .update({ home_phone: oldPhone } as never)
                  .eq("id", resolvedFamilyId!)
              }
            }
            await supabase.from("families").delete().eq("id", member.family_id)
            logAudit("family_auto_deleted", "families", member.family_id, {
              reason: "last_member_moved",
              address_migrated: !!oldAddr,
            })
          }
        }
      } else {
        const { data: created, error } = await supabase
          .from("members")
          .insert(memberData as never)
          .select("id")
          .single()

        if (error || !created) {
          toast.error("Failed to create member: " + (error?.message ?? "Unknown error"))
          setSaving(false)
          return
        }
        resolvedMemberId = (created as { id: string }).id
        toast.success("Member created successfully.")
        const familyName = isNewFamily ? newFamilyName.trim() : families.find((f) => f.id === resolvedFamilyId)?.family_name
        logAudit("member_created", "members", resolvedMemberId, { name: fullName, family: familyName, role: roleInFamily, email: email.trim() || undefined })
      }

      // Save address and home phone for the family
      if (resolvedFamilyId && addressDirty) {
        const hasAddress = street.trim() || city.trim() || addrState.trim() || zip.trim()
        if (hasAddress) {
          const fullAddress = [street.trim(), city.trim(), addrState.trim(), zip.trim()].filter(Boolean).join(", ")
          const { data: existingAddr } = await supabase
            .from("addresses")
            .select("id, full_address")
            .eq("family_id", resolvedFamilyId)
            .eq("is_current", true)
            .limit(1)
            .maybeSingle()

          const addrPayload = {
            street: street.trim(),
            city: city.trim(),
            state: addrState.trim(),
            zip: zip.trim(),
            full_address: fullAddress,
          }

          if (existingAddr) {
            const prev = (existingAddr as { id: string; full_address: string | null })
            await supabase
              .from("addresses")
              .update(addrPayload as never)
              .eq("id", prev.id)
            const familyName = families.find((f) => f.id === resolvedFamilyId)?.family_name
            logAudit("address_updated", "addresses", prev.id, { family: familyName, from: prev.full_address, to: fullAddress })
          } else {
            await supabase
              .from("addresses")
              .insert({
                family_id: resolvedFamilyId,
                ...addrPayload,
                is_current: true,
              } as never)
            const familyName = families.find((f) => f.id === resolvedFamilyId)?.family_name
            logAudit("address_created", "addresses", null, { family: familyName, address: fullAddress })
          }
        }

        if (homePhone.trim()) {
          await supabase
            .from("families")
            .update({ home_phone: homePhone.trim() } as never)
            .eq("id", resolvedFamilyId)
        }
      }

      // Sync tags
      if (resolvedMemberId) {
        if (isEditing) {
          await supabase.from("member_tags").delete().eq("member_id", resolvedMemberId)
        }
        if (selectedTagIds.size > 0) {
          await supabase.from("member_tags").insert(
            [...selectedTagIds].map((tagId) => ({ member_id: resolvedMemberId!, tag_id: tagId })) as never
          )
        }
      }

      onOpenChange(false)
      onSuccess?.()
    } catch {
      toast.error("An unexpected error occurred.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Member" : "Add Member"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update member information below."
              : "Fill in the details to add a new member."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" data-1p-ignore autoComplete="off">
          {/* Name fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value); setFieldErrors((p) => { const n = { ...p }; delete n.firstName; return n }) }}
                onBlur={() => onBlurValidate("firstName", firstName)}
                placeholder="First name"
                required
                aria-invalid={!!fieldErrors.firstName}
              />
              {fieldErrors.firstName && <p className="text-xs text-destructive">{fieldErrors.firstName}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => { setLastName(e.target.value); setFieldErrors((p) => { const n = { ...p }; delete n.lastName; return n }) }}
                onBlur={() => onBlurValidate("lastName", lastName)}
                placeholder="Last name"
                required
                aria-invalid={!!fieldErrors.lastName}
              />
              {fieldErrors.lastName && <p className="text-xs text-destructive">{fieldErrors.lastName}</p>}
            </div>
          </div>

          {/* Family selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Family *</Label>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => {
                  setIsNewFamily((prev) => !prev)
                  if (!isNewFamily) {
                    setFamilyId(null)
                  } else {
                    setNewFamilyName("")
                  }
                }}
              >
                {isNewFamily ? "Select existing" : "Create new"}
              </button>
            </div>
            {isNewFamily ? (
              <Input
                value={newFamilyName}
                onChange={(e) => setNewFamilyName(e.target.value)}
                placeholder="New family name"
              />
            ) : loadingFamilies ? (
              <Input value="Loading families..." disabled />
            ) : (
              <Select
                value={familyId ?? ""}
                onValueChange={(val) => {
                  const fId = val as string
                  setFamilyId(fId)
                  loadFamilyAddress(fId)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a family">
                    {families.find((f) => f.id === familyId)?.family_name || "Select a family"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {families.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.family_name}{!f.is_active ? " (inactive)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label>Role in family</Label>
            <Select
              value={roleInFamily}
              onValueChange={(val) => setRoleInFamily(val as FamilyRole)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cellPhone">Cell phone</Label>
              <Input
                id="cellPhone"
                type="tel"
                value={cellPhone}
                onChange={(e) => setCellPhone(e.target.value)}
                placeholder="(555) 123-4567"
                autoComplete="off"
                data-1p-ignore
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => { const n = { ...p }; delete n.email; return n }) }}
                onBlur={() => onBlurValidate("email", email)}
                placeholder="email@example.com"
                autoComplete="off"
                aria-invalid={!!fieldErrors.email}
                data-1p-ignore
              />
              {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
            </div>
          </div>

          {/* Address (family-level) */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Family Address</Label>
            <Input
              value={street}
              onChange={(e) => { setStreet(e.target.value); setAddressDirty(true) }}
              placeholder="Street address"
              autoComplete="off"
              data-1p-ignore
            />
            <div className="grid grid-cols-6 gap-2">
              <Input
                className="col-span-3"
                value={city}
                onChange={(e) => { setCity(e.target.value); setAddressDirty(true) }}
                placeholder="City"
                autoComplete="off"
                data-1p-ignore
              />
              <Input
                className="col-span-1"
                value={addrState}
                onChange={(e) => { setAddrState(e.target.value); setAddressDirty(true) }}
                placeholder="State"
                autoComplete="off"
                data-1p-ignore
              />
              <Input
                className="col-span-2"
                value={zip}
                onChange={(e) => { setZip(e.target.value); setAddressDirty(true) }}
                placeholder="Zip"
                autoComplete="off"
                data-1p-ignore
              />
            </div>
          </div>

          {/* Home phone (family-level) */}
          <div className="space-y-1.5">
            <Label htmlFor="homePhone">Home phone</Label>
            <Input
              id="homePhone"
              type="tel"
              value={homePhone}
              onChange={(e) => setHomePhone(e.target.value)}
              placeholder="(555) 123-4567"
              autoComplete="off"
              data-1p-ignore
            />
          </div>

          {/* Birthday */}
          <div className="space-y-1.5">
            <Label>Birthday</Label>
            <div className="grid grid-cols-3 gap-3">
              <Select
                value={birthMonth || undefined}
                onValueChange={(val) => setBirthMonth(val as string)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={birthDay || undefined}
                onValueChange={(val) => setBirthDay(val as string)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Day" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                placeholder="Year"
                min={1900}
                max={new Date().getFullYear()}
              />
            </div>
          </div>

          {/* Switches */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">Active</Label>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked)}
              />
            </div>
            {/* Newcomer is now managed via Tags */}
          </div>

          {/* Tags */}
          {availableTags.length > 0 && (
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((tag) => {
                  const isSelected = selectedTagIds.has(tag.id)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        setSelectedTagIds((prev) => {
                          const next = new Set(prev)
                          if (next.has(tag.id)) next.delete(tag.id)
                          else next.add(tag.id)
                          return next
                        })
                      }}
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                        isSelected
                          ? "text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                      style={isSelected ? { backgroundColor: tag.color } : undefined}
                    >
                      {tag.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              {isEditing ? "Save Changes" : "Add Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
