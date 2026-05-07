"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BookOpen, Loader2 } from "lucide-react"

interface VerseLookupProps {
  onSelect: (verse: string, reference: string) => void
}

const TRANSLATIONS = [
  { value: "esv", label: "ESV" },
  { value: "kjv", label: "KJV" },
  { value: "web", label: "WEB" },
]

export function VerseLookup({ onSelect }: VerseLookupProps) {
  const [open, setOpen] = useState(false)
  const [reference, setReference] = useState("")
  const [translation, setTranslation] = useState("esv")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ text: string; reference: string; translation: string } | null>(null)
  const [error, setError] = useState("")

  async function lookup() {
    if (!reference.trim()) return
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const res = await fetch(`/api/bible?ref=${encodeURIComponent(reference.trim())}&translation=${translation}`)
      if (res.ok) {
        const data = await res.json()
        setResult(data)
      } else {
        setError("Verse not found. Try format: John 3:16 or Romans 12:13")
      }
    } catch {
      setError("Failed to fetch verse")
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mt-1"
      >
        <BookOpen className="size-3" />
        Browse Bible verse
      </button>
    )
  }

  return (
    <div className="mt-2 rounded-md border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="e.g., Hebrews 13:2 or John 3:16-17"
          className="h-8 text-xs flex-1"
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), lookup())}
        />
        <Select value={translation} onValueChange={(v) => setTranslation(v ?? "esv")}>
          <SelectTrigger className="h-8 text-xs w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRANSLATIONS.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="h-8 text-xs" onClick={lookup} disabled={loading || !reference.trim()}>
          {loading ? <Loader2 className="size-3 animate-spin" /> : "Look up"}
        </Button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {result && (
        <div className="rounded border bg-white p-3 space-y-2">
          <p className="text-sm italic text-gray-700 leading-relaxed">&ldquo;{result.text}&rdquo;</p>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">— {result.reference} ({result.translation})</p>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px]"
              onClick={() => {
                onSelect(result.text, `${result.reference} (${result.translation})`)
                setOpen(false)
                setResult(null)
                setReference("")
              }}
            >
              Use this verse
            </Button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => { setOpen(false); setResult(null); setError("") }}
        className="text-[10px] text-muted-foreground hover:text-foreground"
      >
        Close
      </button>
    </div>
  )
}
