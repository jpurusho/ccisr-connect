/**
 * Simple recurrence rule parser and date generator.
 *
 * Supported rules:
 *   FREQ=WEEKLY;BYDAY=FR                    — every Friday
 *   FREQ=WEEKLY;BYDAY=WE                    — every Wednesday
 *   FREQ=MONTHLY;BYDAY=1SA                  — first Saturday of each month
 *   FREQ=MONTHLY;BYDAY=2FR                  — second Friday of each month
 *
 * Optional modifiers (appended with semicolons):
 *   EXCEPT=2026-06-06,2026-07-04            — skip specific dates
 *   UNTIL=2026-12-31                        — stop generating after this date
 *
 * If the rule is null/empty, returns an empty array.
 */

import { addDays, addMonths, startOfMonth, format, isBefore, isAfter, isSameDay } from "date-fns"

const DAY_MAP: Record<string, number> = {
  SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
}

interface ParsedRule {
  freq: "WEEKLY" | "MONTHLY"
  byDay: string
  nthWeek?: number
  except: Set<string>
  until: Date | null
}

function parseRule(rule: string): ParsedRule | null {
  const parts: Record<string, string> = {}
  for (const segment of rule.split(";")) {
    const [key, val] = segment.split("=")
    if (key && val) parts[key.trim().toUpperCase()] = val.trim()
  }

  const freq = parts.FREQ as "WEEKLY" | "MONTHLY" | undefined
  if (!freq || (freq !== "WEEKLY" && freq !== "MONTHLY")) return null

  const byDayRaw = parts.BYDAY
  if (!byDayRaw) return null

  const nthMatch = byDayRaw.match(/^(\d)([A-Z]{2})$/)
  const dayCode = nthMatch ? nthMatch[2] : byDayRaw
  if (!(dayCode in DAY_MAP)) return null

  const except = new Set<string>(
    parts.EXCEPT ? parts.EXCEPT.split(",").map((d) => d.trim()) : []
  )

  const until = parts.UNTIL ? new Date(parts.UNTIL + "T23:59:59") : null

  return {
    freq,
    byDay: dayCode,
    nthWeek: nthMatch ? parseInt(nthMatch[1]) : undefined,
    except,
    until,
  }
}

/**
 * Generate all occurrence dates within [rangeStart, rangeEnd] for a given rule.
 */
export function getOccurrences(
  rule: string | null | undefined,
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  if (!rule) return []

  const parsed = parseRule(rule)
  if (!parsed) return []

  const results: Date[] = []
  const targetDow = DAY_MAP[parsed.byDay]

  if (parsed.freq === "WEEKLY") {
    // Find the first target day on or after rangeStart
    let d = new Date(rangeStart)
    const currentDow = d.getDay()
    const diff = (targetDow - currentDow + 7) % 7
    d = addDays(d, diff)

    while (!isAfter(d, rangeEnd)) {
      if (parsed.until && isAfter(d, parsed.until)) break
      const iso = format(d, "yyyy-MM-dd")
      if (!parsed.except.has(iso)) {
        results.push(new Date(d))
      }
      d = addDays(d, 7)
    }
  } else if (parsed.freq === "MONTHLY") {
    const nth = parsed.nthWeek ?? 1

    // Iterate month by month
    let monthDate = startOfMonth(rangeStart)
    while (!isAfter(monthDate, rangeEnd)) {
      // Find the nth occurrence of targetDow in this month
      const firstOfMonth = new Date(monthDate)
      const firstDow = firstOfMonth.getDay()
      let firstTarget = addDays(firstOfMonth, (targetDow - firstDow + 7) % 7)

      const nthTarget = addDays(firstTarget, (nth - 1) * 7)

      // Check it's still in the same month
      if (nthTarget.getMonth() === monthDate.getMonth()) {
        if (!isBefore(nthTarget, rangeStart) && !isAfter(nthTarget, rangeEnd)) {
          if (parsed.until && isAfter(nthTarget, parsed.until)) break
          const iso = format(nthTarget, "yyyy-MM-dd")
          if (!parsed.except.has(iso)) {
            results.push(nthTarget)
          }
        }
      }

      monthDate = addMonths(monthDate, 1)
    }
  }

  return results
}

/**
 * Check if a specific date is an occurrence of a recurrence rule.
 */
export function isOccurrence(
  rule: string | null | undefined,
  date: Date
): boolean {
  if (!rule) return false
  const occurrences = getOccurrences(rule, date, date)
  return occurrences.some((d) => isSameDay(d, date))
}

/**
 * Get the next occurrence on or after a given date.
 */
export function getNextOccurrence(
  rule: string | null | undefined,
  after: Date
): Date | null {
  if (!rule) return null
  // Search up to 6 months ahead
  const rangeEnd = addMonths(after, 6)
  const occurrences = getOccurrences(rule, after, rangeEnd)
  return occurrences.length > 0 ? occurrences[0] : null
}
