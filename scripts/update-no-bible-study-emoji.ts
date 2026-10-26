import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateNoBibleStudyEmoji() {
  const updatedBody = {
    title: 'No Family Bible Study This Week',
    subtitle: 'Please note the schedule change',
    emoji: 'ℹ️', // Changed from 📅 to ℹ️
    primaryColor: '#0D9488',
    headerTitleColor: undefined,
    headerSubtitleColor: undefined,
    body: `There will be <strong>no Family Bible Study this Friday</strong> due to preparations for Harvest Festival on Saturday.

We look forward to seeing you at our next gathering!`,
    bodyBgColor: '#FEF3C7',
    bodyTextColor: undefined,
    footerVerse: '"Let all things be done decently and in order." — 1 Corinthians 14:40<br><br>Christ Church of India, San Ramon',
    footerVerseBgColor: '#CFFAFE',
    footerVerseTextColor: undefined,
    resourceLinks: [],
    customSections: [],
    flyerSections: [],
  }

  console.log('Updating No Bible Study template emoji to ℹ️...')
  const { error } = await supabase
    .from('email_templates')
    .update({
      body_template: JSON.stringify(updatedBody)
    })
    .eq('name', 'No Bible Study This Week')

  if (error) {
    console.error('Error updating template:', error)
  } else {
    console.log('✓ Template updated with Information symbol (ℹ️)')
    console.log('\nRefresh the Templates page to see the change!')
  }
}

updateNoBibleStudyEmoji().catch(console.error)
