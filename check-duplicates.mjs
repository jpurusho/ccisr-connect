import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://jllqfhwuwoeuavaeoiie.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('Checking for duplicate bible_study drafts...\n')

const { data, error } = await supabase
  .from('composed_instances')
  .select('id, subject, subject_prefix, week_start, created_at, updated_at')
  .eq('template_type', 'bible_study')
  .eq('is_active', true)
  .order('updated_at', { ascending: false })

if (error) {
  console.error('Error:', error)
} else {
  console.log(`Found ${data.length} bible_study draft(s):\n`)
  data.forEach((d, i) => {
    console.log(`${i + 1}. ID: ${d.id}`)
    console.log(`   Subject: ${d.subject}`)
    console.log(`   Prefix: ${d.subject_prefix}`)
    console.log(`   Week: ${d.week_start}`)
    console.log(`   Updated: ${d.updated_at}`)
    console.log()
  })

  if (data.length > 1) {
    console.log('❌ PROBLEM: Multiple drafts exist!')
    console.log('   The app should only have ONE active draft per type per week.')
    console.log('   When you navigate away, it might load a different draft.')
  }
}
