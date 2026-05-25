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

    const cards = members.map((m) => {
      const parts: string[] = []
      const memberTags = getMemberTags(m)

      if (fields.family && m.families?.family_name) parts.push(`<div style="font-size:12px;color:#64748b">${m.families.family_name} Family</div>`)
      if (fields.phone && m.cell_phone) parts.push(`<div style="font-size:13px;margin-top:4px">📱 ${formatPhone(m.cell_phone)}</div>`)
      if (fields.email && m.email) parts.push(`<div style="font-size:13px;margin-top:2px">✉ ${m.email}</div>`)
      if (fields.city) {
        const city = getMemberCity(m)
        if (city !== "Unknown") parts.push(`<div style="font-size:13px;margin-top:2px;color:#64748b">📍 ${city}</div>`)
      }
      if (fields.role) parts.push(`<div style="font-size:12px;margin-top:4px;color:#64748b;text-transform:capitalize">${m.role_in_family}</div>`)
      if (fields.birthday && m.birth_month && m.birth_day) {
        parts.push(`<div style="font-size:12px;margin-top:2px;color:#64748b">🎂 ${m.birth_month}/${m.birth_day}${m.birth_year ? `/${m.birth_year}` : ""}</div>`)
      }
      if (fields.tags && memberTags.length > 0) {
        const tagHtml = memberTags.map((t) =>
          `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:10px;color:#fff;background:${t.color};margin-right:4px">${t.name}</span>`
        ).join("")
        parts.push(`<div style="margin-top:6px">${tagHtml}</div>`)
      }

      const accentColor = memberTags.length > 0 ? memberTags[0].color : "#3B82F6"
      return `<div style="break-inside:avoid;border:1px solid #e2e8f0;border-radius:10px;padding:14px 14px 14px 18px;background:#fff;border-left:4px solid ${accentColor}">
        <div style="font-size:15px;font-weight:600;color:#1e293b;margin-bottom:4px">${m.full_name}</div>
        ${parts.join("")}
      </div>`
    }).join("")

    printWindow.document.write(`<!DOCTYPE html><html><head>
      <title>Members Export — CCISR Connect</title>
      <style>
        body { font-family: 'Inter', -apple-system, sans-serif; margin: 0; padding: 20px; color: #1e293b; }
        .header { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #e2e8f0; }
        .header h1 { font-size: 22px; margin: 0; }
        .header p { font-size: 13px; color: #64748b; margin: 4px 0 0; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .footer { text-align: center; margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
        @media print { body { padding: 12px; } .grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }
      </style>
    </head><body>
      <div class="header">
        <h1>Christ Church of India, San Ramon</h1>
        <p>Member Directory — ${members.length} member${members.length !== 1 ? "s" : ""} — ${new Date().toLocaleDateString()}</p>
      </div>
      <div class="grid">${cards}</div>
      <div class="footer">Generated by CCISR Connect</div>
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
