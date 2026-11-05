import { Badge } from "@/components/ui/badge"
import { Plus, Send } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface TemplateCard {
  id: string
  label: string
  icon: LucideIcon
  color: string
  hasSaved: boolean
  isCustom: boolean
  isActive?: boolean
}

interface TemplateGridProps {
  cards: TemplateCard[]
  onSelectCard: (cardId: string) => void
  onCreateNew: () => void
}

export function TemplateGrid({ cards, onSelectCard, onCreateNew }: TemplateGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelectCard(card.id)}
            className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all hover:shadow-md hover:border-primary/30 active:scale-95 ${"isActive" in card && !card.isActive ? "opacity-50" : ""}`}
          >
            <div
              className="flex size-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: card.color + "18", color: card.color }}
            >
              <Icon className="size-5" />
            </div>
            <span className="text-sm font-medium">{card.label}</span>
            {"isActive" in card && !card.isActive ? (
              <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
            ) : card.hasSaved ? (
              <span className="size-1.5 rounded-full" style={{ backgroundColor: card.color }} />
            ) : null}
          </button>
        )
      })}
      <button
        type="button"
        onClick={onCreateNew}
        className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-center text-muted-foreground transition-all hover:border-primary/40 hover:text-primary"
      >
        <Plus className="size-5" />
        <span className="text-sm font-medium">New Template</span>
      </button>
    </div>
  )
}
