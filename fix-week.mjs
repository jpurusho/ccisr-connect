#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://jllqfhwuwoeuavaeoiie.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function fix() {
  const today = new Date()
  const wkSun = new Date(today)
  wkSun.setDate(today.getDate() - today.getDay())
  const thisWeek = wkSun.toISOString().split('T')[0]

  console.log(`Updating bible_study week_start to: ${thisWeek}`)

  const { data, error } = await supabase
    .from('composed_instances')
    .update({ week_start: thisWeek })
    .eq('id', '620e13a9-18c6-4a13-942a-1046f216f7d2')
    .select()

  if (error) {
    console.error('❌ Failed:', error)
  } else {
    console.log('✅ Updated:', data)
  }
}

fix()
