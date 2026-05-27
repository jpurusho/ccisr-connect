import { startOfMonth, endOfMonth } from "date-fns"
import { getOccurrences } from "@/lib/recurrence"

export interface HostAssignment {
  date: string
  familyId: string
  familyName: string
  responseId: string
  memberName: string
}

export interface AssignmentPreview {
  date: string
  familyId: string | null
  familyName: string | null
  responseId: string | null
  memberName: string | null
  existing: boolean
}

export function computeOccurrencesForMonth(
  recurrenceRule: string,
  year: number,
  month: number
): Date[] {
  const start = startOfMonth(new Date(year, month - 1, 1))
  const end = endOfMonth(start)
  return getOccurrences(recurrenceRule, start, end)
}

export function buildRotationPreview(
  occurrences: Date[],
  responses: { responseId: string; familyId: string; familyName: string; memberName: string }[],
  existingInstances: { date: string; hostFamilyId: string | null; responseId: string | null }[]
): AssignmentPreview[] {
  const existingMap = new Map(existingInstances.map((i) => [i.date, i]))
  const preview: AssignmentPreview[] = []

  let responseIdx = 0

  for (const occ of occurrences) {
    const dateStr = occ.toISOString().slice(0, 10)
    const existing = existingMap.get(dateStr)

    if (existing?.hostFamilyId && existing?.responseId) {
      preview.push({
        date: dateStr,
        familyId: existing.hostFamilyId,
        familyName: null,
        responseId: existing.responseId,
        memberName: null,
        existing: true,
      })
    } else if (responses.length > 0) {
      const resp = responses[responseIdx % responses.length]
      preview.push({
        date: dateStr,
        familyId: resp.familyId,
        familyName: resp.familyName,
        responseId: resp.responseId,
        memberName: resp.memberName,
        existing: false,
      })
      responseIdx++
    } else {
      preview.push({
        date: dateStr,
        familyId: null,
        familyName: null,
        responseId: null,
        memberName: null,
        existing: false,
      })
    }
  }

  return preview
}
