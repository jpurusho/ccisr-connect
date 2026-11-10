import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Field } from "./template-form-field"
import { CommonTemplateFields } from "./common-template-fields"
import { FormattingHelp } from "@/components/shared/formatting-help"
import { VerseLookup } from "@/components/shared/verse-lookup"
import { PastelColorPicker, TextColorPicker } from "@/components/dashboard/communication-edit-forms"
import type { ShoeboxMinistryDefaults } from "@/lib/template-defaults"
import type { TemplateStyleSettings } from "@/lib/email/card-builder"

interface ShoeboxMinistryTemplateFormProps {
  data: ShoeboxMinistryDefaults
  onChange: (updater: (prev: ShoeboxMinistryDefaults) => ShoeboxMinistryDefaults) => void
  styleSettings?: TemplateStyleSettings
}

export function ShoeboxMinistryTemplateForm({ data, onChange, styleSettings }: ShoeboxMinistryTemplateFormProps) {
  return (
    <>
      <Field label="Due Date" htmlFor="sbx-due" hint="When shoeboxes are due">
        <Input
          id="sbx-due"
          value={data.dueDate || ""}
          onChange={(e) => onChange((prev) => ({ ...prev, dueDate: e.target.value }))}
          placeholder="Sunday, November 15th, 2026"
        />
      </Field>
      <Field label="Online Builder Link" htmlFor="sbx-link" hint="Link to build shoeboxes online">
        <Input
          id="sbx-link"
          value={data.onlineLink || ""}
          onChange={(e) => onChange((prev) => ({ ...prev, onlineLink: e.target.value }))}
          placeholder="https://build-a-shoebox.samaritanspurse.org/..."
        />
      </Field>
      <Field label="Gift Suggestions PDF Path" htmlFor="sbx-pdf" hint="Path to gift suggestions PDF for attachment">
        <Input
          id="sbx-pdf"
          value={data.pdfPath || ""}
          onChange={(e) => onChange((prev) => ({ ...prev, pdfPath: e.target.value }))}
          placeholder="/Users/.../2026-Gift-Suggestions.pdf"
        />
      </Field>
      <Field label="Reminder Message" htmlFor="sbx-msg" hint="Main message body">
        <Textarea
          id="sbx-msg"
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
      <Field label="Footer Bible Verse" htmlFor="sbx-verse" hint="Leave empty for no footer">
        <Input
          id="sbx-verse"
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
