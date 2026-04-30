"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { logAudit } from "@/lib/audit"
import { formatPhone } from "@/lib/utils"
import type { Member, Family, Address, WeddingAnniversary, Tag } from "@/types/database"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { MemberFormDialog } from "@/components/members/member-form-dialog"
import { toast } from "sonner"
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Cake,
  Heart,
  Users,
  Loader2,
  Tag as TagIcon,
  History,
} from "lucide-react"
import Link from "next/link"

type MemberDetail = Member & {
  families: Family | null
}

import { MONTH_NAMES_FULL as MONTH_NAMES } from "@/lib/date-utils"

export default function MemberDetailPage() {
  const params = useParams()
  const router = useRouter()
  const memberId = params.id as string

  const [member, setMember] = useState<MemberDetail | null>(null)
  const [familyMembers, setFamilyMembers] = useState<Member[]>([])
  const [address, setAddress] = useState<Address | null>(null)
  const [anniversary, setAnniversary] = useState<WeddingAnniversary | null>(null)
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false)
  const [permanentDeleteConfirmName, setPermanentDeleteConfirmName] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [permanentlyDeleting, setPermanentlyDeleting] = useState(false)
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [memberTagIds, setMemberTagIds] = useState<Set<string>>(new Set())
  const [togglingTagId, setTogglingTagId] = useState<string | null>(null)
  const [tagHistory, setTagHistory] = useState<{ action: string; tag_name: string; created_at: string }[]>([])
  const [showTagHistory, setShowTagHistory] = useState(false)

  const fetchMember = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    // Fetch the member with their family
    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .select("*, families(*)")
      .eq("id", memberId)
      .single()

    if (memberError || !memberData) {
      setLoading(false)
      return
    }

    const detail = memberData as MemberDetail
    setMember(detail)

    // Fetch related data in parallel
    const [familyMembersResult, addressResult, anniversaryResult, tagsResult, memberTagsResult, tagHistoryResult] =
      await Promise.all([
        supabase
          .from("members")
          .select("*")
          .eq("family_id", detail.family_id)
          .neq("id", memberId)
          .order("role_in_family", { ascending: true }),
        supabase
          .from("addresses")
          .select("*")
          .eq("family_id", detail.family_id)
          .eq("is_current", true)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("wedding_anniversaries")
          .select("*")
          .eq("family_id", detail.family_id)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("tags")
          .select("*")
          .order("name"),
        supabase
          .from("member_tags")
          .select("tag_id")
          .eq("member_id", memberId),
        supabase
          .from("audit_log")
          .select("action, changes, created_at")
          .eq("entity_type", "member_tags")
          .eq("entity_id", memberId)
          .in("action", ["tag_added", "tag_removed"])
          .order("created_at", { ascending: false })
          .limit(50),
      ])

    if (familyMembersResult.data) {
      setFamilyMembers(familyMembersResult.data)
    }
    if (addressResult.data) {
      setAddress(addressResult.data)
    }
    if (anniversaryResult.data) {
      setAnniversary(anniversaryResult.data)
    }
    if (tagsResult.data) {
      setAvailableTags(tagsResult.data as Tag[])
    }
    if (memberTagsResult.data) {
      setMemberTagIds(new Set(memberTagsResult.data.map((mt: { tag_id: string }) => mt.tag_id)))
    }
    if (tagHistoryResult.data) {
      setTagHistory(
        tagHistoryResult.data.map((row: { action: string; changes: Record<string, unknown> | null; created_at: string }) => ({
          action: row.action,
          tag_name: (row.changes?.tag_name as string) ?? (row.changes?.tag as string) ?? "Unknown",
          created_at: row.created_at,
        }))
      )
    }

    setLoading(false)
  }, [memberId])

  useEffect(() => {
    fetchMember()
  }, [fetchMember])

  async function handleDelete() {
    if (!member) return
    setDeleting(true)

    const supabase = createClient()
    const { error } = await supabase
      .from("members")
      .update({ is_active: false } as never)
      .eq("id", member.id)

    if (error) {
      toast.error("Failed to deactivate member: " + error.message)
      setDeleting(false)
      return
    }

    toast.success(`${member.full_name} has been marked as inactive.`)
    logAudit("member_deleted", "members", member.id, { name: member.full_name })
    setDeleteDialogOpen(false)
    setDeleting(false)
    router.push("/members")
  }

  async function handlePermanentDelete() {
    if (!member) return
    setPermanentlyDeleting(true)

    const supabase = createClient()

    // Check if this is the last member in the family
    const { count } = await supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("family_id", member.family_id)

    const { error } = await supabase
      .from("members")
      .delete()
      .eq("id", member.id)

    if (error) {
      toast.error("Failed to permanently delete member: " + error.message)
      setPermanentlyDeleting(false)
      return
    }

    // Clean up empty family
    if (count !== null && count <= 1) {
      await supabase.from("families").delete().eq("id", member.family_id)
      logAudit("family_auto_deleted", "families", member.family_id, {
        reason: "last_member_deleted",
        family_name: member.families?.family_name,
      })
    }

    toast.success(`${member.full_name} has been permanently deleted.`)
    logAudit("member_permanently_deleted", "members", member.id, { name: member.full_name })
    setPermanentDeleteDialogOpen(false)
    setPermanentlyDeleting(false)
    router.push("/members")
  }

  async function handleTagToggle(tagId: string) {
    if (!member) return
    setTogglingTagId(tagId)

    const supabase = createClient()
    const hasTag = memberTagIds.has(tagId)

    if (hasTag) {
      const { error } = await supabase
        .from("member_tags")
        .delete()
        .eq("member_id", member.id)
        .eq("tag_id", tagId)

      if (error) {
        toast.error("Failed to remove tag: " + error.message)
        setTogglingTagId(null)
        return
      }

      setMemberTagIds((prev) => {
        const next = new Set(prev)
        next.delete(tagId)
        return next
      })
      const tag = availableTags.find((t) => t.id === tagId)
      logAudit("tag_removed", "member_tags", member.id, { tag_name: tag?.name })
    } else {
      const { error } = await supabase
        .from("member_tags")
        .insert({ member_id: member.id, tag_id: tagId } as never)

      if (error) {
        toast.error("Failed to add tag: " + error.message)
        setTogglingTagId(null)
        return
      }

      setMemberTagIds((prev) => new Set(prev).add(tagId))
      const tag = availableTags.find((t) => t.id === tagId)
      logAudit("tag_added", "member_tags", member.id, { tag_name: tag?.name })
    }

    setTogglingTagId(null)
  }

  function handleEditSuccess() {
    fetchMember()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-medium">Member not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This member may have been removed or the link is invalid.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          render={<Link href="/members" />}
        >
          Back to Members
        </Button>
      </div>
    )
  }

  const birthday =
    member.birth_month && member.birth_day
      ? `${MONTH_NAMES[member.birth_month]} ${member.birth_day}${member.birth_year ? `, ${member.birth_year}` : ""}`
      : null

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {member.full_name}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {member.role_in_family}
              </Badge>
              {member.is_active ? (
                <Badge variant="default">Active</Badge>
              ) : (
                <Badge variant="outline">Inactive</Badge>
              )}
              {/* Newcomer shown via tags */}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Pencil className="size-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="size-4" />
            Deactivate
          </Button>
          <Button
            variant="outline"
            className="border-destructive text-destructive hover:bg-destructive/10"
            onClick={() => {
              setPermanentDeleteConfirmName("")
              setPermanentDeleteDialogOpen(true)
            }}
          >
            <Trash2 className="size-4" />
            Delete Permanently
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {member.cell_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Cell Phone</p>
                    <p className="text-sm text-muted-foreground">
                      {formatPhone(member.cell_phone)}
                    </p>
                  </div>
                </div>
              )}
              {member.email && (
                <div className="flex items-center gap-3">
                  <Mail className="size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">
                      {member.email}
                    </p>
                  </div>
                </div>
              )}
              {birthday && (
                <div className="flex items-center gap-3">
                  <Cake className="size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Birthday</p>
                    <p className="text-sm text-muted-foreground">{birthday}</p>
                  </div>
                </div>
              )}
              {address && (
                <div className="flex items-center gap-3">
                  <MapPin className="size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Address</p>
                    <p className="text-sm text-muted-foreground">
                      {address.full_address ??
                        [address.street, address.city, address.state, address.zip]
                          .filter(Boolean)
                          .join(", ")}
                    </p>
                  </div>
                </div>
              )}
              {!member.cell_phone &&
                !member.email &&
                !birthday &&
                !address && (
                  <p className="text-sm text-muted-foreground">
                    No contact information available.
                  </p>
                )}
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        {availableTags.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TagIcon className="size-4" />
                Tags
              </CardTitle>
              <CardDescription>
                Click a tag to toggle it on or off for this member.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => {
                  const isActive = memberTagIds.has(tag.id)
                  const isToggling = togglingTagId === tag.id
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      disabled={isToggling}
                      onClick={() => handleTagToggle(tag.id)}
                      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50"
                      style={
                        isActive
                          ? {
                              backgroundColor: tag.color + "20",
                              borderColor: tag.color,
                              color: tag.color,
                            }
                          : {
                              borderColor: "var(--border)",
                              color: "var(--muted-foreground)",
                            }
                      }
                    >
                      {isToggling ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <span
                          className="inline-block size-2 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                      )}
                      {tag.name}
                    </button>
                  )
                })}
              </div>
              {tagHistory.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <button
                    type="button"
                    onClick={() => setShowTagHistory((prev) => !prev)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <History className="size-3" />
                    {showTagHistory ? "Hide" : "Show"} tag history ({tagHistory.length})
                  </button>
                  {showTagHistory && (
                    <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                      {tagHistory.map((entry, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className={entry.action === "tag_added" ? "text-green-600" : "text-red-500"}>
                            {entry.action === "tag_added" ? "+" : "−"}
                          </span>
                          <span className="font-medium">{entry.tag_name}</span>
                          <span className="text-muted-foreground">
                            {new Date(entry.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Family Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4" />
              {member.families?.family_name ?? "Family"}
            </CardTitle>
            {member.families?.home_phone && (
              <CardDescription className="flex items-center gap-1.5">
                <Phone className="size-3.5" />
                Home: {formatPhone(member.families.home_phone)}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {familyMembers.length > 0 ? (
                familyMembers.map((fm) => (
                  <div
                    key={fm.id}
                    className="flex cursor-pointer items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50"
                    onClick={() => router.push(`/members/${fm.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block size-2 rounded-full ${fm.is_active ? "bg-green-500" : "bg-gray-400"}`}
                      />
                      <span className="text-sm font-medium">
                        {fm.full_name}
                      </span>
                      <Badge
                        variant="secondary"
                        className="capitalize"
                      >
                        {fm.role_in_family}
                      </Badge>
                    </div>
                    {fm.cell_phone && (
                      <span className="text-xs text-muted-foreground">
                        {formatPhone(fm.cell_phone)}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No other family members.
                </p>
              )}

              {anniversary && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2 text-sm">
                    <Heart className="size-4 text-pink-500" />
                    <span className="text-muted-foreground">
                      Wedding Anniversary:{" "}
                      {MONTH_NAMES[anniversary.anniversary_month]}{" "}
                      {anniversary.anniversary_day}
                      {anniversary.anniversary_year
                        ? `, ${anniversary.anniversary_year}`
                        : ""}
                    </span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {member.notes && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {member.notes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Newcomer info */}
        {/* Metadata */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span>
                Created:{" "}
                {new Date(member.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span>
                Last updated:{" "}
                {new Date(member.updated_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <MemberFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        member={member}
        onSuccess={handleEditSuccess}
      />

      {/* Deactivate Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Deactivate Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate{" "}
              <span className="font-medium text-foreground">
                {member.full_name}
              </span>
              ? They will be marked as inactive but their data will be
              preserved. This action can be reversed by editing the member.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="animate-spin" />}
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Confirmation Dialog */}
      <Dialog open={permanentDeleteDialogOpen} onOpenChange={setPermanentDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Permanently</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                {member.full_name}
              </span>{" "}
              and all their data (including tags and mailing list memberships).
              {anniversary && " The wedding anniversary record will also be removed."}
              {familyMembers.length === 0 && " Since this is the only member, the family record will also be deleted."}
              {" "}This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm text-muted-foreground">
              Type <span className="font-semibold text-foreground">{member.full_name}</span> to confirm:
            </p>
            <Input
              value={permanentDeleteConfirmName}
              onChange={(e) => setPermanentDeleteConfirmName(e.target.value)}
              placeholder={member.full_name}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPermanentDeleteDialogOpen(false)}
              disabled={permanentlyDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handlePermanentDelete}
              disabled={permanentlyDeleting || permanentDeleteConfirmName !== member.full_name}
            >
              {permanentlyDeleting && <Loader2 className="animate-spin" />}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
