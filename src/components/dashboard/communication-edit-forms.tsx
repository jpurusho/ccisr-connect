"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"
import type { BirthdayEntry, AnniversaryEntry } from "@/lib/email/card-builder"

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

export interface BibleStudyFormData {
  hostNames: string
  address: string
  city: string
  phone: string
  date: string
  time: string
  topic: string
  message: string
}

export function BibleStudyEditForm({
  data,
  onChange,
}: {
  data: BibleStudyFormData
  onChange: (data: BibleStudyFormData) => void
}) {
  function set<K extends keyof BibleStudyFormData>(
    field: K,
    value: BibleStudyFormData[K]
  ) {
    onChange({ ...data, [field]: value })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Host Names" htmlFor="bs-i-host">
          <Input
            id="bs-i-host"
            value={data.hostNames}
            onChange={(e) => set("hostNames", e.target.value)}
          />
        </Field>
        <Field label="Phone" htmlFor="bs-i-phone">
          <Input
            id="bs-i-phone"
            value={data.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Address" htmlFor="bs-i-addr">
        <Input
          id="bs-i-addr"
          value={data.address}
          onChange={(e) => set("address", e.target.value)}
        />
      </Field>
      <Field label="City" htmlFor="bs-i-city">
        <Input
          id="bs-i-city"
          value={data.city}
          onChange={(e) => set("city", e.target.value)}
          placeholder="e.g., San Ramon, CA"
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
      <Field label="Custom Message (optional)" htmlFor="bs-i-msg">
        <Textarea
          id="bs-i-msg"
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
// Women's Study Edit Form (inline)
// ---------------------------------------------------------------------------

export interface WomensStudyFormData {
  topic: string
  date: string
  time: string
  zoomLink: string
  message: string
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
      <Field label="Topic" htmlFor="ws-i-topic">
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
      <Field label="Zoom Link" htmlFor="ws-i-zoom">
        <Input
          id="ws-i-zoom"
          value={data.zoomLink}
          onChange={(e) => set("zoomLink", e.target.value)}
          placeholder="https://zoom.us/j/..."
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
}

export function BulletinEditForm({
  data,
  onChange,
}: {
  data: BulletinFormData
  onChange: (data: BulletinFormData) => void
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
      <Field label="Week Label" htmlFor="bul-i-week">
        <Input
          id="bul-i-week"
          value={data.weekLabel}
          onChange={(e) => onChange({ ...data, weekLabel: e.target.value })}
        />
      </Field>

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
