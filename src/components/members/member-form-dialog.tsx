"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Member, Family, FamilyRole, FamilyInsert, MemberInsert } from "@/types/database"
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

  // Families for dropdown
  const [families, setFamilies] = useState<Family[]>([])
  const [loadingFamilies, setLoadingFamilies] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchFamilies = useCallback(async () => {
    setLoadingFamilies(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("families")
      .select("*")
      .eq("is_active", true)
      .order("family_name", { ascending: true })
    if (data) setFamilies(data)
    setLoadingFamilies(false)
  }, [])

  // Load families when dialog opens, before pre-filling form
  useEffect(() => {
    if (open) {
      fetchFamilies()
    }
  }, [open, fetchFamilies])

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
    } else if (open && !member) {
      // Reset form for new member
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
    }
  }, [open, member])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First name and last name are required.")
      return
    }

    if (!familyId && !newFamilyName.trim()) {
      toast.error("Please select an existing family or enter a new family name.")
      return
    }

    setSaving(true)

    try {
      const supabase = createClient()
      let resolvedFamilyId = familyId

      // Create new family if needed
      if (isNewFamily && newFamilyName.trim()) {
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
      } else {
        const { error } = await supabase
          .from("members")
          .insert(memberData as never)

        if (error) {
          toast.error("Failed to create member: " + error.message)
          setSaving(false)
          return
        }
        toast.success("Member created successfully.")
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                required
              />
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
                value={familyId ?? undefined}
                onValueChange={(val) => setFamilyId(val as string)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a family" />
                </SelectTrigger>
                <SelectContent>
                  {families.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.family_name}
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
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
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
            <div className="flex items-center justify-between">
              <Label htmlFor="isNewcomer">Newcomer</Label>
              <Switch
                id="isNewcomer"
                checked={isNewcomer}
                onCheckedChange={(checked) => setIsNewcomer(checked)}
              />
            </div>
          </div>

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
