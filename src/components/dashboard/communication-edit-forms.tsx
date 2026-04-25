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
      .select("id, family_name, home_phone, addresses(full_address, city, state, zip, is_current)")
      .eq("is_active", true)
      .ilike("family_name", `%${query.trim()}%`)
      .limit(8)

    if (data) {
      const mapped: FamilySearchResult[] = (data as unknown as Array<{
        id: string
        family_name: string
        home_phone: string | null
        addresses: Array<{ full_address: string; city: string | null; state: string | null; zip: string | null; is_current: boolean }>
      }>).map((f) => {
        const addr = f.addresses?.find((a) => a.is_current)
        return {
          id: f.id,
          family_name: f.family_name,
          home_phone: f.home_phone,
          full_address: addr?.full_address ?? null,
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
// Birthday Edit Form (inline)
// ---------------------------------------------------------------------------

export interface BirthdayFormData {
  weekLabel: string
  birthdays: BirthdayEntry[]
  message: string
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

      <Field label="Custom Message (optional)" htmlFor="bday-inline-msg">
        <Textarea
          id="bday-inline-msg"
          placeholder="Leave blank for default message"
          value={data.message}
          onChange={(e) => onChange({ ...data, message: e.target.value })}
          className="min-h-12"
        />
      </Field>
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

      <Field label="Custom Message (optional)" htmlFor="ann-inline-msg">
        <Textarea
          id="ann-inline-msg"
          placeholder="Leave blank for default message"
          value={data.message}
          onChange={(e) => onChange({ ...data, message: e.target.value })}
          className="min-h-12"
        />
      </Field>
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
  primaryColor: string
  footerVerse: string
  resourceLinkLabel: string
  resourceLinkUrl: string
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

      <Field label="Custom Message (optional)" htmlFor="bs-i-msg">
        <Textarea
          id="bs-i-msg"
          placeholder="Leave blank for default"
          value={data.message}
          onChange={(e) => set("message", e.target.value)}
          className="min-h-12"
        />
      </Field>

      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Resource Link Label" htmlFor="bs-i-rll">
          <Input
            id="bs-i-rll"
            value={data.resourceLinkLabel}
            onChange={(e) => set("resourceLinkLabel", e.target.value)}
            placeholder="e.g., Study Materials"
          />
        </Field>
        <Field label="Resource Link URL" htmlFor="bs-i-rlu">
          <Input
            id="bs-i-rlu"
            value={data.resourceLinkUrl}
            onChange={(e) => set("resourceLinkUrl", e.target.value)}
            placeholder="https://drive.google.com/..."
          />
        </Field>
      </div>
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
  primaryColor: string
  footerVerse: string
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
      <Field label="Custom Message (optional)" htmlFor="ws-i-msg">
        <Textarea
          id="ws-i-msg"
          placeholder="Leave blank for default"
          value={data.message}
          onChange={(e) => set("message", e.target.value)}
          className="min-h-12"
        />
      </Field>
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
