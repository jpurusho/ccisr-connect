"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { MailingList } from "@/types/database"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Plus, Mail, Users, Trash2, Pencil, Loader2 } from "lucide-react"

interface MailingListWithCount extends MailingList {
  member_count: number
}

export default function MailingListsPage() {
  const [lists, setLists] = useState<MailingListWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingList, setEditingList] = useState<MailingList | null>(null)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [googleGroupEmail, setGoogleGroupEmail] = useState("")

  const fetchLists = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("mailing_lists")
      .select("*, mailing_list_members(id)")
      .order("name", { ascending: true })

    if (data) {
      setLists(
        data.map((l: Record<string, unknown>) => ({
          ...(l as MailingList),
          member_count: Array.isArray(l.mailing_list_members)
            ? l.mailing_list_members.length
            : 0,
        }))
      )
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchLists()
  }, [fetchLists])

  function openDialog(list?: MailingList) {
    if (list) {
      setEditingList(list)
      setName(list.name)
      setDescription(list.description ?? "")
      setGoogleGroupEmail(list.google_group_email ?? "")
    } else {
      setEditingList(null)
      setName("")
      setDescription("")
      setGoogleGroupEmail("")
    }
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Name is required")
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        google_group_email: googleGroupEmail.trim() || null,
      }

      if (editingList) {
        const { error } = await supabase
          .from("mailing_lists")
          .update(payload as never)
          .eq("id", editingList.id)
        if (error) {
          toast.error(`Update failed: ${error.message}`)
          return
        }
        toast.success("Mailing list updated")
      } else {
        const { error } = await supabase
          .from("mailing_lists")
          .insert(payload as never)
        if (error) {
          toast.error(`Create failed: ${error.message}`)
          return
        }
        toast.success("Mailing list created")
      }

      setDialogOpen(false)
      fetchLists()
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setSaving(false)
    }
  }

  async function deleteList(list: MailingList) {
    if (!confirm(`Delete mailing list "${list.name}"? This will also remove all member assignments.`)) return

    const supabase = createClient()
    const { error } = await supabase
      .from("mailing_lists")
      .delete()
      .eq("id", list.id)

    if (error) {
      toast.error(`Delete failed: ${error.message}`)
    } else {
      toast.success(`"${list.name}" deleted`)
      fetchLists()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mailing Lists</h1>
          <p className="text-muted-foreground">
            Manage recipient groups for email dispatches.
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="size-4" />
          Create List
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : lists.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Mail className="size-10 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No mailing lists yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create lists to organize recipients for your email dispatches.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <Card key={list.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{list.name}</CardTitle>
                    {list.description && (
                      <CardDescription>{list.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openDialog(list)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => deleteList(list)}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Users className="size-4" />
                    <span>{list.member_count} recipient{list.member_count !== 1 ? "s" : ""}</span>
                  </div>
                  {list.google_group_email && (
                    <Badge variant="outline" className="text-xs">
                      Google Group
                    </Badge>
                  )}
                </div>
                {list.google_group_email && (
                  <p className="mt-2 text-xs text-muted-foreground truncate">
                    {list.google_group_email}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingList ? "Edit Mailing List" : "Create Mailing List"}
            </DialogTitle>
            <DialogDescription>
              {editingList
                ? "Update mailing list details."
                : "Create a new recipient group for email dispatches."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="listName">Name *</Label>
              <Input
                id="listName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Bulletin Recipients"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="listDesc">Description</Label>
              <Textarea
                id="listDesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="googleGroup">Google Group Email</Label>
              <Input
                id="googleGroup"
                type="email"
                value={googleGroupEmail}
                onChange={(e) => setGoogleGroupEmail(e.target.value)}
                placeholder="group@googlegroups.com"
              />
              <p className="text-xs text-muted-foreground">
                Optional — link a Google Group to this mailing list.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                {editingList ? "Save Changes" : "Create List"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
