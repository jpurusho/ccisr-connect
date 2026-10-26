import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function createDSTTemplates() {
  // Template 1: Spring Forward (Daylight Saving Time Begins)
  const springForwardTemplate = {
    name: 'Daylight Saving Time - Spring Forward',
    subject_template: '⏰ Reminder: Set Your Clocks Forward This Weekend',
    body_template: JSON.stringify({
      title: 'Spring Forward Reminder',
      subtitle: 'Daylight Saving Time begins this Sunday',
      emoji: '⏰',
      primaryColor: '#0891B2', // Cyan
      headerTitleColor: undefined,
      headerSubtitleColor: undefined,
      body: `This Sunday at 2:00 AM, daylight saving time begins. Remember to set your clocks **forward one hour** before going to bed on Saturday night.

**🕐 Saturday Night:** Set clocks forward 1 hour (2:00 AM becomes 3:00 AM)
**⛪ Sunday Service:** Times remain the same
**☕ Quick Tip:** Most phones update automatically, but check your car, wall clocks, and appliances

We look forward to seeing you at our regular service time! Though you'll lose an hour of sleep, we gain more evening daylight.`,
      bodyBgColor: '#DBEAFE', // Light blue
      bodyTextColor: undefined,
      footerVerse: '"For everything there is a season, and a time for every matter under heaven." — Ecclesiastes 3:1',
      footerVerseBgColor: '#CFFAFE', // Soft cyan
      footerVerseTextColor: undefined,
      resourceLinks: [],
      customSections: [],
      flyerSections: [],
    }),
    style_settings: {
      cardBgColor: '#FFFFFF',
      cardMaxWidth: '600px',
      customPastels: [],
    },
    is_default: false,
    is_active: true,
  }

  // Template 2: Fall Back (Daylight Saving Time Ends)
  const fallBackTemplate = {
    name: 'Daylight Saving Time - Fall Back',
    subject_template: '⏰ Reminder: Set Your Clocks Back This Weekend',
    body_template: JSON.stringify({
      title: 'Fall Back Reminder',
      subtitle: 'Daylight Saving Time ends this Sunday',
      emoji: '⏰',
      primaryColor: '#EA580C', // Orange/amber for fall
      headerTitleColor: undefined,
      headerSubtitleColor: undefined,
      body: `This Sunday at 2:00 AM, daylight saving time ends. Remember to set your clocks **back one hour** before going to bed on Saturday night.

**🕐 Saturday Night:** Set clocks back 1 hour (2:00 AM becomes 1:00 AM)
**⛪ Sunday Service:** Times remain the same
**☕ Bonus:** You gain an extra hour of sleep!
**💡 Tip:** Great time to check smoke detector batteries

We look forward to seeing you at our regular service time! Enjoy that extra hour of rest.`,
      bodyBgColor: '#FED7AA', // Light orange/peach
      bodyTextColor: undefined,
      footerVerse: '"For everything there is a season, and a time for every matter under heaven." — Ecclesiastes 3:1',
      footerVerseBgColor: '#FDE68A', // Soft amber/yellow
      footerVerseTextColor: undefined,
      resourceLinks: [],
      customSections: [],
      flyerSections: [],
    }),
    style_settings: {
      cardBgColor: '#FFFFFF',
      cardMaxWidth: '600px',
      customPastels: [],
    },
    is_default: false,
    is_active: true,
  }

  console.log('Creating Spring Forward template...')
  const { data: spring, error: springError } = await supabase
    .from('email_templates')
    .insert(springForwardTemplate)
    .select()
    .single()

  if (springError) {
    console.error('Error creating Spring Forward template:', springError)
  } else {
    console.log('✓ Spring Forward template created:', spring.id)
  }

  console.log('\nCreating Fall Back template...')
  const { data: fall, error: fallError } = await supabase
    .from('email_templates')
    .insert(fallBackTemplate)
    .select()
    .single()

  if (fallError) {
    console.error('Error creating Fall Back template:', fallError)
  } else {
    console.log('✓ Fall Back template created:', fall.id)
  }

  console.log('\n✓ Both templates created successfully!')
  console.log('\nYou can now find them in the Templates page under custom templates.')
}

createDSTTemplates().catch(console.error)
