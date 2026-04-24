"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { Member, Family, Address, WeddingAnniversary } from "@/types/database"
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
} from "lucide-react"
import Link from "next/link"

type MemberDetail = Member & {
  families: Family | null
}

const MONTH_NAMES = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

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
  const [deleting, setDeleting] = useState(false)

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
    const [familyMembersResult, addressResult, anniversaryResult] =
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
    setDeleteDialogOpen(false)
    setDeleting(false)
    router.push("/members")
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
          <ArrowLeft className="size-4" />
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
          <Button
            variant="ghost"
            size="icon"
            render={<Link href="/members" />}
          >
            <ArrowLeft />
          </Button>
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
              {member.is_newcomer && (
                <Badge variant="secondary">Newcomer</Badge>
              )}
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
                      {member.cell_phone}
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
                Home: {member.families.home_phone}
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
                        {fm.cell_phone}
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
        {member.is_newcomer && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Newcomer Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Date:</span>
                  <span className="text-muted-foreground">
                    {member.newcomer_date ?? "Not recorded"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Acknowledged:</span>
                  <Badge
                    variant={
                      member.newcomer_acknowledged ? "default" : "outline"
                    }
                  >
                    {member.newcomer_acknowledged ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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

      {/* Delete Confirmation Dialog */}
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
    </div>
  )
}
