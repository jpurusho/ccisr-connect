#!/usr/bin/env tsx
/**
 * Delete stale Bible Study draft with wrong date
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function cleanup() {
  console.log('🧹 Cleaning up stale Bible Study draft...\n')

  // Get current week
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const weekStartISO = weekStart.toISOString().split('T')[0]

  console.log(`Current week: ${weekStartISO}\n`)

  // Find bible_study instances for this week
  const { data: instances } = await supabase
    .from('composed_instances')
    .select('id, template_type, week_start, form_data, updated_at')
    .eq('template_type', 'bible_study')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })

  if (!instances || instances.length === 0) {
    console.log('✅ No bible_study instances found')
    return
  }

  console.log(`Found ${instances.length} bible_study instance(s):\n`)

  for (const inst of instances) {
    const formData = inst.form_data as any
    const isCurrent = inst.week_start === weekStartISO
    const hasWrongDate = formData?.date?.includes('No bible study this week')

    console.log(`Instance ${inst.id}:`)
    console.log(`  Week: ${inst.week_start} ${isCurrent ? '(current)' : '(old)'}`)
    console.log(`  Date field: ${formData?.date || 'n/a'}`)
    console.log(`  Updated: ${inst.updated_at}`)

    if (hasWrongDate) {
      console.log(`  ⚠️  Has wrong date - will delete`)

      const { error } = await supabase
        .from('composed_instances')
        .delete()
        .eq('id', inst.id)

      if (error) {
        console.log(`  ❌ Delete failed: ${error.message}`)
      } else {
        console.log(`  ✅ Deleted`)
      }
    }
    console.log('')
  }

  console.log('✅ Cleanup complete!')
  console.log('Refresh the dashboard - it will regenerate with fresh calendar data.')
}

cleanup().catch(console.error)
