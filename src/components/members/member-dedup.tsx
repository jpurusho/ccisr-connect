"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { logAudit } from "@/lib/audit"
import type { Member } from "@/types/database"
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
import { Trash2, Merge, AlertTriangle } from "lucide-react"
import { formatPhone } from "@/lib/utils"

interface DuplicateGroup {
  key: string
  reason: string
  members: Member[]
}

interface MemberDedupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function MemberDedupDialog({ open, onOpenChange, onSuccess }: MemberDedupDialogProps) {
  const [groups, setGroups] = useState<DuplicateGroup[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    findDuplicates()
  }, [open])

  async function findDuplicates() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("members")
      .select("*")
      .order("full_name")
      .returns<Member[]>()

    if (!data) {
      setLoading(false)
      return
    }

    const dupes: DuplicateGroup[] = []
    const seen = new Set<string>()

    // Group by exact full_name match
    const byName = new Map<string, Member[]>()
    for (const m of data) {
      const key = m.full_name.toLowerCase().trim()
      if (!byName.has(key)) byName.set(key, [])
      byName.get(key)!.push(m)
    }
    for (const [key, members] of byName) {
      if (members.length > 1) {
        const groupKey = `name:${key}`
        seen.add(groupKey)
        dupes.push({ key: groupKey, reason: "Same name", members })
      }
    }

    // Group by email match (non-null)
    const byEmail = new Map<string, Member[]>()
    for (const m of data) {
      if (!m.email) continue
      const key = m.email.toLowerCase().trim()
      if (!byEmail.has(key)) byEmail.set(key, [])
      byEmail.get(key)!.push(m)
    }
    for (const [key, members] of byEmail) {
      if (members.length > 1) {
        const groupKey = `email:${key}`
        if (!seen.has(groupKey)) {
          seen.add(groupKey)
          dupes.push({ key: groupKey, reason: "Same email", members })
        }
      }
    }

    // Group by phone match (non-null, digits only)
    const byPhone = new Map<string, Member[]>()
    for (const m of data) {
      if (!m.cell_phone) continue
      const key = m.cell_phone.replace(/\D/g, "")
      if (key.length < 7) continue
      if (!byPhone.has(key)) byPhone.set(key, [])
      byPhone.get(key)!.push(m)
    }
    for (const [key, members] of byPhone) {
      if (members.length > 1) {
        const groupKey = `phone:${key}`
        if (!seen.has(groupKey)) {
          seen.add(groupKey)
          dupes.push({ key: groupKey, reason: "Same phone", members })
        }
      }
    }

    setGroups(dupes)
    setLoading(false)
  }

  async function deleteMember(memberId: string, memberName: string) {
    if (!confirm(`Permanently delete "${memberName}"?`)) return
    const supabase = createClient()
    const { error } = await supabase.from("members").delete().eq("id", memberId)
    if (error) {
      toast.error(`Failed: ${error.message}`)
    } else {
      toast.success(`${memberName} deleted`)
      logAudit("member_dedup_deleted", "members", memberId, { name: memberName })
      setGroups((prev) =>
        prev
          .map((g) => ({ ...g, members: g.members.filter((m) => m.id !== memberId) }))
          .filter((g) => g.members.length > 1)
      )
      onSuccess?.()
    }
  }

  async function deactivateMember(memberId: string, memberName: string) {
    const supabase = createClient()
    const { error } = await supabase.from("members").update({ is_active: false } as never).eq("id", memberId)
    if (error) {
      toast.error(`Failed: ${error.message}`)
    } else {
      toast.success(`${memberName} deactivated`)
      logAudit("member_dedup_deactivated", "members", memberId, { name: memberName })
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          members: g.members.map((m) => m.id === memberId ? { ...m, is_active: false } : m),
        }))
      )
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Merge className="size-5" />
            Find Duplicate Members
          </SheetTitle>
          <SheetDescription>
            Members matched by name, email, or phone number. Review and remove duplicates.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="space-y-3 px-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="py-8 text-center px-4">
            <p className="text-muted-foreground">No duplicates found.</p>
          </div>
        ) : (
          <div className="space-y-4 px-4">
            <p className="text-sm text-muted-foreground">
              {groups.length} potential duplicate group{groups.length !== 1 ? "s" : ""} found
            </p>
            {groups.map((group) => (
              <div key={group.key} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-amber-500" />
                  <Badge variant="outline">{group.reason}</Badge>
                </div>
                {group.members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/30 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{m.full_name}</span>
                        <Badge variant={m.is_active ? "default" : "outline"} className="text-[10px]">
                          {m.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] capitalize">{m.role_in_family}</Badge>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                        {m.email && <span>{m.email}</span>}
                        {m.cell_phone && <span>{formatPhone(m.cell_phone)}</span>}
                        {m.birth_month && m.birth_day && <span>DOB: {m.birth_month}/{m.birth_day}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {m.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deactivateMember(m.id, m.full_name)}
                        >
                          Deactivate
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteMember(m.id, m.full_name)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <SheetFooter>
          <SheetClose render={<Button variant="outline" />}>Close</SheetClose>
          <Button variant="outline" onClick={findDuplicates} disabled={loading}>
            Re-scan
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
