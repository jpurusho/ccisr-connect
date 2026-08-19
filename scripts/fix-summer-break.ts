#!/usr/bin/env tsx
/**
 * Fix the Summer Break end date to exclude August 21st
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const BREAK_ID = 'fae475aa-fc37-40bf-818c-c4626aa280b4'
const NEW_END_DATE = '2026-08-15' // Bible Study resumes August 21st

async function fix() {
  console.log('🔧 Fixing Summer Break end date...\n')

  // Show current break
  const { data: current } = await supabase
    .from('event_breaks')
    .select('*')
    .eq('id', BREAK_ID)
    .single()

  if (!current) {
    console.log('❌ Break not found')
    return
  }

  console.log('Current break:')
  console.log(`  From: ${current.start_date}`)
  console.log(`  To:   ${current.end_date}`)
  console.log(`  Message: ${current.message}`)
  console.log('')

  // Update end date
  const { error } = await supabase
    .from('event_breaks')
    .update({ end_date: NEW_END_DATE })
    .eq('id', BREAK_ID)

  if (error) {
    console.log(`❌ Update failed: ${error.message}`)
    return
  }

  console.log('✅ Updated!')
  console.log(`  New end date: ${NEW_END_DATE}`)
  console.log('')
  console.log('Bible Study will now show:')
  console.log('  Date: Friday, August 21st')
  console.log('  Status: Active (no longer on break)')
  console.log('')
  console.log('Refresh the dashboard to see the change.')
}

fix().catch(console.error)
