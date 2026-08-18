#!/usr/bin/env tsx
/**
 * Auto-fix script for template/event_type link issues
 *
 * Run with: npx tsx --env-file=.env.local scripts/fix-template-links.ts
 *
 * This script:
 * 1. Ensures all standard event types exist with correct comm_type
 * 2. Creates placeholder default templates for event types that lack them
 * 3. Cleans up composed_instances with stale template_type references
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY not set')
  console.error('Make sure to run with: npx tsx --env-file=.env.local scripts/fix-template-links.ts')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const STANDARD_EVENT_TYPES = [
  { name: 'Family Bible Study', comm_type: 'bible_study', icon: '📖' },
  { name: "Women's Bible Study", comm_type: 'womens_study', icon: '👥' },
  { name: 'Prayer Meeting', comm_type: 'prayer_meeting', icon: '🙏' },
  { name: 'Birthday', comm_type: 'birthday', icon: '🎂' },
  { name: 'Anniversary', comm_type: 'anniversary', icon: '💑' },
  { name: 'Weekly Bulletin', comm_type: 'bulletin', icon: '📰' },
]

const FALLBACK_TEMPLATE_DEFAULTS: Record<string, any> = {
  bible_study: {
    subject: 'Bible Study This {{dayOfWeek}}',
    data: {
      title: 'Bible Study This {{dayOfWeek}}',
      topic: 'Studying the Book of Acts',
      time: '7:30 PM',
      hostNames: 'TBD',
      address: 'TBD',
      message: '',
      headerTitle: '',
      headerSubtitle: '',
      headerEmoji: '📖',
      primaryColor: '#0D9488',
      footerVerse: '',
      resourceLinks: [],
      customSections: [],
    },
  },
  womens_study: {
    subject: "Women's Bible Study This {{dayOfWeek}}",
    data: {
      title: "Women's Bible Study",
      topic: 'Building a Relationship with God',
      time: '7:00 PM',
      zoomLink: '',
      zoomMeetingId: '',
      zoomPasscode: '',
      location: '',
      message: '',
      headerTitle: '',
      headerSubtitle: '',
      headerEmoji: '👥',
      primaryColor: '#DB2777',
      footerVerse: '',
      resourceLinks: [],
      customSections: [],
    },
  },
  prayer_meeting: {
    subject: 'Prayer Meeting This {{dayOfWeek}}',
    data: {
      time: '6:00 PM',
      hostNames: 'TBD',
      address: 'TBD',
      dinnerNote: '',
      signupLink: '',
      message: '',
      headerTitle: '',
      headerSubtitle: '',
      headerEmoji: '🙏',
      primaryColor: '#059669',
      footerVerse: '',
      resourceLinks: [],
      customSections: [],
    },
  },
  birthday: {
    subject: 'Birthdays This Week',
    data: {
      message: '',
      headerTitle: 'Birthday Blessings',
      headerSubtitle: '',
      headerEmoji: '🎂',
      primaryColor: '#7C3AED',
      footerVerse: '',
      resourceLinks: [],
      customSections: [],
    },
  },
  anniversary: {
    subject: 'Anniversaries This Week',
    data: {
      message: '',
      headerTitle: 'Anniversary Blessings',
      headerSubtitle: '',
      headerEmoji: '💑',
      primaryColor: '#D97706',
      footerVerse: '',
      resourceLinks: [],
      customSections: [],
    },
  },
  bulletin: {
    subject: 'Weekly Bulletin - Week of {{week}}',
    data: {
      message: '',
      headerTitle: 'Weekly Bulletin',
      headerSubtitle: 'Week of {{week}}',
      headerEmoji: '📰',
      primaryColor: '#4F46E5',
      footerVerse: '',
      resourceLinks: [],
      customSections: [],
      events: [],
    },
  },
}

async function fix() {
  console.log('🔧 Fixing template/event_type links...\n')

  // 1. Ensure standard event types exist with correct comm_type
  console.log('📋 Ensuring standard event types exist...')
  const { data: existingTypes } = await supabase
    .from('event_types')
    .select('id, name, comm_type')

  const existingCommTypes = new Set(existingTypes?.map(et => et.comm_type) || [])
  const typeIdMap: Record<string, string> = {}

  for (const std of STANDARD_EVENT_TYPES) {
    const existing = existingTypes?.find(et => et.comm_type === std.comm_type)

    if (existing) {
      console.log(`  ✅ ${std.comm_type} exists (name: "${existing.name}")`)
      typeIdMap[std.comm_type] = existing.id

      // Update name/icon if they don't match
      if (existing.name !== std.name) {
        console.log(`     Updating name to "${std.name}"...`)
        await supabase
          .from('event_types')
          .update({ name: std.name, icon: std.icon })
          .eq('id', existing.id)
      }
    } else {
      // Create missing event type
      console.log(`  ➕ Creating ${std.comm_type}...`)
      const { data: created, error } = await supabase
        .from('event_types')
        .insert({
          name: std.name,
          comm_type: std.comm_type,
          icon: std.icon,
          color_scheme: { primary: FALLBACK_TEMPLATE_DEFAULTS[std.comm_type]?.data?.primaryColor || '#6B7280' },
        })
        .select('id')
        .single()

      if (error) {
        console.error(`     ❌ Error creating ${std.comm_type}:`, error.message)
      } else if (created) {
        console.log(`     ✅ Created ${std.comm_type}`)
        typeIdMap[std.comm_type] = created.id
      }
    }
  }
  console.log('')

  // 2. Ensure default templates exist
  console.log('📄 Ensuring default templates exist...')
  const { data: templates } = await supabase
    .from('email_templates')
    .select('id, event_type_id')
    .eq('is_default', true)

  const templateEventTypeIds = new Set(templates?.map(t => t.event_type_id) || [])

  for (const [commType, eventTypeId] of Object.entries(typeIdMap)) {
    if (!templateEventTypeIds.has(eventTypeId)) {
      console.log(`  ➕ Creating default template for ${commType}...`)
      const fallback = FALLBACK_TEMPLATE_DEFAULTS[commType]
      if (!fallback) {
        console.log(`     ⚠️  No fallback template defined for ${commType}, skipping`)
        continue
      }

      const { error } = await supabase
        .from('email_templates')
        .insert({
          name: `${commType} default`,
          event_type_id: eventTypeId,
          subject_template: fallback.subject,
          body_template: JSON.stringify(fallback.data),
          is_default: true,
          style_settings: {},
        })

      if (error) {
        console.error(`     ❌ Error creating template for ${commType}:`, error.message)
      } else {
        console.log(`     ✅ Created default template for ${commType}`)
      }
    } else {
      console.log(`  ✅ Default template exists for ${commType}`)
    }
  }
  console.log('')

  // 3. Check for orphaned composed_instances
  console.log('📝 Checking composed instances...')
  const { data: instances } = await supabase
    .from('composed_instances')
    .select('id, template_type')
    .eq('is_active', true)

  const validCommTypes = new Set(Object.keys(typeIdMap))
  let orphanCount = 0

  for (const inst of instances || []) {
    if (!validCommTypes.has(inst.template_type)) {
      orphanCount++
      console.log(`  ⚠️  Orphaned instance: template_type="${inst.template_type}" (no matching event type)`)
    }
  }

  if (orphanCount === 0) {
    console.log('  ✅ All composed instances have valid template_type references')
  }
  console.log('')

  console.log('✅ Fix complete!')
  console.log('')
  console.log('Next steps:')
  console.log('  1. Go to Templates page and customize the newly created templates')
  console.log('  2. Go to Calendar page and create events for bible_study, womens_study, prayer_meeting')
  console.log('  3. Refresh the Dashboard to see the updated cards')
}

fix().catch(console.error)
