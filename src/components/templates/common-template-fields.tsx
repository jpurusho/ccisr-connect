import React, { memo } from "react"
import { Label } from "@/components/ui/label"
import { CustomSectionsEditor, ResourceLinksEditor } from "@/components/dashboard/communication-edit-forms"
import { type CommonCardFields, type PlaceholderDef, TEMPLATE_PLACEHOLDERS } from "@/lib/template-defaults"

export const CommonTemplateFields = memo(function CommonTemplateFields<T extends CommonCardFields>({
  data,
  onChange,
}: {
  data: T
  onChange: (updater: (prev: T) => T) => void
}) {
  return (
    <>
      <CustomSectionsEditor
        sections={data.customSections ?? []}
        onChange={(sections) => onChange((prev) => ({ ...prev, customSections: sections }))}
      />
      <ResourceLinksEditor
        links={data.resourceLinks ?? []}
        onChange={(links) => onChange((prev) => ({ ...prev, resourceLinks: links }))}
      />
    </>
  )
}) as <T extends CommonCardFields>(props: {
  data: T
  onChange: (updater: (prev: T) => T) => void
}) => React.ReactElement

export const PlaceholderReference = memo(function PlaceholderReference({ typeName }: { typeName: string }) {
  const placeholders: PlaceholderDef[] = TEMPLATE_PLACEHOLDERS[typeName] ?? []
  if (placeholders.length === 0) return null
  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Available Placeholders</p>
      <div className="flex flex-wrap gap-1.5">
        {placeholders.map((p) => (
          <button
            key={p.token}
            type="button"
            title={`${p.description} — e.g. "${p.example}"`}
            className="inline-flex items-center rounded border bg-background px-1.5 py-0.5 font-mono text-xs text-foreground hover:bg-accent transition-colors"
            onClick={() => {
              navigator.clipboard.writeText(p.token)
                .then(() => {/* copied */})
                .catch(() => {/* ignore */})
            }}
          >
            {p.token}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">Click to copy. Use in subject, message, or footer fields.</p>
    </div>
  )
})
