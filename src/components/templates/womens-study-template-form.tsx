import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Field } from "./template-form-field"
import { CommonTemplateFields } from "./common-template-fields"
import { FormattingHelp } from "@/components/shared/formatting-help"
import { VerseLookup } from "@/components/shared/verse-lookup"
import { PastelColorPicker, TextColorPicker } from "@/components/dashboard/communication-edit-forms"
import type { WomensStudyDefaults, TemplateStyleSettings } from "@/lib/template-defaults"

interface WomensStudyTemplateFormProps {
  data: WomensStudyDefaults
  onChange: (updater: (prev: WomensStudyDefaults) => WomensStudyDefaults) => void
  styleSettings?: TemplateStyleSettings
}

export function WomensStudyTemplateForm({ data, onChange, styleSettings }: WomensStudyTemplateFormProps) {
  return (
    <>
      <Field label="Card Title" htmlFor="ws-title">
        <Input
          id="ws-title"
          value={data.title || ""}
          onChange={(e) => onChange((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Women's Bible Study"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Topic" htmlFor="ws-topic">
          <Input
            id="ws-topic"
            value={data.topic || ""}
            onChange={(e) => onChange((prev) => ({ ...prev, topic: e.target.value }))}
          />
        </Field>
        <Field label="Default Time" htmlFor="ws-time">
          <Input
            id="ws-time"
            value={data.time || ""}
            onChange={(e) => onChange((prev) => ({ ...prev, time: e.target.value }))}
            placeholder="7:00 PM"
          />
        </Field>
      </div>
      <Field label="Zoom Link" htmlFor="ws-zoom" hint="Leave empty to exclude Zoom details">
        <Input
          id="ws-zoom"
          value={data.zoomLink || ""}
          onChange={(e) => onChange((prev) => ({ ...prev, zoomLink: e.target.value }))}
          placeholder="https://zoom.us/j/..."
        />
      </Field>
      {data.zoomLink && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Meeting ID" htmlFor="ws-zmid">
            <Input
              id="ws-zmid"
              value={data.zoomMeetingId || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, zoomMeetingId: e.target.value }))}
              placeholder="779 2123 2378"
            />
          </Field>
          <Field label="Passcode" htmlFor="ws-zmpw">
            <Input
              id="ws-zmpw"
              value={data.zoomPasscode || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, zoomPasscode: e.target.value }))}
              placeholder="6gLy8u"
            />
          </Field>
        </div>
      )}
      <Field label="Location (when no Zoom)" htmlFor="ws-loc">
        <Input
          id="ws-loc"
          value={data.location || ""}
          onChange={(e) => onChange((prev) => ({ ...prev, location: e.target.value }))}
        />
      </Field>
      <Field label="Invite Message" htmlFor="ws-msg" hint="Leave empty to exclude">
        <Textarea
          id="ws-msg"
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
      <Field label="Footer Bible Verse" htmlFor="ws-verse" hint="Leave empty for no footer">
        <Input
          id="ws-verse"
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
