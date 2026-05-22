"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ChevronDown, ChevronRight, Plus, X } from "lucide-react"
import type {
  TemplateStyleSettings,
  FontFamily,
  FontSizeScale,
  HeaderStyle,
  HeaderGradient,
  SectionLayout,
} from "@/lib/email/card-builder"
import { HEADER_GRADIENTS } from "@/lib/email/card-builder"

interface TemplateStyleEditorProps {
  value: TemplateStyleSettings
  onChange: (settings: TemplateStyleSettings) => void
}

const FONT_OPTIONS: { value: FontFamily; label: string; preview: string }[] = [
  { value: "sans-serif", label: "Sans-serif", preview: "Aa" },
  { value: "serif", label: "Serif", preview: "Aa" },
  { value: "rounded", label: "Rounded", preview: "Aa" },
  { value: "monospace", label: "Monospace", preview: "Aa" },
]

const SIZE_OPTIONS: { value: FontSizeScale; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "default", label: "Default" },
  { value: "large", label: "Large" },
]

const HEADER_OPTIONS: { value: HeaderStyle; label: string; desc: string }[] = [
  { value: "band", label: "Full Band", desc: "Colored background" },
  { value: "top-border", label: "Top Border", desc: "Thin colored top line" },
  { value: "side-accent", label: "Side Accent", desc: "Left colored bar" },
]

const LAYOUT_OPTIONS: { value: SectionLayout; label: string; desc: string }[] = [
  { value: "table", label: "Table", desc: "Two columns" },
  { value: "paragraph", label: "Paragraph", desc: "Flowing text" },
  { value: "list", label: "List", desc: "Bullet points" },
]

