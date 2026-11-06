import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Field } from "./template-form-field"
import { CommonTemplateFields } from "./common-template-fields"
import { FormattingHelp } from "@/components/shared/formatting-help"
import { VerseLookup } from "@/components/shared/verse-lookup"
import { PastelColorPicker, TextColorPicker, HostFamilyInput } from "@/components/dashboard/communication-edit-forms"
import { formatPhone } from "@/lib/utils"
import type { BibleStudyDefaults } from "@/lib/template-defaults"
import type { TemplateStyleSettings } from "@/lib/email/card-builder"

interface BibleStudyTemplateFormProps {
  data: BibleStudyDefaults
  onChange: (updater: (prev: BibleStudyDefaults) => BibleStudyDefaults) => void
  styleSettings?: TemplateStyleSettings
}

export function BibleStudyTemplateForm({ data, onChange, styleSettings }: BibleStudyTemplateFormProps) {
  return (
    <>
      <Field label="Card Title" htmlFor="bs-title">
        <Input
          id="bs-title"
          value={data.title || ""}
          onChange={(e) => onChange((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Bible Study This Friday"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Topic" htmlFor="bs-topic">
          <Input
            id="bs-topic"
            value={data.topic || ""}
            onChange={(e) => onChange((prev) => ({ ...prev, topic: e.target.value }))}
          />
        </Field>
        <Field label="Default Time" htmlFor="bs-time">
          <Input
            id="bs-time"
            value={data.time || ""}
            onChange={(e) => onChange((prev) => ({ ...prev, time: e.target.value }))}
            placeholder="7:30 PM"
          />
        </Field>
      </div>
      <Field label="Invite Message" htmlFor="bs-msg" hint="Leave empty to exclude">
        <Textarea
          id="bs-msg"
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
      <Field label="Footer Bible Verse" htmlFor="bs-verse" hint="Leave empty for no footer">
        <Input
          id="bs-verse"
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

      <div className="space-y-3">
        <Label>Default Host / Location</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          <HostFamilyInput
            value={data.hostNames || ""}
            onChange={(v) => onChange((prev) => ({ ...prev, hostNames: v }))}
            onSelect={(f) => {
              const useStreet = !!f.street
              onChange((prev) => ({
                ...prev,
                hostNames: `${f.family_name}'s Residence`,
                address: useStreet ? (f.street || undefined) : (f.full_address || prev.address),
                city: useStreet ? ([f.city, [f.state, f.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ") || prev.city) : "",
                phone: formatPhone(f.home_phone) || prev.phone,
              }))
            }}
          />
          <Input
            placeholder="Phone"
            value={data.phone || ""}
            onChange={(e) => onChange((prev) => ({ ...prev, phone: e.target.value }))}
          />
        </div>
        <Input
          placeholder="Address"
          value={data.address || ""}
          onChange={(e) => onChange((prev) => ({ ...prev, address: e.target.value }))}
        />
        <Input
          placeholder="City, State ZIP"
          value={data.city || ""}
          onChange={(e) => onChange((prev) => ({ ...prev, city: e.target.value }))}
        />
      </div>
    </>
  )
}
