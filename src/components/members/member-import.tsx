"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { logAudit } from "@/lib/audit"
import type { FamilyRole } from "@/types/database"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import {
  Upload,
  Loader2,
  Check,
  AlertTriangle,
  Users,
  Cake,
  Phone,
  Mail,
  MapPin,
} from "lucide-react"

// ── VCard Parser ──────────────────────────────────────────────────────────────

interface ParsedContact {
  firstName: string
  lastName: string
  phones: string[]
  emails: string[]
  address: { street: string; city: string; state: string; zip: string } | null
  birthday: { month: number; day: number; year: number | null } | null
  org: string
}

function unfoldLines(text: string): string {
  return text.replace(/\r?\n[ \t]/g, "")
}

function decodeQP(val: string): string {
  return val
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/=\r?\n/g, "")
}

function parseVCard(text: string): ParsedContact[] {
  const contacts: ParsedContact[] = []
  const unfolded = unfoldLines(text)
  const cards = unfolded.split("BEGIN:VCARD")

  for (const card of cards) {
    if (!card.includes("END:VCARD")) continue
    const lines = card.split(/\r?\n/)
    const c: ParsedContact = {
      firstName: "",
      lastName: "",
      phones: [],
      emails: [],
      address: null,
      birthday: null,
      org: "",
    }

    for (const raw of lines) {
      const isQP = raw.toUpperCase().includes("ENCODING=QUOTED-PRINTABLE")
      const colIdx = raw.indexOf(":")
      if (colIdx === -1) continue
      const prop = raw.substring(0, colIdx).toUpperCase()
      let val = raw.substring(colIdx + 1)
      if (isQP) val = decodeQP(val)

      if (prop === "N" || prop.startsWith("N;")) {
        const p = val.split(";")
        c.lastName = (p[0] || "").trim()
        c.firstName = (p[1] || "").trim()
      } else if (
        (prop === "FN" || prop.startsWith("FN;")) &&
        !c.firstName &&
        !c.lastName
      ) {
        const p = val.trim().split(" ")
        c.firstName = p[0] || ""
        c.lastName = p.slice(1).join(" ") || ""
      } else if (prop.startsWith("TEL")) {
        const phone = val.trim()
        if (phone && !c.phones.includes(phone)) c.phones.push(phone)
      } else if (prop.startsWith("EMAIL")) {
        const email = val.trim()
        if (email && !c.emails.includes(email)) c.emails.push(email)
      } else if (prop.startsWith("ADR")) {
        const p = val.split(";")
        const street = (p[2] || "").trim()
        const city = (p[3] || "").trim()
        const state = (p[4] || "").trim()
        const zip = (p[5] || "").trim()
        if (street || city || state || zip) {
          c.address = { street, city, state, zip }
        }
      } else if (prop === "BDAY" || prop.startsWith("BDAY;")) {
        const clean = val.trim().replace(/-/g, "")
        if (clean.startsWith("--") || clean.length === 4) {
          const digits = clean.replace(/^-+/, "")
          const m = parseInt(digits.substring(0, 2), 10)
          const d = parseInt(digits.substring(2, 4), 10)
          if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
            c.birthday = { month: m, day: d, year: null }
          }
        } else if (clean.length >= 8) {
          const y = parseInt(clean.substring(0, 4), 10)
          const m = parseInt(clean.substring(4, 6), 10)
          const d = parseInt(clean.substring(6, 8), 10)
          if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
            c.birthday = { month: m, day: d, year: y || null }
          }
        }
      } else if (prop === "ORG" || prop.startsWith("ORG;")) {
        c.org = val.split(";")[0].trim()
      }
    }

    if (c.firstName || c.lastName) contacts.push(c)
  }

  return contacts
}

// ── Import types ──────────────────────────────────────────────────────────────

interface ImportContact {
  parsed: ParsedContact
  role: FamilyRole
  include: boolean
  duplicateOf: string | null
}

