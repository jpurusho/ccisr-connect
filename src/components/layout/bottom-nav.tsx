"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Menu,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/ui/sidebar"

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Calendar",
    href: "/calendar",
    icon: CalendarDays,
  },
  {
    title: "Members",
    href: "/members",
    icon: Users,
  },
  {
    title: "More",
    href: "#",
    icon: Menu,
    action: "sidebar" as const,
  },
]

export function BottomNav() {
  const pathname = usePathname()
  const { toggleSidebar } = useSidebar()

  const handleClick = (e: React.MouseEvent, item: typeof navItems[0]) => {
    if (item.action === "sidebar") {
      e.preventDefault()
      toggleSidebar()
    }
  }

  return (
    <nav className="lg:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href) && item.href !== "#"

          const Icon = item.icon

          return (
            <Link
              key={item.title}
              href={item.href}
              onClick={(e) => handleClick(e, item)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-w-[60px] h-full rounded-lg transition-colors",
                "active:scale-95 active:bg-accent/50",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.title}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
