import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Send, Pencil, Ban, RotateCcw, Copy, Trash2 } from "lucide-react"

interface CustomTemplate {
  id: string
  name: string
  subject_template: string
  body_template: string
  style_settings?: Record<string, unknown>
  is_active: boolean
}

interface CustomTemplateListProps {
  templates: CustomTemplate[]
  onEdit: (template: CustomTemplate) => void
  onToggleActive: (id: string, name: string, currentActive: boolean) => void
  onClone: (id: string, name: string) => void
  onDelete: (id: string, name: string) => void
}

export function CustomTemplateList({
  templates,
  onEdit,
  onToggleActive,
  onClone,
  onDelete
}: CustomTemplateListProps) {
  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Send className="size-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">No custom templates yet.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Click <strong>New Template</strong> to create your first custom announcement template.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {templates.map((ct) => {
        let parsed: Record<string, unknown> = {}
        try {
          parsed = JSON.parse(ct.body_template)
        } catch {
          /* ignore */
        }
        return (
          <div key={ct.id} className={`flex items-center justify-between rounded-lg border px-4 py-3 ${!ct.is_active ? "opacity-50" : ""}`}>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{ct.name}</p>
              <p className="text-xs text-muted-foreground truncate">{ct.subject_template}</p>
              {typeof parsed.title === "string" && parsed.title && (
                <p className="text-xs text-muted-foreground/70 truncate mt-0.5">Card: {parsed.title}</p>
              )}
              {!ct.is_active && (
                <Badge variant="secondary" className="mt-1 text-[10px]">Inactive</Badge>
              )}
            </div>
            <div className="flex gap-1 shrink-0 ml-2">
              <Button
                variant="ghost"
                size="icon-sm"
                title="Edit"
                onClick={() => onEdit(ct)}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                title={ct.is_active ? "Deactivate" : "Activate"}
                onClick={() => onToggleActive(ct.id, ct.name, ct.is_active)}
              >
                {ct.is_active ? <Ban className="size-3.5 text-muted-foreground" /> : <RotateCcw className="size-3.5 text-green-600" />}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                title="Clone"
                onClick={() => onClone(ct.id, ct.name)}
              >
                <Copy className="size-3.5 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                title="Delete"
                onClick={() => onDelete(ct.id, ct.name)}
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
