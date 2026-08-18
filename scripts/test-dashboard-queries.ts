#!/usr/bin/env tsx
/**
 * Test the exact queries the dashboard uses
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function testQueries() {
  console.log('🧪 Testing Dashboard Queries\n')
  console.log('=' .repeat(60) + '\n')

  // Test with ANON key (what the dashboard uses when logged in)
  const anonClient = createClient(SUPABASE_URL, ANON_KEY)
  console.log('Testing with ANON key (dashboard perspective)...\n')

  // 1. Event types query
  console.log('1️⃣  Query event_types:')
  const { data: et1, error: etErr1, count: etCount1 } = await anonClient
    .from('event_types')
    .select('id, name, comm_type', { count: 'exact' })

  if (etErr1) {
    console.log('   ❌ ERROR:', etErr1.message)
    console.log('   Details:', etErr1)
  } else {
    console.log(`   ✅ Success: ${etCount1} rows`)
    console.log('   Sample:', et1?.slice(0, 2).map(e => `${e.comm_type}: ${e.name}`))
  }
  console.log('')

  // 2. Templates query (same as dashboard uses)
  console.log('2️⃣  Query email_templates (is_default = true):')
  const { data: tmpl1, error: tmplErr1 } = await anonClient
    .from('email_templates')
    .select('id, event_type_id, subject_template, body_template, style_settings')
    .eq('is_default', true)

  if (tmplErr1) {
    console.log('   ❌ ERROR:', tmplErr1.message)
  } else {
    console.log(`   ✅ Success: ${tmpl1?.length || 0} templates`)
    tmpl1?.forEach(t => {
      const et = et1?.find(e => e.id === t.event_type_id)
      console.log(`      - ${et?.comm_type || '???'}`)
    })
  }
  console.log('')

  // 3. Events query
  console.log('3️⃣  Query events (is_active = true):')
  const { data: evt1, error: evtErr1 } = await anonClient
    .from('events')
    .select('id, title, event_type_id, is_active')
    .eq('is_active', true)

  if (evtErr1) {
    console.log('   ❌ ERROR:', evtErr1.message)
  } else {
    console.log(`   ✅ Success: ${evt1?.length || 0} events`)
  }
  console.log('')

  // 4. Composed instances query
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const weekStartISO = weekStart.toISOString().split('T')[0]

  console.log(`4️⃣  Query composed_instances (week_start = ${weekStartISO}):`)
  const { data: ci1, error: ciErr1 } = await anonClient
    .from('composed_instances')
    .select('id, template_type, form_data, subject, week_start, is_recurring')
    .eq('is_active', true)
    .or(`week_start.eq.${weekStartISO},and(is_recurring.eq.true,week_start.lte.${weekStartISO})`)

  if (ciErr1) {
    console.log('   ❌ ERROR:', ciErr1.message)
  } else {
    console.log(`   ✅ Success: ${ci1?.length || 0} instances`)
    ci1?.forEach(inst => {
      console.log(`      - ${inst.template_type} (${inst.week_start})`)
    })
  }
  console.log('')

  // Now test with SERVICE key to compare
  console.log('=' .repeat(60))
  console.log('\nTesting with SERVICE ROLE key (admin perspective)...\n')

  const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY)

  const { data: et2, count: etCount2 } = await serviceClient
    .from('event_types')
    .select('id, name, comm_type', { count: 'exact' })

  const { data: tmpl2 } = await serviceClient
    .from('email_templates')
    .select('id, event_type_id')
    .eq('is_default', true)

  const { data: evt2 } = await serviceClient
    .from('events')
    .select('id')
    .eq('is_active', true)

  console.log(`Event types: ${etCount2} rows`)
  console.log(`Templates: ${tmpl2?.length || 0} rows`)
  console.log(`Events: ${evt2?.length || 0} rows`)
  console.log('')

  // Summary
  console.log('=' .repeat(60))
  console.log('\n📊 SUMMARY:\n')

  if (etErr1) {
    console.log('❌ Dashboard CANNOT read event_types')
    console.log('   → RLS policy is blocking anon/authenticated users')
    console.log('   → Fix: Add RLS policy to allow SELECT for authenticated users')
  } else {
    console.log('✅ Dashboard CAN read event_types')
  }

  if (tmplErr1) {
    console.log('❌ Dashboard CANNOT read email_templates')
    console.log('   → RLS policy is blocking anon/authenticated users')
    console.log('   → Fix: Add RLS policy to allow SELECT for authenticated users')
  } else {
    console.log('✅ Dashboard CAN read email_templates')
  }

  if (evtErr1) {
    console.log('❌ Dashboard CANNOT read events')
  } else {
    console.log('✅ Dashboard CAN read events')
  }

  if (ciErr1) {
    console.log('❌ Dashboard CANNOT read composed_instances')
  } else {
    console.log('✅ Dashboard CAN read composed_instances')
  }

  console.log('')

  // Specific bible_study check
  console.log('=' .repeat(60))
  console.log('\n🔍 Bible Study Specific Check:\n')

  const bsEventType = et1?.find(e => e.comm_type === 'bible_study')
  if (!bsEventType) {
    console.log('❌ bible_study event type not found (RLS issue)')
  } else {
    console.log(`✅ Event type found: ${bsEventType.name} (${bsEventType.id})`)

    const bsTemplate = tmpl1?.find(t => t.event_type_id === bsEventType.id)
    if (!bsTemplate) {
      console.log('❌ No default template found for bible_study')
      console.log('   → Either template doesn\'t exist OR RLS is blocking it')
    } else {
      console.log(`✅ Template found: ${bsTemplate.id}`)
      try {
        const bodyData = JSON.parse(bsTemplate.body_template)
        console.log('   Template data:')
        console.log(`     - title: ${bodyData.title || 'n/a'}`)
        console.log(`     - topic: ${bodyData.topic || 'n/a'}`)
        console.log(`     - time: ${bodyData.time || 'n/a'}`)
      } catch {
        console.log('   (Could not parse body_template)')
      }
    }

    const bsEvents = evt1?.filter(e => e.event_type_id === bsEventType.id)
    if (!bsEvents || bsEvents.length === 0) {
      console.log('⚠️  No active calendar events for bible_study')
      console.log('   → This will cause "No bible study this week" in date field')
    } else {
      console.log(`✅ ${bsEvents.length} active event(s) found`)
    }

    const bsInstance = ci1?.find(i => i.template_type === 'bible_study')
    if (bsInstance) {
      console.log(`⚠️  Composed instance found (week: ${bsInstance.week_start})`)
      console.log('   → Dashboard will use this instead of template')
    } else {
      console.log('ℹ️  No composed instance for this week')
      console.log('   → Dashboard will use template + calendar data')
    }
  }
}

testQueries().catch(console.error)
