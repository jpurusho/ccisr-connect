import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkEvents() {
  // Get events in August 2026
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, title, default_time, start_date, end_date')
    .gte('start_date', '2026-08-01')
    .lte('start_date', '2026-08-31')
    .order('start_date')

  if (eventsError) {
    console.error('Events error:', eventsError)
    return
  }

  console.log('\n=== Events in August 2026 ===')
  events.forEach(e => {
    console.log(`\nEvent: ${e.title}`)
    console.log(`  ID: ${e.id}`)
    console.log(`  Default time: ${e.default_time}`)
    console.log(`  Start date: ${e.start_date}`)
    console.log(`  End date: ${e.end_date}`)
  })

  // Get instances for these events
  if (events.length > 0) {
    const eventIds = events.map(e => e.id)
    const { data: instances, error: instancesError } = await supabase
      .from('event_instances')
      .select('id, event_id, instance_date, instance_time, status')
      .in('event_id', eventIds)
      .order('instance_date')

    if (instancesError) {
      console.error('Instances error:', instancesError)
      return
    }

    console.log('\n=== Event Instances ===')
    instances.forEach(inst => {
      const evt = events.find(e => e.id === inst.event_id)
      console.log(`\n${evt?.title} on ${inst.instance_date}`)
      console.log(`  Instance ID: ${inst.id}`)
      console.log(`  Instance time: ${inst.instance_time}`)
      console.log(`  Status: ${inst.status}`)
    })

    // Offer to fix
    const retreatInstances = instances.filter(i => {
      const evt = events.find(e => e.id === i.event_id)
      return evt?.title === 'CCI Retreat'
    })

    if (retreatInstances.length > 0 && retreatInstances.some(i => i.instance_time !== null)) {
      console.log('\n=== Fix needed ===')
      console.log('The CCI Retreat event instances have times set.')
      console.log('To clear all instance times for this event, the instances need to be updated.')
    }
  }
}

checkEvents().then(() => process.exit(0))
