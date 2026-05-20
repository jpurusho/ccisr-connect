"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command"
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Mail,
  ClipboardList,
  Settings,
  Search,
  User,
} from "lucide-react"

const PAGES = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Members", href: "/members", icon: Users },
  { label: "Email", href: "/email", icon: Mail },
  { label: "Signups", href: "/signups", icon: ClipboardList },
  { label: "Settings", href: "/settings", icon: Settings },
]

interface MemberResult {
  id: string
  full_name: string
  family_name?: string
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [members, setMembers] = useState<MemberResult[]>([])
  const router = useRouter()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  const searchMembers = useCallback(async (q: string) => {
    if (q.length < 2) { setMembers([]); return }
    const supabase = createClient()
    const { data } = await supabase
      .from("members")
      .select("id, full_name, family:families(family_name)")
      .ilike("full_name", `%${q}%`)
      .eq("is_active", true)
      .limit(8)
      .returns<{ id: string; full_name: string; family: { family_name: string } | null }[]>()
    setMembers((data ?? []).map((m) => ({ id: m.id, full_name: m.full_name, family_name: m.family?.family_name ?? undefined })))
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => searchMembers(query), 200)
    return () => clearTimeout(timer)
  }, [query, searchMembers])

  function navigate(href: string) {
    setOpen(false)
    setQuery("")
    router.push(href)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search members, pages..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          {PAGES.map((p) => (
            <CommandItem key={p.href} onSelect={() => navigate(p.href)}>
              <p.icon className="size-4" />
              {p.label}
            </CommandItem>
          ))}
        </CommandGroup>
        {members.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Members">
              {members.map((m) => (
                <CommandItem key={m.id} onSelect={() => navigate(`/members/${m.id}`)}>
                  <User className="size-4" />
                  <span>{m.full_name}</span>
                  {m.family_name && <span className="ml-auto text-xs text-muted-foreground">{m.family_name}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
