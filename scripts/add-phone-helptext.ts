#!/usr/bin/env tsx
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function addHelpText() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Fetch the picnic form
  const { data: form } = await supabase
    .from("signup_forms")
    .select("id, slug, title, fields")
    .eq("slug", "church-picnic")
    .single()

  if (!form) {
    console.log("❌ Form not found")
    return
  }

  console.log(`\n📋 Form: ${form.title}`)

  // Find the phone field
  const fields = form.fields as any[]
  const phoneFieldIndex = fields.findIndex((f: any) => f.type === "phone")

  if (phoneFieldIndex === -1) {
    console.log("❌ No phone field found")
    return
  }

  console.log(`✓ Found phone field: "${fields[phoneFieldIndex].label}"`)

  // Add help text
  fields[phoneFieldIndex].helpText = "Phone required to edit your response later"

  // Update the form
  const { error } = await supabase
    .from("signup_forms")
    .update({ fields })
    .eq("id", form.id)

  if (error) {
    console.log("❌ Failed to update:", error.message)
    return
  }

  console.log('✓ Added help text: "Phone required to edit your response later"')
  console.log("\n✅ Done! The help text will now appear under the phone field on the public form.")
}

addHelpText()
