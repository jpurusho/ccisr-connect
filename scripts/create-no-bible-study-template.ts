import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function createNoBibleStudyTemplate() {
  const template = {
    name: 'No Bible Study This Week',
    subject_template: 'No Family Bible Study This Week',
    body_template: JSON.stringify({
      title: 'No Family Bible Study This Week',
      subtitle: 'Please note the schedule change',
      emoji: '📅',
      primaryColor: '#0D9488', // Teal - same as Bible Study
      headerTitleColor: undefined,
      headerSubtitleColor: undefined,
      body: `There will be <strong>no Family Bible Study this Friday</strong> due to preparations for Harvest Festival on Saturday.

We look forward to seeing you at our next gathering!`,
      bodyBgColor: '#FEF3C7', // Soft amber/yellow for notice
      bodyTextColor: undefined,
      footerVerse: '"Let all things be done decently and in order." — 1 Corinthians 14:40<br><br>Christ Church of India, San Ramon',
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

  console.log('Creating No Bible Study template...')
  const { data, error } = await supabase
    .from('email_templates')
    .insert(template)
    .select()
    .single()

  if (error) {
    console.error('Error creating template:', error)
  } else {
    console.log('✓ No Bible Study template created:', data.id)
    console.log('\n✓ Template created successfully!')
    console.log('\nTo customize the reason:')
    console.log('1. Go to Templates page')
    console.log('2. Edit "No Bible Study This Week"')
    console.log('3. Update the body text with your specific reason')
    console.log('4. Save and compose your email')
  }
}

createNoBibleStudyTemplate().catch(console.error)
