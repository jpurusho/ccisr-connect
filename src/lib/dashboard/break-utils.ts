/**
 * Break Detection Utilities
 *
 * Functions for checking if events are on break and getting break details.
 */

import { format, addDays } from 'date-fns'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getOccurrences } from '@/lib/recurrence'

interface EventBreak {
  id: string
  event_id: string
  start_date: string
  end_date: string
  message: string | null
}

interface BreakStatus {
  isOnBreak: boolean
  breakInfo: EventBreak | null
  breakEndDate: Date | null
  resumeDate: Date | null
  displayMessage: string | null
}

/**
 * Check if an event is on break for a specific date and get break details
 */
export async function getBreakStatus(
  eventId: string,
  checkDate: Date,
  recurrenceRule: string | null,
  supabase: SupabaseClient
): Promise<BreakStatus> {
  const dateISO = format(checkDate, 'yyyy-MM-dd')

  const { data: breakRows } = await supabase
    .from('event_breaks')
    .select('*')
    .eq('event_id', eventId)
    .lte('start_date', dateISO)
    .gte('end_date', dateISO)
    .limit(1)

  if (!breakRows || breakRows.length === 0) {
    return {
      isOnBreak: false,
      breakInfo: null,
      breakEndDate: null,
      resumeDate: null,
      displayMessage: null,
    }
  }

  const breakInfo = breakRows[0] as EventBreak
  const breakEndDate = new Date(breakInfo.end_date + 'T00:00:00')

  // Calculate resume date (first occurrence after break ends)
  const resumeDate = recurrenceRule
    ? getNextOccurrenceAfterDate(recurrenceRule, breakEndDate)
    : null

  // Build display message
  const displayMessage = buildBreakMessage(breakInfo, breakEndDate, resumeDate)

  return {
    isOnBreak: true,
    breakInfo,
    breakEndDate,
    resumeDate,
    displayMessage,
  }
}

/**
 * Get the next occurrence of a recurring event after a given date
 */
function getNextOccurrenceAfterDate(recurrenceRule: string, afterDate: Date): Date | null {
  const searchStart = addDays(afterDate, 1)
  const searchEnd = addDays(afterDate, 90) // Look ahead 90 days

  const occurrences = getOccurrences(recurrenceRule, searchStart, searchEnd)
  return occurrences.length > 0 ? occurrences[0] : null
}

/**
 * Build a user-friendly break message
 */
function buildBreakMessage(
  breakInfo: EventBreak,
  breakEndDate: Date,
  resumeDate: Date | null
): string {
  const endDateStr = format(breakEndDate, 'MMMM do')
  const customMessage = breakInfo.message || 'On scheduled break'

  if (resumeDate) {
    const resumeDateStr = format(resumeDate, 'EEEE, MMMM do')
    return `🏖️ ${customMessage} until ${endDateStr} - Resumes: ${resumeDateStr}`
  }

  return `🏖️ ${customMessage} until ${endDateStr}`
}

/**
 * Check if a specific date conflicts with any break for an event
 */
export async function checkBreakConflict(
  eventId: string,
  date: Date,
  supabase: SupabaseClient
): Promise<EventBreak | null> {
  const dateISO = format(date, 'yyyy-MM-dd')

  const { data } = await supabase
    .from('event_breaks')
    .select('*')
    .eq('event_id', eventId)
    .lte('start_date', dateISO)
    .gte('end_date', dateISO)
    .single()

  return data as EventBreak | null
}

/**
 * Get all active breaks for an event (breaks that include today)
 */
export async function getActiveBreaks(
  eventId: string,
  supabase: SupabaseClient
): Promise<EventBreak[]> {
  const today = format(new Date(), 'yyyy-MM-dd')

  const { data } = await supabase
    .from('event_breaks')
    .select('*')
    .eq('event_id', eventId)
    .lte('start_date', today)
    .gte('end_date', today)
    .order('start_date', { ascending: true })

  return (data as EventBreak[]) || []
}
