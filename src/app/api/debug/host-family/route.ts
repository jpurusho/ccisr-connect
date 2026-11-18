import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const searchParams = request.nextUrl.searchParams
  const eventId = searchParams.get('eventId')
  const date = searchParams.get('date') // format: YYYY-MM-DD

  if (!eventId || !date) {
    return NextResponse.json(
      { error: 'Missing eventId or date' },
      { status: 400 }
    )
  }

  try {
    // 1. Get the event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, host_family_id, host_until, recurrence_rule')
      .eq('id', eventId)
      .single()

    if (eventError) throw eventError

    // 2. Get the event instance for this date (if exists)
    const { data: instance, error: instanceError } = await supabase
      .from('event_instances')
      .select('id, instance_date, host_family_id, location_override, status')
      .eq('event_id', eventId)
      .eq('instance_date', date)
      .maybeSingle()

    // 3. Determine which host_family_id is actually used
    let activeHostFamilyId: string | null = null
    let source = 'none'

    if (instance?.host_family_id) {
      activeHostFamilyId = instance.host_family_id
      source = 'instance_override'
    } else if (event?.host_family_id) {
      // Check if host_until has expired
      if (event.host_until) {
        const hostUntilDate = new Date(event.host_until + 'T23:59:59')
        const checkDate = new Date(date + 'T00:00:00')
        if (checkDate <= hostUntilDate) {
          activeHostFamilyId = event.host_family_id
          source = 'event_level'
        } else {
          source = 'event_level_expired'
        }
      } else {
        activeHostFamilyId = event.host_family_id
        source = 'event_level'
      }
    }

    // 4. Get family and address details for active host
    let hostFamily = null
    if (activeHostFamilyId) {
      const { data: family } = await supabase
        .from('families')
        .select('id, family_name, addresses(id, full_address, is_current)')
        .eq('id', activeHostFamilyId)
        .single()
      hostFamily = family
    }

    // 5. Get event-level host family (for comparison)
    let eventLevelHost = null
    if (event?.host_family_id && event.host_family_id !== activeHostFamilyId) {
      const { data: family } = await supabase
        .from('families')
        .select('id, family_name, addresses(id, full_address, is_current)')
        .eq('id', event.host_family_id)
        .single()
      eventLevelHost = family
    }

    // 6. Check audit log for recent changes
    const { data: auditLogs } = await supabase
      .from('audit_log')
      .select('id, action, created_at, changes')
      .or(`entity_id.eq.${eventId},entity_id.eq.${instance?.id}`)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      event: {
        id: event.id,
        title: event.title,
        host_family_id: event.host_family_id,
        host_until: event.host_until,
      },
      instance: instance || null,
      resolution: {
        activeHostFamilyId,
        source,
        explanation:
          source === 'instance_override'
            ? 'Instance has a specific host override'
            : source === 'event_level_expired'
            ? `Event host expired on ${event.host_until}`
            : source === 'event_level'
            ? 'Using event-level host (not expired)'
            : 'No host assigned',
      },
      hostFamily,
      eventLevelHost,
      auditLogs: auditLogs || [],
    })
  } catch (error) {
    console.error('Debug host family error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch host data', details: String(error) },
      { status: 500 }
    )
  }
}
