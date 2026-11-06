import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Field } from "./template-form-field"
import { CommonTemplateFields } from "./common-template-fields"
import { FormattingHelp } from "@/components/shared/formatting-help"
import { VerseLookup } from "@/components/shared/verse-lookup"
import { PastelColorPicker, TextColorPicker } from "@/components/dashboard/communication-edit-forms"
import type { PrayerMeetingDefaults } from "@/lib/template-defaults"
import type { TemplateStyleSettings } from "@/lib/email/card-builder"

interface PrayerMeetingTemplateFormProps {
  data: PrayerMeetingDefaults
  onChange: (updater: (prev: PrayerMeetingDefaults) => PrayerMeetingDefaults) => void
  styleSettings?: TemplateStyleSettings
}

export function PrayerMeetingTemplateForm({ data, onChange, styleSettings }: PrayerMeetingTemplateFormProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Default Date" htmlFor="pm-date" hint="e.g., First Saturday of each month">
          <Input
            id="pm-date"
            value={data.date || ""}
            onChange={(e) => onChange((prev) => ({ ...prev, date: e.target.value }))}
            placeholder="Saturday, May 3rd"
          />
        </Field>
        <Field label="Default Time" htmlFor="pm-time">
          <Input
            id="pm-time"
            value={data.time || ""}
            onChange={(e) => onChange((prev) => ({ ...prev, time: e.target.value }))}
            placeholder="6:00 PM"
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Default Host" htmlFor="pm-host">
          <Input
            id="pm-host"
            value={data.hostNames || ""}
            onChange={(e) => onChange((prev) => ({ ...prev, hostNames: e.target.value }))}
            placeholder="Host family name"
          />
        </Field>
        <Field label="Phone" htmlFor="pm-phone">
          <Input
            id="pm-phone"
            value={data.phone || ""}
            onChange={(e) => onChange((prev) => ({ ...prev, phone: e.target.value }))}
          />
        </Field>
      </div>
      <Field label="Address" htmlFor="pm-addr">
        <Input
          id="pm-addr"
          value={data.address || ""}
          onChange={(e) => onChange((prev) => ({ ...prev, address: e.target.value }))}
        />
      </Field>
      <Field label="City, State ZIP" htmlFor="pm-city">
        <Input
          id="pm-city"
          value={data.city || ""}
          onChange={(e) => onChange((prev) => ({ ...prev, city: e.target.value }))}
        />
      </Field>
      <Field label="Dinner Note" htmlFor="pm-dinner" hint="Leave empty to exclude">
        <Input
          id="pm-dinner"
          value={data.dinnerNote || ""}
          onChange={(e) => onChange((prev) => ({ ...prev, dinnerNote: e.target.value }))}
          placeholder="Potluck dinner — please bring a dish to share"
        />
      </Field>
      <Field label="Signup Link" htmlFor="pm-signup" hint="Leave empty to exclude">
        <Input
          id="pm-signup"
          value={data.signupLink || ""}
          onChange={(e) => onChange((prev) => ({ ...prev, signupLink: e.target.value }))}
          placeholder="https://..."
        />
      </Field>
      <Field label="Invite Message" htmlFor="pm-msg" hint="Leave empty for default">
        <Textarea
          id="pm-msg"
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
      <Field label="Footer Bible Verse" htmlFor="pm-verse" hint="Leave empty for default">
        <Input
          id="pm-verse"
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
    </>
  )
}
