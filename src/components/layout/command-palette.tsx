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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

  const [showShortcuts, setShowShortcuts] = useState(false)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === "?" && !isInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setShowShortcuts((prev) => !prev)
      }
      if (isInput) return
      if (e.key === "g" && !e.metaKey && !e.ctrlKey) {
        const next = e
        const handler = (e2: KeyboardEvent) => {
          document.removeEventListener("keydown", handler)
          if (e2.key === "d") router.push("/dashboard")
          else if (e2.key === "c") router.push("/calendar")
          else if (e2.key === "m") router.push("/members")
          else if (e2.key === "s") router.push("/signups")
          else if (e2.key === "e") router.push("/email")
        }
        document.addEventListener("keydown", handler, { once: true })
        setTimeout(() => document.removeEventListener("keydown", handler), 1000)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [router])

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
    <>
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

    <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {[
            ["⌘ K", "Open command palette"],
            ["?", "Show this help"],
            ["g then d", "Go to Dashboard"],
            ["g then c", "Go to Calendar"],
            ["g then m", "Go to Members"],
            ["g then s", "Go to Signups"],
            ["g then e", "Go to Email"],
          ].map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-muted-foreground">{desc}</span>
              <kbd className="rounded border bg-muted px-2 py-0.5 text-xs font-mono">{key}</kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
