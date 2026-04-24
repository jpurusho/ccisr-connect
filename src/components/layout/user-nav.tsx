"use client"

import { useRouter } from "next/navigation"
import { ChevronsUpDown, LogOut, User, Palette } from "lucide-react"
import { useTheme } from "next-themes"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

// Placeholder user data - will be replaced with real auth data
const placeholderUser = {
  name: "Church Admin",
  email: "admin@ccisr.org",
  initials: "CA",
}

export function UserNav() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  const handleSignOut = async () => {
    try {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch {
      // Supabase client may not be configured yet
    }
    router.push("/login")
  }

  const cycleTheme = () => {
    const themes = ["light", "dark", "warm"]
    const currentIndex = themes.indexOf(theme ?? "light")
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            }
          >
            <Avatar size="sm">
              <AvatarFallback className="text-xs">
                {placeholderUser.initials}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">
                {placeholderUser.name}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {placeholderUser.email}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {placeholderUser.name}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {placeholderUser.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/settings/profile")}>
                <User className="size-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={cycleTheme}>
                <Palette className="size-4" />
                <span>Theme ({theme ?? "light"})</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="size-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
