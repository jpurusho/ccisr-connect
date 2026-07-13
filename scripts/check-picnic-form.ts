#!/usr/bin/env tsx
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function checkForm() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data: forms } = await supabase
    .from("signup_forms")
    .select("slug, title, fields")
    .ilike("slug", "%picnic%")

  if (!forms || forms.length === 0) {
    console.log("No forms found matching 'picnic'")
    return
  }

  for (const form of forms) {
    console.log(`\n📋 Form: ${form.title}`)
    console.log(`   Slug: ${form.slug}`)
    console.log("\n   Fields:")
    const fields = form.fields as any[]
    fields.forEach((f: any, i: number) => {
      console.log(`   ${i + 1}. ${f.label} (type: ${f.type})${f.required ? " [Required]" : ""}`)
      if (f.helpText) console.log(`      Help: ${f.helpText}`)
    })
  }
}

checkForm()
