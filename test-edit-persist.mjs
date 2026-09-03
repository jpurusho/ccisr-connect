#!/usr/bin/env node
/**
 * Test the exact user workflow:
 * 1. Load current state
 * 2. Simulate editing subject in UI
 * 3. Save (like clicking Save button)
 * 4. Reload (like navigating away and back)
 * 5. Verify subject persisted
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://jllqfhwuwoeuavaeoiie.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const testId = '620e13a9-18c6-4a13-942a-1046f216f7d2'

async function test() {
  console.log('🧪 Testing Edit → Save → Reload workflow\n')

  // Step 1: Load current state (simulate page load)
  console.log('1️⃣  Loading current state from DB...')
  const { data: before, error: loadError } = await supabase
    .from('composed_instances')
    .select('id, subject, subject_prefix')
    .eq('id', testId)
    .single()

  if (loadError) {
    console.error('❌ Load failed:', loadError)
    process.exit(1)
  }

  console.log('Current state:', before)
  const originalSubject = before.subject

  // Step 2: Simulate user editing subject in UI
  const editedSubject = `EDITED TEST - ${Date.now()}`
  const editedPrefix = 'Test Prefix'
  console.log(`\n2️⃣  User edits subject to: "${editedSubject}"`)
  console.log(`   User edits prefix to: "${editedPrefix}"`)

  // Step 3: Simulate Save button (this is what handleSaveInstance does)
  console.log('\n3️⃣  Clicking Save button...')
  console.log('   This should save edited values to DB')

  const { data: saveResult, error: saveError } = await supabase
    .from('composed_instances')
    .update({
      subject: editedSubject,
      subject_prefix: editedPrefix
    })
    .eq('id', testId)
    .select('id, subject, subject_prefix')

  if (saveError) {
    console.error('❌ Save failed:', saveError)
    process.exit(1)
  }

  console.log('✅ Save succeeded')
  console.log('   Returned from DB:', saveResult[0])

  // Verify what was actually saved
  if (saveResult[0].subject !== editedSubject) {
    console.error(`❌ SAVE MISMATCH: Expected "${editedSubject}", got "${saveResult[0].subject}"`)
    process.exit(1)
  }

  if (saveResult[0].subject_prefix !== editedPrefix) {
    console.error(`❌ PREFIX MISMATCH: Expected "${editedPrefix}", got "${saveResult[0].subject_prefix}"`)
    process.exit(1)
  }

  // Step 4: Simulate navigating away and back (reload from DB)
  console.log('\n4️⃣  Simulating navigate away and back (reload from DB)...')

  const { data: after, error: reloadError } = await supabase
    .from('composed_instances')
    .select('id, subject, subject_prefix')
    .eq('id', testId)
    .single()

  if (reloadError) {
    console.error('❌ Reload failed:', reloadError)
    process.exit(1)
  }

  console.log('Reloaded state:', after)

  // Step 5: Verify persistence
  if (after.subject !== editedSubject) {
    console.error(`\n❌ PERSISTENCE FAILED!`)
    console.error(`   Expected: "${editedSubject}"`)
    console.error(`   Got: "${after.subject}"`)
    console.error(`\n   This means the save didn't actually write to DB`)
    process.exit(1)
  }

  if (after.subject_prefix !== editedPrefix) {
    console.error(`\n❌ PREFIX PERSISTENCE FAILED!`)
    console.error(`   Expected: "${editedPrefix}"`)
    console.error(`   Got: "${after.subject_prefix}"`)
    process.exit(1)
  }

  console.log('\n✅ ALL CHECKS PASSED')
  console.log('   - Save wrote correct values')
  console.log('   - Values persisted after reload')
  console.log('\n   Database operations work correctly.')
  console.log('   If app still shows old values, the issue is in the app code.')

  // Restore original value
  console.log(`\n5️⃣  Restoring original subject: "${originalSubject}"`)
  await supabase
    .from('composed_instances')
    .update({ subject: originalSubject, subject_prefix: null })
    .eq('id', testId)

  console.log('✅ Restored')
}

test().catch(err => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
