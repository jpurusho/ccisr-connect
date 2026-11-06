/**
 * Batch Event Breaks Query Utility
 *
 * Eliminates N+1 pattern when checking break status for multiple events.
 * Instead of querying breaks separately for each event/date inside a loop,
 * fetch all breaks for the date range upfront and use in-memory lookups.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

interface EventBreak {
  id: string
  event_id: string
  start_date: string
  end_date: string
  message: string | null
}

/**
 * Batch-load event breaks for a date range
 * Returns a map: eventId → array of breaks
 */
export async function batchLoadEventBreaks(
  eventIds: string[],
  startDate: string,
  endDate: string,
  supabase: SupabaseClient
): Promise<Map<string, EventBreak[]>> {
  const result = new Map<string, EventBreak[]>()

  if (eventIds.length === 0) return result

  // Single query for all breaks overlapping the date range
  const { data } = await supabase
    .from('event_breaks')
    .select('id, event_id, start_date, end_date, message')
    .in('event_id', eventIds)
    .lte('start_date', endDate)
    .gte('end_date', startDate)
    .returns<EventBreak[]>()

  // Group by event_id
  for (const brk of data ?? []) {
    if (!result.has(brk.event_id)) {
      result.set(brk.event_id, [])
    }
    result.get(brk.event_id)!.push(brk)
  }

  return result
}

/**
 * Check if an event is on break for a specific date (using pre-loaded breaks)
 */
export function isEventOnBreak(
  eventId: string,
  dateStr: string,
  breaksMap: Map<string, EventBreak[]>
): { isOnBreak: boolean; message: string | null } {
  const breaks = breaksMap.get(eventId)
  if (!breaks) return { isOnBreak: false, message: null }

  const match = breaks.find(b => b.start_date <= dateStr && b.end_date >= dateStr)
  return {
    isOnBreak: !!match,
    message: match?.message ?? (match ? 'On Break' : null),
  }
}
