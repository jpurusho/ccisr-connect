import { format, addDays } from "date-fns"

export type CommType =
  | "birthday"
  | "anniversary"
  | "bible_study"
  | "womens_study"
  | "prayer_meeting"
  | "bulletin"

export const COMM_TYPE_TO_ET: Record<CommType, string> = {
  birthday: "birthday",
  anniversary: "anniversary",
  bible_study: "friday_bible_study",
  womens_study: "wednesday_womens_study",
  prayer_meeting: "monthly_prayer",
  bulletin: "bulletin",
}

export const DISPATCH_MATCHERS: Record<CommType, (subject: string) => boolean> = {
  birthday: (s) => /birthday/i.test(s),
  anniversary: (s) => /anniversary/i.test(s),
  bible_study: (s) => /bible.?study/i.test(s) && !/women/i.test(s),
  womens_study: (s) => /women.*(?:bible|study)/i.test(s),
  prayer_meeting: (s) => /prayer/i.test(s),
  bulletin: (s) => /bulletin/i.test(s),
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
