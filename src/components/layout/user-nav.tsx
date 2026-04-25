"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/ui/button"
import {
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface UserInfo {
  name: string
  email: string
  avatar: string | null
  initials: string
}

export function UserNav() {
  const router = useRouter()
  const [user, setUser] = useState<UserInfo | null>(null)

  useEffect(() => {
    async function loadUser() {
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          const meta = authUser.user_metadata ?? {}
          const idMeta = authUser.identities?.[0]?.identity_data ?? {}
          const name = meta.full_name || meta.name || idMeta.full_name || idMeta.name || authUser.email?.split("@")[0] || "User"
          const email = authUser.email || ""
          const avatar = meta.avatar_url || meta.picture || idMeta.avatar_url || idMeta.picture || null
          const parts = String(name).trim().split(/\s+/)
          const initials = parts.length >= 2
            ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
            : name.slice(0, 2).toUpperCase()
          setUser({ name, email, avatar, initials })
        }
      } catch {
        // Auth not configured
      }
    }
    loadUser()
  }, [])

  const handleSignOut = async () => {
    try {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch {
      // ignore
    }
    router.push("/login")
  }

  if (!user) return null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex items-center gap-2.5 px-2 py-2 overflow-hidden">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="size-7 shrink-0 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
              {user.initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium leading-tight">
              {user.name}
            </p>
            <p className="truncate text-[10px] leading-tight text-muted-foreground">
              {user.email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            onClick={handleSignOut}
            title="Sign out"
          >
            <LogOut className="size-3.5" />
          </Button>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
