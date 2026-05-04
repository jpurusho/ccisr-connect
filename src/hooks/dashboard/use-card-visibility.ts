"use client"

import { useState } from "react"
import type { CommType } from "@/lib/dashboard-types"

const BUILTIN_TYPES: CommType[] = ["bulletin", "birthday", "anniversary", "bible_study", "womens_study", "prayer_meeting"]
const TEMPLATE_STORAGE_KEY = "ccisr-dashboard-templates"
const CUSTOM_HIDDEN_KEY = "ccisr-dashboard-hidden-custom"

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

function loadHiddenCustom(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const saved = localStorage.getItem(CUSTOM_HIDDEN_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as string[]
      if (Array.isArray(parsed)) return new Set(parsed)
    }
  } catch { /* ignore */ }
  return new Set()
}

export function useCardVisibility() {
  const [visibleTemplates, setVisibleTemplates] = useState<CommType[]>(() => loadVisibleTemplates())
  const [hiddenCustom, setHiddenCustom] = useState<Set<string>>(() => loadHiddenCustom())

  function toggleTemplate(type: CommType) {
    setVisibleTemplates((prev) => {
      const next = prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
      localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  function isCustomVisible(id: string): boolean {
    return !hiddenCustom.has(id)
  }

  function toggleCustomTemplate(id: string) {
    setHiddenCustom((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      localStorage.setItem(CUSTOM_HIDDEN_KEY, JSON.stringify([...next]))
      return next
    })
  }

  return { visibleTemplates, toggleTemplate, isCustomVisible, toggleCustomTemplate }
}
