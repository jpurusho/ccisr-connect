#!/usr/bin/env tsx
/**
 * Check templates with service role key
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function check() {
  console.log('🔍 Checking templates and event types...\n')

  // Get all event types
  const { data: eventTypes } = await supabase
    .from('event_types')
    .select('id, name, comm_type')
    .in('comm_type', ['bible_study', 'womens_study', 'prayer_meeting', 'birthday', 'anniversary', 'bulletin'])
    .order('comm_type')

  console.log(`📋 Standard Event Types: ${eventTypes?.length || 0}`)
  const etMap: Record<string, { id: string; name: string }> = {}
  eventTypes?.forEach(et => {
    if (et.comm_type) {
      etMap[et.comm_type] = { id: et.id, name: et.name }
      console.log(`  - ${et.comm_type}: ${et.name} (${et.id})`)
    }
  })
  console.log('')

  // Get default templates
  const { data: templates } = await supabase
    .from('email_templates')
    .select('id, name, event_type_id, is_default')
    .eq('is_default', true)

  console.log(`📄 Default Templates: ${templates?.length || 0}`)
  const tmplMap = new Map(templates?.map(t => [t.event_type_id, t]) || [])

  for (const [commType, et] of Object.entries(etMap)) {
    const tmpl = tmplMap.get(et.id)
    if (tmpl) {
      console.log(`  ✅ ${commType}: has template "${tmpl.name}"`)
    } else {
      console.log(`  ❌ ${commType}: MISSING template for event type "${et.name}" (${et.id})`)
    }
  }
  console.log('')

  // Check for bible study event
  const { data: events } = await supabase
    .from('events')
    .select('id, title, event_type_id, is_active, recurrence_rule, start_date')
    .eq('is_active', true)

  const bsEventTypeId = etMap['bible_study']?.id
  const bsEvents = events?.filter(e => e.event_type_id === bsEventTypeId) || []

  console.log(`📅 Bible Study Events: ${bsEvents.length}`)
  if (bsEvents.length === 0) {
    console.log(`  ❌ No active calendar event for bible_study`)
    console.log(`     → Create an event in Calendar with event type "Family Bible Study"`)
  } else {
    bsEvents.forEach(e => {
      const recur = e.recurrence_rule ? 'recurring' : e.start_date ? `one-time: ${e.start_date}` : 'no schedule'
      console.log(`  ✅ ${e.title} (${recur})`)
    })
  }
}

check().catch(console.error)
