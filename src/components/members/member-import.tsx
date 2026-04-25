"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { logAudit } from "@/lib/audit"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Upload, Loader2, Check } from "lucide-react"

interface ParsedContact {
  firstName: string
  lastName: string
  phone: string
  email: string
  address: string
  city: string
  state: string
  zip: string
}

function parseVCard(text: string): ParsedContact[] {
  const contacts: ParsedContact[] = []
  const cards = text.split("BEGIN:VCARD")

  for (const card of cards) {
    if (!card.includes("END:VCARD")) continue

    const lines = card.split(/\r?\n/)
    const contact: ParsedContact = {
      firstName: "", lastName: "", phone: "", email: "",
      address: "", city: "", state: "", zip: "",
    }

    for (const line of lines) {
      const upper = line.toUpperCase()

      if (upper.startsWith("N:") || upper.startsWith("N;")) {
        const val = line.substring(line.indexOf(":") + 1)
        const parts = val.split(";")
        contact.lastName = (parts[0] || "").trim()
        contact.firstName = (parts[1] || "").trim()
      } else if (upper.startsWith("FN:") || upper.startsWith("FN;")) {
        if (!contact.firstName && !contact.lastName) {
          const val = line.substring(line.indexOf(":") + 1).trim()
          const parts = val.split(" ")
          contact.firstName = parts[0] || ""
          contact.lastName = parts.slice(1).join(" ") || ""
        }
      } else if (upper.startsWith("TEL")) {
        const val = line.substring(line.indexOf(":") + 1).trim()
        if (!contact.phone) contact.phone = val
      } else if (upper.startsWith("EMAIL")) {
        const val = line.substring(line.indexOf(":") + 1).trim()
        if (!contact.email) contact.email = val
      } else if (upper.startsWith("ADR")) {
        const val = line.substring(line.indexOf(":") + 1)
        const parts = val.split(";")
        contact.address = (parts[2] || "").trim()
        contact.city = (parts[3] || "").trim()
        contact.state = (parts[4] || "").trim()
        contact.zip = (parts[5] || "").trim()
      }
    }

    if (contact.firstName || contact.lastName) {
      contacts.push(contact)
    }
  }

  return contacts
}

interface MemberImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function MemberImportDialog({ open, onOpenChange, onSuccess }: MemberImportDialogProps) {
  const [contacts, setContacts] = useState<ParsedContact[]>([])
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState<Set<number>>(new Set())
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = parseVCard(text)
      setContacts(parsed)
      setImported(new Set())
      if (parsed.length === 0) {
        toast.error("No contacts found in the file")
      } else {
        toast.success(`Found ${parsed.length} contact${parsed.length > 1 ? "s" : ""}`)
      }
    }
    reader.readAsText(file)
  }

  async function importContact(index: number) {
    const c = contacts[index]
    if (!c.firstName && !c.lastName) {
      toast.error("Contact has no name")
      return
    }

    setImporting(true)
    const supabase = createClient()
    const fullName = `${c.firstName} ${c.lastName}`.trim()

    const { error } = await supabase.from("members").insert({
      first_name: c.firstName || "Unknown",
      last_name: c.lastName || "Unknown",
      full_name: fullName,
      family_id: null,
      role_in_family: "husband",
      cell_phone: c.phone || null,
      email: c.email || null,
      is_active: true,
      is_newcomer: false,
      newcomer_acknowledged: false,
      notes: c.address ? `Imported address: ${[c.address, c.city, c.state, c.zip].filter(Boolean).join(", ")}` : "Imported from vCard",
    } as never)

    if (error) {
      toast.error(`Failed to import ${fullName}: ${error.message}`)
    } else {
      toast.success(`${fullName} imported`)
      logAudit("member_imported", "members", null, { name: fullName, source: "vcard" })
      setImported((prev) => new Set([...prev, index]))
    }
    setImporting(false)
  }

  async function importAll() {
    setImporting(true)
    let count = 0
    for (let i = 0; i < contacts.length; i++) {
      if (imported.has(i)) continue
      const c = contacts[i]
      if (!c.firstName && !c.lastName) continue

      const supabase = createClient()
      const fullName = `${c.firstName} ${c.lastName}`.trim()

      const { error } = await supabase.from("members").insert({
        first_name: c.firstName || "Unknown",
        last_name: c.lastName || "Unknown",
        full_name: fullName,
        family_id: null,
        role_in_family: "husband",
        cell_phone: c.phone || null,
        email: c.email || null,
        is_active: true,
        is_newcomer: false,
        newcomer_acknowledged: false,
        notes: c.address ? `Imported address: ${[c.address, c.city, c.state, c.zip].filter(Boolean).join(", ")}` : "Imported from vCard",
      } as never)

      if (!error) {
        count++
        setImported((prev) => new Set([...prev, i]))
      }
    }
    logAudit("members_bulk_imported", "members", null, { count, source: "vcard" })
    toast.success(`Imported ${count} contact${count !== 1 ? "s" : ""}`)
    setImporting(false)
    onSuccess?.()
  }

  function handleClose() {
    setContacts([])
    setImported(new Set())
    if (fileRef.current) fileRef.current.value = ""
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Contacts</DialogTitle>
          <DialogDescription>
            Upload a .vcf (vCard) file to import contacts as members.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center transition-colors hover:border-muted-foreground/50 cursor-pointer"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary", "bg-primary/5") }}
            onDragLeave={(e) => { e.currentTarget.classList.remove("border-primary", "bg-primary/5") }}
            onDrop={(e) => {
              e.preventDefault()
              e.currentTarget.classList.remove("border-primary", "bg-primary/5")
              const file = e.dataTransfer.files[0]
              if (file && (file.name.endsWith(".vcf") || file.type === "text/vcard")) {
                const reader = new FileReader()
                reader.onload = (ev) => {
                  const text = ev.target?.result as string
                  const parsed = parseVCard(text)
                  setContacts(parsed)
                  setImported(new Set())
                  if (parsed.length === 0) toast.error("No contacts found in the file")
                  else toast.success(`Found ${parsed.length} contact${parsed.length > 1 ? "s" : ""}`)
                }
                reader.readAsText(file)
              } else {
                toast.error("Please drop a .vcf file")
              }
            }}
          >
            <Upload className="size-8 text-muted-foreground/50" />
            <div>
              <p className="text-sm font-medium">Drop a .vcf file here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">Supports vCard contact files from your phone or email</p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".vcf,text/vcard"
            onChange={handleFile}
            className="hidden"
          />

          {contacts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{contacts.length} contact{contacts.length !== 1 ? "s" : ""} found</p>
                <Button size="sm" onClick={importAll} disabled={importing || imported.size === contacts.length}>
                  {importing ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                  Import All
                </Button>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {contacts.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {c.firstName} {c.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[c.phone, c.email].filter(Boolean).join(" · ") || "No contact info"}
                      </p>
                    </div>
                    {imported.has(i) ? (
                      <Badge variant="default" className="shrink-0 gap-1">
                        <Check className="size-3" />
                        Imported
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => importContact(i)}
                        disabled={importing}
                        className="shrink-0"
                      >
                        Import
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {imported.size > 0 ? "Done" : "Cancel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
