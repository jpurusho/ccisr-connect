"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2 } from "lucide-react"
import { formatPhone } from "@/lib/utils"
import type { BirthdayEntry, AnniversaryEntry } from "@/lib/email/card-builder"

interface FamilySearchResult {
  id: string
  family_name: string
  home_phone: string | null
  full_address: string | null
  street: string | null
  city: string | null
  state: string | null
  zip: string | null
}

export function HostFamilyInput({
  value,
  onChange,
  onSelect,
}: {
  value: string
  onChange: (v: string) => void
  onSelect: (family: FamilySearchResult) => void
}) {
  const [results, setResults] = useState<FamilySearchResult[]>([])
  const [showResults, setShowResults] = useState(false)

  async function handleSearch(query: string) {
    onChange(query)
    if (query.trim().length < 2) {
      setResults([])
      setShowResults(false)
      return
    }
    const supabase = createClient()
    const { data } = await supabase
      .from("families")
      .select("id, family_name, home_phone, addresses(full_address, street, city, state, zip, is_current), members(cell_phone, role_in_family)")
      .eq("is_active", true)
      .ilike("family_name", `%${query.trim()}%`)
      .limit(8)

    if (data) {
      const mapped: FamilySearchResult[] = (data as unknown as Array<{
        id: string
        family_name: string
        home_phone: string | null
        addresses: Array<{ full_address: string; street: string | null; city: string | null; state: string | null; zip: string | null; is_current: boolean }>
        members: Array<{ cell_phone: string | null; role_in_family: string }> | null
      }>).map((f) => {
        const addr = f.addresses?.find((a) => a.is_current)
        const primaryMember = f.members?.find((m) => m.role_in_family === "husband") ?? f.members?.[0]
        const phone = f.home_phone || primaryMember?.cell_phone || null
        const address = addr?.full_address || [addr?.street, addr?.city, addr?.state, addr?.zip].filter(Boolean).join(", ") || null
        return {
          id: f.id,
          family_name: f.family_name,
          home_phone: phone,
          full_address: address,
          street: addr?.street ?? null,
          city: addr?.city ?? null,
          state: addr?.state ?? null,
          zip: addr?.zip ?? null,
        }
      })
      setResults(mapped)
      setShowResults(mapped.length > 0)
    }
  }

  return (
    <div className="relative">
      <Input
        placeholder="Type family name to search..."
        value={value}
        onChange={(e) => handleSearch(e.target.value)}
        onBlur={() => setTimeout(() => setShowResults(false), 200)}
        onFocus={() => results.length > 0 && setShowResults(true)}
      />
      {showResults && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-48 overflow-y-auto">
          {results.map((f) => (
            <button
              key={f.id}
              type="button"
              className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-accent"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect(f)
                setShowResults(false)
              }}
            >
              <span className="font-medium">{f.family_name}</span>
              {f.full_address && (
                <span className="text-xs text-muted-foreground truncate">{f.full_address}</span>
              )}
              {f.home_phone && (
                <span className="text-xs text-muted-foreground">{formatPhone(f.home_phone)}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared field wrapper
// ---------------------------------------------------------------------------

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared: Resource Links Editor
// ---------------------------------------------------------------------------

export interface ResourceLinkItem {
  label: string
  url: string
}

export function ResourceLinksEditor({
  links,
  onChange,
}: {
  links: ResourceLinkItem[]
  onChange: (links: ResourceLinkItem[]) => void
}) {
  return (
    <div className="space-y-2">
      <Label>Links</Label>
      {links.map((link, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            placeholder="Label (e.g., Study Materials)"
            value={link.label}
            onChange={(e) => {
              const updated = [...links]
              updated[i] = { ...updated[i], label: e.target.value }
              onChange(updated)
            }}
            className="w-40"
          />
          <Input
            placeholder="https://..."
            value={link.url}
            onChange={(e) => {
              const updated = [...links]
              updated[i] = { ...updated[i], url: e.target.value }
              onChange(updated)
            }}
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onChange(links.filter((_, j) => j !== i))}
          >
            <Trash2 className="size-3.5 text-muted-foreground" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...links, { label: "", url: "" }])}>
        <Plus className="size-3.5" />
        Add Link
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared: Card Style Fields (message, footer verse, primary color)
// ---------------------------------------------------------------------------

interface CardStyleFieldsData {
  message: string
  headerSubtitle: string
  primaryColor: string
  footerVerse: string
}

export function CardStyleFields<T extends CardStyleFieldsData>({
  data,
  onChange,
  idPrefix,
}: {
  data: T
  onChange: (data: T) => void
  idPrefix: string
}) {
  return (
    <>
      <Field label="Custom Message (optional)" htmlFor={`${idPrefix}-msg`}>
        <Textarea
          id={`${idPrefix}-msg`}
          placeholder="Leave blank for default"
          value={data.message}
          onChange={(e) => onChange({ ...data, message: e.target.value })}
          className="min-h-12"
        />
      </Field>
      <Field label="Header Subtitle (optional)" htmlFor={`${idPrefix}-hsub`}>
        <Input
          id={`${idPrefix}-hsub`}
          value={data.headerSubtitle}
          onChange={(e) => onChange({ ...data, headerSubtitle: e.target.value })}
          placeholder="Christ Church of India, San Ramon"
        />
      </Field>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Footer Verse / Text" htmlFor={`${idPrefix}-fv`}>
          <Input
            id={`${idPrefix}-fv`}
            value={data.footerVerse}
            onChange={(e) => onChange({ ...data, footerVerse: e.target.value })}
            placeholder="Christ Church of India, San Ramon"
          />
        </Field>
        <Field label="Primary Color" htmlFor={`${idPrefix}-color`}>
          <div className="flex items-center gap-2">
            <Input
              id={`${idPrefix}-color`}
              value={data.primaryColor}
              onChange={(e) => onChange({ ...data, primaryColor: e.target.value })}
              placeholder="#4F46E5"
              className="flex-1"
            />
            {data.primaryColor && (
              <span className="size-6 rounded-md border" style={{ backgroundColor: data.primaryColor }} />
            )}
          </div>
        </Field>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Birthday Edit Form (inline)
// ---------------------------------------------------------------------------

export interface BirthdayFormData {
  weekLabel: string
  birthdays: BirthdayEntry[]
  message: string
  headerSubtitle: string
  primaryColor: string
  footerVerse: string
  resourceLinks: { label: string; url: string }[]
}

export function BirthdayEditForm({
  data,
  onChange,
}: {
  data: BirthdayFormData
  onChange: (data: BirthdayFormData) => void
}) {
  function updateBirthday(
    index: number,
    field: keyof BirthdayEntry,
    value: string
  ) {
    const updated = [...data.birthdays]
    updated[index] = { ...updated[index], [field]: value }
    onChange({ ...data, birthdays: updated })
  }

  function removeBirthday(index: number) {
    onChange({
      ...data,
      birthdays: data.birthdays.filter((_, i) => i !== index),
    })
  }

  function addBirthday() {
    onChange({
      ...data,
      birthdays: [...data.birthdays, { name: "", date: "" }],
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Birthdays</Label>
        {data.birthdays.map((b, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              placeholder="Name"
              value={b.name}
              onChange={(e) => updateBirthday(i, "name", e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Date (e.g., 4/29)"
              value={b.date}
              onChange={(e) => updateBirthday(i, "date", e.target.value)}
              className="w-28"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => removeBirthday(i)}
            >
              <Trash2 className="size-3.5 text-muted-foreground" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addBirthday}>
          <Plus className="size-3.5" />
          Add Birthday
        </Button>
      </div>

      <ResourceLinksEditor
        links={data.resourceLinks ?? []}
        onChange={(links) => onChange({ ...data, resourceLinks: links })}
      />
      <CardStyleFields data={data} onChange={onChange} idPrefix="bday-i" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Anniversary Edit Form (inline)
// ---------------------------------------------------------------------------

export interface AnniversaryFormData {
  weekLabel: string
  anniversaries: AnniversaryEntry[]
  message: string
  headerSubtitle: string
  primaryColor: string
  footerVerse: string
  resourceLinks: { label: string; url: string }[]
}

export function AnniversaryEditForm({
  data,
  onChange,
}: {
  data: AnniversaryFormData
  onChange: (data: AnniversaryFormData) => void
}) {
  function updateAnniversary(
    index: number,
    field: keyof AnniversaryEntry,
    value: string | number | undefined
  ) {
    const updated = [...data.anniversaries]
    updated[index] = { ...updated[index], [field]: value }
    onChange({ ...data, anniversaries: updated })
  }

  function removeAnniversary(index: number) {
    onChange({
      ...data,
      anniversaries: data.anniversaries.filter((_, i) => i !== index),
    })
  }

  function addAnniversary() {
    onChange({
      ...data,
      anniversaries: [
        ...data.anniversaries,
        { husbandName: "", wifeName: "", date: "" },
      ],
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Anniversaries</Label>
        {data.anniversaries.map((a, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Husband"
              value={a.husbandName}
              onChange={(e) =>
                updateAnniversary(i, "husbandName", e.target.value)
              }
              className="w-24 flex-1"
            />
            <Input
              placeholder="Wife"
              value={a.wifeName}
              onChange={(e) =>
                updateAnniversary(i, "wifeName", e.target.value)
              }
              className="w-24 flex-1"
            />
            <Input
              placeholder="Date"
              value={a.date}
              onChange={(e) => updateAnniversary(i, "date", e.target.value)}
              className="w-20"
            />
            <Input
              placeholder="Yrs"
              type="number"
              value={a.years ?? ""}
              onChange={(e) =>
                updateAnniversary(
                  i,
                  "years",
                  e.target.value ? parseInt(e.target.value, 10) : undefined
                )
              }
              className="w-14"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => removeAnniversary(i)}
            >
              <Trash2 className="size-3.5 text-muted-foreground" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addAnniversary}>
          <Plus className="size-3.5" />
          Add Anniversary
        </Button>
      </div>

      <ResourceLinksEditor
        links={data.resourceLinks ?? []}
        onChange={(links) => onChange({ ...data, resourceLinks: links })}
      />
      <CardStyleFields data={data} onChange={onChange} idPrefix="ann-i" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bible Study Edit Form (inline)
// ---------------------------------------------------------------------------

export interface BibleStudyLocationData {
  label: string
  hostNames: string
  address: string
  city: string
  phone: string
  onVacation: boolean
  vacationMessage: string
}

export interface BibleStudyFormData {
  title: string
  date: string
  time: string
  topic: string
  message: string
  headerSubtitle: string
  primaryColor: string
  footerVerse: string
  resourceLinks: { label: string; url: string }[]
  locations: BibleStudyLocationData[]
}

export function BibleStudyEditForm({
  data,
  onChange,
}: {
  data: BibleStudyFormData
  onChange: (data: BibleStudyFormData) => void
}) {
  function set<K extends keyof Omit<BibleStudyFormData, "locations">>(
    field: K,
    value: BibleStudyFormData[K]
  ) {
    onChange({ ...data, [field]: value })
  }

  function updateLocation(index: number, field: keyof BibleStudyLocationData, value: string) {
    const updated = [...data.locations]
    updated[index] = { ...updated[index], [field]: value }
    onChange({ ...data, locations: updated })
  }

  function removeLocation(index: number) {
    onChange({ ...data, locations: data.locations.filter((_, i) => i !== index) })
  }

  function addLocation() {
    onChange({
      ...data,
      locations: [...data.locations, { label: "", hostNames: "TBD", address: "TBD", city: "", phone: "", onVacation: false, vacationMessage: "" }],
    })
  }

  return (
    <div className="space-y-4">
      <Field label="Card Title" htmlFor="bs-i-title">
        <Input
          id="bs-i-title"
          value={data.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Bible Study This Friday"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date" htmlFor="bs-i-date">
          <Input
            id="bs-i-date"
            value={data.date}
            onChange={(e) => set("date", e.target.value)}
            placeholder="Friday, May 2nd"
          />
        </Field>
        <Field label="Time" htmlFor="bs-i-time">
          <Input
            id="bs-i-time"
            value={data.time}
            onChange={(e) => set("time", e.target.value)}
            placeholder="7:30 PM"
          />
        </Field>
      </div>
      <Field label="Topic" htmlFor="bs-i-topic">
        <Input
          id="bs-i-topic"
          value={data.topic}
          onChange={(e) => set("topic", e.target.value)}
        />
      </Field>

      {/* Locations */}
      <div className="space-y-3">
        <Label>Locations</Label>
        {data.locations.map((loc, i) => (
          <div key={i} className="space-y-2 rounded-md border border-border p-3">
            <div className="flex items-center justify-between">
              <Input
                placeholder="Location name (e.g., San Ramon)"
                value={loc.label}
                onChange={(e) => updateLocation(i, "label", e.target.value)}
                className="flex-1 font-medium"
              />
              {data.locations.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="ml-2 shrink-0"
                  onClick={() => removeLocation(i)}
                >
                  <Trash2 className="size-3.5 text-muted-foreground" />
                </Button>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <HostFamilyInput
                value={loc.hostNames}
                onChange={(v) => updateLocation(i, "hostNames", v)}
                onSelect={(f) => {
                  const locs = [...data.locations]
                  locs[i] = {
                    ...locs[i],
                    hostNames: `${f.family_name}'s Residence`,
                    address: f.full_address ?? locs[i].address,
                    city: [f.city, f.state, f.zip].filter(Boolean).join(", ") || locs[i].city,
                    phone: formatPhone(f.home_phone) || locs[i].phone,
                  }
                  onChange({ ...data, locations: locs })
                }}
              />
              <Input
                placeholder="Phone"
                value={loc.phone}
                onChange={(e) => updateLocation(i, "phone", e.target.value)}
              />
            </div>
            <Input
              placeholder="Address"
              value={loc.address}
              onChange={(e) => updateLocation(i, "address", e.target.value)}
            />
            <Input
              placeholder="City, State ZIP"
              value={loc.city}
              onChange={(e) => updateLocation(i, "city", e.target.value)}
            />
            <div className="flex items-center gap-2 pt-1">
              <Switch
                size="sm"
                checked={loc.onVacation}
                onCheckedChange={(checked) => {
                  const locs = [...data.locations]
                  locs[i] = { ...locs[i], onVacation: checked }
                  onChange({ ...data, locations: locs })
                }}
              />
              <Label className="text-xs text-muted-foreground">On vacation / break</Label>
            </div>
            {loc.onVacation && (
              <Input
                placeholder="e.g., Bible Study will resume on September 12th"
                value={loc.vacationMessage}
                onChange={(e) => {
                  const locs = [...data.locations]
                  locs[i] = { ...locs[i], vacationMessage: e.target.value }
                  onChange({ ...data, locations: locs })
                }}
              />
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addLocation}>
          <Plus className="size-3.5" />
          Add Location
        </Button>
      </div>

      <ResourceLinksEditor
        links={data.resourceLinks ?? []}
        onChange={(links) => onChange({ ...data, resourceLinks: links })}
      />
      <CardStyleFields data={data} onChange={onChange} idPrefix="bs-i" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Women's Study Edit Form (inline)
// ---------------------------------------------------------------------------

export interface WomensStudyFormData {
  title: string
  topic: string
  date: string
  time: string
  zoomLink: string
  zoomMeetingId: string
  zoomPasscode: string
  location: string
  message: string
  headerSubtitle: string
  primaryColor: string
  footerVerse: string
  resourceLinks: { label: string; url: string }[]
}

export function WomensStudyEditForm({
  data,
  onChange,
}: {
  data: WomensStudyFormData
  onChange: (data: WomensStudyFormData) => void
}) {
  function set<K extends keyof WomensStudyFormData>(
    field: K,
    value: WomensStudyFormData[K]
  ) {
    onChange({ ...data, [field]: value })
  }

  return (
    <div className="space-y-4">
      <Field label="Card Title" htmlFor="ws-i-title">
        <Input
          id="ws-i-title"
          value={data.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Women's Bible Study"
        />
      </Field>
      <Field label="Topic (leave empty to exclude)" htmlFor="ws-i-topic">
        <Input
          id="ws-i-topic"
          value={data.topic}
          onChange={(e) => set("topic", e.target.value)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date" htmlFor="ws-i-date">
          <Input
            id="ws-i-date"
            value={data.date}
            onChange={(e) => set("date", e.target.value)}
            placeholder="Wednesday, May 7th"
          />
        </Field>
        <Field label="Time" htmlFor="ws-i-time">
          <Input
            id="ws-i-time"
            value={data.time}
            onChange={(e) => set("time", e.target.value)}
            placeholder="7:00 PM"
          />
        </Field>
      </div>
      <Field label="Zoom Link (leave empty to exclude)" htmlFor="ws-i-zoom">
        <Input
          id="ws-i-zoom"
          value={data.zoomLink}
          onChange={(e) => set("zoomLink", e.target.value)}
          placeholder="https://zoom.us/j/..."
        />
      </Field>
      {data.zoomLink && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Meeting ID" htmlFor="ws-i-zmid">
            <Input
              id="ws-i-zmid"
              value={data.zoomMeetingId}
              onChange={(e) => set("zoomMeetingId", e.target.value)}
              placeholder="779 2123 2378"
            />
          </Field>
          <Field label="Passcode" htmlFor="ws-i-zmpw">
            <Input
              id="ws-i-zmpw"
              value={data.zoomPasscode}
              onChange={(e) => set("zoomPasscode", e.target.value)}
              placeholder="6gLy8u"
            />
          </Field>
        </div>
      )}
      <Field label="Location (used when no Zoom link)" htmlFor="ws-i-loc">
        <Input
          id="ws-i-loc"
          value={data.location}
          onChange={(e) => set("location", e.target.value)}
          placeholder="e.g., Fellowship Hall"
        />
      </Field>
      <ResourceLinksEditor
        links={data.resourceLinks ?? []}
        onChange={(links) => onChange({ ...data, resourceLinks: links })}
      />
      <CardStyleFields data={data} onChange={onChange} idPrefix="ws-i" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bulletin Edit Form (inline)
// ---------------------------------------------------------------------------

export interface BulletinFormData {
  weekLabel: string
  birthdays: { name: string; date: string }[]
  anniversaries: { names: string; date: string }[]
  helpers: { role: string; name: string }[]
  events: { title: string; details: string }[]
  resourceLinks: { label: string; url: string }[]
  message: string
  headerSubtitle: string
  primaryColor: string
  footerVerse: string
  weeksAhead?: number
}

export function BulletinEditForm({
  data,
  onChange,
  onWeeksChange,
}: {
  data: BulletinFormData
  onChange: (data: BulletinFormData) => void
  onWeeksChange?: (weeks: number) => void
}) {
  // --- Birthdays ---
  function updateBday(i: number, field: string, value: string) {
    const updated = [...data.birthdays]
    updated[i] = { ...updated[i], [field]: value }
    onChange({ ...data, birthdays: updated })
  }
  function removeBday(i: number) {
    onChange({
      ...data,
      birthdays: data.birthdays.filter((_, idx) => idx !== i),
    })
  }
  function addBday() {
    onChange({
      ...data,
      birthdays: [...data.birthdays, { name: "", date: "" }],
    })
  }

  // --- Anniversaries ---
  function updateAnni(i: number, field: string, value: string) {
    const updated = [...data.anniversaries]
    updated[i] = { ...updated[i], [field]: value }
    onChange({ ...data, anniversaries: updated })
  }
  function removeAnni(i: number) {
    onChange({
      ...data,
      anniversaries: data.anniversaries.filter((_, idx) => idx !== i),
    })
  }
  function addAnni() {
    onChange({
      ...data,
      anniversaries: [...data.anniversaries, { names: "", date: "" }],
    })
  }

  // --- Helpers ---
  function updateHelper(i: number, field: string, value: string) {
    const updated = [...data.helpers]
    updated[i] = { ...updated[i], [field]: value }
    onChange({ ...data, helpers: updated })
  }
  function removeHelper(i: number) {
    onChange({
      ...data,
      helpers: data.helpers.filter((_, idx) => idx !== i),
    })
  }
  function addHelper() {
    onChange({
      ...data,
      helpers: [...data.helpers, { role: "", name: "" }],
    })
  }

  // --- Events ---
  function updateEvent(i: number, field: string, value: string) {
    const updated = [...data.events]
    updated[i] = { ...updated[i], [field]: value }
    onChange({ ...data, events: updated })
  }
  function removeEvent(i: number) {
    onChange({
      ...data,
      events: data.events.filter((_, idx) => idx !== i),
    })
  }
  function addEvent() {
    onChange({
      ...data,
      events: [...data.events, { title: "", details: "" }],
    })
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Week Label" htmlFor="bul-i-week">
          <Input
            id="bul-i-week"
            value={data.weekLabel}
            onChange={(e) => onChange({ ...data, weekLabel: e.target.value })}
          />
        </Field>
        {onWeeksChange && (
          <Field label="Weeks to Include" htmlFor="bul-i-weeks">
            <Select
              value={String(data.weeksAhead ?? 1)}
              onValueChange={(val) => onWeeksChange(parseInt(val ?? "1", 10))}
            >
              <SelectTrigger id="bul-i-weeks" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 week</SelectItem>
                <SelectItem value="2">2 weeks</SelectItem>
                <SelectItem value="3">3 weeks</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        )}
      </div>

      {/* Birthdays */}
      <InlineListSection
        label="Birthdays"
        items={data.birthdays}
        fields={[
          { key: "name", placeholder: "Name", className: "flex-1" },
          { key: "date", placeholder: "Date", className: "w-24" },
        ]}
        onUpdate={updateBday}
        onRemove={removeBday}
        onAdd={addBday}
        addLabel="Add Birthday"
      />

      {/* Anniversaries */}
      <InlineListSection
        label="Anniversaries"
        items={data.anniversaries}
        fields={[
          {
            key: "names",
            placeholder: "Names (e.g., John & Jane)",
            className: "flex-1",
          },
          { key: "date", placeholder: "Date", className: "w-24" },
        ]}
        onUpdate={updateAnni}
        onRemove={removeAnni}
        onAdd={addAnni}
        addLabel="Add Anniversary"
      />

      {/* Helpers */}
      <InlineListSection
        label="Helpers This Month"
        items={data.helpers}
        fields={[
          { key: "role", placeholder: "Role (e.g., Usher)", className: "w-36" },
          { key: "name", placeholder: "Name", className: "flex-1" },
        ]}
        onUpdate={updateHelper}
        onRemove={removeHelper}
        onAdd={addHelper}
        addLabel="Add Helper"
      />

      {/* Events */}
      <div className="space-y-2">
        <Label>Events</Label>
        {data.events.map((evt, i) => (
          <div
            key={i}
            className="space-y-1.5 rounded-md border border-border p-2.5"
          >
            <div className="flex items-center gap-2">
              <Input
                placeholder="Title"
                value={evt.title}
                onChange={(e) => updateEvent(i, "title", e.target.value)}
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => removeEvent(i)}
              >
                <Trash2 className="size-3.5 text-muted-foreground" />
              </Button>
            </div>
            <Textarea
              placeholder="Details"
              value={evt.details}
              onChange={(e) => updateEvent(i, "details", e.target.value)}
              className="min-h-10"
            />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addEvent}>
          <Plus className="size-3.5" />
          Add Event
        </Button>
      </div>

      <ResourceLinksEditor
        links={data.resourceLinks ?? []}
        onChange={(links) => onChange({ ...data, resourceLinks: links })}
      />
      <CardStyleFields data={data} onChange={onChange} idPrefix="bul-i" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Reusable inline list section
// ---------------------------------------------------------------------------

interface InlineFieldDef {
  key: string
  placeholder: string
  className?: string
}

function InlineListSection<T extends Record<string, string>>({
  label,
  items,
  fields,
  onUpdate,
  onRemove,
  onAdd,
  addLabel,
}: {
  label: string
  items: T[]
  fields: InlineFieldDef[]
  onUpdate: (index: number, field: string, value: string) => void
  onRemove: (index: number) => void
  onAdd: () => void
  addLabel: string
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          {fields.map((f) => (
            <Input
              key={f.key}
              placeholder={f.placeholder}
              value={(item as Record<string, string>)[f.key] ?? ""}
              onChange={(e) => onUpdate(i, f.key, e.target.value)}
              className={f.className}
            />
          ))}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onRemove(i)}
          >
            <Trash2 className="size-3.5 text-muted-foreground" />
          </Button>
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground">None added yet.</p>
      )}
      <Button variant="outline" size="sm" onClick={onAdd}>
        <Plus className="size-3.5" />
        {addLabel}
      </Button>
    </div>
  )
}
