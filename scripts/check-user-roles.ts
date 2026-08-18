#!/usr/bin/env tsx
/**
 * Check app_users table and assign operator role if missing
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function checkUsers() {
  console.log('👥 Checking app_users table...\n')

  // Get all auth users
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

  if (authError) {
    console.error('Error listing auth users:', authError)
    return
  }

  console.log(`Found ${authUsers.users.length} auth users:\n`)

  // Get all app_users
  const { data: appUsers } = await supabase
    .from('app_users')
    .select('*')

  for (const authUser of authUsers.users) {
    const appUser = appUsers?.find(u => u.id === authUser.id)

    console.log(`📧 ${authUser.email}`)
    console.log(`   Auth ID: ${authUser.id}`)

    if (!appUser) {
      console.log('   ❌ NOT in app_users table')
      console.log('   → Need to create app_users record with operator role\n')

      // Create app_user with operator role
      const { error: insertError } = await supabase
        .from('app_users')
        .insert({
          id: authUser.id,
          email: authUser.email,
          role: 'operator',
          is_active: true,
        })

      if (insertError) {
        console.log(`   ❌ Failed to create: ${insertError.message}`)
      } else {
        console.log('   ✅ Created with role: operator\n')
      }
    } else {
      console.log(`   ✅ In app_users table`)
      console.log(`      Role: ${appUser.role}`)
      console.log(`      Active: ${appUser.is_active}`)

      if (!appUser.role) {
        console.log('   ⚠️  Role is NULL - setting to operator...')

        const { error: updateError } = await supabase
          .from('app_users')
          .update({ role: 'operator', is_active: true })
          .eq('id', appUser.id)

        if (updateError) {
          console.log(`   ❌ Failed to update: ${updateError.message}`)
        } else {
          console.log('   ✅ Updated role to operator')
        }
      } else if (!appUser.is_active) {
        console.log('   ⚠️  User is INACTIVE - activating...')

        const { error: updateError } = await supabase
          .from('app_users')
          .update({ is_active: true })
          .eq('id', appUser.id)

        if (updateError) {
          console.log(`   ❌ Failed to activate: ${updateError.message}`)
        } else {
          console.log('   ✅ User activated')
        }
      }
      console.log('')
    }
  }

  console.log('✅ User role check complete!')
  console.log('')
  console.log('Next steps:')
  console.log('  1. Refresh your browser')
  console.log('  2. Go to Dashboard - templates should now load')
  console.log('  3. If still not working, clear browser cache and log out/in again')
}

checkUsers().catch(console.error)
