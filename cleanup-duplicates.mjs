#!/usr/bin/env node
/**
 * Clean up duplicate drafts - keep only the most recent one per type per week
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://jllqfhwuwoeuavaeoiie.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function cleanup() {
  console.log('🧹 Cleaning up duplicate drafts...\n')

  // Get all active drafts
  const { data: drafts, error } = await supabase
    .from('composed_instances')
    .select('id, template_type, week_start, updated_at')
    .eq('is_active', true)
    .order('template_type')
    .order('week_start')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  // Group by template_type + week_start
  const groups = {}
  for (const draft of drafts) {
    const key = `${draft.template_type}:${draft.week_start}`
    if (!groups[key]) groups[key] = []
    groups[key].push(draft)
  }

  // Find duplicates
  const toDelete = []
  for (const [key, group] of Object.entries(groups)) {
    if (group.length > 1) {
      console.log(`Found ${group.length} drafts for ${key}:`)
      group.forEach((d, i) => {
        const status = i === 0 ? '✅ KEEP (most recent)' : '❌ DELETE (old)'
        console.log(`  ${status}: ${d.id} (${d.updated_at})`)
        if (i > 0) toDelete.push(d.id)
      })
      console.log()
    }
  }

  if (toDelete.length === 0) {
    console.log('✅ No duplicates found')
    return
  }

  console.log(`\nDeleting ${toDelete.length} old draft(s)...`)

  const { error: deleteError } = await supabase
    .from('composed_instances')
    .delete()
    .in('id', toDelete)

  if (deleteError) {
    console.error('❌ Delete failed:', deleteError)
  } else {
    console.log(`✅ Deleted ${toDelete.length} old draft(s)`)
  }
}

cleanup()
