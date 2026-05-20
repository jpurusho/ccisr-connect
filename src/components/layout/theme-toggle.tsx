"use client"

import { useEffect, useState, useRef } from "react"
import { useTheme } from "next-themes"
import {
  Sun,
  Moon,
  Flame,
  Code2,
  Star,
  Waves,
  TreePine,
  Palette,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const THEMES = [
  { value: "light", label: "Light", icon: Sun, group: "light" },
  { value: "warm", label: "Warm", icon: Flame, group: "light" },
  { value: "ocean", label: "Ocean", icon: Waves, group: "light" },
  { value: "forest", label: "Forest", icon: TreePine, group: "light" },
  { value: "dark", label: "Dark", icon: Moon, group: "dark" },
  { value: "github-dark", label: "GitHub Dark", icon: Code2, group: "dark" },
  { value: "midnight", label: "Midnight", icon: Star, group: "dark" },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  const icon = !mounted ? (
    <Palette className="size-4" />
  ) : theme === "dark" || theme === "github-dark" || theme === "midnight" ? (
    <Moon className="size-4" />
  ) : theme === "warm" ? (
    <Flame className="size-4" />
  ) : theme === "ocean" ? (
    <Waves className="size-4" />
  ) : theme === "forest" ? (
    <TreePine className="size-4" />
  ) : (
    <Sun className="size-4" />
  )

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen((prev) => !prev)}
        title="Toggle theme"
      >
        {icon}
        <span className="sr-only">Toggle theme</span>
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-40 rounded-lg border bg-popover p-1 shadow-lg">
          <p className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Light</p>
          {THEMES.filter((t) => t.group === "light").map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.value}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent ${theme === t.value ? "bg-accent font-medium" : ""}`}
                onClick={() => { setTheme(t.value); setOpen(false) }}
              >
                <Icon className="size-3.5" />
                {t.label}
              </button>
            )
          })}
          <div className="my-1 border-t" />
          <p className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Dark</p>
          {THEMES.filter((t) => t.group === "dark").map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.value}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent ${theme === t.value ? "bg-accent font-medium" : ""}`}
                onClick={() => { setTheme(t.value); setOpen(false) }}
              >
                <Icon className="size-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
