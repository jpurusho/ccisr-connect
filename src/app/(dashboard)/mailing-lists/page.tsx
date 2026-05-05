"use client"

import { useEffect, useState, useCallback, useRef } from "react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Search,
  UserPlus,
  Inbox,
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

// ── Component ─────────────────────────────────────────────────────────────

export default function MailingListsPage() {
  // ---- List state ----
  const [lists, setLists] = useState<MailingListWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingList, setEditingList] = useState<MailingList | null>(null)
  const [saving, setSaving] = useState(false)

  // List form fields
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [googleGroupEmail, setGoogleGroupEmail] = useState("")

  // ---- Expansion + recipients ----
  const [expandedListId, setExpandedListId] = useState<string | null>(null)
  const [recipients, setRecipients] = useState<ListRecipient[]>([])
  const [recipientsLoading, setRecipientsLoading] = useState(false)

  // ---- Add recipients (flat state) ----
  const [addSearch, setAddSearch] = useState("")
  const [addEmails, setAddEmails] = useState("")
  const [addType, setAddType] = useState<RecipientType>("to")
  const [searchResults, setSearchResults] = useState<MemberOption[]>([])
  const [addingRecipient, setAddingRecipient] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // ---- Data fetching ----

  const fetchLists = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true)
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
    fetchLists(true)
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
      resetAddState()
    }
  }

  function resetAddState() {
    setAddSearch("")
    setAddEmails("")
    setAddType("to")
    setSearchResults([])
  }

  async function searchMembers(query: string) {
    setAddSearch(query)
    if (query.trim().length < 2) {
      setSearchResults([])
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

    setSearchResults(data ?? [])
  }

  async function addMemberRecipient(memberId: string) {
    if (!expandedListId) return
    setAddingRecipient(true)
    const supabase = createClient()

    const { error } = await supabase
      .from("mailing_list_members")
      .insert({
        mailing_list_id: expandedListId,
        recipient_type: addType,
        member_id: memberId,
      } as never)

    if (error) {
      toast.error(error.message.includes("duplicate")
        ? "This member is already in the list"
        : `Failed: ${error.message}`)
    } else {
      toast.success("Member added")
      const memberName = searchResults.find((m) => m.id === memberId)?.full_name
      const listName = lists.find((l) => l.id === expandedListId)?.name
      logAudit("mailing_list_member_added", "mailing_list_members", expandedListId, {
        member: memberName, list: listName, type: addType,
      })
      setAddSearch("")
      setSearchResults([])
      fetchRecipients(expandedListId)
      fetchLists()
    }
    setAddingRecipient(false)
  }

  async function addBulkEmails() {
    if (!expandedListId || !addEmails.trim()) return
    setAddingRecipient(true)
    const supabase = createClient()

    const emails = addEmails
      .split(/[,\n]/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && e.includes("@"))

    if (emails.length === 0) {
      toast.error("No valid email addresses found")
      setAddingRecipient(false)
      return
    }

    const payloads = emails.map((e) => ({
      mailing_list_id: expandedListId,
      recipient_type: addType,
      external_email: e,
    }))

    const { error } = await supabase
      .from("mailing_list_members")
      .insert(payloads as never[])

    if (error) {
      toast.error(error.message.includes("duplicate")
        ? "Some recipients already exist in the list"
        : `Failed: ${error.message}`)
    } else {
      toast.success(`${emails.length} recipient${emails.length > 1 ? "s" : ""} added`)
      const bulkListName = lists.find((l) => l.id === expandedListId)?.name
      logAudit("mailing_list_members_bulk_added", "mailing_list_members", expandedListId, {
        count: emails.length, list: bulkListName, type: addType,
      })
      setAddEmails("")
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
      setRecipients((prev) => prev.filter((r) => r.id !== recipientId))
      const removed = recipients.find((r) => r.id === recipientId)
      const removedName = removed?.member_name || removed?.external_email || recipientId
      const removeListName = lists.find((l) => l.id === expandedListId)?.name
      logAudit("mailing_list_member_removed", "mailing_list_members", expandedListId, { member: removedName, list: removeListName })
      fetchLists()
    }
  }

  async function updateRecipientType(recipientId: string, newType: RecipientType) {
    const supabase = createClient()
    const { error } = await supabase
      .from("mailing_list_members")
      .update({ recipient_type: newType } as never)
      .eq("id", recipientId)
    if (error) {
      toast.error(`Failed: ${error.message}`)
    } else {
      setRecipients((prev) =>
        prev.map((r) => r.id === recipientId ? { ...r, recipient_type: newType } : r)
      )
      toast.success(`Changed to ${newType.toUpperCase()}`)
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

  // ── Derived data ───────────────────────────────────────────────────────

  const toRecipients = recipients.filter((r) => r.recipient_type === "to")
  const ccRecipients = recipients.filter((r) => r.recipient_type === "cc")
  const bccRecipients = recipients.filter((r) => r.recipient_type === "bcc")

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
              <Card key={list.id}>
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
                  <CardContent className="border-t pt-4 space-y-4">
                    {recipientsLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-10 w-full" />
                        ))}
                      </div>
                    ) : (
                      <>
                        {/* ── Summary bar ── */}
                        {recipients.length > 0 && (
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span>{toRecipients.length} To</span>
                            <span>{ccRecipients.length} CC</span>
                            <span>{bccRecipients.length} BCC</span>
                            <span className="font-medium text-foreground">{recipients.length} total</span>
                          </div>
                        )}

                        {/* ── Add Recipients Area ── */}
                        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                          <div className="flex items-center gap-2">
                            <UserPlus className="size-4 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium">Add Recipients</span>
                            <div className="ml-auto">
                              <Select value={addType} onValueChange={(v) => setAddType(v as RecipientType)}>
                                <SelectTrigger className="h-7 w-20 text-xs px-2">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="to">To</SelectItem>
                                  <SelectItem value="cc">CC</SelectItem>
                                  <SelectItem value="bcc">BCC</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Member search */}
                          <div className="relative">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                              <Input
                                ref={searchRef}
                                value={addSearch}
                                onChange={(e) => searchMembers(e.target.value)}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                                placeholder="Search members by name..."
                                className="h-8 text-sm pl-8"
                                disabled={addingRecipient}
                              />
                            </div>
                            {searchFocused && addSearch.length >= 2 && (
                              <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-48 overflow-y-auto">
                                {searchResults.length > 0 ? (
                                  searchResults.map((m) => (
                                    <button
                                      key={m.id}
                                      type="button"
                                      className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => addMemberRecipient(m.id)}
                                      disabled={addingRecipient}
                                    >
                                      <span className="font-medium">{m.full_name}</span>
                                      <span className="text-xs text-muted-foreground">{m.email || "no email"}</span>
                                    </button>
                                  ))
                                ) : (
                                  <div className="px-3 py-3 text-center text-sm text-muted-foreground">
                                    No members found for &ldquo;{addSearch}&rdquo;
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Bulk email input */}
                          <div className="space-y-1.5">
                            <div className="flex gap-2">
                              <Input
                                value={addEmails}
                                onChange={(e) => setAddEmails(e.target.value)}
                                placeholder="Add emails (comma separated)"
                                className="h-8 text-sm flex-1"
                                disabled={addingRecipient}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && addEmails.trim()) {
                                    e.preventDefault()
                                    addBulkEmails()
                                  }
                                }}
                              />
                              <Button
                                size="sm"
                                className="h-8"
                                disabled={!addEmails.trim() || addingRecipient}
                                onClick={addBulkEmails}
                              >
                                {addingRecipient ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Plus className="size-3.5" />
                                )}
                                Add
                              </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              Paste multiple emails separated by commas or newlines
                            </p>
                          </div>
                        </div>

                        {/* ── Flat recipient list ── */}
                        {recipients.length === 0 ? (
                          <div className="flex flex-col items-center gap-2 py-6 text-center">
                            <Inbox className="size-8 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground">
                              No recipients yet
                            </p>
                            <p className="text-xs text-muted-foreground/70">
                              Search for members or add email addresses above
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {recipients.map((r) => (
                              <Badge
                                key={r.id}
                                variant="secondary"
                                className="gap-1 pr-1 font-normal"
                              >
                                <select
                                  value={r.recipient_type}
                                  onChange={(e) =>
                                    updateRecipientType(r.id, e.target.value as RecipientType)
                                  }
                                  className="h-4 rounded border-none bg-primary/10 text-[10px] font-semibold uppercase text-primary outline-none cursor-pointer px-0.5"
                                  title="Change recipient type"
                                >
                                  <option value="to">TO</option>
                                  <option value="cc">CC</option>
                                  <option value="bcc">BCC</option>
                                </select>
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
                      </>
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
                Optional — emails sent to this list will also go to the Google Group address.
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
