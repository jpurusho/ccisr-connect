#!/usr/bin/env tsx
/**
 * Backfill phone numbers for signup responses that are member-linked
 *
 * Usage:
 *   npx dotenv -e .env.local -- tsx scripts/backfill-signup-phones.ts <form-slug>
 *
 * Example:
 *   npx dotenv -e .env.local -- tsx scripts/backfill-signup-phones.ts summer-picnic
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing environment variables")
  process.exit(1)
}

const formSlug = process.argv[2]

if (!formSlug) {
  console.error("❌ Usage: npx tsx scripts/backfill-signup-phones.ts <form-slug>")
  process.exit(1)
}

async function backfillPhones() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log(`\n🔍 Looking up form: ${formSlug}`)

  // Fetch the form
  const { data: form, error: formError } = await supabase
    .from("signup_forms")
    .select("id, title, fields")
    .eq("slug", formSlug)
    .single()

  if (formError || !form) {
    console.error("❌ Form not found")
    process.exit(1)
  }

  console.log(`✓ Found: ${form.title}`)

  // Find the phone field
  const fields = form.fields as { id: string; type: string; label: string }[]
  const phoneField = fields.find((f) => f.type === "phone")

  if (!phoneField) {
    console.error("❌ This form does not have a phone field")
    console.log("\nAdd a phone field to the form first, then run this script.")
    process.exit(1)
  }

  console.log(`✓ Phone field found: "${phoneField.label}" (${phoneField.id})`)

  // Fetch all responses for this form that are member-linked
  const { data: responses, error: responsesError } = await supabase
    .from("signup_responses")
    .select("id, member_id, data")
    .eq("form_id", form.id)
    .not("member_id", "is", null)

  if (responsesError) {
    console.error("❌ Failed to fetch responses:", responsesError)
    process.exit(1)
  }

  if (!responses || responses.length === 0) {
    console.log("\n✓ No member-linked responses found. Nothing to backfill.")
    process.exit(0)
  }

  console.log(`\n📋 Found ${responses.length} member-linked responses`)

  let updated = 0
  let skipped = 0
  let failed = 0

  for (const response of responses) {
    const data = response.data as Record<string, unknown>

    // Skip if phone already exists
    if (data[phoneField.id]) {
      skipped++
      continue
    }

    // Fetch member's phone
    const { data: member } = await supabase
      .from("members")
      .select("phone")
      .eq("id", response.member_id)
      .single()

    if (!member || !member.phone) {
      console.log(`  ⚠ No phone found for member ${response.member_id}`)
      skipped++
      continue
    }

    // Update response with phone
    const updatedData = {
      ...data,
      [phoneField.id]: member.phone,
    }

    const { error: updateError } = await supabase
      .from("signup_responses")
      .update({ data: updatedData })
      .eq("id", response.id)

    if (updateError) {
      console.log(`  ❌ Failed to update response ${response.id}:`, updateError.message)
      failed++
    } else {
      updated++
      process.stdout.write(`\r  ✓ Updated: ${updated}`)
    }
  }

  console.log(`\n\n📊 Summary:`)
  console.log(`  ✓ Updated: ${updated}`)
  console.log(`  ⚠ Skipped: ${skipped} (already had phone or member has no phone)`)
  if (failed > 0) {
    console.log(`  ❌ Failed: ${failed}`)
  }

  console.log(`\n✅ Backfill complete!`)
  console.log(`\nNext steps:`)
  console.log(`  1. Verify by viewing responses at /signup/${formSlug}/responses`)
  console.log(`  2. Member-linked signups should now have phone numbers`)
  console.log(`  3. Edit feature will now work for those signups`)
}

backfillPhones().catch((err) => {
  console.error("❌ Unexpected error:", err)
  process.exit(1)
})
