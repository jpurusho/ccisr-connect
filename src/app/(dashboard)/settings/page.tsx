"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Check, Sun, Moon, Flame, Code2, Star, Waves, TreePine, Palette } from "lucide-react"

const lightThemes = [
  {
    id: "light",
    name: "Light",
    icon: Sun,
    description: "Clean and minimal",
    colors: {
      bg: "oklch(1 0 0)",
      card: "oklch(0.97 0 0)",
      primary: "oklch(0.205 0 0)",
      accent: "oklch(0.97 0 0)",
      sidebar: "oklch(0.985 0 0)",
    },
  },
  {
    id: "warm",
    name: "Warm",
    icon: Flame,
    description: "Amber and honey tones",
    colors: {
      bg: "oklch(0.97 0.012 85)",
      card: "oklch(0.93 0.02 80)",
      primary: "oklch(0.55 0.15 55)",
      accent: "oklch(0.88 0.06 75)",
      sidebar: "oklch(0.94 0.02 78)",
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    icon: Waves,
    description: "Calm blues and teals",
    colors: {
      bg: "oklch(0.97 0.01 230)",
      card: "oklch(0.93 0.02 225)",
      primary: "oklch(0.55 0.13 230)",
      accent: "oklch(0.95 0.03 225)",
      sidebar: "oklch(0.95 0.03 225)",
    },
  },
  {
    id: "forest",
    name: "Forest",
    icon: TreePine,
    description: "Natural greens",
    colors: {
      bg: "oklch(0.98 0.02 150)",
      card: "oklch(0.94 0.03 150)",
      primary: "oklch(0.60 0.15 150)",
      accent: "oklch(0.96 0.04 150)",
      sidebar: "oklch(0.96 0.04 150)",
    },
  },
]

const darkThemes = [
  {
    id: "dark",
    name: "Dark",
    icon: Moon,
    description: "Classic dark mode",
    colors: {
      bg: "oklch(0.145 0 0)",
      card: "oklch(0.205 0 0)",
      primary: "oklch(0.922 0 0)",
      accent: "oklch(0.269 0 0)",
      sidebar: "oklch(0.205 0 0)",
    },
  },
  {
    id: "github-dark",
    name: "GitHub Dark Pro",
    icon: Code2,
    description: "Inspired by GitHub",
    colors: {
      bg: "oklch(0.16 0.01 260)",
      card: "oklch(0.20 0.01 260)",
      primary: "oklch(0.70 0.14 250)",
      accent: "oklch(0.52 0.18 260)",
      sidebar: "oklch(0.08 0.01 260)",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    icon: Star,
    description: "Deep navy blues",
    colors: {
      bg: "oklch(0.18 0.04 270)",
      card: "oklch(0.25 0.03 265)",
      primary: "oklch(0.62 0.19 260)",
      accent: "oklch(0.40 0.18 265)",
      sidebar: "oklch(0.10 0.04 270)",
    },
  },
]

function ThemeCard({
  themeConfig,
  isActive,
  onSelect,
}: {
  themeConfig: (typeof lightThemes)[number]
  isActive: boolean
  onSelect: () => void
}) {
  const Icon = themeConfig.icon

  return (
    <button
      onClick={onSelect}
      className={`group relative flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all duration-200 hover:shadow-lg ${
        isActive
          ? "border-primary shadow-md ring-2 ring-primary/20"
          : "border-border hover:border-primary/40"
      }`}
    >
      {/* Color swatch preview */}
      <div
        className="relative h-28 w-full"
        style={{ backgroundColor: themeConfig.colors.bg }}
      >
        {/* Sidebar preview strip */}
        <div
          className="absolute inset-y-0 left-0 w-12"
          style={{ backgroundColor: themeConfig.colors.sidebar }}
        />
        {/* Card preview */}
        <div
          className="absolute right-3 top-3 h-14 w-24 rounded-md border shadow-sm"
          style={{
            backgroundColor: themeConfig.colors.card,
            borderColor: themeConfig.colors.accent,
          }}
        >
          {/* Primary color bar inside card */}
          <div
            className="mx-2 mt-2 h-2 w-12 rounded-full"
            style={{ backgroundColor: themeConfig.colors.primary }}
          />
          <div
            className="mx-2 mt-1.5 h-1.5 w-16 rounded-full opacity-30"
            style={{ backgroundColor: themeConfig.colors.primary }}
          />
          <div
            className="mx-2 mt-1 h-1.5 w-10 rounded-full opacity-15"
            style={{ backgroundColor: themeConfig.colors.primary }}
          />
        </div>
        {/* Accent dot */}
        <div
          className="absolute bottom-3 right-3 h-5 w-5 rounded-full"
          style={{ backgroundColor: themeConfig.colors.primary }}
        />
        {/* Selected check */}
        {isActive && (
          <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-3" />
          </div>
        )}
      </div>

      {/* Theme info */}
      <div className="flex items-center gap-2.5 border-t px-3 py-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{themeConfig.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {themeConfig.description}
          </p>
        </div>
      </div>
    </button>
  )
}

export default function SettingsAppearancePage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appearance</h1>
          <p className="text-muted-foreground">
            Customize how CCISR Connect looks for you.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-xl border bg-muted"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Palette className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appearance</h1>
          <p className="text-muted-foreground">
            Customize how CCISR Connect looks for you. Choose a theme that suits
            your style.
          </p>
        </div>
      </div>

      {/* Light Themes */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sun className="size-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Light Themes</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {lightThemes.map((t) => (
            <ThemeCard
              key={t.id}
              themeConfig={t}
              isActive={theme === t.id}
              onSelect={() => setTheme(t.id)}
            />
          ))}
        </div>
      </section>

      {/* Dark Themes */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Moon className="size-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Dark Themes</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {darkThemes.map((t) => (
            <ThemeCard
              key={t.id}
              themeConfig={t}
              isActive={theme === t.id}
              onSelect={() => setTheme(t.id)}
            />
          ))}
        </div>
      </section>

      {/* Current theme info */}
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Active theme:{" "}
          <span className="font-semibold text-foreground">
            {[...lightThemes, ...darkThemes].find((t) => t.id === theme)
              ?.name ?? theme}
          </span>
        </p>
      </div>
    </div>
  )
}
