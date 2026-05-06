import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createHash } from "crypto"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const IP_SALT = process.env.SIGNUP_IP_SALT || "ccisr-signup-default-salt"

function hashIp(ip: string): string {
  return createHash("sha256").update(ip + IP_SALT).digest("hex").slice(0, 16)
}

function maskPhone(phone: string | null): string | undefined {
  if (!phone) return undefined
  const digits = phone.replace(/\D/g, "")
  if (digits.length < 4) return undefined
  return `***-***-${digits.slice(-4)}`
}

export async function POST(req: NextRequest) {
  let body: { formId?: string; query?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { formId, query } = body
  if (!formId || !query || query.length < 3) {
    return NextResponse.json({ results: [] })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const ipHash = hashIp(ip)

  // Rate limit: max 10 lookups per form per minute
  const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString()
  const { count } = await supabase
    .from("signup_rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .eq("form_id", formId)
    .gte("attempt_at", oneMinAgo)

  if ((count ?? 0) >= 10) {
    return NextResponse.json({ results: [] })
  }

  await supabase.from("signup_rate_limits").insert({ ip_hash: ipHash, form_id: formId })

  // Verify form exists and has member_autocomplete enabled
  const { data: form } = await supabase
    .from("signup_forms")
    .select("id, member_autocomplete, status")
    .eq("id", formId)
    .single()

  if (!form || form.status !== "active" || !form.member_autocomplete) {
    return NextResponse.json({ results: [] })
  }

  // Search members — return minimal data only
  const { data: members } = await supabase
    .from("members")
    .select("id, full_name, cell_phone, family_id")
    .eq("is_active", true)
    .ilike("full_name", `%${query.trim()}%`)
    .limit(5)

  if (!members || members.length === 0) {
    return NextResponse.json({ results: [] })
  }

  // Fetch addresses for matched families (city only)
  const familyIds = [...new Set(members.map((m) => m.family_id).filter(Boolean))]
  const { data: addresses } = familyIds.length > 0
    ? await supabase
        .from("addresses")
        .select("family_id, city, state, street, zip")
        .in("family_id", familyIds)
        .eq("is_current", true)
    : { data: [] }

  const addrMap = new Map<string, { city?: string; state?: string; street?: string; zip?: string }>()
  for (const a of addresses ?? []) {
    addrMap.set(a.family_id, { city: a.city, state: a.state, street: a.street, zip: a.zip })
  }

  const results = members.map((m) => {
    const addr = addrMap.get(m.family_id)
    return {
      id: m.id,
      name: m.full_name,
      maskedPhone: maskPhone(m.cell_phone),
      city: addr?.city || undefined,
      address: addr ? [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(", ") : undefined,
      phone: m.cell_phone || undefined,
    }
  })

  return NextResponse.json({ results })
}
