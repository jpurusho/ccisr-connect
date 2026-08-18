#!/usr/bin/env tsx
/**
 * Simple DB check script
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function check() {
  console.log('🔍 Checking database state...\n')

  // Event types
  const { data: eventTypes, error: etError } = await supabase
    .from('event_types')
    .select('*')
    .order('name')

  console.log('Event Types:', eventTypes?.length || 0)
  if (etError) {
    console.error('Error:', etError)
  } else {
    eventTypes?.forEach(et => {
      console.log(`  - ${et.name} | comm_type: ${et.comm_type} | id: ${et.id}`)
    })
  }
  console.log('')

  // Templates
  const { data: templates, error: tmplError } = await supabase
    .from('email_templates')
    .select('id, name, event_type_id, is_default')
    .eq('is_default', true)
    .order('name')

  console.log('Default Templates:', templates?.length || 0)
  if (tmplError) {
    console.error('Error:', tmplError)
  } else {
    templates?.forEach(t => {
      const et = eventTypes?.find(e => e.id === t.event_type_id)
      console.log(`  - ${t.name} → ${et?.name || '???'} (${et?.comm_type || '???'})`)
    })
  }
  console.log('')

  // Events
  const { data: events, error: evtError } = await supabase
    .from('events')
    .select('id, title, event_type_id, is_active, recurrence_rule, start_date')
    .eq('is_active', true)
    .order('title')

  console.log('Active Events:', events?.length || 0)
  if (evtError) {
    console.error('Error:', evtError)
  } else {
    events?.forEach(e => {
      const et = eventTypes?.find(t => t.id === e.event_type_id)
      const recur = e.recurrence_rule ? '(recurring)' : e.start_date ? `(${e.start_date})` : '(no schedule)'
      console.log(`  - ${e.title} → ${et?.name || '???'} ${recur}`)
    })
  }
}

check().catch(console.error)
