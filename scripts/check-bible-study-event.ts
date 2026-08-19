#!/usr/bin/env tsx
/**
 * Check Bible Study event configuration
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function check() {
  console.log('🔍 Checking Bible Study Event Configuration\n')

  // Get current week
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const weekStartISO = weekStart.toISOString().split('T')[0]
  const weekEndISO = weekEnd.toISOString().split('T')[0]

  console.log(`Current week: ${weekStartISO} to ${weekEndISO}\n`)

  // Get event type
  const { data: eventType } = await supabase
    .from('event_types')
    .select('id, name, comm_type')
    .eq('comm_type', 'bible_study')
    .single()

  if (!eventType) {
    console.log('❌ No event type found with comm_type = bible_study')
    return
  }

  console.log(`✅ Event Type: ${eventType.name} (${eventType.id})\n`)

  // Get events
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('event_type_id', eventType.id)
    .eq('is_active', true)

  if (!events || events.length === 0) {
    console.log('❌ No active events found for Bible Study')
    console.log('   → This is why dashboard shows "No bible study this week"')
    console.log('   → FIX: Go to Calendar and create an event with event type "Family Bible Study"')
    return
  }

  console.log(`📅 Found ${events.length} active event(s):\n`)

  for (const event of events) {
    console.log(`Event: ${event.title} (${event.id})`)
    console.log(`  Recurrence: ${event.recurrence_rule || '(none)'}`)
    console.log(`  Start Date: ${event.start_date || '(none)'}`)
    console.log(`  End Date: ${event.end_date || '(none)'}`)
    console.log(`  Default Time: ${event.default_time || '(none)'}`)
    console.log(`  Host Family ID: ${event.host_family_id || '(none)'}`)
    console.log('')

    // Check for breaks this week
    const { data: breaks } = await supabase
      .from('event_breaks')
      .select('*')
      .eq('event_id', event.id)
      .lte('start_date', weekEndISO)
      .gte('end_date', weekStartISO)

    if (breaks && breaks.length > 0) {
      console.log('  🚫 ON BREAK THIS WEEK:')
      for (const brk of breaks) {
        console.log(`     ${brk.start_date} to ${brk.end_date}: ${brk.message || '(no message)'}`)
      }
      console.log('     → This is why dashboard shows "No bible study this week"')
      console.log('')
    }

    // Check instances this week
    const { data: instances } = await supabase
      .from('event_instances')
      .select('*')
      .eq('event_id', event.id)
      .gte('instance_date', weekStartISO)
      .lte('instance_date', weekEndISO)

    if (instances && instances.length > 0) {
      console.log('  📍 Instances this week:')
      for (const inst of instances) {
        console.log(`     ${inst.instance_date} at ${inst.instance_time || event.default_time} - Status: ${inst.status}`)
        if (inst.status === 'cancelled') {
          console.log('        → Cancelled instance - won\'t show in dashboard')
        }
      }
      console.log('')
    }
  }

  console.log('=' .repeat(60))
  console.log('\n💡 SUMMARY:\n')
  console.log('If dashboard shows "No bible study this week", possible causes:')
  console.log('  1. Event has no recurrence_rule AND start_date is not this week')
  console.log('  2. Event is on break (check event_breaks table above)')
  console.log('  3. Instance is cancelled')
  console.log('  4. Recurrence rule doesn\'t generate an occurrence this week')
  console.log('')
  console.log('To fix:')
  console.log('  - If on break: Delete the break or wait for it to end')
  console.log('  - If no recurrence: Add recurrence_rule (e.g., "FREQ=WEEKLY;BYDAY=FR")')
  console.log('  - If cancelled: Restore the instance via Calendar')
}

check().catch(console.error)
