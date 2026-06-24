import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixRetreatTime() {
  // Find the CCI Retreat event
  const { data: events } = await supabase
    .from('events')
    .select('id, title')
    .eq('title', 'CCI Retreat')
    .single()

  if (!events) {
    console.log('CCI Retreat event not found')
    return
  }

  console.log(`Found event: ${events.title} (${events.id})`)

  // Update all instances for this event to have null instance_time
  const { data: updated, error } = await supabase
    .from('event_instances')
    .update({ instance_time: null })
    .eq('event_id', events.id)
    .select()

  if (error) {
    console.error('Error updating instances:', error)
    return
  }

  console.log(`\nUpdated ${updated.length} instance(s):`)
  updated.forEach(inst => {
    console.log(`  - ${inst.instance_date}: time set to null`)
  })

  console.log('\n✓ All instance times cleared for CCI Retreat event')
}

fixRetreatTime().then(() => process.exit(0))
