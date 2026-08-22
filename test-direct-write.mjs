#!/usr/bin/env node
/**
 * Direct test: Write subject_prefix to database
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jllqfhwuwoeuavaeoiie.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsbHFmaHd1d29ldWF2YWVvaWllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NzI4ODcsImV4cCI6MjA5MjU0ODg4N30.rBd9VY9CvZCMqe6LGTcgBuV7L7bR-eX04_IhtAgf1Fs'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function test() {
  console.log('🧪 Direct write test\n')

  // Try to update a specific record
  const testId = '620e13a9-18c6-4a13-942a-1046f216f7d2' // Bible study ID

  console.log('1️⃣  Attempting to write subject_prefix directly...')

  const { data, error } = await supabase
    .from('composed_instances')
    .update({
      subject_prefix: `Test-${Date.now()}`
    })
    .eq('id', testId)
    .select()

  if (error) {
    console.error('❌ Write failed:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
  } else {
    console.log('✅ Write succeeded')
    console.log('Returned data:', JSON.stringify(data, null, 2))
  }

  // Verify by reading back
  console.log('\n2️⃣  Reading back to verify...')
  const { data: readData, error: readError } = await supabase
    .from('composed_instances')
    .select('id, subject, subject_prefix')
    .eq('id', testId)
    .single()

  if (readError) {
    console.error('❌ Read failed:', readError)
  } else {
    console.log('✅ Read succeeded')
    console.log('Current data:', JSON.stringify(readData, null, 2))
  }
}

test().catch(console.error)
