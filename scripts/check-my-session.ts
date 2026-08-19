#!/usr/bin/env tsx
/**
 * Check current user session and role
 * Run this AFTER logging in to the app
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

console.log('🔐 Session Diagnostic\n')
console.log('This checks if your browser session has the correct role claims.')
console.log('You need to provide your current session token.\n')

console.log('To get your session token:')
console.log('1. Open browser DevTools (F12)')
console.log('2. Go to Application/Storage → Local Storage')
console.log('3. Find key starting with "sb-" and ending with "-auth-token"')
console.log('4. Copy the "access_token" value from the JSON')
console.log('5. Run: ACCESS_TOKEN="your-token" npx tsx --env-file=.env.local scripts/check-my-session.ts\n')

const accessToken = process.env.ACCESS_TOKEN

if (!accessToken) {
  console.log('❌ No ACCESS_TOKEN provided')
  process.exit(1)
}

// Decode JWT (just the payload, no verification needed for diagnosis)
try {
  const parts = accessToken.split('.')
  if (parts.length !== 3) {
    console.log('❌ Invalid JWT format')
    process.exit(1)
  }

  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())

  console.log('📋 JWT Payload:\n')
  console.log('  User ID:', payload.sub)
  console.log('  Email:', payload.email)
  console.log('  Role:', payload.role || '(none)')
  console.log('  Issued at:', new Date(payload.iat * 1000).toISOString())
  console.log('  Expires at:', new Date(payload.exp * 1000).toISOString())
  console.log('  Custom claims:', JSON.stringify(payload.user_metadata || {}, null, 2))
  console.log('')

  // Check app_users table
  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  })

  const { data: appUser, error } = await supabase
    .from('app_users')
    .select('role, is_active')
    .eq('id', payload.sub)
    .single()

  if (error) {
    console.log('❌ Could not query app_users:', error.message)
    console.log('   This means RLS is blocking you\n')
  } else {
    console.log('✅ app_users record found:')
    console.log('  Role:', appUser?.role)
    console.log('  Active:', appUser?.is_active)
    console.log('')
  }

  // Try to query templates
  const { data: templates, error: tmplError, count } = await supabase
    .from('email_templates')
    .select('id', { count: 'exact', head: true })
    .eq('is_default', true)

  if (tmplError) {
    console.log('❌ Could not query email_templates:', tmplError.message)
  } else {
    console.log(`✅ Can query email_templates: ${count} default templates found`)
  }

  console.log('\n' + '='.repeat(60))
  console.log('\n📊 DIAGNOSIS:\n')

  if (!payload.role && (!appUser || !appUser.role)) {
    console.log('❌ PROBLEM: Your session has no role')
    console.log('   → JWT token missing role claim')
    console.log('   → app_users record has no role')
    console.log('\n💡 FIX: Log out and log back in')
  } else if (!payload.role && appUser?.role) {
    console.log('❌ PROBLEM: JWT token is outdated')
    console.log(`   → JWT has no role (issued ${new Date(payload.iat * 1000).toLocaleString()})`)
    console.log(`   → But app_users has role: ${appUser.role}`)
    console.log('\n💡 FIX: Log out and log back in to get fresh token with role claims')
  } else if (payload.role && appUser?.role) {
    console.log('✅ Session is good')
    console.log(`   → JWT has role: ${payload.role}`)
    console.log(`   → app_users has role: ${appUser.role}`)

    if (count === 0) {
      console.log('\n⚠️  But templates query returned 0 rows')
      console.log('   → RLS policy may need adjustment')
    }
  }

} catch (err) {
  console.error('Error:', err)
}
