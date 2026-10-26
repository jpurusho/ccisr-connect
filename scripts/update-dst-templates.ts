import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateDSTTemplates() {
  // Updated Spring Forward body (removed tips)
  const springForwardBody = {
    title: 'Spring Forward Reminder',
    subtitle: 'Daylight Saving Time begins this Sunday',
    emoji: '⏰',
    primaryColor: '#0891B2',
    headerTitleColor: undefined,
    headerSubtitleColor: undefined,
    body: `On Sunday, March 14, 2027 at 2:00 AM, daylight saving time begins. Remember to set your clocks <strong>forward one hour</strong> before going to bed on Saturday night.

<strong>🕐 Saturday Night:</strong> Set clocks forward 1 hour (2:00 AM becomes 3:00 AM)
<strong>⛪ Sunday Service:</strong> Times remain the same

We look forward to seeing you at our regular service time!`,
    bodyBgColor: '#DBEAFE',
    bodyTextColor: undefined,
    footerVerse: '"For everything there is a season, and a time for every matter under heaven." — Ecclesiastes 3:1<br><br>Christ Church of India, San Ramon',
    footerVerseBgColor: '#CFFAFE',
    footerVerseTextColor: undefined,
    resourceLinks: [],
    customSections: [],
    flyerSections: [],
  }

  // Updated Fall Back body (removed tips)
  const fallBackBody = {
    title: 'Fall Back Reminder',
    subtitle: 'Daylight Saving Time ends this Sunday',
    emoji: '⏰',
    primaryColor: '#EA580C',
    headerTitleColor: undefined,
    headerSubtitleColor: undefined,
    body: `On Sunday, November 2, 2026 at 2:00 AM, daylight saving time ends. Remember to set your clocks <strong>back one hour</strong> before going to bed on Saturday night.

<strong>🕐 Saturday Night:</strong> Set clocks back 1 hour (2:00 AM becomes 1:00 AM)
<strong>⛪ Sunday Service:</strong> Times remain the same

We look forward to seeing you at our regular service time!`,
    bodyBgColor: '#FED7AA',
    bodyTextColor: undefined,
    footerVerse: '"For everything there is a season, and a time for every matter under heaven." — Ecclesiastes 3:1<br><br>Christ Church of India, San Ramon',
    footerVerseBgColor: '#FDE68A',
    footerVerseTextColor: undefined,
    resourceLinks: [],
    customSections: [],
    flyerSections: [],
  }

  console.log('Updating Spring Forward template...')
  const { error: springError } = await supabase
    .from('email_templates')
    .update({
      body_template: JSON.stringify(springForwardBody)
    })
    .eq('name', 'Daylight Saving Time - Spring Forward')

  if (springError) {
    console.error('Error updating Spring Forward template:', springError)
  } else {
    console.log('✓ Spring Forward template updated')
  }

  console.log('\nUpdating Fall Back template...')
  const { error: fallError } = await supabase
    .from('email_templates')
    .update({
      body_template: JSON.stringify(fallBackBody)
    })
    .eq('name', 'Daylight Saving Time - Fall Back')

  if (fallError) {
    console.error('Error updating Fall Back template:', fallError)
  } else {
    console.log('✓ Fall Back template updated')
  }

  console.log('\n✓ Both templates updated successfully!')
}

updateDSTTemplates().catch(console.error)
