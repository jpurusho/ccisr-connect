/**
 * Independent test to verify template visibility logic
 * Run with: npx tsx scripts/test-template-visibility.ts
 */

import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"
import { templateRegistry } from "../src/lib/template-registry"

// Load .env.local
config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface EventType {
  id: string
  name: string
  comm_type: string | null
  show_in_dashboard: boolean | null
  display_order: number | null
  icon_name: string | null
  card_color: string | null
}

async function testTemplateVisibility() {
  console.log("╔════════════════════════════════════════════════════════════════╗")
  console.log("║        TEMPLATE VISIBILITY TEST - DATABASE vs RENDER           ║")
  console.log("╚════════════════════════════════════════════════════════════════╝\n")

  // Query event_types from database (EXACT same query as dashboard)
  const { data: eventTypes, error } = await supabase
    .from("event_types")
    .select("id, name, comm_type, show_in_dashboard, display_order, icon_name, card_color")
    .returns<EventType[]>()

  if (error) {
    console.error("❌ Database query failed:", error.message)
    process.exit(1)
  }

  console.log("📊 DATABASE QUERY RESULTS")
  console.log("─────────────────────────────────────────────────────────────────")
  console.log(`Total rows returned: ${eventTypes?.length || 0}\n`)

  // Check for duplicates
  const commTypeCounts: Record<string, number> = {}
  eventTypes?.forEach((et) => {
    if (et.comm_type) {
      commTypeCounts[et.comm_type] = (commTypeCounts[et.comm_type] || 0) + 1
    }
  })

  const duplicates = Object.entries(commTypeCounts).filter(([_, count]) => count > 1)
  if (duplicates.length > 0) {
    console.log("❌ DUPLICATES FOUND IN DATABASE:")
    duplicates.forEach(([ct, count]) => {
      console.log(`   ${ct}: appears ${count} times`)
    })
    console.log()
  } else {
    console.log("✓ No duplicate comm_type values found\n")
  }

  // Show all rows
  console.log("All event_types rows:")
  eventTypes?.forEach((et, i) => {
    console.log(`${i + 1}. id=${et.id.substring(0, 8)}... comm_type=${et.comm_type}`)
    console.log(`   name="${et.name}"`)
    console.log(`   show_in_dashboard=${et.show_in_dashboard}`)
    console.log(`   display_order=${et.display_order}`)
    console.log()
  })

  console.log("\n🔍 TEMPLATE LOADING SIMULATION")
  console.log("─────────────────────────────────────────────────────────────────")
  console.log("Simulating dashboard template loading logic...\n")

  const visibleTemplates: { type: string; label: string; displayOrder: number }[] = []
  const seenTypes = new Set<string>()

  eventTypes?.forEach((et) => {
    const ct = et.comm_type
    console.log(`\nProcessing: comm_type="${ct}" (id=${et.id.substring(0, 8)}...)`)

    if (!ct) {
      console.log("  → SKIP: No comm_type")
      return
    }

    if (et.show_in_dashboard === false) {
      console.log(`  → SKIP: show_in_dashboard is false`)
      return
    }

    if (seenTypes.has(ct)) {
      console.log(`  → SKIP: Duplicate comm_type (already seen)`)
      return
    }

    const templateConfig = templateRegistry.get(ct)
    if (!templateConfig) {
      console.log(`  → SKIP: Not in template registry`)
      return
    }

    seenTypes.add(ct)
    console.log(`  ✓ ADDED to visible templates`)

    visibleTemplates.push({
      type: ct,
      label: templateConfig.label,
      displayOrder: et.display_order ?? 999,
    })
  })

  // Sort by display order
  visibleTemplates.sort((a, b) => a.displayOrder - b.displayOrder)

  console.log("\n\n📋 FINAL VISIBLE TEMPLATES (what should render on dashboard)")
  console.log("─────────────────────────────────────────────────────────────────")
  console.log(`Total: ${visibleTemplates.length} templates\n`)

  if (visibleTemplates.length === 0) {
    console.log("⚠️  NO TEMPLATES WILL BE VISIBLE")
  } else {
    visibleTemplates.forEach((t, i) => {
      console.log(`${i + 1}. ${t.label} (${t.type}) - order: ${t.displayOrder}`)
    })
  }

  console.log("\n\n✅ TEST COMPLETE")
  console.log("═══════════════════════════════════════════════════════════════════")
  console.log("If dashboard shows different templates, there's a frontend bug.")
  console.log("If dashboard matches this list, the logic is working correctly.")
  console.log("═══════════════════════════════════════════════════════════════════\n")
}

testTemplateVisibility().catch((err) => {
  console.error("Test failed:", err)
  process.exit(1)
})
