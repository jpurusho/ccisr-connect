import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const now = new Date().toISOString()

  const { data: dispatches, error } = await supabase
    .from("dispatch_queue")
    .select("id")
    .eq("status", "approved")
    .lte("scheduled_at", now)
    .limit(10)

  if (error || !dispatches || dispatches.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  let sentCount = 0
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin

  for (const d of dispatches) {
    try {
      const res = await fetch(`${baseUrl}/api/dispatch/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dispatchId: d.id }),
      })
      if (res.ok) sentCount++
    } catch {
      // Individual send failures are handled by the send endpoint
    }
  }

  return NextResponse.json({ sent: sentCount, checked: dispatches.length })
}