export function TemplateStyleEditor({ value, onChange }: TemplateStyleEditorProps) {
  const [expanded, setExpanded] = useState(false)
  const [addingPastel, setAddingPastel] = useState(false)
  const [newPastelBg, setNewPastelBg] = useState("#E8F4FD")
  const [newPastelBorder, setNewPastelBorder] = useState("#38BDF8")
  const [newPastelLabel, setNewPastelLabel] = useState("")

  function update(partial: Partial<TemplateStyleSettings>) {
    onChange({ ...value, ...partial })
  }

  function addCustomPastel() {
    if (!newPastelBg || !newPastelBorder) return
    const existing = value.customPastels ?? []
    update({
      customPastels: [...existing, { bg: newPastelBg, border: newPastelBorder, label: newPastelLabel || "Custom" }],
    })
    setAddingPastel(false)
    setNewPastelBg("#E8F4FD")
    setNewPastelBorder("#38BDF8")
    setNewPastelLabel("")
  }

  function removePastel(index: number) {
    const existing = [...(value.customPastels ?? [])]
    existing.splice(index, 1)
    update({ customPastels: existing.length > 0 ? existing : undefined })
  }

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-left hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
        Style & Appearance
        {(value.fontFamily || value.headerStyle || value.sectionLayout || value.footerText || (value.headerGradient && value.headerGradient !== "none")) && (
          <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">customized</span>
        )}
      </button>

      {expanded && (
        <div className="border-t px-3 pb-3 space-y-4">
          {/* Quick Theme Packages */}
          <div className="pt-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quick Theme</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { name: "Classic", fontFamily: "serif" as FontFamily, headerStyle: "band" as HeaderStyle, gradient: "none" as HeaderGradient },
                { name: "Modern", fontFamily: "sans-serif" as FontFamily, headerStyle: "top-border" as HeaderStyle, gradient: "ocean" as HeaderGradient },
                { name: "Festive", fontFamily: "rounded" as FontFamily, headerStyle: "band" as HeaderStyle, gradient: "sunset" as HeaderGradient },
                { name: "Elegant", fontFamily: "serif" as FontFamily, headerStyle: "side-accent" as HeaderStyle, gradient: "lavender" as HeaderGradient },
                { name: "Bold", fontFamily: "sans-serif" as FontFamily, headerStyle: "band" as HeaderStyle, gradient: "midnight" as HeaderGradient },
                { name: "Fresh", fontFamily: "rounded" as FontFamily, headerStyle: "band" as HeaderStyle, gradient: "emerald" as HeaderGradient },
              ].map((pkg) => (
                <Button
                  key={pkg.name}
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] px-2.5"
                  onClick={() => update({ fontFamily: pkg.fontFamily, headerStyle: pkg.headerStyle, headerGradient: pkg.gradient })}
                >
                  {pkg.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Typography */}
          <div className="pt-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Typography</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Font</Label>
                <Select
                  value={value.fontFamily ?? "sans-serif"}
                  onValueChange={(v) => update({ fontFamily: v as FontFamily })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        <span style={{ fontFamily: f.value === "serif" ? "Georgia, serif" : f.value === "monospace" ? "'Courier New', monospace" : "inherit" }}>
                          {f.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Size</Label>
                <Select
                  value={value.fontSizeScale ?? "default"}
                  onValueChange={(v) => update({ fontSizeScale: v as FontSizeScale })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZE_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Header Style */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Header Style</p>
            <div className="grid grid-cols-3 gap-1.5">
              {HEADER_OPTIONS.map((h) => (
                <button
                  key={h.value}
                  type="button"
                  className={`rounded-md border p-2 text-center transition-all ${
                    (value.headerStyle ?? "band") === h.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border hover:border-muted-foreground"
                  }`}
                  onClick={() => update({ headerStyle: h.value })}
                >
                  <div className="mb-1">
                    {h.value === "band" && <div className="mx-auto h-3 w-full rounded-sm bg-primary/70" />}
                    {h.value === "top-border" && <div className="mx-auto h-0.5 w-full rounded-sm bg-primary/70" />}
                    {h.value === "side-accent" && <div className="mx-auto h-4 w-1 rounded-sm bg-primary/70 mr-auto ml-0" />}
                  </div>
                  <p className="text-[10px] font-medium">{h.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Header Gradient */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Header Background</p>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                className={`rounded-md border p-1.5 text-center transition-all ${
                  !value.headerGradient || value.headerGradient === "none"
                    ? "border-primary ring-1 ring-primary/30"
                    : "border-border hover:border-muted-foreground"
                }`}
                onClick={() => update({ headerGradient: "none", customGradientCss: undefined })}
              >
                <div className="mx-auto h-4 w-full rounded-sm bg-primary/70" />
                <p className="text-[9px] mt-0.5">Solid</p>
              </button>
              {(Object.entries(HEADER_GRADIENTS) as [Exclude<HeaderGradient, "none" | "custom">, { label: string; css: string }][]).map(([key, g]) => (
                <button
                  key={key}
                  type="button"
                  className={`rounded-md border p-1.5 text-center transition-all ${
                    value.headerGradient === key
                      ? "border-primary ring-1 ring-primary/30"
                      : "border-border hover:border-muted-foreground"
                  }`}
                  onClick={() => update({ headerGradient: key })}
                >
                  <div className="mx-auto h-4 w-full rounded-sm" style={{ background: g.css }} />
                  <p className="text-[9px] mt-0.5">{g.label}</p>
                </button>
              ))}
              <button
                type="button"
                className={`rounded-md border p-1.5 text-center transition-all ${
                  value.headerGradient === "custom"
                    ? "border-primary ring-1 ring-primary/30"
                    : "border-border hover:border-muted-foreground"
                }`}
                onClick={() => update({ headerGradient: "custom" })}
              >
                <div className="mx-auto h-4 w-full rounded-sm bg-gradient-to-r from-gray-300 to-gray-500" />
                <p className="text-[9px] mt-0.5">Custom</p>
              </button>
            </div>
            {value.headerGradient === "custom" && (
              <Input
                value={value.customGradientCss ?? ""}
                onChange={(e) => update({ customGradientCss: e.target.value })}
                placeholder="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                className="h-7 text-xs font-mono"
              />
            )}
          </div>

          {/* Section Layout */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Section Layout</p>
            <div className="grid grid-cols-3 gap-1.5">
              {LAYOUT_OPTIONS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  className={`rounded-md border px-2 py-1.5 text-center transition-all ${
                    (value.sectionLayout ?? "table") === l.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border hover:border-muted-foreground"
                  }`}
                  onClick={() => update({ sectionLayout: l.value })}
                >
                  <p className="text-xs font-medium">{l.label}</p>
                  <p className="text-[10px] text-muted-foreground">{l.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Pastels */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Custom Pastels</p>
            {(value.customPastels ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {value.customPastels!.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]"
                    style={{ backgroundColor: p.bg, border: `1.5px solid ${p.border}` }}
                  >
                    <span>{p.label}</span>
                    <button type="button" onClick={() => removePastel(i)} className="hover:text-destructive">
                      <X className="size-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {addingPastel ? (
              <div className="space-y-2 rounded-md border bg-muted/30 p-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[10px]">Background</Label>
                    <Input
                      type="color"
                      value={newPastelBg}
                      onChange={(e) => setNewPastelBg(e.target.value)}
                      className="h-7 w-full p-0.5"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Border</Label>
                    <Input
                      type="color"
                      value={newPastelBorder}
                      onChange={(e) => setNewPastelBorder(e.target.value)}
                      className="h-7 w-full p-0.5"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Label</Label>
                    <Input
                      value={newPastelLabel}
                      onChange={(e) => setNewPastelLabel(e.target.value)}
                      placeholder="Name"
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="h-6 flex-1 rounded"
                    style={{ backgroundColor: newPastelBg, border: `1.5px solid ${newPastelBorder}` }}
                  />
                  <Button size="sm" className="h-6 text-xs" onClick={addCustomPastel}>Add</Button>
                  <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setAddingPastel(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingPastel(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <Plus className="size-3" /> Add custom pastel
              </button>
            )}
          </div>

          {/* Footer */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Footer</p>
            <Input
              value={value.footerText ?? ""}
              onChange={(e) => update({ footerText: e.target.value || undefined })}
              placeholder="Custom footer text (default: church name)"
              className="h-8 text-xs"
            />
          </div>

          {/* Dark Mode */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium">Dark mode support</p>
              <p className="text-[10px] text-muted-foreground">Apple Mail, Outlook.com (not Gmail)</p>
            </div>
            <Switch
              size="sm"
              checked={value.darkModeEnabled ?? false}
              onCheckedChange={(checked) => update({ darkModeEnabled: checked || undefined })}
            />
          </div>
        </div>
      )}
    </div>
  )
}
