import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Loader2, Plus, Save } from "lucide-react"
import { Field, ColorPickerField } from "./template-form-field"
import { PlaceholderReference } from "./common-template-fields"
import { VerseLookup } from "@/components/shared/verse-lookup"
import { PastelColorPicker, TextColorPicker, CustomSectionsEditor, ResourceLinksEditor, FlyerSectionsEditor, type FlyerSectionItem } from "@/components/dashboard/communication-edit-forms"
import { TemplateStyleEditor } from "@/components/dashboard/template-style-editor"
import { VisualTemplateBuilder } from "@/components/template-builder/visual-template-builder"
import { PASTEL_BORDER_MAP, type TemplateStyleSettings } from "@/lib/email/card-builder"
import type { VisualConfig } from "@/lib/email/visual-config-types"

interface CustomTemplateEditorProps {
  mode: "create" | "edit"
  initialData?: {
    id?: string
    name: string
    subject: string
    data: Record<string, unknown>
    styleSettings: TemplateStyleSettings
    isActive?: boolean
  }
  saving: boolean
  onSave: (data: {
    id?: string
    name: string
    subject: string
    data: Record<string, unknown>
    styleSettings: TemplateStyleSettings
  }) => void
  onCancel: () => void
  onToggleActive?: (id: string, isActive: boolean) => void
}

