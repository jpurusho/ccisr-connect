import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixPicnicTime() {
  // Find the CCI SR Picnic event
  const { data: events } = await supabase
    .from('events')
    .select('id, title, default_time, default_end_time')
    .ilike('title', '%picnic%')

  if (!events || events.length === 0) {
    console.log('No picnic events found')
    return
  }

  console.log('\n=== Picnic Events ===')
  events.forEach(e => {
    console.log(`${e.title}: ${e.default_time || 'no time'} - ${e.default_end_time || 'no end'}`)
  })

  // Get today's date
  const today = new Date().toISOString().split('T')[0]

  for (const event of events) {
    console.log(`\n=== Updating future instances for: ${event.title} ===`)

    // Get future instances
    const { data: instances } = await supabase
      .from('event_instances')
      .select('id, instance_date, instance_time, instance_end_time')
      .eq('event_id', event.id)
      .gte('instance_date', today)
      .order('instance_date')

    if (!instances || instances.length === 0) {
      console.log('  No future instances found')
      continue
    }

    console.log(`  Found ${instances.length} future instance(s)`)
    instances.forEach(inst => {
      console.log(`    ${inst.instance_date}: ${inst.instance_time || 'no time'} - ${inst.instance_end_time || 'no end'}`)
    })

    // Update future instances to match event default times
    const { data: updated, error } = await supabase
      .from('event_instances')
      .update({
        instance_time: event.default_time,
        instance_end_time: event.default_end_time,
      })
      .eq('event_id', event.id)
      .gte('instance_date', today)
      .select()

    if (error) {
      console.error(`  Error updating: ${error.message}`)
    } else {
      console.log(`  ✓ Updated ${updated.length} instance(s) to: ${event.default_time} - ${event.default_end_time}`)
    }
  }
}

fixPicnicTime().then(() => process.exit(0))
