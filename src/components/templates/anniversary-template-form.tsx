import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Field } from "./template-form-field"
import { CommonTemplateFields } from "./common-template-fields"
import { FormattingHelp } from "@/components/shared/formatting-help"
import { VerseLookup } from "@/components/shared/verse-lookup"
import { PastelColorPicker, TextColorPicker } from "@/components/dashboard/communication-edit-forms"
import type { AnniversaryDefaults, TemplateStyleSettings } from "@/lib/template-defaults"

interface AnniversaryTemplateFormProps {
  data: AnniversaryDefaults
  onChange: (updater: (prev: AnniversaryDefaults) => AnniversaryDefaults) => void
  styleSettings?: TemplateStyleSettings
}

export function AnniversaryTemplateForm({ data, onChange, styleSettings }: AnniversaryTemplateFormProps) {
  return (
    <>
      <Field label="Wish Message" htmlFor="an-msg" hint="Leave empty for no wish text">
        <Textarea
          id="an-msg"
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
      <Field label="Footer Bible Verse" htmlFor="an-verse" hint="Leave empty for no footer">
        <Input
          id="an-verse"
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
