"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/members": "Members",
  "/email": "Email",
  "/settings": "Settings",
  "/calendar": "Calendar",
  "/compose": "Compose",
  "/dispatch": "Dispatch",
  "/mailing-lists": "Mailing Lists",
  "/history": "History",
  "/reports": "Reports",
  "/templates": "Templates",
}

export function DynamicBreadcrumb() {
  const pathname = usePathname()

  if (pathname === "/dashboard") {
    return <span className="text-sm font-medium">Dashboard</span>
  }

  const segments: { label: string; href: string }[] = [
    { label: "Dashboard", href: "/dashboard" },
  ]

  // Build breadcrumb segments from path
  if (pathname.startsWith("/members/")) {
    segments.push({ label: "Members", href: "/members" })
    // Member detail page — show generic label (name loaded by the page itself)
    segments.push({ label: "Details", href: pathname })
  } else if (pathname.startsWith("/settings")) {
    segments.push({ label: "Settings", href: "/settings" })
  } else {
    const label = ROUTE_LABELS[pathname]
    if (label) {
      segments.push({ label, href: pathname })
    }
  }

  return (
    <nav className="flex items-center gap-1 text-sm">
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1
        return (
          <span key={seg.href} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3 text-muted-foreground/50" />}
            {isLast ? (
              <span className="font-medium text-foreground">{seg.label}</span>
            ) : (
              <Link
                href={seg.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
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
