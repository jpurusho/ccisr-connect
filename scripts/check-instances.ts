#!/usr/bin/env tsx
/**
 * Check composed instances
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function check() {
  console.log('🔍 Checking composed instances...\n')

  // Get current week Sunday
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const weekStartISO = weekStart.toISOString().split('T')[0]

  console.log(`Current week: ${weekStartISO}\n`)

  // Get all bible_study instances
  const { data: instances } = await supabase
    .from('composed_instances')
    .select('id, template_type, week_start, form_data, subject, is_active, is_recurring, created_at, updated_at')
    .eq('template_type', 'bible_study')
    .eq('is_active', true)
    .order('week_start', { ascending: false })

  console.log(`📝 Bible Study Composed Instances: ${instances?.length || 0}`)

  if (!instances || instances.length === 0) {
    console.log('  ℹ️  No composed instances found for bible_study')
    console.log('  ℹ️  Dashboard will use template defaults + calendar data')
    return
  }

  for (const inst of instances) {
    const isCurrent = inst.week_start === weekStartISO
    const age = inst.updated_at ? Math.floor((Date.now() - new Date(inst.updated_at).getTime()) / (1000 * 60 * 60 * 24)) : '?'

    console.log(`\n  ${isCurrent ? '🔴 CURRENT' : '⚪️ OLD'} Instance:`)
    console.log(`     ID: ${inst.id}`)
    console.log(`     Week: ${inst.week_start}`)
    console.log(`     Subject: ${inst.subject}`)
    console.log(`     Updated: ${age} days ago`)
    console.log(`     Recurring: ${inst.is_recurring}`)

    const formData = inst.form_data as any
    if (formData) {
      console.log(`     Data:`)
      console.log(`       - title: ${formData.title || 'n/a'}`)
      console.log(`       - date: ${formData.date || 'n/a'}`)
      console.log(`       - time: ${formData.time || 'n/a'}`)
      console.log(`       - topic: ${formData.topic || 'n/a'}`)
      console.log(`       - hostNames: ${formData.hostNames || 'n/a'}`)
    }

    if (isCurrent) {
      console.log(`\n  ⚠️  This instance will be shown in Dashboard instead of template defaults`)
      console.log(`     To force regeneration from template, delete this instance:`)
      console.log(`     DELETE FROM composed_instances WHERE id = '${inst.id}';`)
    }
  }
}

check().catch(console.error)
