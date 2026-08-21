#!/usr/bin/env node
/**
 * Test script to verify subject_prefix database operations
 * Usage: node test-subject-prefix.mjs
 */

import { createClient } from '@supabase/supabase-js'

// Get credentials from env
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in environment')
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function test() {
  console.log('🔍 Testing subject_prefix database operations...\n')

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  console.log('👤 Auth status:', user ? `Logged in as ${user.email}` : '⚠️  Not authenticated (using anon key)')
  console.log()

  // Test 1: Check if column exists
  console.log('1️⃣  Checking if subject_prefix column exists...')
  const { data: columns, error: schemaError } = await supabase
    .from('composed_instances')
    .select('*')
    .limit(1)

  if (schemaError) {
    console.error('❌ Schema check failed:', schemaError)
    return
  }

  if (columns && columns.length > 0) {
    const hasColumn = 'subject_prefix' in columns[0]
    console.log(hasColumn ? '✅ subject_prefix column exists' : '❌ subject_prefix column missing')
    console.log('Available columns:', Object.keys(columns[0]).join(', '))
  }

  // Test 2: Query all records first
  console.log('\n2️⃣  Querying all records (no filter)...')
  const { data: allRecords, error: allError } = await supabase
    .from('composed_instances')
    .select('id, template_type, subject, subject_prefix')
    .limit(5)

  if (allError) {
    console.error('❌ Query failed:', allError)
    console.error('This likely means RLS is blocking reads or the table doesn\'t exist')
  } else {
    console.log(`✅ Query succeeded - found ${allRecords?.length || 0} records`)
    if (allRecords && allRecords.length > 0) {
      console.log('Sample record:', JSON.stringify(allRecords[0], null, 2))
    }
  }

  // Test 3: Query bible_study specifically
  console.log('\n3️⃣  Querying bible_study records...')
  const { data: withSelect, error: selectError } = await supabase
    .from('composed_instances')
    .select('id, template_type, subject, subject_prefix')
    .eq('template_type', 'bible_study')
    .order('updated_at', { ascending: false })
    .limit(1)

  if (selectError) {
    console.error('❌ Query failed:', selectError)
  } else {
    console.log('✅ Query succeeded')
    console.log('Result:', JSON.stringify(withSelect, null, 2))
  }

  // Test 4: Update test
  console.log('\n4️⃣  Testing update operation...')
  if (withSelect && withSelect.length > 0) {
    const testId = withSelect[0].id
    const testPrefix = `Test-${Date.now()}`

    const { data: updated, error: updateError } = await supabase
      .from('composed_instances')
      .update({ subject_prefix: testPrefix })
      .eq('id', testId)
      .select('id, subject_prefix')

    if (updateError) {
      console.error('❌ Update failed:', updateError)
    } else {
      console.log('✅ Update succeeded')
      console.log('Updated record:', JSON.stringify(updated, null, 2))

      // Verify the update
      const { data: verified } = await supabase
        .from('composed_instances')
        .select('id, subject_prefix')
        .eq('id', testId)
        .single()

      if (verified?.subject_prefix === testPrefix) {
        console.log('✅ Verification passed - data persisted correctly')
      } else {
        console.log('❌ Verification failed - data not persisted')
        console.log('Expected:', testPrefix)
        console.log('Got:', verified?.subject_prefix)
      }
    }
  }

  // Test 5: Check RLS policies
  console.log('\n5️⃣  Checking RLS policies...')
  const { data: policies, error: policyError } = await supabase.rpc('pg_policies', {})
  if (!policyError && policies) {
    const relevantPolicies = policies.filter(p => p.tablename === 'composed_instances')
    console.log(`Found ${relevantPolicies.length} RLS policies for composed_instances`)
  }

  console.log('\n✅ Test complete')
}

test().catch(console.error)
