#!/usr/bin/env tsx
/**
 * Recover deleted signup form from audit log
 *
 * Usage:
 *   tsx scripts/recover-signup-form.ts <form_id>
 *   tsx scripts/recover-signup-form.ts --list-deleted
 *
 * This script reads the audit log to find the last known state of a deleted form
 * and recreates it (without responses, as those cascade-delete)
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing environment variables:")
  console.error("   NEXT_PUBLIC_SUPABASE_URL")
  console.error("   SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function listDeletedForms() {
  console.log("🔍 Searching for deleted signup forms in audit log...\n")

  const { data, error } = await supabase
    .from("audit_log")
    .select("entity_id, changes, created_at, user_id")
    .eq("entity_type", "signup_forms")
    .eq("action", "signup_form_deleted")
    .order("created_at", { ascending: false })
    .limit(20)

  if (error) {
    console.error("❌ Error fetching audit log:", error.message)
    return
  }

  if (!data || data.length === 0) {
    console.log("✅ No deleted forms found in recent history")
    return
  }

  console.log(`Found ${data.length} deleted forms:\n`)
  for (const entry of data) {
    const changes = entry.changes as any
    console.log(`📋 ID: ${entry.entity_id}`)
    console.log(`   Title: ${changes.title || "Unknown"}`)
    console.log(`   Deleted: ${new Date(entry.created_at).toLocaleString()}`)
    console.log(`   Responses lost: ${changes.responseCount || 0}`)
    console.log(`   Fields: ${changes.fieldCount || 0}`)
    console.log()
  }
}

async function recoverForm(formId: string) {
  console.log(`🔍 Looking for form ${formId} in audit log...\n`)

  // Get the last update before deletion
  const { data: updates, error: updateError } = await supabase
    .from("audit_log")
    .select("changes, created_at")
    .eq("entity_type", "signup_forms")
    .eq("entity_id", formId)
    .in("action", ["signup_form_updated", "signup_form_created"])
    .order("created_at", { ascending: false })
    .limit(1)

  if (updateError) {
    console.error("❌ Error fetching audit log:", updateError.message)
    return
  }

  if (!updates || updates.length === 0) {
    console.error("❌ No audit entries found for this form")
    console.log("\nTip: Use --list-deleted to see recently deleted forms")
    return
  }

  // Get deletion info
  const { data: deletion } = await supabase
    .from("audit_log")
    .select("changes, created_at")
    .eq("entity_type", "signup_forms")
    .eq("entity_id", formId)
    .eq("action", "signup_form_deleted")
    .single()

  const lastState = updates[0].changes as any
  const deletionInfo = deletion?.changes as any

  console.log("📋 Found form data:")
  console.log(`   Title: ${lastState.title}`)
  console.log(`   Last updated: ${new Date(updates[0].created_at).toLocaleString()}`)
  if (deletion) {
    console.log(`   Deleted: ${new Date(deletion.created_at).toLocaleString()}`)
    console.log(`   Responses lost: ${deletionInfo?.responseCount || 0}`)
  }
  console.log()

  // Try to get full form data from most recent update
  const { data: fullForm, error: formError } = await supabase
    .from("signup_forms")
    .select("*")
    .eq("id", formId)
    .single()

  if (fullForm) {
    console.log("✅ Form still exists in database! No recovery needed.")
    return
  }

  console.log("⚠️  Manual Recovery Required\n")
  console.log("The audit log only stores partial data. To fully recover this form:")
  console.log("1. Create a new form manually in the dashboard")
  console.log("2. Use the following details from the audit log:\n")
  console.log(`   Title: ${lastState.title || "Not recorded"}`)
  console.log(`   Slug: Generate new (old slug may be taken)`)
  console.log(`   Fields: ${lastState.fieldCount?.after || lastState.fieldCount || "Unknown"} fields`)

  if (lastState.addedFields) {
    console.log("\n   Recently added fields:")
    for (const field of lastState.addedFields) {
      console.log(`   - ${field.label} (${field.type})`)
    }
  }

  if (lastState.removedFields) {
    console.log("\n   Recently removed fields (may need to restore):")
    for (const field of lastState.removedFields) {
      console.log(`   - ${field.label} (${field.type})`)
    }
  }

  console.log("\n⚠️  Note: Responses cannot be recovered (cascade delete)")
  console.log("\nTip: For better recovery, implement soft delete (see ADR 0007)")
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log("Usage:")
    console.log("  tsx scripts/recover-signup-form.ts <form_id>")
    console.log("  tsx scripts/recover-signup-form.ts --list-deleted")
    process.exit(1)
  }

  if (args[0] === "--list-deleted" || args[0] === "-l") {
    await listDeletedForms()
  } else {
    await recoverForm(args[0])
  }
}

main().catch(console.error)
