import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Plus, Trash2 } from "lucide-react"
import { Field } from "./template-form-field"
import { CommonTemplateFields } from "./common-template-fields"
import { FormattingHelp } from "@/components/shared/formatting-help"
import { VerseLookup } from "@/components/shared/verse-lookup"
import { PastelColorPicker, TextColorPicker } from "@/components/dashboard/communication-edit-forms"
import type { BulletinDefaults, TemplateStyleSettings } from "@/lib/template-defaults"

interface BulletinTemplateFormProps {
  data: BulletinDefaults
  onChange: (updater: (prev: BulletinDefaults) => BulletinDefaults) => void
  styleSettings?: TemplateStyleSettings
}

export function BulletinTemplateForm({ data, onChange, styleSettings }: BulletinTemplateFormProps) {
  return (
    <div className="space-y-3">
      <Label>Default Events</Label>
      {(data.events || []).map((evt, i) => (
        <div key={i} className="space-y-1.5 rounded-md border p-2.5">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Event title"
              value={evt.title}
              onChange={(e) => {
                const evts = [...(data.events || [])]
                evts[i] = { ...evts[i], title: e.target.value }
                onChange((prev) => ({ ...prev, events: evts }))
              }}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                const evts = (data.events || []).filter((_, j) => j !== i)
                onChange((prev) => ({ ...prev, events: evts }))
              }}
            >
              <Trash2 className="size-3.5 text-muted-foreground" />
            </Button>
          </div>
          <Textarea
            placeholder="Details"
            value={evt.details}
            onChange={(e) => {
              const evts = [...(data.events || [])]
              evts[i] = { ...evts[i], details: e.target.value }
              onChange((prev) => ({ ...prev, events: evts }))
            }}
            className="min-h-10"
          />
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          const evts = [...(data.events || []), { title: "", details: "" }]
          onChange((prev) => ({ ...prev, events: evts }))
        }}
      >
        <Plus className="size-3.5" />
        Add Event
      </Button>
      <Field label="Bulletin Message" htmlFor="bul-msg" hint="Leave empty to exclude">
        <Textarea
          id="bul-msg"
          value={data.message || ""}
          onChange={(e) => onChange((prev) => ({ ...prev, message: e.target.value }))}
          className="min-h-16"
        />
        <FormattingHelp />
        <PastelColorPicker
          value={data.messageBgColor}
          onChange={(color) => onChange((prev) => ({ ...prev, messageBgColor: color }))}
          extraPastels={styleSettings?.customPastels}
        />
      </Field>
      <Field label="Footer Bible Verse" htmlFor="bul-verse" hint="Leave empty for default footer">
        <Input
          id="bul-verse"
          value={data.footerVerse || ""}
          onChange={(e) => onChange((prev) => ({ ...prev, footerVerse: e.target.value }))}
        />
        <div className="flex items-center gap-4">
          <PastelColorPicker
            value={data.footerVerseBgColor}
            onChange={(color) => onChange((prev) => ({ ...prev, footerVerseBgColor: color }))}
            extraPastels={styleSettings?.customPastels}
          />
          <TextColorPicker
            value={data.footerVerseTextColor}
            onChange={(c) => onChange((prev) => ({ ...prev, footerVerseTextColor: c }))}
            label="Text"
          />
        </div>
        <VerseLookup onSelect={(text, ref) => onChange((prev) => ({ ...prev, footerVerse: `${text} — ${ref}` }))} />
      </Field>
      <CommonTemplateFields data={data} onChange={onChange} />
    </div>
  )
}
