"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { useBreadcrumbTitle } from "./breadcrumb-context"

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/members": "Members",
  "/email": "Email",
  "/settings": "Settings",
  "/calendar": "Calendar",
  "/dispatch": "Dispatch",
  "/mailing-lists": "Mailing Lists",
  "/history": "History",
  "/reports": "Reports",
  "/templates": "Templates",
  "/signups": "Signups",
}

export function DynamicBreadcrumb() {
  const pathname = usePathname()
  const { pageTitle } = useBreadcrumbTitle()

  if (pathname === "/dashboard") {
    return <span className="text-sm font-medium">Dashboard</span>
  }

  const segments: { label: string; href: string }[] = [
    { label: "Dashboard", href: "/dashboard" },
  ]

  if (pathname.startsWith("/members/")) {
    segments.push({ label: "Members", href: "/members" })
    segments.push({ label: pageTitle || "Details", href: pathname })
  } else if (pathname.startsWith("/signups/")) {
    segments.push({ label: "Signups", href: "/signups" })
    segments.push({ label: pageTitle || "Responses", href: pathname })
  } else if (pathname.startsWith("/settings")) {
    segments.push({ label: "Settings", href: "/settings" })
  } else {
    const label = ROUTE_LABELS[pathname]
    if (label) {
      segments.push({ label, href: pathname })
    }
  }

  return (
    <nav className="flex items-center gap-1 text-sm min-w-0">
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1
        return (
          <span key={seg.href} className="flex items-center gap-1 min-w-0">
            {i > 0 && <ChevronRight className="size-3 shrink-0 text-muted-foreground/50" />}
            {isLast ? (
              <span className="font-medium text-foreground truncate">{seg.label}</span>
            ) : (
              <Link
                href={seg.href}
                className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
              >
                {seg.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
