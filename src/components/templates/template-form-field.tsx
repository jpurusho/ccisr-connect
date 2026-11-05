import { memo } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export const Field = memo(function Field({
  label,
  htmlFor,
  hint,
  children
}: {
  label: string
  htmlFor?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
})

const COLOR_PRESETS = [
  { label: "Purple", value: "#7C3AED" },
  { label: "Gold", value: "#D97706" },
  { label: "Teal", value: "#0D9488" },
  { label: "Rose", value: "#DB2777" },
  { label: "Green", value: "#059669" },
  { label: "Indigo", value: "#4F46E5" },
  { label: "Blue", value: "#2563EB" },
  { label: "Red", value: "#DC2626" },
  { label: "Orange", value: "#EA580C" },
  { label: "Cyan", value: "#0891B2" },
  { label: "Slate", value: "#475569" },
]

export const ColorPickerField = memo(function ColorPickerField({
  value,
  onChange,
  defaultColor
}: {
  value: string | undefined
  onChange: (color: string) => void
  defaultColor: string
}) {
  const current = value || defaultColor
  return (
    <div className="space-y-1.5">
      <Label>Theme Color</Label>
      <div className="flex items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              title={preset.label}
              className={`size-6 rounded-full border-2 transition-transform hover:scale-110 ${current === preset.value ? "border-foreground scale-110" : "border-transparent"}`}
              style={{ backgroundColor: preset.value }}
              onClick={() => onChange(preset.value)}
            />
          ))}
        </div>
        <Input
          type="color"
          value={current}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-12 cursor-pointer rounded border p-0.5"
        />
      </div>
    </div>
  )
})
