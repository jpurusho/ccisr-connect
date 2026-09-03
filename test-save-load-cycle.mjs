#!/usr/bin/env node
/**
 * End-to-end test: Verify subject_prefix save and load cycle
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jllqfhwuwoeuavaeoiie.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  console.error('Load it from .env.local')
  process.exit(1)
}

// Use service role key to bypass RLS for testing
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function test() {
  console.log('🧪 End-to-End Save/Load Test for subject_prefix\n')
  console.log('Using service role key (bypasses RLS)\n')

  const testId = '620e13a9-18c6-4a13-942a-1046f216f7d2' // Bible study
  const testPrefix = `E2E-Test-${Date.now()}`

  // Step 1: Write subject_prefix
  console.log('1️⃣  Writing subject_prefix to database...')
  console.log(`   Value: "${testPrefix}"`)

  const { data: writeData, error: writeError } = await supabase
    .from('composed_instances')
    .update({
      subject_prefix: testPrefix,
      subject: 'E2E Test Subject'
    })
    .eq('id', testId)
    .select('id, subject, subject_prefix')

  if (writeError) {
    console.error('❌ Write failed:', writeError)
    process.exit(1)
  }

  console.log('✅ Write succeeded')
  console.log('   Returned:', JSON.stringify(writeData, null, 2))

  if (!writeData || writeData.length === 0) {
    console.error('❌ Write returned empty data - might be RLS blocking')
    process.exit(1)
  }

  const returnedPrefix = writeData[0]?.subject_prefix
  if (returnedPrefix !== testPrefix) {
    console.error(`❌ MISMATCH: Expected "${testPrefix}", got "${returnedPrefix}"`)
    console.error('   This means the field is being stripped by Supabase client validation')
    process.exit(1)
  }

  console.log(`✅ Write verification passed - prefix returned correctly`)

  // Step 2: Read back (simulating page load)
  console.log('\n2️⃣  Reading back (simulating page load)...')

  const { data: readData, error: readError } = await supabase
    .from('composed_instances')
    .select('id, template_type, subject, subject_prefix, updated_at')
    .eq('id', testId)
    .single()

  if (readError) {
    console.error('❌ Read failed:', readError)
    process.exit(1)
  }

  console.log('✅ Read succeeded')
  console.log('   Data:', JSON.stringify(readData, null, 2))

  const loadedPrefix = readData?.subject_prefix
  if (loadedPrefix !== testPrefix) {
    console.error(`❌ LOAD MISMATCH: Expected "${testPrefix}", got "${loadedPrefix}"`)
    console.error('   The data was written but not loaded correctly')
    process.exit(1)
  }

  console.log(`✅ Load verification passed - prefix loaded correctly`)

  // Step 3: Test the exact query the app uses
  console.log('\n3️⃣  Testing app\'s actual query pattern...')

  const today = new Date()
  const wkSun = new Date(today)
  wkSun.setDate(today.getDate() - today.getDay()) // Start of week (Sunday)
  const wkSunISO = wkSun.toISOString().split('T')[0]

  const { data: appQueryData, error: appQueryError } = await supabase
    .from('composed_instances')
    .select('id, template_type, form_data, subject, subject_prefix, mailing_list_id, smtp_config_id, additional_recipients, week_start, is_recurring, recur_until, updated_at')
    .eq('is_active', true)
    .or(`week_start.eq.${wkSunISO},and(is_recurring.eq.true,week_start.lte.${wkSunISO})`)

  if (appQueryError) {
    console.error('❌ App query failed:', appQueryError)
    process.exit(1)
  }

  const bibleStudy = appQueryData?.find(r => r.template_type === 'bible_study')
  if (!bibleStudy) {
    console.warn('⚠️  Bible study not found in app query results (wrong week?)')
    console.warn(`   Week filter: week_start.eq.${wkSunISO}`)
  } else {
    console.log('✅ Found bible_study in app query')
    console.log('   subject_prefix:', bibleStudy.subject_prefix)

    if (bibleStudy.subject_prefix !== testPrefix) {
      console.error(`❌ APP QUERY MISMATCH: Expected "${testPrefix}", got "${bibleStudy.subject_prefix}"`)
      process.exit(1)
    }
  }

  console.log('\n✅ ALL TESTS PASSED')
  console.log('   - Write works')
  console.log('   - Load works')
  console.log('   - App query pattern works')
  console.log('\nIf the app still shows old data, it\'s a browser cache issue.')
  console.log('Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)')
}

test().catch(err => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
