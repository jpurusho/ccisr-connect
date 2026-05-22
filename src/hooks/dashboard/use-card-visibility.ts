"use client"

import { useState, useCallback } from "react"
import type { CommType } from "@/lib/dashboard-types"

const BUILTIN_TYPES: CommType[] = ["bulletin", "birthday", "anniversary", "bible_study", "womens_study", "prayer_meeting"]
const ORDER_STORAGE_KEY = "ccisr-dashboard-card-order"
const HIDDEN_STORAGE_KEY = "ccisr-dashboard-hidden-cards"
const CUSTOM_HIDDEN_KEY = "ccisr-dashboard-hidden-custom"

interface CardOrderItem {
  type: string
  visible: boolean
}

function loadCardOrder(): CardOrderItem[] {
  if (typeof window === "undefined") return BUILTIN_TYPES.map((t) => ({ type: t, visible: true }))
  try {
    const saved = localStorage.getItem(ORDER_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as CardOrderItem[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch { /* ignore */ }
  return BUILTIN_TYPES.map((t) => ({ type: t, visible: true }))
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
  const [cardOrder, setCardOrder] = useState<CardOrderItem[]>(() => loadCardOrder())
  const [hiddenCustom, setHiddenCustom] = useState<Set<string>>(() => loadHiddenCustom())

  const visibleTemplates = cardOrder.filter((c) => c.visible).map((c) => c.type as CommType)

  function toggleTemplate(type: CommType) {
    setCardOrder((prev) => {
      const next = prev.map((c) => c.type === type ? { ...c, visible: !c.visible } : c)
      // Add if not in list yet
      if (!next.find((c) => c.type === type)) {
        next.push({ type, visible: true })
      }
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next))
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

  const reorderCards = useCallback((fromIndex: number, toIndex: number) => {
    setCardOrder((prev) => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const ensureCardInOrder = useCallback((type: string) => {
    setCardOrder((prev) => {
      if (prev.find((c) => c.type === type)) return prev
      const next = [...prev, { type, visible: true }]
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return {
    visibleTemplates,
    cardOrder,
    toggleTemplate,
    isCustomVisible,
    toggleCustomTemplate,
    reorderCards,
    ensureCardInOrder,
  }
}
