#!/usr/bin/env tsx
/**
 * Seed event types manually with verbose output
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const EVENT_TYPES = [
  { name: 'Family Bible Study', comm_type: 'bible_study', icon: '📖', color: '#0D9488' },
  { name: "Women's Bible Study", comm_type: 'womens_study', icon: '👥', color: '#DB2777' },
  { name: 'Prayer Meeting', comm_type: 'prayer_meeting', icon: '🙏', color: '#059669' },
  { name: 'Birthday', comm_type: 'birthday', icon: '🎂', color: '#7C3AED' },
  { name: 'Anniversary', comm_type: 'anniversary', icon: '💑', color: '#D97706' },
  { name: 'Weekly Bulletin', comm_type: 'bulletin', icon: '📰', color: '#4F46E5' },
]

async function seed() {
  console.log('🌱 Seeding event types...\n')
  console.log('Using:', SUPABASE_URL)
  console.log('Key type:', SUPABASE_KEY.substring(0, 20) + '...\n')

  for (const et of EVENT_TYPES) {
    console.log(`Creating ${et.comm_type}...`)

    const { data, error } = await supabase
      .from('event_types')
      .insert({
        name: et.name,
        comm_type: et.comm_type,
        icon: et.icon,
        color_scheme: { primary: et.color },
      })
      .select()
      .single()

    if (error) {
      console.error(`  ❌ Error:`, error.message)
      console.error('     Details:', JSON.stringify(error, null, 2))
    } else {
      console.log(`  ✅ Created: ${data.id}`)
    }
  }

  console.log('\n✅ Seeding complete!')

  // Verify
  const { data: all, count } = await supabase
    .from('event_types')
    .select('*', { count: 'exact' })

  console.log(`\n📊 Total event types in DB: ${count}`)
  all?.forEach(et => {
    console.log(`  - ${et.name} (${et.comm_type})`)
  })
}

seed().catch(console.error)
