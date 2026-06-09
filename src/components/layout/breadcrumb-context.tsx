"use client"

import { createContext, useContext, useState, useCallback } from "react"

interface BreadcrumbContextValue {
  pageTitle: string | null
  setPageTitle: (title: string | null) => void
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  pageTitle: null,
  setPageTitle: () => {},
})

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [pageTitle, setPageTitleState] = useState<string | null>(null)
  const setPageTitle = useCallback((title: string | null) => setPageTitleState(title), [])
  return (
    <BreadcrumbContext.Provider value={{ pageTitle, setPageTitle }}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

export function useBreadcrumbTitle() {
  return useContext(BreadcrumbContext)
}
