"use client"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Eye } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  type VisualConfig,
  type VisualSection,
  type VisualSectionType,
  SECTION_LABELS,
  DEFAULT_SECTIONS,
} from "@/lib/email/visual-config-types"
import { buildGenericEventCard, buildStyleContext, type TemplateStyleSettings } from "@/lib/email/card-builder"
import { SectionCard } from "./section-card"
import { LivePreviewPane } from "./live-preview-pane"

interface VisualTemplateBuilderProps {
  initialConfig?: VisualConfig | null
  globalStyle?: TemplateStyleSettings
  onSave: (config: VisualConfig) => void
  saving?: boolean
}

export function VisualTemplateBuilder({ initialConfig, globalStyle, onSave, saving }: VisualTemplateBuilderProps) {
  const [sections, setSections] = useState<VisualSection[]>(initialConfig?.sections ?? DEFAULT_SECTIONS)
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false)

  const updateSection = useCallback((id: string, partial: Partial<VisualSection>) => {
    setSections((prev) => prev.map((s) => s.id === id ? { ...s, ...partial } : s))
  }, [])

  const updateConfig = useCallback((id: string, config: Record<string, unknown>) => {
    setSections((prev) => prev.map((s) => s.id === id ? { ...s, config: { ...s.config, ...config } } : s))
  }, [])

  const toggleSection = useCallback((id: string) => {
    setSections((prev) => prev.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s))
  }, [])

  const moveSection = useCallback((idx: number, dir: -1 | 1) => {
    setSections((prev) => {
      const target = idx + dir
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }, [])

  const removeSection = useCallback((id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const addSection = useCallback((type: VisualSectionType) => {
    const id = `s-${type}-${Date.now()}`
    setSections((prev) => [
      ...prev.filter((s) => s.type !== "footer"),
      { id, type, enabled: true, config: {} },
      ...prev.filter((s) => s.type === "footer"),
    ])
  }, [])

  const previewHtml = useMemo(() => {
    const enabled = sections.filter((s) => s.enabled)
    const headerCfg = enabled.find((s) => s.type === "header")?.config ?? {}
    const msgCfg = enabled.find((s) => s.type === "message")?.config ?? {}
    const detailsCfg = enabled.find((s) => s.type === "details")?.config ?? {}
    const quoteCfg = enabled.find((s) => s.type === "quote")?.config ?? {}

    const style = buildStyleContext(globalStyle)
    const cardSections = enabled
      .map((s) => s.type)
      .filter((t): t is "header" | "details" | "locations" | "virtual" | "message" | "custom" | "footer" =>
        ["header", "details", "locations", "virtual", "message", "custom", "footer"].includes(t)
      )

    return buildGenericEventCard(
      {
        title: (headerCfg.title as string) || "Event Title",
        date: (detailsCfg.date as string) || "Friday, June 5",
        time: (detailsCfg.time as string) || "7:30 PM",
        topic: (detailsCfg.topic as string) || "",
        message: (msgCfg.text as string) || undefined,
        messageBgColor: (msgCfg.bgColor as string) || undefined,
        headerTitle: (headerCfg.title as string) || "Event Title",
        headerSubtitle: (headerCfg.subtitle as string) || "",
        headerEmoji: (headerCfg.emoji as string) || "📅",
        primaryColor: (headerCfg.primaryColor as string) || globalStyle?.headerColor || "",
        footerVerse: (quoteCfg.text as string) || "",
        footerVerseBgColor: (quoteCfg.bgColor as string) || undefined,
      },
      style,
      cardSections.length > 0 ? cardSections : undefined
    )
  }, [sections, globalStyle])

  const availableToAdd: VisualSectionType[] = [
    "banner_image", "message", "details", "locations", "virtual",
    "quote", "signup_cta", "custom", "resource_links", "flyer",
  ]

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,400px]">
      {/* Left: Section editor */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Sections</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setMobilePreviewOpen(true)}>
              <Eye className="size-3.5" />
              Preview
            </Button>
            <Button size="sm" onClick={() => onSave({ sections, globalStyle })} disabled={saving}>
              {saving ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </div>

        {/* Section list */}
        <div className="space-y-2">
          {sections.map((section, idx) => (
            <SectionCard
              key={section.id}
              section={section}
              onUpdate={(config) => updateConfig(section.id, config)}
              onToggle={() => toggleSection(section.id)}
              onMoveUp={() => moveSection(idx, -1)}
              onMoveDown={() => moveSection(idx, 1)}
              onRemove={() => removeSection(section.id)}
              isFirst={idx === 0}
              isLast={idx === sections.length - 1}
            >
              <SectionEditor section={section} onChange={(config) => updateConfig(section.id, config)} />
            </SectionCard>
          ))}
        </div>

        {/* Quick-add */}
        <div className="rounded-lg border border-dashed border-muted-foreground/30 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Add Section</p>
          <div className="flex flex-wrap gap-1.5">
            {availableToAdd.map((type) => (
              <Button
                key={type}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => addSection(type)}
              >
                {SECTION_LABELS[type].emoji} {SECTION_LABELS[type].label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Live preview (desktop) */}
      <div className="hidden lg:block">
        <div className="sticky top-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Live Preview</p>
          <LivePreviewPane html={previewHtml} />
        </div>
      </div>

      {/* Mobile preview dialog */}
      <Dialog open={mobilePreviewOpen} onOpenChange={setMobilePreviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          <LivePreviewPane html={previewHtml} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Per-section editors ─────────────────────────────────────────────────────

function SectionEditor({ section, onChange }: { section: VisualSection; onChange: (config: Record<string, unknown>) => void }) {
  const { config } = section

  switch (section.type) {
    case "header":
      return (
        <div className="space-y-2">
          <Field label="Title" value={(config.title as string) ?? ""} onChange={(v) => onChange({ title: v })} />
          <Field label="Subtitle" value={(config.subtitle as string) ?? ""} onChange={(v) => onChange({ subtitle: v })} />
          <Field label="Emoji" value={(config.emoji as string) ?? "📅"} onChange={(v) => onChange({ emoji: v })} className="w-20 text-center text-xl" />
          <Field label="Color" value={(config.primaryColor as string) ?? ""} onChange={(v) => onChange({ primaryColor: v })} type="color" />
        </div>
      )

    case "message":
      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Message Text</Label>
            <Textarea
              value={(config.text as string) ?? ""}
              onChange={(e) => onChange({ text: e.target.value })}
              rows={3}
              className="text-sm"
              placeholder="Write your message..."
            />
          </div>
          <Field label="Background Color" value={(config.bgColor as string) ?? ""} onChange={(v) => onChange({ bgColor: v })} type="color" />
        </div>
      )

    case "details":
      return (
        <div className="space-y-2">
          <Field label="Date" value={(config.date as string) ?? ""} onChange={(v) => onChange({ date: v })} placeholder="e.g., Friday, June 5" />
          <Field label="Time" value={(config.time as string) ?? ""} onChange={(v) => onChange({ time: v })} placeholder="e.g., 7:30 PM" />
          <Field label="Topic" value={(config.topic as string) ?? ""} onChange={(v) => onChange({ topic: v })} placeholder="e.g., Studying the Book of Acts" />
        </div>
      )

    case "quote":
      return (
        <div className="space-y-2">
          <Field label="Verse / Quote" value={(config.text as string) ?? ""} onChange={(v) => onChange({ text: v })} placeholder="e.g., &quot;For God so loved...&quot; — John 3:16" />
          <Field label="Background Color" value={(config.bgColor as string) ?? ""} onChange={(v) => onChange({ bgColor: v })} type="color" />
        </div>
      )

    case "banner_image":
      return (
        <div className="space-y-2">
          <Field label="Image URL" value={(config.url as string) ?? ""} onChange={(v) => onChange({ url: v })} placeholder="https://..." />
          <Field label="Caption" value={(config.caption as string) ?? ""} onChange={(v) => onChange({ caption: v })} />
        </div>
      )

    case "virtual":
      return (
        <div className="space-y-2">
          <Field label="Zoom Link" value={(config.zoomLink as string) ?? ""} onChange={(v) => onChange({ zoomLink: v })} placeholder="https://zoom.us/..." />
          <Field label="Meeting ID" value={(config.meetingId as string) ?? ""} onChange={(v) => onChange({ meetingId: v })} />
          <Field label="Passcode" value={(config.passcode as string) ?? ""} onChange={(v) => onChange({ passcode: v })} />
        </div>
      )

    case "signup_cta":
      return (
        <div className="space-y-2">
          <Field label="Button Text" value={(config.buttonText as string) ?? "Sign Up"} onChange={(v) => onChange({ buttonText: v })} />
          <Field label="Link URL" value={(config.url as string) ?? ""} onChange={(v) => onChange({ url: v })} placeholder="https://..." />
        </div>
      )

    case "resource_links":
      return (
        <p className="text-xs text-muted-foreground">Resource links are configured in the main template editor.</p>
      )

    case "locations":
      return (
        <p className="text-xs text-muted-foreground">Location data is pulled from the event's calendar settings.</p>
      )

    case "custom":
      return (
        <p className="text-xs text-muted-foreground">Custom sections are configured in the main template editor.</p>
      )

    case "flyer":
      return (
        <div className="space-y-2">
          <Field label="Image URL" value={(config.url as string) ?? ""} onChange={(v) => onChange({ url: v })} placeholder="https://..." />
          <Field label="Caption" value={(config.caption as string) ?? ""} onChange={(v) => onChange({ caption: v })} />
        </div>
      )

    case "footer":
      return (
        <div className="space-y-2">
          <Field label="Footer Text" value={(config.text as string) ?? ""} onChange={(v) => onChange({ text: v })} placeholder="Christ Church of India, San Ramon" />
        </div>
      )

    default:
      return null
  }
}

function Field({ label, value, onChange, type = "text", placeholder, className }: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: "text" | "color"
  placeholder?: string
  className?: string
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {type === "color" ? (
        <div className="flex items-center gap-2">
          <input type="color" value={value || "#6B7280"} onChange={(e) => onChange(e.target.value)} className="h-7 w-10 cursor-pointer rounded border p-0.5" />
          <span className="text-xs text-muted-foreground">{value || "Default"}</span>
          {value && <button type="button" className="text-xs text-muted-foreground underline" onClick={() => onChange("")}>Reset</button>}
        </div>
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`h-8 text-sm ${className ?? ""}`} />
      )}
    </div>
  )
}