export function CustomTemplateEditor({
  mode,
  initialData,
  saving,
  onSave,
  onCancel,
  onToggleActive
}: CustomTemplateEditorProps) {
  const [name, setName] = useState(initialData?.name || "")
  const [subject, setSubject] = useState(initialData?.subject || "")
  const [data, setData] = useState<Record<string, unknown>>(initialData?.data || {
    title: "",
    subtitle: "",
    emoji: "📋",
    primaryColor: "",
    body: "",
    bodyBgColor: undefined,
    bodyTextColor: undefined,
    headerTitleColor: undefined,
    headerSubtitleColor: undefined,
    footerVerse: "",
    footerVerseBgColor: undefined,
    footerVerseTextColor: undefined,
    resourceLinks: [],
    customSections: [],
    flyerSections: [],
    onBreak: false,
    breakMessage: "",
    breaks: []
  })
  const [styleSettings, setStyleSettings] = useState<TemplateStyleSettings>(initialData?.styleSettings || {})
  const [useVisualBuilder, setUseVisualBuilder] = useState((initialData?.data?._useVisualBuilder as boolean) ?? false)

  const handleSubmit = () => {
    if (mode === "create" && (!name.trim() || !subject.trim())) {
      return
    }

    const submitData = useVisualBuilder ? { ...data, _useVisualBuilder: undefined } : data

    onSave({
      id: initialData?.id,
      name: name.trim(),
      subject: subject.trim(),
      data: submitData,
      styleSettings
    })
  }

  if (mode === "edit" && useVisualBuilder) {
    return (
      <>
        <div className="flex items-center gap-2 border-b pb-3 mb-4">
          <Button
            variant={!useVisualBuilder ? "default" : "outline"}
            size="sm"
            onClick={() => setUseVisualBuilder(false)}
          >
            Form Editor
          </Button>
          <Button
            variant={useVisualBuilder ? "default" : "outline"}
            size="sm"
            onClick={() => setUseVisualBuilder(true)}
          >
            Visual Builder
          </Button>
          {initialData?.id && onToggleActive && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {initialData.isActive !== false ? "Active" : "Inactive"}
              </span>
              <Switch
                size="sm"
                checked={initialData.isActive !== false}
                onCheckedChange={(checked) => onToggleActive(initialData.id!, checked)}
              />
            </div>
          )}
        </div>
        <VisualTemplateBuilder
          initialConfig={(data.visualConfig as VisualConfig) ?? null}
          globalStyle={styleSettings}
          saving={saving}
          onSave={async (config) => {
            onSave({
              id: initialData?.id,
              name,
              subject,
              data: { ...data, visualConfig: config, _useVisualBuilder: undefined },
              styleSettings
            })
          }}
        />
      </>
    )
  }

  return (
    <div className="space-y-4">
      {mode === "edit" && (
        <div className="flex items-center gap-2 border-b pb-3">
          <Button
            variant={!useVisualBuilder ? "default" : "outline"}
            size="sm"
            onClick={() => setUseVisualBuilder(false)}
          >
            Form Editor
          </Button>
          <Button
            variant={useVisualBuilder ? "default" : "outline"}
            size="sm"
            onClick={() => setUseVisualBuilder(true)}
          >
            Visual Builder
          </Button>
          {initialData?.id && onToggleActive && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {initialData.isActive !== false ? "Active" : "Inactive"}
              </span>
              <Switch
                size="sm"
                checked={initialData.isActive !== false}
                onCheckedChange={(checked) => onToggleActive(initialData.id!, checked)}
              />
            </div>
          )}
        </div>
      )}

      <Field label="Template Name *" htmlFor="nc-name" hint="A short name to identify this template">
        <Input
          id="nc-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Easter Announcement"
        />
      </Field>

      <Field label="Email Subject *" htmlFor="nc-subj">
        <Input
          id="nc-subj"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g., Easter Service — Join Us This Sunday"
        />
      </Field>

      <PlaceholderReference typeName="custom" />

      <Field label="Card Title" htmlFor="nc-title" hint="Displayed as the heading in the email card">
        <Input
          id="nc-title"
          value={(data.title as string) || ""}
          onChange={(e) => setData({ ...data, title: e.target.value })}
          placeholder="e.g., Easter Sunday Service"
          style={data.headerTitleColor ? { color: data.headerTitleColor as string } : undefined}
        />
        <TextColorPicker
          value={data.headerTitleColor as string | undefined}
          onChange={(c) => setData({ ...data, headerTitleColor: c })}
          label="Text"
        />
      </Field>

      <Field label="Subtitle" htmlFor="nc-sub">
        <Input
          id="nc-sub"
          value={(data.subtitle as string) || ""}
          onChange={(e) => setData({ ...data, subtitle: e.target.value })}
          style={data.headerSubtitleColor ? { color: data.headerSubtitleColor as string } : undefined}
        />
        <TextColorPicker
          value={data.headerSubtitleColor as string | undefined}
          onChange={(c) => setData({ ...data, headerSubtitleColor: c })}
          label="Text"
        />
        <VerseLookup
          onSelect={(text, ref) => setData({ ...data, subtitle: `"${text}" — ${ref}` })}
        />
      </Field>

      <Field label="Header Emoji" htmlFor="nc-emoji" hint="Paste an emoji (e.g. 🤝 🙌 ⛪)">
        <Input
          id="nc-emoji"
          value={(data.emoji as string) || "📋"}
          onChange={(e) => setData({ ...data, emoji: e.target.value })}
          className="w-24 text-2xl text-center"
        />
      </Field>

      <ColorPickerField
        value={(data.primaryColor as string) || ""}
        defaultColor="#6B7280"
        onChange={(color) => setData({ ...data, primaryColor: color })}
      />

      <TemplateStyleEditor
        value={styleSettings}
        onChange={setStyleSettings}
      />

      <Field label="Message Body" htmlFor="nc-body">
        <Textarea
          id="nc-body"
          value={(data.body as string) || ""}
          onChange={(e) => setData({ ...data, body: e.target.value })}
          className="min-h-24 transition-colors"
          placeholder="Write the main content of the announcement..."
          style={(data.bodyBgColor as string) ? {
            backgroundColor: data.bodyBgColor as string,
            borderColor: PASTEL_BORDER_MAP[data.bodyBgColor as string],
            boxShadow: `0 0 6px ${PASTEL_BORDER_MAP[data.bodyBgColor as string]}50`,
            color: '#1E293B',
          } : undefined}
        />
        <div className="flex items-center gap-4">
          <PastelColorPicker
            value={data.bodyBgColor as string | undefined}
            onChange={(color) => setData({ ...data, bodyBgColor: color })}
            extraPastels={styleSettings.customPastels}
          />
          <TextColorPicker
            value={data.bodyTextColor as string | undefined}
            onChange={(c) => setData({ ...data, bodyTextColor: c })}
            label="Text"
          />
        </div>
      </Field>

      <Field label="Footer Verse" htmlFor="nc-foot">
        <Input
          id="nc-foot"
          value={(data.footerVerse as string) || ""}
          onChange={(e) => setData({ ...data, footerVerse: e.target.value })}
          placeholder="e.g., For God so loved the world... — John 3:16"
          style={(data.footerVerseBgColor as string) ? {
            backgroundColor: data.footerVerseBgColor as string,
            borderColor: PASTEL_BORDER_MAP[data.footerVerseBgColor as string],
            boxShadow: `0 0 6px ${PASTEL_BORDER_MAP[data.footerVerseBgColor as string]}50`,
            color: '#1E293B',
          } : undefined}
        />
        <div className="flex items-center gap-4">
          <PastelColorPicker
            value={data.footerVerseBgColor as string | undefined}
            onChange={(color) => setData({ ...data, footerVerseBgColor: color })}
            extraPastels={styleSettings.customPastels}
          />
          <TextColorPicker
            value={data.footerVerseTextColor as string | undefined}
            onChange={(c) => setData({ ...data, footerVerseTextColor: c })}
            label="Text"
          />
        </div>
        <VerseLookup
          onSelect={(text, ref) => setData({ ...data, footerVerse: `"${text}" — ${ref}` })}
        />
      </Field>

      <FlyerSectionsEditor
        sections={(data.flyerSections as FlyerSectionItem[]) ?? []}
        onChange={(flyerSections) => setData({ ...data, flyerSections })}
      />

      <CustomSectionsEditor
        sections={(data.customSections as { title: string; emoji: string; entries: { label: string; name: string }[] }[]) ?? []}
        onChange={(sections) => setData({ ...data, customSections: sections })}
      />

      <ResourceLinksEditor
        links={(data.resourceLinks as { label: string; url: string }[]) ?? []}
        onChange={(links) => setData({ ...data, resourceLinks: links })}
      />

      <div className="flex gap-2 pt-2">
        <Button
          onClick={handleSubmit}
          disabled={saving || (mode === "create" && (!name.trim() || !subject.trim()))}
          style={{ backgroundColor: "#6B7280" }}
          className="text-white hover:opacity-90"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : mode === "create" ? <Plus className="size-4" /> : <Save className="size-4" />}
          {mode === "create" ? "Create Template" : "Save Changes"}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
