import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Field } from "./template-form-field"
import { CommonTemplateFields } from "./common-template-fields"
import { FormattingHelp } from "@/components/shared/formatting-help"
import { VerseLookup } from "@/components/shared/verse-lookup"
import { PastelColorPicker, TextColorPicker } from "@/components/dashboard/communication-edit-forms"
import type { BirthdayDefaults } from "@/lib/template-defaults"
import type { TemplateStyleSettings } from "@/lib/email/card-builder"

interface BirthdayTemplateFormProps {
  data: BirthdayDefaults
  onChange: (updater: (prev: BirthdayDefaults) => BirthdayDefaults) => void
  styleSettings?: TemplateStyleSettings
}

export function BirthdayTemplateForm({ data, onChange, styleSettings }: BirthdayTemplateFormProps) {
  return (
    <>
      <Field label="Wish Message" htmlFor="bd-msg" hint="Leave empty for no wish text">
        <Textarea
          id="bd-msg"
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
      <Field label="Footer Bible Verse" htmlFor="bd-verse" hint="Leave empty for no footer">
        <Input
          id="bd-verse"
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
