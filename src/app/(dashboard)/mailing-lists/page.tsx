"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { logAudit } from "@/lib/audit"
import type { MailingList, RecipientType } from "@/types/database"
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
import {
  Plus,
  Mail,
  Users,
  Trash2,
  Pencil,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────

interface MailingListWithCount extends MailingList {
  member_count: number
}

interface ListRecipient {
  id: string
  member_id: string | null
  external_email: string | null
  recipient_type: RecipientType
  member_name?: string
  member_email?: string
}

interface MemberOption {
  id: string
  full_name: string
  email: string | null
}

const RECIPIENT_SECTIONS: { value: RecipientType; label: string; description: string }[] = [
  { value: "to", label: "To", description: "Primary recipients" },
  { value: "cc", label: "CC", description: "Carbon copy" },
  { value: "bcc", label: "BCC", description: "Blind carbon copy" },
]

// ── Component ─────────────────────────────────────────────────────────────

export default function MailingListsPage() {
  const [lists, setLists] = useState<MailingListWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingList, setEditingList] = useState<MailingList | null>(null)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [googleGroupEmail, setGoogleGroupEmail] = useState("")

  const [expandedListId, setExpandedListId] = useState<string | null>(null)
  const [recipients, setRecipients] = useState<ListRecipient[]>([])
  const [recipientsLoading, setRecipientsLoading] = useState(false)

  const [addSearches, setAddSearches] = useState<Record<string, string>>({})
  const [addEmails, setAddEmails] = useState<Record<string, string>>({})
  const [addModes, setAddModes] = useState<Record<string, "member" | "external">>({})
  const [searchResults, setSearchResults] = useState<Record<string, MemberOption[]>>({})
  const [addingRecipient, setAddingRecipient] = useState(false)

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

  // ── Recipient management ────────────────────────────────────────────────

  async function fetchRecipients(listId: string) {
    setRecipientsLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("mailing_list_members")
      .select("id, member_id, external_email, recipient_type, members(full_name, email)")
      .eq("mailing_list_id", listId)
      .order("created_at", { ascending: true })

    if (data) {
      setRecipients(
        (data as unknown as Array<{
          id: string
          member_id: string | null
          external_email: string | null
          recipient_type: RecipientType
          members: { full_name: string; email: string | null } | null
        }>).map((r) => ({
          id: r.id,
          member_id: r.member_id,
          external_email: r.external_email,
          recipient_type: r.recipient_type,
          member_name: r.members?.full_name,
          member_email: r.members?.email ?? undefined,
        }))
      )
    }
    setRecipientsLoading(false)
  }

  function toggleExpand(listId: string) {
    if (expandedListId === listId) {
      setExpandedListId(null)
      setRecipients([])
    } else {
      setExpandedListId(listId)
      fetchRecipients(listId)
    }
  }

  async function searchMembers(query: string, sectionKey: string) {
    setAddSearches((prev) => ({ ...prev, [sectionKey]: query }))
    if (query.trim().length < 2) {
      setSearchResults((prev) => ({ ...prev, [sectionKey]: [] }))
      return
    }
    const supabase = createClient()
    const { data } = await supabase
      .from("members")
      .select("id, full_name, email")
      .eq("is_active", true)
      .ilike("full_name", `%${query.trim()}%`)
      .limit(10)
      .returns<MemberOption[]>()

    setSearchResults((prev) => ({ ...prev, [sectionKey]: data ?? [] }))
  }

  async function addRecipient(type: RecipientType, memberId?: string, email?: string) {
    if (!expandedListId) return
    setAddingRecipient(true)
    const supabase = createClient()

    const payload: Record<string, unknown> = {
      mailing_list_id: expandedListId,
      recipient_type: type,
    }
    if (memberId) {
      payload.member_id = memberId
    } else if (email) {
      payload.external_email = email.trim()
    } else {
      setAddingRecipient(false)
      return
    }

    const { error } = await supabase
      .from("mailing_list_members")
      .insert(payload as never)

    if (error) {
      toast.error(error.message.includes("duplicate")
        ? "This recipient is already in the list"
        : `Failed: ${error.message}`)
    } else {
      toast.success("Recipient added")
      logAudit("mailing_list_member_added", "mailing_list_members", expandedListId, {
        memberId, email, type,
      })
      setAddSearches((prev) => ({ ...prev, [type]: "" }))
      setAddEmails((prev) => ({ ...prev, [type]: "" }))
      setSearchResults((prev) => ({ ...prev, [type]: [] }))
      fetchRecipients(expandedListId)
      fetchLists()
    }
    setAddingRecipient(false)
  }

  async function removeRecipient(recipientId: string) {
    if (!expandedListId) return
    const supabase = createClient()
    const { error } = await supabase
      .from("mailing_list_members")
      .delete()
      .eq("id", recipientId)

    if (error) {
      toast.error(`Failed: ${error.message}`)
    } else {
      toast.success("Recipient removed")
      logAudit("mailing_list_member_removed", "mailing_list_members", expandedListId, { recipientId })
      fetchRecipients(expandedListId)
      fetchLists()
    }
  }

  // ── List CRUD ───────────────────────────────────────────────────────────

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
        logAudit("mailing_list_updated", "mailing_lists", editingList.id, { name })
      } else {
        const { error } = await supabase
          .from("mailing_lists")
          .insert(payload as never)
        if (error) {
          toast.error(`Create failed: ${error.message}`)
          return
        }
        toast.success("Mailing list created")
        logAudit("mailing_list_created", "mailing_lists", null, { name })
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
    if (!confirm(`Delete mailing list "${list.name}"? This will also remove all recipients.`))
      return

    const supabase = createClient()
    const { error } = await supabase
      .from("mailing_lists")
      .delete()
      .eq("id", list.id)

    if (error) {
      toast.error(`Delete failed: ${error.message}`)
    } else {
      toast.success(`"${list.name}" deleted`)
      logAudit("mailing_list_deleted", "mailing_lists", list.id, { name: list.name })
      if (expandedListId === list.id) setExpandedListId(null)
      fetchLists()
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

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
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
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
        <div className="space-y-4">
          {lists.map((list) => {
            const isExpanded = expandedListId === list.id

            return (
              <Card key={list.id} className={isExpanded ? "overflow-visible" : ""}>
                <CardHeader
                  className="cursor-pointer"
                  onClick={() => toggleExpand(list.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{list.name}</CardTitle>
                      {list.description && (
                        <CardDescription className="mt-0.5">
                          {list.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="gap-1">
                        <Users className="size-3" />
                        {list.member_count}
                      </Badge>
                      {list.google_group_email && (
                        <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                          Google Group
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => { e.stopPropagation(); openDialog(list) }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => { e.stopPropagation(); deleteList(list) }}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                      {isExpanded ? (
                        <ChevronUp className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="border-t pt-4">
                    {recipientsLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-10 w-full" />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {RECIPIENT_SECTIONS.map((section) => {
                          const type = section.value
                          const typeRecipients = recipients.filter((r) => r.recipient_type === type)
                          const mode = addModes[type] ?? "member"
                          const search = addSearches[type] ?? ""
                          const email = addEmails[type] ?? ""
                          const results = searchResults[type] ?? []

                          return (
                            <div key={type} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-sm font-semibold">{section.label}</span>
                                  <span className="ml-2 text-xs text-muted-foreground">{section.description}</span>
                                  {typeRecipients.length > 0 && (
                                    <Badge variant="secondary" className="ml-2 text-xs">
                                      {typeRecipients.length}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant={mode === "member" ? "default" : "ghost"}
                                    size="sm"
                                    className="h-6 text-xs px-2"
                                    onClick={() => setAddModes((prev) => ({ ...prev, [type]: "member" }))}
                                  >
                                    Member
                                  </Button>
                                  <Button
                                    variant={mode === "external" ? "default" : "ghost"}
                                    size="sm"
                                    className="h-6 text-xs px-2"
                                    onClick={() => setAddModes((prev) => ({ ...prev, [type]: "external" }))}
                                  >
                                    Email
                                  </Button>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                {mode === "member" ? (
                                  <div className="relative flex-1">
                                    <Input
                                      value={search}
                                      onChange={(e) => searchMembers(e.target.value, type)}
                                      placeholder="Search member..."
                                      className="h-8 text-sm"
                                    />
                                    {results.length > 0 && (
                                      <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-48 overflow-y-auto">
                                        {results.map((m) => (
                                          <button
                                            key={m.id}
                                            type="button"
                                            className="flex w-full items-center justify-between px-3 py-1.5 text-sm hover:bg-accent text-left"
                                            onClick={() => addRecipient(type, m.id)}
                                            disabled={addingRecipient}
                                          >
                                            <span className="font-medium">{m.full_name}</span>
                                            <span className="text-xs text-muted-foreground">{m.email || "no email"}</span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <>
                                    <Input
                                      type="email"
                                      value={email}
                                      onChange={(e) => setAddEmails((prev) => ({ ...prev, [type]: e.target.value }))}
                                      placeholder="email@example.com"
                                      className="h-8 text-sm flex-1"
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" && email.trim()) {
                                          e.preventDefault()
                                          addRecipient(type, undefined, email)
                                        }
                                      }}
                                    />
                                    <Button
                                      size="sm"
                                      className="h-8"
                                      disabled={!email.trim() || addingRecipient}
                                      onClick={() => addRecipient(type, undefined, email)}
                                    >
                                      <Plus className="size-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>

                              {typeRecipients.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {typeRecipients.map((r) => (
                                    <Badge
                                      key={r.id}
                                      variant="secondary"
                                      className="gap-1 pr-1 font-normal"
                                    >
                                      <span className="max-w-40 truncate">
                                        {r.member_name || r.external_email}
                                      </span>
                                      {r.member_name && r.member_email && (
                                        <span className="text-[10px] opacity-60 hidden sm:inline">
                                          {r.member_email}
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => removeRecipient(r.id)}
                                        className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                                      >
                                        <X className="size-3" />
                                      </button>
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}

                        {recipients.length === 0 && (
                          <p className="text-center text-sm text-muted-foreground py-2">
                            No recipients yet. Add members or emails to any field above.
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Create/Edit List Dialog */}
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
                type="text"
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
