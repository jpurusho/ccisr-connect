"use client"

import { useState } from "react"
import {
  BookOpen,
  Cake,
  Heart,
  Users,
  HandHelping,
  Newspaper,
  Church,
  Cross,
  Music,
  Baby,
  GraduationCap,
  Flame,
  Star,
  Sun,
  Moon,
  Coffee,
  Utensils,
  Gift,
  TreePine,
  Tent,
  Globe,
  Megaphone,
  CalendarDays,
  Sparkles,
  Crown,
  Palette,
  Drama,
  Gamepad2,
  Trophy,
  Bus,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export const ICON_OPTIONS = [
  { value: "BookOpen", label: "Bible / Study", icon: BookOpen },
  { value: "Cross", label: "Cross / Faith", icon: Cross },
  { value: "Church", label: "Church", icon: Church },
  { value: "HandHelping", label: "Prayer", icon: HandHelping },
  { value: "Cake", label: "Birthday", icon: Cake },
  { value: "Heart", label: "Anniversary / Love", icon: Heart },
  { value: "Users", label: "Group / Fellowship", icon: Users },
  { value: "Newspaper", label: "Bulletin / News", icon: Newspaper },
  { value: "Music", label: "Worship / Music", icon: Music },
  { value: "Baby", label: "Kids / Nursery", icon: Baby },
  { value: "GraduationCap", label: "Youth / Education", icon: GraduationCap },
  { value: "Flame", label: "Holy Spirit / Revival", icon: Flame },
  { value: "Star", label: "Special Event", icon: Star },
  { value: "Sun", label: "Morning / Retreat", icon: Sun },
  { value: "Moon", label: "Evening / Night", icon: Moon },
  { value: "Coffee", label: "Fellowship / Social", icon: Coffee },
  { value: "Utensils", label: "Potluck / Meal", icon: Utensils },
  { value: "Gift", label: "Giving / Charity", icon: Gift },
  { value: "TreePine", label: "Outdoor / Camp", icon: TreePine },
  { value: "Tent", label: "VBS / Camp", icon: Tent },
  { value: "Globe", label: "Missions", icon: Globe },
  { value: "Megaphone", label: "Announcement", icon: Megaphone },
  { value: "CalendarDays", label: "Event / Schedule", icon: CalendarDays },
  { value: "Sparkles", label: "Celebration", icon: Sparkles },
  { value: "Crown", label: "Kingdom / Leadership", icon: Crown },
  { value: "Palette", label: "Creative / Arts", icon: Palette },
  { value: "Drama", label: "Drama / Skit", icon: Drama },
  { value: "Gamepad2", label: "Games / Fun", icon: Gamepad2 },
  { value: "Trophy", label: "Awards / Competition", icon: Trophy },
  { value: "Bus", label: "Transport / Outing", icon: Bus },
] as const

export type IconValue = (typeof ICON_OPTIONS)[number]["value"]

export function getIconComponent(value: string | null | undefined) {
  const found = ICON_OPTIONS.find((o) => o.value === value)
  return found?.icon ?? CalendarDays
}

interface IconPickerProps {
  value: string
  onChange: (value: string) => void
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const selected = ICON_OPTIONS.find((o) => o.value === value)
  const SelectedIcon = selected?.icon ?? CalendarDays

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
        onClick={() => setOpen((p) => !p)}
      >
        <SelectedIcon className="size-4" />
        <span className="text-xs">{selected?.label ?? "Pick icon"}</span>
      </Button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 max-h-56 overflow-y-auto rounded-lg border bg-popover p-2 shadow-lg">
          <div className="grid grid-cols-5 gap-1">
            {ICON_OPTIONS.map((opt) => {
              const Icon = opt.icon
              const isSelected = opt.value === value
              return (
                <button
                  key={opt.value}
                  type="button"
                  title={opt.label}
                  className={`flex items-center justify-center rounded-md p-2 transition-colors hover:bg-accent ${
                    isSelected ? "bg-primary/10 ring-1 ring-primary" : ""
                  }`}
                  onClick={() => { onChange(opt.value); setOpen(false) }}
                >
                  <Icon className="size-4" />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
