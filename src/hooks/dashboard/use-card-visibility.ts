"use client"

import { useState } from "react"
import type { CommType } from "@/lib/dashboard-types"

const BUILTIN_TYPES: CommType[] = ["bulletin", "birthday", "anniversary", "bible_study", "womens_study", "prayer_meeting"]
const TEMPLATE_STORAGE_KEY = "ccisr-dashboard-templates"

function loadVisibleTemplates(): CommType[] {
  if (typeof window === "undefined") return BUILTIN_TYPES
  try {
    const saved = localStorage.getItem(TEMPLATE_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as string[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as CommType[]
    }
  } catch { /* ignore */ }
  return BUILTIN_TYPES
}

export function useCardVisibility() {
  const [visibleTemplates, setVisibleTemplates] = useState<CommType[]>(() => loadVisibleTemplates())

  function toggleTemplate(type: CommType) {
    setVisibleTemplates((prev) => {
      const next = prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
      localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  return { visibleTemplates, toggleTemplate }
}
