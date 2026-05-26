"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { canonicalCityName } from "@/lib/city-utils"
import type { Member, Family, Address, Tag } from "@/types/database"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Printer } from "lucide-react"
import { formatPhone } from "@/lib/utils"

type MemberExport = Member & {
  families:
    | (Pick<Family, "family_name"> & {
        addresses: Pick<Address, "city" | "is_current">[]
      })
    | null
  member_tags?: { tags: Pick<Tag, "id" | "name" | "color"> | null }[]
}

interface MemberExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filter: string
  cityFilter: string
  tagFilter: string
  searchQuery: string
}

const FIELD_OPTIONS = [
  { key: "name", label: "Name", default: true },
  { key: "family", label: "Family", default: true },
  { key: "phone", label: "Phone", default: true },
  { key: "email", label: "Email", default: true },
  { key: "city", label: "City", default: false },
  { key: "role", label: "Role", default: false },
  { key: "tags", label: "Tags", default: true },
  { key: "birthday", label: "Birthday", default: false },
]

export function MemberExportDialog({
  open,
  onOpenChange,
  filter,
  cityFilter,
  tagFilter,
  searchQuery,
}: MemberExportDialogProps) {
  const [members, setMembers] = useState<MemberExport[]>([])
  const [loading, setLoading] = useState(false)
  const [fields, setFields] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    FIELD_OPTIONS.forEach((f) => { init[f.key] = f.default })
    return init
  })

  useEffect(() => {
    if (!open) return

    async function fetchMembers() {
      setLoading(true)
      const supabase = createClient()
      const { data } = await supabase
        .from("members")
        .select("*, families(family_name, addresses(city, is_current)), member_tags(tags(id, name, color))")
        .order("last_name")
        .order("first_name")

      if (data) {
        let result = data as unknown as MemberExport[]

        if (filter === "active") result = result.filter((m) => m.is_active)
        else if (filter === "inactive") result = result.filter((m) => !m.is_active)
        else if (filter === "newcomers") result = result.filter((m) =>
          (m.member_tags ?? []).some((mt) => mt.tags?.name?.toLowerCase() === "newcomer")
        )

        if (cityFilter && cityFilter !== "all") {
          result = result.filter((m) => {
            const addr = m.families?.addresses?.find((a) => a.is_current)
            return canonicalCityName(addr?.city ?? null) === cityFilter
          })
        }

        if (tagFilter && tagFilter !== "all") {
          result = result.filter((m) =>
            (m.member_tags ?? []).some((mt) => mt.tags?.id === tagFilter)
          )
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          result = result.filter(
            (m) =>
              m.full_name.toLowerCase().includes(q) ||
              (m.cell_phone && m.cell_phone.toLowerCase().includes(q)) ||
              (m.email && m.email.toLowerCase().includes(q))
          )
        }

        setMembers(result)
      }
      setLoading(false)
    }

    fetchMembers()
  }, [open, filter, cityFilter, tagFilter, searchQuery])

  function getMemberCity(m: MemberExport): string {
    const addr = m.families?.addresses?.find((a) => a.is_current)
    return canonicalCityName(addr?.city ?? null)
  }

  function getMemberTags(m: MemberExport) {
    return (m.member_tags ?? []).map((mt) => mt.tags).filter(Boolean) as Pick<Tag, "id" | "name" | "color">[]
  }

  function handlePrint() {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const rows = members.map((m) => {
      const memberTags = getMemberTags(m)
      const cells: string[] = []

      if (fields.name) cells.push(`<td class="name">${m.full_name}</td>`)
      if (fields.family) cells.push(`<td>${m.families?.family_name ?? ""}</td>`)
      if (fields.phone) cells.push(`<td class="mono">${m.cell_phone ? formatPhone(m.cell_phone) : ""}</td>`)
      if (fields.email) cells.push(`<td class="email">${m.email ?? ""}</td>`)
      if (fields.city) cells.push(`<td>${getMemberCity(m) !== "Unknown" ? getMemberCity(m) : ""}</td>`)
      if (fields.role) cells.push(`<td class="cap">${m.role_in_family}</td>`)
      if (fields.birthday) cells.push(`<td>${m.birth_month && m.birth_day ? `${m.birth_month}/${m.birth_day}` : ""}</td>`)
      if (fields.tags) {
        const tagHtml = memberTags.map((t) =>
          `<span class="tag" style="background:${t.color}">${t.name}</span>`
        ).join("")
        cells.push(`<td>${tagHtml}</td>`)
      }

      return `<tr>${cells.join("")}</tr>`
    }).join("")

    const headers = FIELD_OPTIONS
      .filter((f) => fields[f.key])
      .map((f) => `<th>${f.label}</th>`)
      .join("")

    printWindow.document.write(`<!DOCTYPE html><html><head>
      <title>Members Directory — CCISR Connect</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', system-ui, sans-serif; color: #1a1a1a; padding: 32px; font-size: 13px; line-height: 1.4; }
        .header { margin-bottom: 24px; }
        .header h1 { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
        .header .meta { display: flex; gap: 16px; margin-top: 6px; font-size: 12px; color: #6b7280; }
        .header .meta span { display: flex; align-items: center; gap: 4px; }
        table { width: 100%; border-collapse: collapse; }
        thead { position: sticky; top: 0; }
        th { text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; padding: 8px 12px; border-bottom: 2px solid #e5e7eb; background: #f9fafb; }
        td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
        tr:hover td { background: #f8fafc; }
        .name { font-weight: 600; white-space: nowrap; }
        .mono { font-family: 'SF Mono', 'JetBrains Mono', monospace; font-size: 12px; }
        .email { font-size: 12px; color: #4b5563; }
        .cap { text-transform: capitalize; }
        .tag { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 500; color: #fff; margin-right: 3px; }
        .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between; }
        @media print {
          body { padding: 16px; }
          th { background: #f3f4f6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .tag { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          tr:hover td { background: none; }
        }
      </style>
    </head><body>
      <div class="header">
        <h1>Member Directory</h1>
        <div class="meta">
          <span>${members.length} member${members.length !== 1 ? "s" : ""}</span>
          <span>${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
        </div>
      </div>
      <table>
        <thead><tr>${headers}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">
        <span>CCISR Connect</span>
        <span>Christ Church of India, San Ramon</span>
      </div>
    </body></html>`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 500)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Export Members</SheetTitle>
          <SheetDescription>
            {loading
              ? "Loading members..."
              : `${members.length} member${members.length !== 1 ? "s" : ""} match current filters`}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="space-y-2 px-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-4 px-4">
            <div>
              <Label className="text-sm font-medium">Fields to include</Label>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {FIELD_OPTIONS.map((opt) => (
                  <label
                    key={opt.key}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Switch
                      size="sm"
                      checked={fields[opt.key]}
                      onCheckedChange={(checked) =>
                        setFields((prev) => ({ ...prev, [opt.key]: checked }))
                      }
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        <SheetFooter>
          <SheetClose render={<Button variant="outline" />}>Close</SheetClose>
          <Button onClick={handlePrint} disabled={loading || members.length === 0}>
            <Printer className="size-4" />
            Print / Save PDF
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