interface ImportGroup {
  familyName: string
  contacts: ImportContact[]
  existingFamily: {
    id: string
    name: string
    memberCount: number
  } | null
  useExisting: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

const ROLES: { value: FamilyRole; label: string }[] = [
  { value: "husband", label: "Husband" },
  { value: "wife", label: "Wife" },
  { value: "child", label: "Child" },
]

interface MemberImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function MemberImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: MemberImportDialogProps) {
  const [groups, setGroups] = useState<ImportGroup[]>([])
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setLoading(true)
    try {
      const text = await file.text()
      const parsed = parseVCard(text)
      if (parsed.length === 0) {
        toast.error("No contacts found in the file")
        setLoading(false)
        return
      }
      toast.success(
        `Found ${parsed.length} contact${parsed.length > 1 ? "s" : ""}`
      )
      await buildGroups(parsed)
    } catch {
      toast.error("Failed to read file")
    }
    setLoading(false)
  }

  async function buildGroups(contacts: ParsedContact[]) {
    const supabase = createClient()

    const [famRes, memRes] = await Promise.all([
      supabase
        .from("families")
        .select("id, family_name, members(id)")
        .order("family_name"),
      supabase.from("members").select("id, full_name, family_id"),
    ])
    const allFamilies = (famRes.data ?? []) as {
      id: string
      family_name: string
      members: { id: string }[]
    }[]
    const allMembers = (memRes.data ?? []) as {
      id: string
      full_name: string
      family_id: string
    }[]

    const byLastName = new Map<string, ParsedContact[]>()
    for (const c of contacts) {
      const key = (c.lastName || c.firstName || "Unknown")
        .toLowerCase()
        .trim()
      if (!byLastName.has(key)) byLastName.set(key, [])
      byLastName.get(key)!.push(c)
    }

    const result: ImportGroup[] = []
    for (const [key, groupContacts] of byLastName) {
      const existing = allFamilies.find(
        (f) => f.family_name.toLowerCase().trim() === key
      )

      const importContacts: ImportContact[] = groupContacts.map((c) => {
        const fullName = `${c.firstName} ${c.lastName}`.trim().toLowerCase()
        const dupe = allMembers.find(
          (m) => m.full_name.toLowerCase().trim() === fullName
        )
        return {
          parsed: c,
          role: "husband" as FamilyRole,
          include: !dupe,
          duplicateOf: dupe ? dupe.full_name : null,
        }
      })

      result.push({
        familyName:
          groupContacts[0].lastName ||
          groupContacts[0].firstName ||
          "Unknown",
        contacts: importContacts,
        existingFamily: existing
          ? {
              id: existing.id,
              name: existing.family_name,
              memberCount: existing.members.length,
            }
          : null,
        useExisting: !!existing,
      })
    }

    result.sort((a, b) => a.familyName.localeCompare(b.familyName))
    setGroups(result)
    setDone(false)
  }

  function updateContact(
    gi: number,
    ci: number,
    updates: Partial<ImportContact>
  ) {
    setGroups((prev) =>
      prev.map((g, i) =>
        i === gi
          ? {
              ...g,
              contacts: g.contacts.map((c, j) =>
                j === ci ? { ...c, ...updates } : c
              ),
            }
          : g
      )
    )
  }

  function updateGroup(gi: number, updates: Partial<ImportGroup>) {
    setGroups((prev) =>
      prev.map((g, i) => (i === gi ? { ...g, ...updates } : g))
    )
  }

  async function handleImport() {
    setImporting(true)
    const supabase = createClient()
    let memberCount = 0
    let familyCount = 0
    let existingCount = 0

    for (const group of groups) {
      const active = group.contacts.filter((c) => c.include)
      if (active.length === 0) continue

      let familyId: string

      if (group.useExisting && group.existingFamily) {
        familyId = group.existingFamily.id
        existingCount++
      } else {
        const { data: newFam, error } = await supabase
          .from("families")
          .insert({
            family_name: group.familyName,
            is_active: true,
          } as never)
          .select("id")
          .single()

        if (error || !newFam) {
          toast.error(
            `Failed to create family "${group.familyName}": ${error?.message}`
          )
          continue
        }
        familyId = (newFam as { id: string }).id
        familyCount++

        const firstAddr = active.find((c) => c.parsed.address)?.parsed.address
        if (firstAddr) {
          const full = [
            firstAddr.street,
            firstAddr.city,
            firstAddr.state,
            firstAddr.zip,
          ]
            .filter(Boolean)
            .join(", ")
          await supabase.from("addresses").insert({
            family_id: familyId,
            street: firstAddr.street || "",
            city: firstAddr.city || "",
            state: firstAddr.state || "",
            zip: firstAddr.zip || "",
            full_address: full || "",
            is_current: true,
          } as never)
        }
      }

      for (const c of active) {
        const fullName =
          `${c.parsed.firstName} ${c.parsed.lastName}`.trim() || "Unknown"
        const { error } = await supabase.from("members").insert({
          family_id: familyId,
          first_name: c.parsed.firstName || "Unknown",
          last_name: c.parsed.lastName || "Unknown",
          full_name: fullName,
          role_in_family: c.role,
          cell_phone: c.parsed.phones[0] || null,
          email: c.parsed.emails[0] || null,
          birth_month: c.parsed.birthday?.month ?? null,
          birth_day: c.parsed.birthday?.day ?? null,
          birth_year: c.parsed.birthday?.year ?? null,
          is_active: true,
          is_newcomer: false,
          newcomer_acknowledged: false,
          notes: c.parsed.org ? `Organization: ${c.parsed.org}` : null,
        } as never)
        if (!error) memberCount++
      }
    }

    const parts: string[] = []
    if (memberCount > 0)
      parts.push(`${memberCount} member${memberCount !== 1 ? "s" : ""}`)
    if (familyCount > 0)
      parts.push(
        `${familyCount} new famil${familyCount !== 1 ? "ies" : "y"}`
      )
    if (existingCount > 0)
      parts.push(
        `added to ${existingCount} existing famil${existingCount !== 1 ? "ies" : "y"}`
      )
    toast.success(`Imported ${parts.join(", ")}`)
    logAudit("members_bulk_imported", "members", null, {
      memberCount,
      familyCount,
      existingCount,
      source: "vcard",
    })
    setImporting(false)
    setDone(true)
    onSuccess?.()
  }

  function handleClose() {
    setGroups([])
    setDone(false)
    if (fileRef.current) fileRef.current.value = ""
    onOpenChange(false)
  }

  const totalContacts = groups.reduce((n, g) => n + g.contacts.length, 0)
  const includedContacts = groups.reduce(
    (n, g) => n + g.contacts.filter((c) => c.include).length,
    0
  )

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Import Contacts</SheetTitle>
          <SheetDescription>
            Upload a .vcf (vCard) file. Contacts are grouped by last name into
            families.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4">
          {/* Upload area */}
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-center transition-colors hover:border-muted-foreground/50 cursor-pointer"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              e.currentTarget.classList.add("border-primary", "bg-primary/5")
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove("border-primary", "bg-primary/5")
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.currentTarget.classList.remove("border-primary", "bg-primary/5")
              const file = e.dataTransfer.files[0]
              if (
                file &&
                (file.name.endsWith(".vcf") || file.type === "text/vcard")
              ) {
                handleFile(file)
              } else {
                toast.error("Please drop a .vcf file")
              }
            }}
          >
            {loading ? (
              <Loader2 className="size-7 text-muted-foreground/50 animate-spin" />
            ) : (
              <Upload className="size-7 text-muted-foreground/50" />
            )}
            <div>
              <p className="text-sm font-medium">
                {groups.length > 0
                  ? "Drop another file to replace"
                  : "Drop a .vcf file here or click to browse"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Supports vCard files from your phone or email
              </p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".vcf,text/vcard"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
            className="hidden"
          />

          {/* Review groups */}
          {groups.length > 0 && !done && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {totalContacts} contact{totalContacts !== 1 ? "s" : ""} in{" "}
                  {groups.length} famil{groups.length !== 1 ? "ies" : "y"}
                  {includedContacts < totalContacts &&
                    ` · ${includedContacts} selected`}
                </span>
                <Button
                  size="sm"
                  onClick={handleImport}
                  disabled={importing || includedContacts === 0}
                >
                  {importing ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Upload className="size-3.5" />
                  )}
                  Import {includedContacts}
                </Button>
              </div>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {groups.map((group, gi) => (
                  <div key={gi} className="rounded-lg border">
                    {/* Family header */}
                    <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Users className="size-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm truncate">
                          {group.familyName}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] shrink-0"
                        >
                          {group.contacts.length}
                        </Badge>
                      </div>
                      {group.existingFamily ? (
                        <Badge
                          variant={group.useExisting ? "default" : "outline"}
                          className="text-[10px] cursor-pointer shrink-0"
                          onClick={() =>
                            updateGroup(gi, {
                              useExisting: !group.useExisting,
                            })
                          }
                        >
                          {group.useExisting
                            ? `Add to existing (${group.existingFamily.memberCount})`
                            : "Create new"}
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="text-[10px] shrink-0"
                        >
                          New family
                        </Badge>
                      )}
                    </div>

                    {/* Contacts */}
                    <div className="divide-y">
                      {group.contacts.map((c, ci) => (
                        <div
                          key={ci}
                          className={`px-3 py-2 text-sm ${!c.include ? "opacity-40" : ""}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Switch
                                size="sm"
                                checked={c.include}
                                onCheckedChange={(checked) =>
                                  updateContact(gi, ci, { include: checked })
                                }
                              />
                              <span className="font-medium truncate">
                                {c.parsed.firstName} {c.parsed.lastName}
                              </span>
                              {c.duplicateOf && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] gap-0.5 text-amber-600 border-amber-300 shrink-0"
                                >
                                  <AlertTriangle className="size-3" />
                                  Exists
                                </Badge>
                              )}
                            </div>
                            <Select
                              value={c.role}
                              onValueChange={(val) =>
                                updateContact(gi, ci, {
                                  role: val as FamilyRole,
                                })
                              }
                            >
                              <SelectTrigger className="w-24 h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLES.map((r) => (
                                  <SelectItem key={r.value} value={r.value}>
                                    {r.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {c.include && (
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 pl-9 text-xs text-muted-foreground">
                              {c.parsed.phones[0] && (
                                <span className="flex items-center gap-1">
                                  <Phone className="size-3" />
                                  {c.parsed.phones[0]}
                                </span>
                              )}
                              {c.parsed.emails[0] && (
                                <span className="flex items-center gap-1">
                                  <Mail className="size-3" />
                                  {c.parsed.emails[0]}
                                </span>
                              )}
                              {c.parsed.birthday && (
                                <span className="flex items-center gap-1">
                                  <Cake className="size-3" />
                                  {c.parsed.birthday.month}/
                                  {c.parsed.birthday.day}
                                  {c.parsed.birthday.year
                                    ? `/${c.parsed.birthday.year}`
                                    : ""}
                                </span>
                              )}
                              {c.parsed.address && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="size-3" />
                                  {[
                                    c.parsed.address.city,
                                    c.parsed.address.state,
                                  ]
                                    .filter(Boolean)
                                    .join(", ") || c.parsed.address.street}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Done state */}
          {done && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Check className="size-10 text-green-500 mb-2" />
              <p className="font-medium">Import complete</p>
              <p className="text-sm text-muted-foreground mt-1">
                Review and edit imported members in the Members list.
              </p>
            </div>
          )}
        </div>

        <SheetFooter>
          <SheetClose render={<Button variant="outline" />}>Close</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
