#!/usr/bin/env tsx
/**
 * Check for breaks affecting Bible Study this week
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function check() {
  console.log('🔍 Checking Bible Study breaks...\n')

  // Get Bible Study event
  const { data: eventType } = await supabase
    .from('event_types')
    .select('id, name')
    .eq('comm_type', 'bible_study')
    .single()

  if (!eventType) {
    console.log('❌ No Bible Study event type found')
    return
  }

  const { data: events } = await supabase
    .from('events')
    .select('id, title')
    .eq('event_type_id', eventType.id)
    .eq('is_active', true)

  if (!events || events.length === 0) {
    console.log('❌ No active Bible Study events')
    return
  }

  console.log(`Found ${events.length} Bible Study event(s):\n`)

  for (const event of events) {
    console.log(`Event: ${event.title} (${event.id})`)

    // Get ALL breaks for this event
    const { data: breaks } = await supabase
      .from('event_breaks')
      .select('*')
      .eq('event_id', event.id)
      .order('start_date')

    if (!breaks || breaks.length === 0) {
      console.log('  ✅ No breaks scheduled\n')
      continue
    }

    console.log(`  📅 ${breaks.length} break(s) scheduled:\n`)

    for (const brk of breaks) {
      const today = new Date().toISOString().split('T')[0]
      const isActive = brk.start_date <= today && brk.end_date >= today
      const isPast = brk.end_date < today
      const isFuture = brk.start_date > today

      let status = ''
      if (isActive) status = '🔴 ACTIVE (affecting this week)'
      else if (isPast) status = '⚪ Past'
      else if (isFuture) status = '🟡 Future'

      console.log(`     ${status}`)
      console.log(`     From: ${brk.start_date}`)
      console.log(`     To:   ${brk.end_date}`)
      console.log(`     Message: ${brk.message || '(none)'}`)
      console.log(`     ID: ${brk.id}`)

      if (isActive) {
        console.log(`\n     ⚠️  This break is causing "No bible study this week"`)
        console.log(`     To remove: DELETE FROM event_breaks WHERE id = '${brk.id}';`)
      }
      console.log('')
    }
  }
}

check().catch(console.error)
