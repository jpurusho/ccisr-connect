import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://jllqfhwuwoeuavaeoiie.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const today = new Date()
const wkSun = new Date(today)
wkSun.setDate(today.getDate() - today.getDay())
const thisWeek = wkSun.toISOString().split('T')[0]

console.log(`Today: ${today.toISOString().split('T')[0]}`)
console.log(`This week's Sunday: ${thisWeek}`)

const { data, error } = await supabase
  .from('composed_instances')
  .update({ 
    week_start: thisWeek,
    subject: 'Bible Study This Friday — Friday, September 4th',
    subject_prefix: null
  })
  .eq('id', '620e13a9-18c6-4a13-942a-1046f216f7d2')
  .select()

if (error) {
  console.error('Error:', error)
} else {
  console.log('Updated:', data[0])
}
