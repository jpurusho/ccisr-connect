"use client"

import { useState } from "react"
import { format, parse } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Expand, ImagePlus, Loader2, Minimize2, Plus, RefreshCw, Trash2 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"
import { formatPhone } from "@/lib/utils"
import { VerseLookup } from "@/components/shared/verse-lookup"
import type { BirthdayEntry, AnniversaryEntry } from "@/lib/email/card-builder"
import { PASTEL_BORDER_MAP } from "@/lib/email/card-builder"

interface FamilySearchResult {
  id: string
  family_name: string
  home_phone: string | null
  full_address: string | null
  street: string | null
  city: string | null
  state: string | null
  zip: string | null
}

export function HostFamilyInput({
  value,
  onChange,
  onSelect,
}: {
  value: string
  onChange: (v: string) => void
  onSelect: (family: FamilySearchResult) => void
}) {
  const [results, setResults] = useState<FamilySearchResult[]>([])
  const [showResults, setShowResults] = useState(false)

  async function handleSearch(query: string) {
    onChange(query)
    if (query.trim().length < 2) {
      setResults([])
      setShowResults(false)
      return
    }
    const supabase = createClient()
    const { data } = await supabase
      .from("families")
      .select("id, family_name, home_phone, addresses(full_address, street, city, state, zip, is_current), members(cell_phone, role_in_family)")
      .eq("is_active", true)
      .ilike("family_name", `%${query.trim()}%`)
      .limit(8)

    if (data) {
      const mapped: FamilySearchResult[] = (data as unknown as Array<{
        id: string
        family_name: string
        home_phone: string | null
        addresses: Array<{ full_address: string; street: string | null; city: string | null; state: string | null; zip: string | null; is_current: boolean }>
        members: Array<{ cell_phone: string | null; role_in_family: string }> | null
      }>).map((f) => {
        const addr = f.addresses?.find((a) => a.is_current)
        const primaryMember = f.members?.find((m) => m.role_in_family === "husband") ?? f.members?.[0]
        const phone = f.home_phone || primaryMember?.cell_phone || null
        const address = addr?.full_address || [addr?.street, addr?.city, addr?.state, addr?.zip].filter(Boolean).join(", ") || null
        return {
          id: f.id,
          family_name: f.family_name,
          home_phone: phone,
          full_address: address,
          street: addr?.street ?? null,
          city: addr?.city ?? null,
          state: addr?.state ?? null,
          zip: addr?.zip ?? null,
        }
      })
      setResults(mapped)
      setShowResults(mapped.length > 0)
    }
  }

  return (
    <div className="relative">
      <Input
        placeholder="Type family name to search..."
        value={value}
        onChange={(e) => handleSearch(e.target.value)}
        onBlur={() => setTimeout(() => setShowResults(false), 200)}
        onFocus={() => results.length > 0 && setShowResults(true)}
      />
      {showResults && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-48 overflow-y-auto">
          {results.map((f) => (
            <button
              key={f.id}
              type="button"
              className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-accent"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect(f)
                setShowResults(false)
              }}
            >
              <span className="font-medium">{f.family_name}</span>
              {f.full_address && (
                <span className="text-xs text-muted-foreground truncate">{f.full_address}</span>
              )}
              {f.home_phone && (
                <span className="text-xs text-muted-foreground">{formatPhone(f.home_phone)}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Member Search Input (autocomplete from members DB)
// ---------------------------------------------------------------------------

export function MemberSearchInput({
  value,
  onChange,
  onMemberSelect,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  onMemberSelect?: (memberId: string) => void
  placeholder?: string
}) {
  const [results, setResults] = useState<{ id: string; full_name: string }[]>([])
  const [showResults, setShowResults] = useState(false)

  async function handleSearch(query: string) {
    onChange(query)
    if (query.trim().length < 2) {
      setResults([])
      setShowResults(false)
      return
    }
    const supabase = createClient()
    const { data } = await supabase
      .from("members")
      .select("id, full_name")
      .eq("is_active", true)
      .ilike("full_name", `%${query.trim()}%`)
      .order("full_name")
      .limit(8)

    if (data) {
      setResults(data)
      setShowResults(data.length > 0)
    }
  }

  return (
    <div className="relative">
      <Input
        placeholder={placeholder ?? "Type member name..."}
        value={value}
        onChange={(e) => handleSearch(e.target.value)}
        onBlur={() => setTimeout(() => setShowResults(false), 200)}
        onFocus={() => results.length > 0 && setShowResults(true)}
      />
      {showResults && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-36 overflow-y-auto">
          {results.map((m) => (
            <button
              key={m.id}
              type="button"
              className="flex w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(m.full_name)
                onMemberSelect?.(m.id)
                setShowResults(false)
              }}
            >
              {m.full_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Custom Sections Editor (reusable across all templates)
// ---------------------------------------------------------------------------

export interface CustomSection {
  title: string
  emoji: string
  color?: string
  layout?: "table" | "paragraph" | "list"
  entries: { label: string; name: string }[]
}

export const PASTEL_COLORS: { bg: string; border: string; label: string }[] = [
  { bg: "#FFE4E4", border: PASTEL_BORDER_MAP["#FFE4E4"], label: "Rose" },
  { bg: "#FFE8D6", border: PASTEL_BORDER_MAP["#FFE8D6"], label: "Peach" },
  { bg: "#FFFBD6", border: PASTEL_BORDER_MAP["#FFFBD6"], label: "Yellow" },
  { bg: "#D6F5E0", border: PASTEL_BORDER_MAP["#D6F5E0"], label: "Green" },
  { bg: "#D6F0FF", border: PASTEL_BORDER_MAP["#D6F0FF"], label: "Sky" },
  { bg: "#E4DEFF", border: PASTEL_BORDER_MAP["#E4DEFF"], label: "Purple" },
  { bg: "#FFD6F5", border: PASTEL_BORDER_MAP["#FFD6F5"], label: "Pink" },
  { bg: "#DBEAFE", border: PASTEL_BORDER_MAP["#DBEAFE"], label: "Blue" },
]

export function PastelColorPicker({
  value,
  onChange,
  extraPastels,
}: {
  value?: string
  onChange: (color: string | undefined) => void
  extraPastels?: { bg: string; border: string; label: string }[]
}) {
  const allPastels = [...PASTEL_COLORS, ...(extraPastels ?? [])]
  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
      <button
        type="button"
        className={`size-5 rounded-full border-2 bg-white transition-all ${!value ? "border-primary ring-1 ring-primary/40" : "border-border hover:border-muted-foreground"}`}
        onClick={() => onChange(undefined)}
        title="No background"
      />
      {allPastels.map((c) => (
        <button
          key={c.bg}
          type="button"
          className="size-5 rounded-full transition-all hover:scale-110"
          style={{
            backgroundColor: c.bg,
            border: `2px solid ${value === c.bg ? c.border : "transparent"}`,
            boxShadow: value === c.bg ? `0 0 6px ${c.border}` : undefined,
          }}
          onClick={() => onChange(value === c.bg ? undefined : c.bg)}
          title={c.label}
        />
      ))}
    </div>
  )
}

const EMOJI_PRESETS = [
  "📋", "🤝", "🍪", "🍽️", "🎵", "🙏", "📖", "⛪", "🎶", "🎤",
  "🕊️", "💒", "🎂", "💍", "📅", "📆", "🗓️", "🔔", "✝️", "❤️",
  "🌿", "☀️", "🎉", "🏠", "👨‍👩‍👧‍👦", "🧒", "👶", "🎓", "🎁", "🎈", "💐", "🕯️",
]

const SECTION_COLOR_PRESETS = [
  { label: "Default", value: "" },
  { label: "Blue", value: "#2563EB" },
  { label: "Teal", value: "#0D9488" },
  { label: "Green", value: "#059669" },
  { label: "Orange", value: "#EA580C" },
  { label: "Rose", value: "#DB2777" },
  { label: "Purple", value: "#7C3AED" },
  { label: "Red", value: "#DC2626" },
  { label: "Amber", value: "#D97706" },
  { label: "Indigo", value: "#4F46E5" },
  { label: "Slate", value: "#475569" },
]

function EmojiPickerInput({
  value,
  onChange,
}: {
  value: string
  onChange: (emoji: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="flex size-10 items-center justify-center rounded-md border text-lg hover:bg-accent transition-colors"
      >
        {value || "📋"}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="grid grid-cols-6 gap-1">
          {EMOJI_PRESETS.map((e) => (
            <button
              key={e}
              type="button"
              className={`size-9 rounded text-xl hover:bg-accent transition-colors ${value === e ? "bg-accent ring-1 ring-primary" : ""}`}
              onClick={() => { onChange(e); setOpen(false) }}
            >
              {e}
            </button>
          ))}
        </div>
        <Input
          placeholder="Or type any emoji"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 w-full text-center text-lg"
        />
      </PopoverContent>
    </Popover>
  )
}

export function CustomSectionsEditor({
  sections,
  onChange,
}: {
  sections: CustomSection[]
  onChange: (sections: CustomSection[]) => void
}) {
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({})

  function updateSection(idx: number, field: keyof Omit<CustomSection, "entries">, value: string) {
    const updated = [...sections]
    updated[idx] = { ...updated[idx], [field]: value }
    onChange(updated)
  }

  function removeSection(idx: number) {
    onChange(sections.filter((_, i) => i !== idx))
  }

  function moveSection(idx: number, dir: -1 | 1) {
    const target = idx + dir
    if (target < 0 || target >= sections.length) return
    const updated = [...sections]
    ;[updated[idx], updated[target]] = [updated[target], updated[idx]]
    onChange(updated)
  }

  function addSection() {
    onChange([...sections, { title: "", emoji: "📋", color: "", entries: [{ label: "", name: "" }] }])
  }

  function updateEntry(sIdx: number, eIdx: number, field: "label" | "name", value: string) {
    const updated = [...sections]
    const entries = [...updated[sIdx].entries]
    entries[eIdx] = { ...entries[eIdx], [field]: value }
    updated[sIdx] = { ...updated[sIdx], entries }
    onChange(updated)
  }

  function removeEntry(sIdx: number, eIdx: number) {
    const updated = [...sections]
    updated[sIdx] = { ...updated[sIdx], entries: updated[sIdx].entries.filter((_, i) => i !== eIdx) }
    onChange(updated)
  }

  function addEntry(sIdx: number) {
    const updated = [...sections]
    updated[sIdx] = { ...updated[sIdx], entries: [...updated[sIdx].entries, { label: "", name: "" }] }
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      <Label>Custom Sections</Label>
      {sections.map((sec, sIdx) => (
        <div key={sIdx} className="rounded-md border border-border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <EmojiPickerInput
              value={sec.emoji}
              onChange={(e) => updateSection(sIdx, "emoji", e)}
            />
            <Input
              placeholder="Section title (e.g., Snack Helpers)"
              value={sec.title}
              onChange={(e) => updateSection(sIdx, "title", e.target.value)}
              className="flex-1 font-medium"
            />
            <div className="flex items-center gap-1">
              {SECTION_COLOR_PRESETS.slice(1, 6).map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  className={`size-4 rounded-full border transition-transform hover:scale-125 ${(sec.color || "") === c.value ? "ring-1 ring-primary ring-offset-1" : "border-transparent"}`}
                  style={{ backgroundColor: c.value }}
                  onClick={() => {
                    const updated = [...sections]
                    updated[sIdx] = { ...updated[sIdx], color: sec.color === c.value ? "" : c.value }
                    onChange(updated)
                  }}
                />
              ))}
              <Input
                type="color"
                value={sec.color || "#4F46E5"}
                onChange={(e) => {
                  const updated = [...sections]
                  updated[sIdx] = { ...updated[sIdx], color: e.target.value }
                  onChange(updated)
                }}
                className="h-5 w-6 cursor-pointer rounded border-0 p-0"
                title="Custom color"
              />
            </div>
            <div className="flex items-center">
              <Button variant="ghost" size="icon-sm" onClick={() => moveSection(sIdx, -1)} disabled={sIdx === 0} title="Move up">
                <ArrowUp className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => moveSection(sIdx, 1)} disabled={sIdx === sections.length - 1} title="Move down">
                <ArrowDown className="size-3.5" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setCollapsed((prev) => ({ ...prev, [sIdx]: !prev[sIdx] }))}
              title={collapsed[sIdx] ? "Expand" : "Collapse"}
            >
              {collapsed[sIdx] ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => removeSection(sIdx)} title="Remove section">
              <Trash2 className="size-3.5 text-muted-foreground" />
            </Button>
          </div>
          {!collapsed[sIdx] && (
            <div className="space-y-1.5 pl-1">
              <div className="flex items-center gap-1 pb-1">
                <span className="text-[10px] text-muted-foreground mr-1">Layout:</span>
                {(["table", "paragraph", "list"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${(sec.layout || "table") === l ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                    onClick={() => {
                      const updated = [...sections]
                      updated[sIdx] = { ...updated[sIdx], layout: l === "table" ? undefined : l }
                      onChange(updated)
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {sec.entries.map((entry, eIdx) => (
                <div key={eIdx} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Role / label"
                      value={entry.label}
                      onChange={(e) => updateEntry(sIdx, eIdx, "label", e.target.value)}
                      className="w-36"
                    />
                    <MemberSearchInput
                      value={entry.name}
                      onChange={(v) => updateEntry(sIdx, eIdx, "name", v)}
                      placeholder="Member name or text"
                    />
                    <Button variant="ghost" size="icon-sm" onClick={() => removeEntry(sIdx, eIdx)} title="Remove entry">
                      <Trash2 className="size-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                  <VerseLookup onSelect={(text, ref) => updateEntry(sIdx, eIdx, "name", `"${text}" — ${ref}`)} />
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addEntry(sIdx)}>
                <Plus className="size-3.5" />
                Add Entry
              </Button>
            </div>
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addSection}>
        <Plus className="size-3.5" />
        Add Section
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared field wrapper
// ---------------------------------------------------------------------------

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared: Date picker that outputs formatted display string
// ---------------------------------------------------------------------------

function DateField({
  label,
  htmlFor,
  value,
  onChange,
}: {
  label: string
  htmlFor: string
  value: string
  onChange: (formatted: string) => void
}) {
  // Try to parse the display string back to a date for the input value
  let isoValue = ""
  if (value && value !== "No bible study this week" && value !== "No study this week") {
    try {
      const parsed = parse(value, "EEEE, MMMM do", new Date())
      if (!isNaN(parsed.getTime())) isoValue = format(parsed, "yyyy-MM-dd")
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={htmlFor}
          type="date"
          value={isoValue}
          onChange={(e) => {
            if (e.target.value) {
              const d = new Date(e.target.value + "T00:00:00")
              onChange(format(d, "EEEE, MMMM do"))
            }
          }}
          className="w-40"
        />
        <span className="text-sm text-muted-foreground truncate">{value || "No date set"}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared: Resource Links Editor
// ---------------------------------------------------------------------------

export interface ResourceLinkItem {
  label: string
  url: string
}

export function ResourceLinksEditor({
  links,
  onChange,
}: {
  links: ResourceLinkItem[]
  onChange: (links: ResourceLinkItem[]) => void
}) {
  return (
    <div className="space-y-2">
      <Label>Links</Label>
      {links.map((link, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            placeholder="Label (e.g., Study Materials)"
            value={link.label}
            onChange={(e) => {
              const updated = [...links]
              updated[i] = { ...updated[i], label: e.target.value }
              onChange(updated)
            }}
            className="w-40"
          />
          <Input
            placeholder="https://..."
            value={link.url}
            onChange={(e) => {
              const updated = [...links]
              updated[i] = { ...updated[i], url: e.target.value }
              onChange(updated)
            }}
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onChange(links.filter((_, j) => j !== i))}
            title="Remove link"
          >
            <Trash2 className="size-3.5 text-muted-foreground" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...links, { label: "", url: "" }])}>
        <Plus className="size-3.5" />
        Add Link
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Flyer Sections Editor (custom cards only)
// ---------------------------------------------------------------------------

function FlyerImagePreview({ src, onRemove }: { src: string; onRemove: () => void }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="relative rounded-lg border overflow-hidden">
      <img
        src={src}
        alt="Flyer preview"
        className={expanded ? "w-full object-contain" : "w-full max-h-48 object-cover cursor-pointer"}
        onClick={() => setExpanded(!expanded)}
      />
      <div className="absolute top-2 right-2 flex gap-1">
        <Button variant="secondary" size="icon-sm" onClick={() => setExpanded(!expanded)} title={expanded ? "Collapse" : "Expand to full size"}>
          {expanded ? <Minimize2 className="size-3.5" /> : <Expand className="size-3.5" />}
        </Button>
        <Button variant="destructive" size="sm" onClick={onRemove}>
          <Trash2 className="size-3.5" /> Remove
        </Button>
      </div>
    </div>
  )
}

export interface FlyerSectionItem {
  imageUrl: string
  caption: string
  captionBgColor?: string
  resourceLinks: { label: string; url: string }[]
}

export function FlyerSectionsEditor({
  sections,
  onChange,
}: {
  sections: FlyerSectionItem[]
  onChange: (sections: FlyerSectionItem[]) => void
}) {
  const [uploading, setUploading] = useState<Record<number, boolean>>({})

  async function handleUpload(idx: number, file: File) {
    setUploading((prev) => ({ ...prev, [idx]: true }))
    try {
      const supabase = createClient()
      const ext = file.name.split(".").pop() || "jpg"
      const path = `flyers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from("card-images").upload(path, file, { upsert: true })
      if (error) { toast.error(`Upload failed: ${error.message}`); return }
      const { data: urlData } = supabase.storage.from("card-images").getPublicUrl(path)
      const updated = [...sections]
      updated[idx] = { ...updated[idx], imageUrl: urlData.publicUrl }
      onChange(updated)
      toast.success("Flyer uploaded")
    } catch {
      toast.error("Upload failed")
    } finally {
      setUploading((prev) => ({ ...prev, [idx]: false }))
    }
  }

  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir
    if (target < 0 || target >= sections.length) return
    const updated = [...sections]
    ;[updated[idx], updated[target]] = [updated[target], updated[idx]]
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      <Label>Flyer Sections</Label>
      {sections.map((sec, idx) => (
        <div key={idx} className="rounded-md border border-border p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Flyer {idx + 1}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" onClick={() => move(idx, -1)} disabled={idx === 0} title="Move up">
                <ArrowUp className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => move(idx, 1)} disabled={idx === sections.length - 1} title="Move down">
                <ArrowDown className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => onChange(sections.filter((_, i) => i !== idx))} title="Remove flyer">
                <Trash2 className="size-3.5 text-muted-foreground" />
              </Button>
            </div>
          </div>

          {sec.imageUrl ? (
            <FlyerImagePreview
              src={sec.imageUrl}
              onRemove={() => { const u = [...sections]; u[idx] = { ...u[idx], imageUrl: "" }; onChange(u) }}
            />
          ) : (
            <div className="space-y-2">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 text-sm text-muted-foreground hover:border-primary/50 hover:bg-muted/30 transition-colors">
                {uploading[idx] ? (
                  <><Loader2 className="size-4 animate-spin" /> Uploading...</>
                ) : (
                  <><ImagePlus className="size-5" /><span>Click to upload flyer (JPG / PNG, max 5 MB)</span></>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={!!uploading[idx]}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(idx, f) }}
                />
              </label>
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or paste URL</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <Input
                placeholder="https://..."
                defaultValue=""
                onBlur={(e) => { const v = e.target.value.trim(); if (v) { const u = [...sections]; u[idx] = { ...u[idx], imageUrl: v }; onChange(u) } }}
              />
            </div>
          )}

          <Field label="Caption (optional)">
            <Textarea
              value={sec.caption}
              onChange={(e) => { const u = [...sections]; u[idx] = { ...u[idx], caption: e.target.value }; onChange(u) }}
              placeholder="Text shown below the flyer image..."
              className="min-h-14 transition-colors"
              style={sec.captionBgColor ? {
                backgroundColor: sec.captionBgColor,
                borderColor: PASTEL_BORDER_MAP[sec.captionBgColor],
                boxShadow: `0 0 6px ${PASTEL_BORDER_MAP[sec.captionBgColor]}50`,
              } : undefined}
            />
            <PastelColorPicker
              value={sec.captionBgColor}
              onChange={(color) => { const u = [...sections]; u[idx] = { ...u[idx], captionBgColor: color }; onChange(u) }}
            />
          </Field>

          <ResourceLinksEditor
            links={sec.resourceLinks}
            onChange={(links) => { const u = [...sections]; u[idx] = { ...u[idx], resourceLinks: links }; onChange(u) }}
          />
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...sections, { imageUrl: "", caption: "", resourceLinks: [] }])}>
        <Plus className="size-3.5" />
        Add Flyer
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared: Card Style Fields (message, footer verse, primary color)
// ---------------------------------------------------------------------------

interface CardStyleFieldsData {
  message: string
  messageBgColor?: string
  messageTextColor?: string
  headerTitle: string
  headerTitleColor?: string
  headerSubtitle: string
  headerSubtitleColor?: string
  headerEmoji: string
  primaryColor: string
  footerVerse: string
  footerVerseBgColor?: string
  footerVerseTextColor?: string
}

export function TextColorPicker({ value, onChange, label }: { value?: string; onChange: (v: string | undefined) => void; label: string }) {
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <span className="text-[10px] text-muted-foreground">{label}:</span>
      <Input
        type="color"
        value={value || "#1E293B"}
        onChange={(e) => onChange(e.target.value)}
        className="h-5 w-6 cursor-pointer rounded border-0 p-0"
      />
      {value && (
        <button type="button" onClick={() => onChange(undefined)} className="text-[10px] text-muted-foreground hover:text-foreground">
          reset
        </button>
      )}
    </div>
  )
}

export function CardStyleFields<T extends CardStyleFieldsData>({
  data,
  onChange,
  idPrefix,
}: {
  data: T
  onChange: (data: T) => void
  idPrefix: string
}) {
  return (
    <>
      <Field label="Custom Message (optional)" htmlFor={`${idPrefix}-msg`}>
        <Textarea
          id={`${idPrefix}-msg`}
          placeholder="Leave blank for default"
          value={data.message}
          onChange={(e) => onChange({ ...data, message: e.target.value })}
          className="min-h-12 transition-colors"
          style={{
            ...(data.messageBgColor ? {
              backgroundColor: data.messageBgColor,
              borderColor: PASTEL_BORDER_MAP[data.messageBgColor],
              boxShadow: `0 0 6px ${PASTEL_BORDER_MAP[data.messageBgColor]}50`,
            } : {}),
            ...(data.messageTextColor ? { color: data.messageTextColor } : {}),
          }}
        />
        <div className="flex items-center gap-4">
          <PastelColorPicker
            value={data.messageBgColor}
            onChange={(color) => onChange({ ...data, messageBgColor: color })}
          />
          <TextColorPicker value={data.messageTextColor} onChange={(c) => onChange({ ...data, messageTextColor: c })} label="Text" />
        </div>
      </Field>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Field label="Email Header Title (optional)" htmlFor={`${idPrefix}-htitle`}>
          <Input
            id={`${idPrefix}-htitle`}
            value={data.headerTitle}
            onChange={(e) => onChange({ ...data, headerTitle: e.target.value })}
            placeholder="Leave blank for default"
            style={data.headerTitleColor ? { color: data.headerTitleColor } : undefined}
          />
          <TextColorPicker value={data.headerTitleColor} onChange={(c) => onChange({ ...data, headerTitleColor: c })} label="Text" />
        </Field>
        <Field label="Emoji">
          <EmojiPickerInput
            value={data.headerEmoji}
            onChange={(e) => onChange({ ...data, headerEmoji: e })}
          />
        </Field>
      </div>
      <Field label="Header Subtitle (optional)" htmlFor={`${idPrefix}-hsub`}>
        <Input
          id={`${idPrefix}-hsub`}
          value={data.headerSubtitle}
          onChange={(e) => onChange({ ...data, headerSubtitle: e.target.value })}
          placeholder="Christ Church of India, San Ramon"
          style={data.headerSubtitleColor ? { color: data.headerSubtitleColor } : undefined}
        />
        <div className="flex items-center gap-4">
          <TextColorPicker value={data.headerSubtitleColor} onChange={(c) => onChange({ ...data, headerSubtitleColor: c })} label="Text" />
        </div>
        <VerseLookup onSelect={(text, ref) => onChange({ ...data, headerSubtitle: `"${text}" — ${ref}` })} />
      </Field>
      <Field label="Footer Verse / Text" htmlFor={`${idPrefix}-fv`}>
        <Input
          id={`${idPrefix}-fv`}
          value={data.footerVerse}
          onChange={(e) => onChange({ ...data, footerVerse: e.target.value })}
          placeholder="Christ Church of India, San Ramon"
          style={{
            ...(data.footerVerseBgColor ? {
              backgroundColor: data.footerVerseBgColor,
              borderColor: PASTEL_BORDER_MAP[data.footerVerseBgColor],
              boxShadow: `0 0 6px ${PASTEL_BORDER_MAP[data.footerVerseBgColor]}50`,
            } : {}),
            ...(data.footerVerseTextColor ? { color: data.footerVerseTextColor } : {}),
          }}
        />
        <div className="flex items-center gap-4">
          <PastelColorPicker
            value={data.footerVerseBgColor}
            onChange={(color) => onChange({ ...data, footerVerseBgColor: color })}
          />
          <TextColorPicker value={data.footerVerseTextColor} onChange={(c) => onChange({ ...data, footerVerseTextColor: c })} label="Text" />
        </div>
        <VerseLookup onSelect={(text, ref) => onChange({ ...data, footerVerse: `"${text}" — ${ref}` })} />
      </Field>
      <Field label="Primary Color" htmlFor={`${idPrefix}-color`}>
        <div className="flex items-center gap-2">
          <Input
            id={`${idPrefix}-color`}
            value={data.primaryColor}
            onChange={(e) => onChange({ ...data, primaryColor: e.target.value })}
            placeholder="#4F46E5"
            className="flex-1"
          />
          {data.primaryColor && (
            <span className="size-6 rounded-md border" style={{ backgroundColor: data.primaryColor }} />
          )}
        </div>
      </Field>
    </>
  )
}

// ---------------------------------------------------------------------------
// Base form data — all template form types extend this
// ---------------------------------------------------------------------------

export interface BaseFormData {
  message: string
  messageBgColor?: string
  messageTextColor?: string
  headerTitle: string
  headerTitleColor?: string
  headerSubtitle: string
  headerSubtitleColor?: string
  headerEmoji: string
  primaryColor: string
  footerVerse: string
  footerVerseBgColor?: string
  footerVerseTextColor?: string
  resourceLinks: { label: string; url: string }[]
  customSections?: CustomSection[]
}

// ---------------------------------------------------------------------------
// Common fields editor — single component for all shared fields
// ---------------------------------------------------------------------------

export function CommonFieldsEditor<T extends BaseFormData>({
  data,
  onChange,
  idPrefix,
}: {
  data: T
  onChange: (data: T) => void
  idPrefix: string
}) {
  return (
    <>
      <CustomSectionsEditor
        sections={data.customSections ?? []}
        onChange={(sections) => onChange({ ...data, customSections: sections })}
      />
      <ResourceLinksEditor
        links={data.resourceLinks ?? []}
        onChange={(links) => onChange({ ...data, resourceLinks: links })}
      />
      <CardStyleFields data={data} onChange={onChange} idPrefix={idPrefix} />
    </>
  )
}

// ---------------------------------------------------------------------------
// Birthday Edit Form (inline)
// ---------------------------------------------------------------------------

export interface BirthdayFormData extends BaseFormData {
  weekLabel: string
  birthdays: BirthdayEntry[]
}

export function BirthdayEditForm({
  data,
  onChange,
}: {
  data: BirthdayFormData
  onChange: (data: BirthdayFormData) => void
}) {
  function updateBirthday(
    index: number,
    field: keyof BirthdayEntry,
    value: string
  ) {
    const updated = [...data.birthdays]
    updated[index] = { ...updated[index], [field]: value }
    onChange({ ...data, birthdays: updated })
  }

  function removeBirthday(index: number) {
    onChange({
      ...data,
      birthdays: data.birthdays.filter((_, i) => i !== index),
    })
  }

  function addBirthday() {
    onChange({
      ...data,
      birthdays: [...data.birthdays, { name: "", date: "" }],
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Birthdays</Label>
        {data.birthdays.map((b, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              placeholder="Name"
              value={b.name}
              onChange={(e) => updateBirthday(i, "name", e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Date (e.g., 4/29)"
              value={b.date}
              onChange={(e) => updateBirthday(i, "date", e.target.value)}
              className="w-28"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => removeBirthday(i)}
              title="Remove"
            >
              <Trash2 className="size-3.5 text-muted-foreground" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addBirthday}>
          <Plus className="size-3.5" />
          Add Birthday
        </Button>
      </div>

      <CommonFieldsEditor data={data} onChange={onChange} idPrefix="bday-i" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Anniversary Edit Form (inline)
// ---------------------------------------------------------------------------

export interface AnniversaryFormData extends BaseFormData {
  weekLabel: string
  anniversaries: AnniversaryEntry[]
}

export function AnniversaryEditForm({
  data,
  onChange,
}: {
  data: AnniversaryFormData
  onChange: (data: AnniversaryFormData) => void
}) {
  function updateAnniversary(
    index: number,
    field: keyof AnniversaryEntry,
    value: string | number | undefined
  ) {
    const updated = [...data.anniversaries]
    updated[index] = { ...updated[index], [field]: value }
    onChange({ ...data, anniversaries: updated })
  }

  function removeAnniversary(index: number) {
    onChange({
      ...data,
      anniversaries: data.anniversaries.filter((_, i) => i !== index),
    })
  }

  function addAnniversary() {
    onChange({
      ...data,
      anniversaries: [
        ...data.anniversaries,
        { husbandName: "", wifeName: "", date: "" },
      ],
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Anniversaries</Label>
        {data.anniversaries.map((a, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Husband"
              value={a.husbandName}
              onChange={(e) =>
                updateAnniversary(i, "husbandName", e.target.value)
              }
              className="w-24 flex-1"
            />
            <Input
              placeholder="Wife"
              value={a.wifeName}
              onChange={(e) =>
                updateAnniversary(i, "wifeName", e.target.value)
              }
              className="w-24 flex-1"
            />
            <Input
              placeholder="Date"
              value={a.date}
              onChange={(e) => updateAnniversary(i, "date", e.target.value)}
              className="w-20"
            />
            <Input
              placeholder="Yrs"
              type="number"
              value={a.years ?? ""}
              onChange={(e) =>
                updateAnniversary(
                  i,
                  "years",
                  e.target.value ? parseInt(e.target.value, 10) : undefined
                )
              }
              className="w-14"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => removeAnniversary(i)}
              title="Remove"
            >
              <Trash2 className="size-3.5 text-muted-foreground" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addAnniversary}>
          <Plus className="size-3.5" />
          Add Anniversary
        </Button>
      </div>

      <CommonFieldsEditor data={data} onChange={onChange} idPrefix="ann-i" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bible Study Edit Form (inline)
// ---------------------------------------------------------------------------

export interface BibleStudyLocationData {
  label: string
  hostNames: string
  address: string
  city: string
  phone: string
  onVacation: boolean
  vacationMessage: string
  breaks?: { from: string; to: string; message: string }[]
}

export interface BibleStudyFormData extends BaseFormData {
  title: string
  date: string
  time: string
  topic: string
  locations: BibleStudyLocationData[]
}

export function BibleStudyEditForm({
  data,
  onChange,
}: {
  data: BibleStudyFormData
  onChange: (data: BibleStudyFormData) => void
}) {
  function set<K extends keyof Omit<BibleStudyFormData, "locations">>(
    field: K,
    value: BibleStudyFormData[K]
  ) {
    onChange({ ...data, [field]: value })
  }

  function updateLocation(index: number, field: keyof BibleStudyLocationData, value: string) {
    const updated = [...data.locations]
    updated[index] = { ...updated[index], [field]: value }
    onChange({ ...data, locations: updated })
  }

  function removeLocation(index: number) {
    onChange({ ...data, locations: data.locations.filter((_, i) => i !== index) })
  }

  function addLocation() {
    onChange({
      ...data,
      locations: [...data.locations, { label: "", hostNames: "TBD", address: "TBD", city: "", phone: "", onVacation: false, vacationMessage: "" }],
    })
  }

  return (
    <div className="space-y-4">
      <Field label="Card Title" htmlFor="bs-i-title">
        <Input
          id="bs-i-title"
          value={data.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Bible Study This Friday"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <DateField
          label="Date"
          htmlFor="bs-i-date"
          value={data.date}
          onChange={(v) => set("date", v)}
        />
        <Field label="Time" htmlFor="bs-i-time">
          <Input
            id="bs-i-time"
            value={data.time}
            onChange={(e) => set("time", e.target.value)}
            placeholder="7:30 PM"
          />
        </Field>
      </div>
      <Field label="Topic" htmlFor="bs-i-topic">
        <Input
          id="bs-i-topic"
          value={data.topic}
          onChange={(e) => set("topic", e.target.value)}
        />
      </Field>

      {/* Locations */}
      <div className="space-y-3">
        <Label>Locations</Label>
        {data.locations.map((loc, i) => (
          <div key={i} className="space-y-2 rounded-md border border-border p-3">
            <div className="flex items-center justify-between">
              <Input
                placeholder="Location name (e.g., San Ramon)"
                value={loc.label}
                onChange={(e) => updateLocation(i, "label", e.target.value)}
                className="flex-1 font-medium"
              />
              {data.locations.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="ml-2 shrink-0"
                  onClick={() => removeLocation(i)}
                  title="Remove location"
                >
                  <Trash2 className="size-3.5 text-muted-foreground" />
                </Button>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <HostFamilyInput
                value={loc.hostNames}
                onChange={(v) => updateLocation(i, "hostNames", v)}
                onSelect={(f) => {
                  const locs = [...data.locations]
                  locs[i] = {
                    ...locs[i],
                    hostNames: `${f.family_name}'s Residence`,
                    address: f.street ?? f.full_address ?? locs[i].address,
                    city: [f.city, [f.state, f.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ") || locs[i].city,
                    phone: formatPhone(f.home_phone) || locs[i].phone,
                  }
                  onChange({ ...data, locations: locs })
                }}
              />
              <Input
                placeholder="Phone"
                value={loc.phone}
                onChange={(e) => updateLocation(i, "phone", e.target.value)}
              />
            </div>
            <Input
              placeholder="Address"
              value={loc.address}
              onChange={(e) => updateLocation(i, "address", e.target.value)}
            />
            <Input
              placeholder="City, State ZIP"
              value={loc.city}
              onChange={(e) => updateLocation(i, "city", e.target.value)}
            />
            <div className="flex items-center gap-2 pt-1">
              <Switch
                size="sm"
                checked={loc.onVacation}
                onCheckedChange={(checked) => {
                  const locs = [...data.locations]
                  locs[i] = { ...locs[i], onVacation: checked }
                  onChange({ ...data, locations: locs })
                }}
              />
              <Label className="text-xs text-muted-foreground">On vacation / break</Label>
            </div>
            {loc.onVacation && (
              <Input
                placeholder="e.g., Bible Study will resume on September 12th"
                value={loc.vacationMessage}
                onChange={(e) => {
                  const locs = [...data.locations]
                  locs[i] = { ...locs[i], vacationMessage: e.target.value }
                  onChange({ ...data, locations: locs })
                }}
              />
            )}
            {/* Scheduled breaks */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground font-medium">Scheduled Breaks</p>
              {(loc.breaks ?? []).map((brk, bIdx) => (
                <div key={bIdx} className="flex items-center gap-1.5">
                  <Input
                    type="date"
                    value={brk.from}
                    onChange={(e) => {
                      const locs = [...data.locations]
                      const breaks = [...(locs[i].breaks ?? [])]
                      breaks[bIdx] = { ...breaks[bIdx], from: e.target.value }
                      locs[i] = { ...locs[i], breaks }
                      onChange({ ...data, locations: locs })
                    }}
                    className="w-32 text-xs h-7"
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input
                    type="date"
                    value={brk.to}
                    onChange={(e) => {
                      const locs = [...data.locations]
                      const breaks = [...(locs[i].breaks ?? [])]
                      breaks[bIdx] = { ...breaks[bIdx], to: e.target.value }
                      locs[i] = { ...locs[i], breaks }
                      onChange({ ...data, locations: locs })
                    }}
                    className="w-32 text-xs h-7"
                  />
                  <Input
                    placeholder="Break message"
                    value={brk.message}
                    onChange={(e) => {
                      const locs = [...data.locations]
                      const breaks = [...(locs[i].breaks ?? [])]
                      breaks[bIdx] = { ...breaks[bIdx], message: e.target.value }
                      locs[i] = { ...locs[i], breaks }
                      onChange({ ...data, locations: locs })
                    }}
                    className="flex-1 text-xs h-7"
                  />
                  <Button variant="ghost" size="icon-sm" title="Remove break" onClick={() => {
                    const locs = [...data.locations]
                    const breaks = (locs[i].breaks ?? []).filter((_, j) => j !== bIdx)
                    locs[i] = { ...locs[i], breaks: breaks.length > 0 ? breaks : undefined }
                    onChange({ ...data, locations: locs })
                  }}>
                    <Trash2 className="size-3 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => {
                const locs = [...data.locations]
                const breaks = [...(locs[i].breaks ?? []), { from: "", to: "", message: "" }]
                locs[i] = { ...locs[i], breaks }
                onChange({ ...data, locations: locs })
              }}>
                <Plus className="size-3" />
                Add break period
              </Button>
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addLocation}>
          <Plus className="size-3.5" />
          Add Location
        </Button>
      </div>

      <CommonFieldsEditor data={data} onChange={onChange} idPrefix="bs-i" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Women's Study Edit Form (inline)
// ---------------------------------------------------------------------------

export interface WomensStudyFormData extends BaseFormData {
  title: string
  topic: string
  date: string
  time: string
  zoomLink: string
  zoomMeetingId: string
  zoomPasscode: string
  location: string
}

export function WomensStudyEditForm({
  data,
  onChange,
}: {
  data: WomensStudyFormData
  onChange: (data: WomensStudyFormData) => void
}) {
  function set<K extends keyof WomensStudyFormData>(
    field: K,
    value: WomensStudyFormData[K]
  ) {
    onChange({ ...data, [field]: value })
  }

  return (
    <div className="space-y-4">
      <Field label="Card Title" htmlFor="ws-i-title">
        <Input
          id="ws-i-title"
          value={data.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Women's Bible Study"
        />
      </Field>
      <Field label="Topic (leave empty to exclude)" htmlFor="ws-i-topic">
        <Input
          id="ws-i-topic"
          value={data.topic}
          onChange={(e) => set("topic", e.target.value)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <DateField
          label="Date"
          htmlFor="ws-i-date"
          value={data.date}
          onChange={(v) => set("date", v)}
        />
        <Field label="Time" htmlFor="ws-i-time">
          <Input
            id="ws-i-time"
            value={data.time}
            onChange={(e) => set("time", e.target.value)}
            placeholder="7:00 PM"
          />
        </Field>
      </div>
      <Field label="Zoom Link (leave empty to exclude)" htmlFor="ws-i-zoom">
        <Input
          id="ws-i-zoom"
          value={data.zoomLink}
          onChange={(e) => set("zoomLink", e.target.value)}
          placeholder="https://zoom.us/j/..."
        />
      </Field>
      {data.zoomLink && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Meeting ID" htmlFor="ws-i-zmid">
            <Input
              id="ws-i-zmid"
              value={data.zoomMeetingId}
              onChange={(e) => set("zoomMeetingId", e.target.value)}
              placeholder="779 2123 2378"
            />
          </Field>
          <Field label="Passcode" htmlFor="ws-i-zmpw">
            <Input
              id="ws-i-zmpw"
              value={data.zoomPasscode}
              onChange={(e) => set("zoomPasscode", e.target.value)}
              placeholder="6gLy8u"
            />
          </Field>
        </div>
      )}
      <Field label="Location (used when no Zoom link)" htmlFor="ws-i-loc">
        <Input
          id="ws-i-loc"
          value={data.location}
          onChange={(e) => set("location", e.target.value)}
          placeholder="e.g., Fellowship Hall"
        />
      </Field>
      <CommonFieldsEditor data={data} onChange={onChange} idPrefix="ws-i" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Prayer Meeting Edit Form (inline)
// ---------------------------------------------------------------------------

export interface PrayerMeetingFormData extends BaseFormData {
  date: string
  time: string
  hostNames: string
  address: string
  city: string
  phone: string
  dinnerNote: string
  signupLink: string
}

export function PrayerMeetingEditForm({
  data,
  onChange,
}: {
  data: PrayerMeetingFormData
  onChange: (data: PrayerMeetingFormData) => void
}) {
  function set<K extends keyof PrayerMeetingFormData>(
    field: K,
    value: PrayerMeetingFormData[K]
  ) {
    onChange({ ...data, [field]: value })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <DateField
          label="Date"
          htmlFor="pm-i-date"
          value={data.date}
          onChange={(v) => set("date", v)}
        />
        <Field label="Time" htmlFor="pm-i-time">
          <Input
            id="pm-i-time"
            value={data.time}
            onChange={(e) => set("time", e.target.value)}
            placeholder="6:00 PM"
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <HostFamilyInput
          value={data.hostNames}
          onChange={(v) => set("hostNames", v)}
          onSelect={(f) => {
            onChange({
              ...data,
              hostNames: `${f.family_name}'s Residence`,
              address: f.street ?? f.full_address ?? data.address,
              city: [f.city, [f.state, f.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ") || data.city,
              phone: formatPhone(f.home_phone) || data.phone,
            })
          }}
        />
        <Field label="Phone" htmlFor="pm-i-phone">
          <Input
            id="pm-i-phone"
            value={data.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Address" htmlFor="pm-i-addr">
        <Input
          id="pm-i-addr"
          value={data.address}
          onChange={(e) => set("address", e.target.value)}
          placeholder="123 Main St"
        />
      </Field>
      <Field label="City, State ZIP" htmlFor="pm-i-city">
        <Input
          id="pm-i-city"
          value={data.city}
          onChange={(e) => set("city", e.target.value)}
        />
      </Field>
      <Field label="Dinner Note (optional)" htmlFor="pm-i-dinner">
        <Input
          id="pm-i-dinner"
          value={data.dinnerNote}
          onChange={(e) => set("dinnerNote", e.target.value)}
          placeholder="e.g., Potluck dinner at 6 PM — please bring a dish to share"
        />
      </Field>
      <Field label="Signup Link (optional)" htmlFor="pm-i-signup">
        <Input
          id="pm-i-signup"
          value={data.signupLink}
          onChange={(e) => set("signupLink", e.target.value)}
          placeholder="https://..."
        />
      </Field>
      <CommonFieldsEditor data={data} onChange={onChange} idPrefix="pm-i" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bulletin Edit Form (inline)
// ---------------------------------------------------------------------------

export const BULLETIN_DEFAULT_SECTION_ORDER = ["birthdays", "anniversaries", "helpers", "events", "upcoming"] as const
export type BulletinSectionKey = (typeof BULLETIN_DEFAULT_SECTION_ORDER)[number]

export interface BulletinFormData extends BaseFormData {
  weekLabel: string
  birthdays: { name: string; date: string }[]
  anniversaries: { names: string; date: string }[]
  helpers: { role: string; name: string }[]
  events: { title: string; details: string }[]
  upcomingEvents?: { title: string; details: string }[]
  sectionOrder?: BulletinSectionKey[]
  weeksAhead?: number
}

export function BulletinEditForm({
  data,
  onChange,
  onWeeksChange,
  onRefreshFromDb,
}: {
  data: BulletinFormData
  onChange: (data: BulletinFormData) => void
  onWeeksChange?: (weeks: number) => void
  onRefreshFromDb?: () => void
}) {
  // --- Birthdays ---
  function updateBday(i: number, field: string, value: string) {
    const updated = [...data.birthdays]
    updated[i] = { ...updated[i], [field]: value }
    onChange({ ...data, birthdays: updated })
  }
  function removeBday(i: number) {
    onChange({
      ...data,
      birthdays: data.birthdays.filter((_, idx) => idx !== i),
    })
  }
  function addBday() {
    onChange({
      ...data,
      birthdays: [...data.birthdays, { name: "", date: "" }],
    })
  }

  // --- Anniversaries ---
  function updateAnni(i: number, field: string, value: string) {
    const updated = [...data.anniversaries]
    updated[i] = { ...updated[i], [field]: value }
    onChange({ ...data, anniversaries: updated })
  }
  function removeAnni(i: number) {
    onChange({
      ...data,
      anniversaries: data.anniversaries.filter((_, idx) => idx !== i),
    })
  }
  function addAnni() {
    onChange({
      ...data,
      anniversaries: [...data.anniversaries, { names: "", date: "" }],
    })
  }

  // --- Helpers ---
  function updateHelper(i: number, field: string, value: string) {
    const updated = [...data.helpers]
    updated[i] = { ...updated[i], [field]: value }
    onChange({ ...data, helpers: updated })
  }
  function removeHelper(i: number) {
    onChange({
      ...data,
      helpers: data.helpers.filter((_, idx) => idx !== i),
    })
  }
  function addHelper() {
    onChange({
      ...data,
      helpers: [...data.helpers, { role: "", name: "" }],
    })
  }

  // --- Events ---
  function updateEvent(i: number, field: string, value: string) {
    const updated = [...data.events]
    updated[i] = { ...updated[i], [field]: value }
    onChange({ ...data, events: updated })
  }
  function removeEvent(i: number) {
    onChange({
      ...data,
      events: data.events.filter((_, idx) => idx !== i),
    })
  }
  function addEvent() {
    onChange({
      ...data,
      events: [...data.events, { title: "", details: "" }],
    })
  }
  function updateUpcoming(i: number, field: string, value: string) {
    const updated = [...(data.upcomingEvents ?? [])]
    updated[i] = { ...updated[i], [field]: value }
    onChange({ ...data, upcomingEvents: updated })
  }
  function removeUpcoming(i: number) {
    onChange({ ...data, upcomingEvents: (data.upcomingEvents ?? []).filter((_, idx) => idx !== i) })
  }
  function addUpcoming() {
    onChange({ ...data, upcomingEvents: [...(data.upcomingEvents ?? []), { title: "", details: "" }] })
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Week Label" htmlFor="bul-i-week">
          <Input
            id="bul-i-week"
            value={data.weekLabel}
            onChange={(e) => onChange({ ...data, weekLabel: e.target.value })}
          />
        </Field>
        {onWeeksChange && (
          <Field label="Weeks to Include" htmlFor="bul-i-weeks">
            <Select
              value={String(data.weeksAhead ?? 1)}
              onValueChange={(val) => onWeeksChange(parseInt(val ?? "1", 10))}
            >
              <SelectTrigger id="bul-i-weeks" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">This week only</SelectItem>
                <SelectItem value="2">2 weeks</SelectItem>
                <SelectItem value="3">3 weeks</SelectItem>
                <SelectItem value="4">4 weeks</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        )}
      </div>

      {onRefreshFromDb && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRefreshFromDb}
          className="text-xs"
        >
          <RefreshCw className="size-3.5" />
          Refresh Birthdays & Anniversaries from DB
        </Button>
      )}

      {(() => {
        const order = data.sectionOrder ?? [...BULLETIN_DEFAULT_SECTION_ORDER]

        function moveBuiltinSection(idx: number, dir: -1 | 1) {
          const target = idx + dir
          if (target < 0 || target >= order.length) return
          const updated = [...order]
          ;[updated[idx], updated[target]] = [updated[target], updated[idx]]
          onChange({ ...data, sectionOrder: updated })
        }

        const SECTION_LABELS: Record<BulletinSectionKey, string> = {
          birthdays: "Birthdays",
          anniversaries: "Anniversaries",
          helpers: "Helpers This Month",
          events: "This Week",
          upcoming: "Upcoming Events",
        }

        const sectionRenderers: Record<BulletinSectionKey, React.ReactNode> = {
          birthdays: (
            <div className="space-y-2">
              {data.birthdays.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <MemberSearchInput
                    value={b.name}
                    onChange={(v) => updateBday(i, "name", v)}
                    onMemberSelect={async (memberId) => {
                      const supabase = (await import("@/lib/supabase/client")).createClient()
                      const { data: m } = await supabase.from("members").select("full_name, birth_month, birth_day").eq("id", memberId).single() as { data: { full_name: string; birth_month: number | null; birth_day: number | null } | null }
                      if (m) {
                        updateBday(i, "name", m.full_name)
                        if (m.birth_month && m.birth_day) updateBday(i, "date", `${m.birth_month}/${m.birth_day}`)
                      }
                    }}
                    placeholder="Type member name"
                  />
                  <Input
                    placeholder="Date"
                    value={b.date}
                    onChange={(e) => updateBday(i, "date", e.target.value)}
                    className="w-24"
                  />
                  <Button variant="ghost" size="icon-sm" onClick={() => removeBday(i)} title="Remove">
                    <Trash2 className="size-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              {data.birthdays.length === 0 && <p className="text-xs text-muted-foreground">None added yet.</p>}
              <Button variant="outline" size="sm" onClick={addBday}>
                <Plus className="size-3.5" />
                Add Birthday
              </Button>
            </div>
          ),
          anniversaries: (
            <div className="space-y-2">
              {data.anniversaries.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <MemberSearchInput
                    value={a.names}
                    onChange={(v) => updateAnni(i, "names", v)}
                    placeholder="Names (e.g., John & Jane)"
                  />
                  <Input
                    placeholder="Date"
                    value={a.date}
                    onChange={(e) => updateAnni(i, "date", e.target.value)}
                    className="w-24"
                  />
                  <Button variant="ghost" size="icon-sm" onClick={() => removeAnni(i)} title="Remove">
                    <Trash2 className="size-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              {data.anniversaries.length === 0 && <p className="text-xs text-muted-foreground">None added yet.</p>}
              <Button variant="outline" size="sm" onClick={addAnni}>
                <Plus className="size-3.5" />
                Add Anniversary
              </Button>
            </div>
          ),
          helpers: (
            <div className="space-y-2">
              {data.helpers.map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="Role (e.g., Usher)"
                    value={h.role}
                    onChange={(e) => updateHelper(i, "role", e.target.value)}
                    className="w-36"
                  />
                  <MemberSearchInput
                    value={h.name}
                    onChange={(v) => updateHelper(i, "name", v)}
                    placeholder="Member name"
                  />
                  <Button variant="ghost" size="icon-sm" onClick={() => removeHelper(i)} title="Remove helper">
                    <Trash2 className="size-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              {data.helpers.length === 0 && (
                <p className="text-xs text-muted-foreground">None added yet.</p>
              )}
              <Button variant="outline" size="sm" onClick={addHelper}>
                <Plus className="size-3.5" />
                Add Helper
              </Button>
            </div>
          ),
          events: (
            <div className="space-y-2">
              {data.events.map((evt, i) => (
                <div key={i} className="space-y-1.5 rounded-md border border-border p-2.5">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Title"
                      value={evt.title}
                      onChange={(e) => updateEvent(i, "title", e.target.value)}
                      className="flex-1"
                    />
                    <Button variant="ghost" size="icon-sm" onClick={() => removeEvent(i)} title="Remove event">
                      <Trash2 className="size-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Details"
                    value={evt.details}
                    onChange={(e) => updateEvent(i, "details", e.target.value)}
                    className="min-h-10"
                  />
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addEvent}>
                <Plus className="size-3.5" />
                Add Event
              </Button>
            </div>
          ),
          upcoming: (
            <div className="space-y-2">
              {(data.upcomingEvents ?? []).map((evt, i) => (
                <div key={i} className="space-y-1.5 rounded-md border border-dashed border-border p-2.5">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Title"
                      value={evt.title}
                      onChange={(e) => updateUpcoming(i, "title", e.target.value)}
                      className="flex-1"
                    />
                    <Button variant="ghost" size="icon-sm" onClick={() => removeUpcoming(i)} title="Remove">
                      <Trash2 className="size-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Details (date, time, location)"
                    value={evt.details}
                    onChange={(e) => updateUpcoming(i, "details", e.target.value)}
                    className="min-h-10"
                  />
                </div>
              ))}
              {(data.upcomingEvents ?? []).length === 0 && <p className="text-xs text-muted-foreground">No upcoming events. Increase &quot;Weeks to Include&quot; or add manually.</p>}
              <Button variant="outline" size="sm" onClick={addUpcoming}>
                <Plus className="size-3.5" />
                Add Upcoming Event
              </Button>
            </div>
          ),
        }

        return order.map((key, idx) => (
          <div key={key} className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Label className="flex-1">{SECTION_LABELS[key]}</Label>
              <Button variant="ghost" size="icon-sm" onClick={() => moveBuiltinSection(idx, -1)} disabled={idx === 0} title="Move up">
                <ArrowUp className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => moveBuiltinSection(idx, 1)} disabled={idx === order.length - 1} title="Move down">
                <ArrowDown className="size-3.5" />
              </Button>
            </div>
            {sectionRenderers[key]}
          </div>
        ))
      })()}

      <CommonFieldsEditor data={data} onChange={onChange} idPrefix="bul-i" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Reusable inline list section
// ---------------------------------------------------------------------------

interface InlineFieldDef {
  key: string
  placeholder: string
  className?: string
}

function InlineListSection<T extends Record<string, string>>({
  label,
  items,
  fields,
  onUpdate,
  onRemove,
  onAdd,
  addLabel,
}: {
  label: string
  items: T[]
  fields: InlineFieldDef[]
  onUpdate: (index: number, field: string, value: string) => void
  onRemove: (index: number) => void
  onAdd: () => void
  addLabel: string
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          {fields.map((f) => (
            <Input
              key={f.key}
              placeholder={f.placeholder}
              value={(item as Record<string, string>)[f.key] ?? ""}
              onChange={(e) => onUpdate(i, f.key, e.target.value)}
              className={f.className}
            />
          ))}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onRemove(i)}
            title="Remove"
          >
            <Trash2 className="size-3.5 text-muted-foreground" />
          </Button>
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground">None added yet.</p>
      )}
      <Button variant="outline" size="sm" onClick={onAdd}>
        <Plus className="size-3.5" />
        {addLabel}
      </Button>
    </div>
  )
}
