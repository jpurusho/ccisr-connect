/**
 * Event Processing Utility
 *
 * Handles the common logic for recurring events (Bible Study, Women's Study, Prayer Meeting)
 * Eliminates ~300 lines of duplicated code.
 */

import { format } from 'date-fns'
import { getOccurrences } from '@/lib/recurrence'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getBreakStatus } from './break-utils'

interface Event {
  id: string
  title: string
  recurrence_rule: string | null
  start_date?: string | null
  end_date?: string | null
  default_time?: string | null
  host_family_id?: string | null
  host_until?: string | null
}

interface EventInstance {
  id: string
  event_id: string
  instance_date: string
  instance_time: string | null
  instance_end_time: string | null
  location_override: string | null
  notes: string | null
  host_family_id: string | null
  status: string
}

interface ProcessedEvent {
  date: string | null          // "Friday, August 21st" or null if none
  time: string | null          // "7:30 PM" or null
  onBreak: boolean
  cancelled: boolean
  hasOccurrence: boolean
  instance: EventInstance | null
  breakMessage: string | null  // User-friendly break message with end date and resume date
}

/**
 * Process a recurring event to determine if it occurs this week
 * and extract relevant data (date, time, status)
 */
export async function processRecurringEvent(
  event: Event | undefined,
  weekStart: Date,
  weekEnd: Date,
  instances: EventInstance[],
  supabase: SupabaseClient
): Promise<ProcessedEvent> {

  // No event = no occurrence
  if (!event) {
    return {
      date: null,
      time: null,
      onBreak: false,
      cancelled: false,
      hasOccurrence: false,
      instance: null,
      breakMessage: null,
    }
  }

  // Calculate occurrences
  const occurrences = event.recurrence_rule
    ? getOccurrences(event.recurrence_rule, weekStart, weekEnd)
    : []

  // Check for one-time event in range
  let rawDate = occurrences.length > 0 ? occurrences[0] : null
  if (!rawDate && !event.recurrence_rule && event.start_date) {
    const sd = new Date(event.start_date + 'T00:00:00')
    if (sd >= weekStart && sd <= weekEnd) {
      rawDate = sd
    }
  }

  // No occurrence this week
  if (!rawDate) {
    return {
      date: null,
      time: null,
      onBreak: false,
      cancelled: false,
      hasOccurrence: false,
      instance: null,
      breakMessage: null,
    }
  }

  // Find instance for this date
  const instance = instances.find(
    i => i.event_id === event.id && i.instance_date === format(rawDate!, 'yyyy-MM-dd')
  ) || null

  const cancelled = instance?.status === 'cancelled'

  // Check for break with detailed info
  const breakStatus = await getBreakStatus(
    event.id,
    rawDate,
    event.recurrence_rule,
    supabase
  )

  // Final date (null if cancelled or on break)
  const finalDate = (cancelled || breakStatus.isOnBreak) ? null : rawDate

  return {
    date: finalDate ? format(finalDate, 'EEEE, MMMM do') : null,
    time: instance?.instance_time || event.default_time || null,
    onBreak: breakStatus.isOnBreak,
    cancelled,
    hasOccurrence: true,
    instance,
    breakMessage: breakStatus.displayMessage,
  }
}

/**
 * Format time from 24h to 12h format
 */
export function formatTime(time: string | null): string {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}
