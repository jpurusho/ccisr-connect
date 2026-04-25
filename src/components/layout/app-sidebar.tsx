"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Send,
  Clock,
  History,
  Mail,
  BarChart3,
  Settings,
  Church,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { UserNav } from "@/components/layout/user-nav"
import { APP_VERSION } from "@/lib/version"

const membershipNav = [
  { title: "Communication Hub", href: "/dashboard", icon: LayoutDashboard },
  { title: "Members", href: "/members", icon: Users },
  { title: "Calendar", href: "/calendar", icon: CalendarDays },
  { title: "Reports", href: "/reports", icon: BarChart3 },
]

const communicationsNav = [
  { title: "Compose", href: "/compose", icon: Send },
  { title: "Dispatch Queue", href: "/dispatch", icon: Clock },
  { title: "Mailing Lists", href: "/mailing-lists", icon: Mail },
  { title: "History", href: "/history", icon: History },
]

const configNav = [
  { title: "Settings", href: "/settings", icon: Settings },
]

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string
  items: typeof membershipNav
  pathname: string
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href)

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  isActive={isActive}
                  tooltip={item.title}
                  render={<Link href={item.href} />}
                >
                  <item.icon className="size-4" />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Church className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">CCISR Connect</span>
                <span className="text-xs text-muted-foreground">
                  Church Management
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavGroup label="Membership" items={membershipNav} pathname={pathname} />
        <NavGroup label="Communications" items={communicationsNav} pathname={pathname} />
        <NavGroup label="Configuration" items={configNav} pathname={pathname} />
      </SidebarContent>

      <SidebarFooter>
        <UserNav />
        <p className="px-3 pb-2 text-[10px] text-muted-foreground/50">v{APP_VERSION}</p>
      </SidebarFooter>
    </Sidebar>
  )
}
