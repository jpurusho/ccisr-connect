"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { ChevronDown, ChevronUp, GripVertical, Trash2 } from "lucide-react"
import { SECTION_LABELS, type VisualSection } from "@/lib/email/visual-config-types"

interface SectionCardProps {
  section: VisualSection
  onUpdate: (config: Record<string, unknown>) => void
  onToggle: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  isFirst: boolean
  isLast: boolean
  children?: React.ReactNode
}

export function SectionCard({
  section,
  onToggle,
  onMoveUp,
  onMoveDown,
  onRemove,
  isFirst,
  isLast,
  children,
}: SectionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const meta = SECTION_LABELS[section.type]

  return (
    <div
      className={`rounded-lg border transition-colors ${
        section.enabled ? "border-border bg-card" : "border-dashed border-muted-foreground/20 bg-muted/30 opacity-60"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground/50" />
        <span className="text-base">{meta.emoji}</span>
        <span className="flex-1 text-sm font-medium">{meta.label}</span>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={onMoveUp} disabled={isFirst} title="Move up">
            <ChevronUp className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onMoveDown} disabled={isLast} title="Move down">
            <ChevronDown className="size-3.5" />
          </Button>
          <Switch size="sm" checked={section.enabled} onCheckedChange={onToggle} />
          {section.type !== "header" && section.type !== "footer" && (
            <Button variant="ghost" size="icon-sm" onClick={onRemove} title="Remove section">
              <Trash2 className="size-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>

      {section.enabled && children && (
        <>
          <button
            className="w-full border-t px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Hide settings ▲" : "Edit settings ▼"}
          </button>
          {expanded && (
            <div className="border-t px-3 py-3 space-y-3">
              {children}
            </div>
          )}
        </>
      )}
    </div>
  )
}
