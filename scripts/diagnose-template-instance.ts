#!/usr/bin/env tsx
/**
 * Diagnostic script for template/instance disconnect issues
 *
 * Run with: node --env-file=.env.local --import tsx scripts/diagnose-template-instance.ts
 * Or: npx tsx --env-file=.env.local scripts/diagnose-template-instance.ts
 *
 * This script checks:
 * 1. Event types and their comm_type mappings
 * 2. Default templates and their event_type_id links
 * 3. Active calendar events
 * 4. Composed instances
 * 5. Identifies disconnects and offers fixes
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!SUPABASE_ANON_KEY) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_ANON_KEY not set')
  console.error('Make sure to run with: npx tsx --env-file=.env.local scripts/diagnose-template-instance.ts')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function diagnose() {
  console.log('🔍 Diagnosing template/instance connections...\n')

  // 1. Check event types
  console.log('📋 Event Types:')
  const { data: eventTypes, error: etError } = await supabase
    .from('event_types')
    .select('id, name, comm_type, default_template_id')
    .order('name')

  if (etError) {
    console.error('Error fetching event types:', etError)
    return
  }

  const commTypeMap: Record<string, string> = {}
  const eventTypeIds: Record<string, string> = {}

  for (const et of eventTypes || []) {
    const tabName = et.comm_type || et.name
    commTypeMap[tabName] = et.id
    eventTypeIds[et.id] = tabName
    console.log(`  - ${et.name} (comm_type: ${et.comm_type || 'null'}, id: ${et.id})`)
  }
  console.log('')

  // 2. Check default templates
  console.log('📄 Default Templates (is_default = true):')
  const { data: templates, error: tmplError } = await supabase
    .from('email_templates')
    .select('id, name, event_type_id, subject_template')
    .eq('is_default', true)
    .order('name')

  if (tmplError) {
    console.error('Error fetching templates:', tmplError)
    return
  }

  const templatesByEventType: Record<string, typeof templates[0]> = {}
  for (const tmpl of templates || []) {
    templatesByEventType[tmpl.event_type_id] = tmpl
    const etName = eventTypeIds[tmpl.event_type_id] || '???'
    console.log(`  - ${tmpl.name} → event_type: ${etName} (${tmpl.event_type_id})`)
  }
  console.log('')

  // 3. Check active events
  console.log('📅 Active Calendar Events:')
  const { data: events, error: evtError } = await supabase
    .from('events')
    .select('id, title, event_type_id, recurrence_rule, start_date, is_active')
    .eq('is_active', true)
    .order('title')

  if (evtError) {
    console.error('Error fetching events:', evtError)
    return
  }

  for (const evt of events || []) {
    const etName = eventTypeIds[evt.event_type_id] || '???'
    const recur = evt.recurrence_rule ? '(recurring)' : evt.start_date ? `(one-time: ${evt.start_date})` : '(no schedule)'
    console.log(`  - ${evt.title} → ${etName} ${recur}`)
  }
  console.log('')

  // 4. Check composed instances for this week
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay()) // Sunday
  const weekStartISO = weekStart.toISOString().split('T')[0]

  console.log(`📝 Composed Instances (week_start = ${weekStartISO}):`)
  const { data: instances, error: instError } = await supabase
    .from('composed_instances')
    .select('id, template_type, week_start, is_active, is_recurring')
    .or(`week_start.eq.${weekStartISO},and(is_recurring.eq.true,week_start.lte.${weekStartISO})`)
    .eq('is_active', true)

  if (instError) {
    console.error('Error fetching instances:', instError)
    return
  }

  for (const inst of instances || []) {
    console.log(`  - ${inst.template_type} (week: ${inst.week_start}, recurring: ${inst.is_recurring})`)
  }
  console.log('')

  // 5. Identify issues
  console.log('🔎 Issues Found:')
  let issuesFound = false

  // Check for event types without default templates
  for (const et of eventTypes || []) {
    if (!templatesByEventType[et.id]) {
      issuesFound = true
      const tabName = et.comm_type || et.name
      console.log(`  ⚠️  Event type "${et.name}" (comm_type: ${et.comm_type || 'null'}) has NO default template`)
      console.log(`      → Dashboard will use fallback defaults for "${tabName}"`)
      console.log(`      → "Reload from template" will fail with "No template defaults found"`)
      console.log(`      → FIX: Go to Templates page and save a template for "${tabName}"`)
    }
  }

  // Check for templates pointing to non-existent event types
  for (const tmpl of templates || []) {
    if (!eventTypeIds[tmpl.event_type_id]) {
      issuesFound = true
      console.log(`  ⚠️  Template "${tmpl.name}" points to non-existent event_type_id: ${tmpl.event_type_id}`)
      console.log(`      → FIX: Update the template's event_type_id in the database`)
    }
  }

  // Check for event types without active calendar events
  const eventTypeIdsWithEvents = new Set((events || []).map(e => e.event_type_id))
  for (const et of eventTypes || []) {
    const tabName = et.comm_type || et.name
    if (!eventTypeIdsWithEvents.has(et.id) && ['bible_study', 'womens_study', 'prayer_meeting'].includes(tabName)) {
      issuesFound = true
      console.log(`  ⚠️  Event type "${et.name}" has NO active calendar event`)
      console.log(`      → Dashboard will show "No ${tabName.replace(/_/g, ' ')} this week"`)
      console.log(`      → FIX: Create an event in Calendar for this event type`)
    }
  }

  if (!issuesFound) {
    console.log('  ✅ No issues detected')
  }
  console.log('')

  // 6. Bible Study specific check
  console.log('📖 Bible Study Specific Check:')
  const bibleStudyCommTypes = eventTypes?.filter(et =>
    et.comm_type === 'bible_study' || et.name.toLowerCase().includes('bible')
  )

  if (!bibleStudyCommTypes || bibleStudyCommTypes.length === 0) {
    console.log('  ❌ No event type found for Bible Study')
    console.log('      → FIX: Create an event type with comm_type = "bible_study"')
  } else {
    for (const et of bibleStudyCommTypes) {
      console.log(`  Event Type: ${et.name} (id: ${et.id}, comm_type: ${et.comm_type})`)

      const template = templatesByEventType[et.id]
      if (template) {
        console.log(`    ✅ Has default template: "${template.name}"`)
      } else {
        console.log(`    ❌ NO default template`)
        console.log(`       → Go to Templates page, select "${et.comm_type || et.name}" tab, and click Save`)
      }

      const evts = events?.filter(e => e.event_type_id === et.id)
      if (evts && evts.length > 0) {
        console.log(`    ✅ Has ${evts.length} active calendar event(s):`)
        for (const evt of evts) {
          console.log(`       - ${evt.title}`)
        }
      } else {
        console.log(`    ❌ NO active calendar events`)
        console.log(`       → Go to Calendar and create an event with event type "${et.name}"`)
      }
    }
  }
  console.log('')

  // 7. Recommendations
  console.log('💡 Recommendations:')
  console.log('  1. Ensure every event type has a default template (Templates page)')
  console.log('  2. Ensure every event type has an active calendar event if it should appear in Dashboard')
  console.log('  3. Check that event_types.comm_type matches the tab name in Dashboard')
  console.log('  4. If "No bible study this week" appears, check:')
  console.log('     - Event has a recurrence_rule OR start_date within this week')
  console.log('     - Event is not on break (check event_breaks table)')
  console.log('     - No cancelled instance for this week')
  console.log('')
}

diagnose().catch(console.error)
