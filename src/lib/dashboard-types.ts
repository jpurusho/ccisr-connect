import { format, addDays } from "date-fns"

/**
 * Template type strings - these reference templates in the registry.
 * NOT a hardcoded union - any string can be a valid template type.
 * Common built-in types for reference only.
 */
export type TemplateType = string

export function inferTemplateType(name: string): string | null {
  const n = name.toLowerCase()
  if (n.includes("bible study") && !n.includes("women")) return "bible_study"
  if (n.includes("women") && n.includes("study")) return "womens_study"
  if (n.includes("prayer")) return "prayer_meeting"
  if (n.includes("birthday")) return "birthday"
  if (n.includes("anniversary")) return "anniversary"
  if (n.includes("bulletin")) return "bulletin"
  if (n.includes("shoebox") || n.includes("operation christmas")) return "shoebox_ministry"
  return null
}

export function buildEventTypeMappings(eventTypes: { id: string; name: string; comm_type: string | null }[]): {
  etIdToTemplateType: Record<string, string>
  etIdToName: Record<string, string>
} {
  const etIdToTemplateType: Record<string, string> = {}
  const etIdToName: Record<string, string> = {}

  for (const et of eventTypes) {
    const templateType = et.comm_type ?? inferTemplateType(et.name)
    if (templateType) {
      etIdToTemplateType[et.id] = templateType
      etIdToName[et.id] = et.name
    }
  }

  return {
    etIdToTemplateType,
    etIdToName,
  }
}

export const DISPATCH_MATCHERS: Record<string, (subject: string) => boolean> = {
  birthday: (s) => /birthday/i.test(s),
  anniversary: (s) => /anniversary/i.test(s),
  bible_study: (s) => /bible.?study/i.test(s) && !/women/i.test(s),
  womens_study: (s) => /women.*(?:bible|study)/i.test(s),
  prayer_meeting: (s) => /prayer/i.test(s),
  bulletin: (s) => /bulletin/i.test(s),
  shoebox_ministry: (s) => /shoebox|operation christmas child/i.test(s),
}

export function formatRelativeTime(isoStr: string | null | undefined): string | null {
  if (!isoStr) return null
  const d = new Date(isoStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return format(d, "MMM d")
}

export function getWeekDays(start: Date, end: Date) {
  const days: { month: number; day: number }[] = []
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    days.push({ month: d.getMonth() + 1, day: d.getDate() })
  }
  return days
}

export function mapDispatchStatus(dbStatus: string): "draft" | "sent" | "scheduled" | "failed" {
  switch (dbStatus) {
    case "sent": return "sent"
    case "failed": return "failed"
    case "sending":
    case "pending":
    case "previewed":
    case "approved": return "scheduled"
    default: return "draft"
  }
}
