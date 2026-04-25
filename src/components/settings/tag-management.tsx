"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { logAudit } from "@/lib/audit"
import type { Tag } from "@/types/database"
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
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Plus, Trash2, Pencil, Tag as TagIcon, Check, X } from "lucide-react"

const PRESET_COLORS = [
  "#F59E0B", "#0D9488", "#8B5CF6", "#059669", "#EC4899",
  "#3B82F6", "#EF4444", "#F97316", "#6B7280", "#DC2626",
]

export function TagManagementPanel() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState("#3B82F6")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("")

  const fetchTags = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("tags")
      .select("*")
      .order("name")
      .returns<Tag[]>()
    if (data) setTags(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  async function handleCreate() {
    if (!newName.trim()) {
      toast.error("Tag name is required")
      return
    }
    const supabase = createClient()
    const { error } = await supabase.from("tags").insert({
      name: newName.trim(),
      color: newColor,
    } as never)

    if (error) {
      toast.error(error.message.includes("unique") ? "Tag already exists" : `Failed: ${error.message}`)
    } else {
      toast.success(`Tag "${newName.trim()}" created`)
      logAudit("tag_created", "tags", null, { name: newName.trim(), color: newColor })
      setNewName("")
      fetchTags()
    }
  }

  function startEdit(tag: Tag) {
    setEditingId(tag.id)
    setEditName(tag.name)
    setEditColor(tag.color)
  }

  async function handleUpdate() {
    if (!editingId || !editName.trim()) return
    const supabase = createClient()
    const { error } = await supabase
      .from("tags")
      .update({ name: editName.trim(), color: editColor } as never)
      .eq("id", editingId)

    if (error) {
      toast.error(`Failed: ${error.message}`)
    } else {
      toast.success("Tag updated")
      logAudit("tag_updated", "tags", editingId, { name: editName.trim(), color: editColor })
      setEditingId(null)
      fetchTags()
    }
  }

  async function handleDelete(tag: Tag) {
    if (!confirm(`Delete tag "${tag.name}"? It will be removed from all members.`)) return
    const supabase = createClient()
    const { error } = await supabase.from("tags").delete().eq("id", tag.id)

    if (error) {
      toast.error(`Failed: ${error.message}`)
    } else {
      toast.success(`Tag "${tag.name}" deleted`)
      logAudit("tag_deleted", "tags", tag.id, { name: tag.name })
      fetchTags()
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Create tags to categorize members. Tags can be used to filter and export member lists.
      </p>

      {/* Create new tag */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Tag</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-40 space-y-1.5">
              <Label htmlFor="tag-name">Name</Label>
              <Input
                id="tag-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Youth Group"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex items-center gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`size-6 rounded-full border-2 transition-transform hover:scale-110 ${newColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setNewColor(c)}
                  />
                ))}
                <Input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="h-6 w-8 cursor-pointer rounded border p-0"
                />
              </div>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="size-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tag list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TagIcon className="size-4" />
            Tags
          </CardTitle>
          <CardDescription>{tags.length} tag{tags.length !== 1 ? "s" : ""}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : tags.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No tags yet. Create one above.
            </p>
          ) : (
            <div className="space-y-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2"
                >
                  {editingId === tag.id ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={`size-5 rounded-full border-2 ${editColor === c ? "border-foreground" : "border-transparent"}`}
                            style={{ backgroundColor: c }}
                            onClick={() => setEditColor(c)}
                          />
                        ))}
                      </div>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 flex-1"
                        onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
                        autoFocus
                      />
                      <Button variant="ghost" size="icon-sm" onClick={handleUpdate}>
                        <Check className="size-3.5 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditingId(null)}>
                        <X className="size-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div
                        className="size-4 shrink-0 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="flex-1 text-sm font-medium">{tag.name}</span>
                      <Button variant="ghost" size="icon-sm" onClick={() => startEdit(tag)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(tag)}>
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
