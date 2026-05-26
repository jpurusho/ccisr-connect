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
      const memberTags = getMemberTags(m)
      const accentColor = memberTags.length > 0 ? memberTags[0].color : "#3B82F6"
      const details: string[] = []

      if (fields.phone && m.cell_phone) {
        details.push(`<div class="detail"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span>${formatPhone(m.cell_phone)}</span></div>`)
      }
      if (fields.email && m.email) {
        details.push(`<div class="detail"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg><span>${m.email}</span></div>`)
      }
      if (fields.city) {
        const city = getMemberCity(m)
        if (city !== "Unknown") {
          details.push(`<div class="detail"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg><span>${city}</span></div>`)
        }
      }
      if (fields.birthday && m.birth_month && m.birth_day) {
        details.push(`<div class="detail birthday"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9333ea" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20"/><path d="M7 8v3"/><path d="M12 8v3"/><path d="M17 8v3"/><path d="M7 4h.01"/><path d="M12 4h.01"/><path d="M17 4h.01"/></svg><span>${m.birth_month}/${m.birth_day}${m.birth_year ? `/${m.birth_year}` : ""}</span></div>`)
      }
      if (fields.role) {
        details.push(`<div class="role-badge">${m.role_in_family}</div>`)
      }

      let tagsHtml = ""
      if (fields.tags && memberTags.length > 0) {
        tagsHtml = `<div class="tags">${memberTags.map((t) => `<span class="tag" style="background:${t.color}">${t.name}</span>`).join("")}</div>`
      }

      return `<div class="card" style="border-left-color:${accentColor}">
        <div class="card-header">
          <div class="name-block">
            <div class="member-name">${m.full_name}</div>
            ${fields.family && m.families?.family_name ? `<div class="family-name">${m.families.family_name} Family</div>` : ""}
          </div>
          <span class="status-dot ${m.is_active ? "active" : "inactive"}"></span>
        </div>
        <div class="card-body">
          ${details.join("")}
          ${tagsHtml}
        </div>
      </div>`
    }).join("")

    printWindow.document.write(`<!DOCTYPE html><html><head>
      <title>Member Directory — CCISR Connect</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif; color: #1e293b; padding: 28px; background: #f8fafc; }
        .header { text-align: center; margin-bottom: 28px; }
        .header h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.03em; }
        .header p { font-size: 13px; color: #64748b; margin-top: 4px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
        .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 16px 14px 20px; border-left: 4px solid #3B82F6; break-inside: avoid; transition: box-shadow 0.15s; }
        .card-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; }
        .name-block { min-width: 0; flex: 1; }
        .member-name { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .family-name { font-size: 12px; color: #64748b; margin-top: 2px; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }
        .status-dot.active { background: #22c55e; }
        .status-dot.inactive { background: #9ca3af; }
        .card-body { display: flex; flex-direction: column; gap: 6px; }
        .detail { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #475569; }
        .detail svg { flex-shrink: 0; }
        .detail.birthday { color: #7c3aed; }
        .detail.birthday span { font-weight: 500; }
        .role-badge { display: inline-block; font-size: 11px; font-weight: 500; text-transform: capitalize; padding: 2px 10px; border-radius: 6px; background: #f1f5f9; color: #475569; margin-top: 2px; }
        .tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
        .tag { display: inline-block; padding: 2px 9px; border-radius: 99px; font-size: 10px; font-weight: 500; color: #fff; }
        .footer { text-align: center; margin-top: 28px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
        @media print {
          body { background: #fff; padding: 12px; }
          .card { border-color: #e2e8f0; box-shadow: none; }
          .tag, .status-dot, .role-badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .grid { gap: 10px; }
        }
        @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
      </style>
    </head><body>
      <div class="header">
        <h1>Christ Church of India, San Ramon</h1>
        <p>Member Directory — ${members.length} member${members.length !== 1 ? "s" : ""} — ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
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
