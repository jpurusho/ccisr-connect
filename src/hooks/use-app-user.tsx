"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import type { AppUser } from "@/types/database"

type AppUserContextValue = {
  appUser: AppUser | null
  loading: boolean
}

const AppUserContext = createContext<AppUserContextValue>({ appUser: null, loading: true })

export function AppUserProvider({ children }: { children: ReactNode }) {
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setLoading(false)
        return
      }
      const { data } = await supabase
        .from("app_users")
        .select("*")
        .eq("id", user.id)
        .single()
      setAppUser(data)
      setLoading(false)
    })
  }, [])

  return (
    <AppUserContext.Provider value={{ appUser, loading }}>
      {children}
    </AppUserContext.Provider>
  )
}

export function useAppUser() {
  return useContext(AppUserContext)
}
