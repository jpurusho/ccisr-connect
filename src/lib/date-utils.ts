export const MONTH_NAMES_SHORT = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

export const MONTH_NAMES_FULL = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export function formatMonthDay(month: number, day: number): string {
  return `${MONTH_NAMES_SHORT[month]} ${day}`
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number)
  return `${MONTH_NAMES_SHORT[month]} ${day}, ${year}`
}

export function formatTime(timeStr: string | null): string {
  if (!timeStr) return ""
  const [h, m] = timeStr.split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`
}

export function getCurrentWeekBounds(today: Date): { monday: Date; sunday: Date } {
  const d = new Date(today)
  d.setHours(0, 0, 0, 0)
  const dayOfWeek = d.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { monday, sunday }
}

export function getMonthDayPairsInRange(
  start: Date,
  end: Date
): Array<{ month: number; day: number }> {
  const pairs: Array<{ month: number; day: number }> = []
  const current = new Date(start)
  current.setHours(0, 0, 0, 0)
  const endTime = new Date(end)
  endTime.setHours(23, 59, 59, 999)

  while (current <= endTime) {
    pairs.push({ month: current.getMonth() + 1, day: current.getDate() })
    current.setDate(current.getDate() + 1)
  }
  return pairs
}

export function getWeekLabel(monday: Date, sunday: Date): string {
  return `${MONTH_NAMES_SHORT[monday.getMonth() + 1]} ${monday.getDate()} – ${MONTH_NAMES_SHORT[sunday.getMonth() + 1]} ${sunday.getDate()}`
}

export function getUpcomingSunday(today: Date): Date {
  const d = new Date(today)
  d.setHours(0, 0, 0, 0)
  const dayOfWeek = d.getDay()
  if (dayOfWeek === 0) return d
  d.setDate(d.getDate() + (7 - dayOfWeek))
  return d
}

export function getBulletinWeekBounds(targetSunday: Date): { sunday: Date; saturday: Date } {
  const sunday = new Date(targetSunday)
  sunday.setHours(0, 0, 0, 0)
  const saturday = new Date(sunday)
  saturday.setDate(sunday.getDate() + 6)
  return { sunday, saturday }
}

export function getBulletinMultiWeekBounds(
  targetSunday: Date,
  weekCount: number
): { sunday: Date; saturday: Date } {
  const sunday = new Date(targetSunday)
  sunday.setHours(0, 0, 0, 0)
  const saturday = new Date(sunday)
  saturday.setDate(sunday.getDate() + weekCount * 7 - 1)
  return { sunday, saturday }
}

export function statusLabel(status: string): string {
  switch (status) {
    case "confirmed": return "Scheduled"
    case "draft": return "Tentative"
    case "cancelled": return "Cancelled"
    case "pending": return "Pending"
    case "approved": return "Approved"
    case "sending": return "Sending"
    case "sent": return "Sent"
    case "failed": return "Failed"
    default: return status.charAt(0).toUpperCase() + status.slice(1)
  }
}
