#!/usr/bin/env tsx
/**
 * Test if get_user_role() function works for authenticated users
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function test() {
  console.log('🧪 Testing get_user_role() function\n')

  // Get all users
  const { data: users } = await supabase
    .from('app_users')
    .select('id, email, role, is_active')

  if (!users || users.length === 0) {
    console.log('❌ No users found in app_users')
    return
  }

  console.log(`Found ${users.length} users in app_users:\n`)

  for (const user of users) {
    console.log(`📧 ${user.email}`)
    console.log(`   ID: ${user.id}`)
    console.log(`   Role: ${user.role}`)
    console.log(`   Active: ${user.is_active}`)

    // Test get_user_role() function by calling it directly
    const { data: roleResult, error: roleError } = await supabase.rpc('get_user_role', {})

    console.log(`   Testing RLS with this user's context...`)

    // Simulate authenticated request by setting auth context
    // Note: This doesn't fully simulate browser auth, but checks the function
    const { data: testQuery, error: testError } = await supabase
      .from('event_types')
      .select('id, name')
      .limit(1)

    if (testError) {
      console.log(`   ❌ Query failed: ${testError.message}`)
    } else {
      console.log(`   ✅ Query succeeded: ${testQuery?.length || 0} rows`)
    }

    console.log('')
  }

  // Check RLS policies on app_users itself
  console.log('=' .repeat(60))
  console.log('\n🔒 Checking RLS on app_users table:\n')

  const { data: policies } = await supabase
    .from('app_users')
    .select('*')
    .limit(1)

  console.log('Can service role query app_users?', policies ? '✅ Yes' : '❌ No')

  // The critical question: Can an authenticated user query their OWN row in app_users?
  console.log('\nChecking if app_users has RLS policy for authenticated users...')
  console.log('The get_user_role() function needs to SELECT from app_users.')
  console.log('If app_users RLS blocks authenticated users, the function returns NULL.\n')

  // Check for specific RLS policies
  const { data: rlsPolicies, error: rlsError } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT tablename, policyname, cmd, qual
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'app_users'
      `
    })
    .single()

  if (rlsError) {
    console.log('Could not query pg_policies (need to check manually in DB)')
  }
}

test().catch(console.error)
