import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { rateLimitByIp } from "@/lib/rate-limit"
import { ApiError } from "@/lib/api-response"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Rate limiting: 20 requests per hour per IP
  const rateLimit = rateLimitByIp(req, {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000,
    namespace: "signup-slug",
  })

  if (!rateLimit.allowed) {
    return ApiError.tooManyRequests()
  }

  const { slug } = await params
  if (!slug || slug.length < 4) {
    return ApiError.notFound()
  }

  const isPreview = req.nextUrl.searchParams.get("preview") === "1"
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Check if user is authenticated admin
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = !!user

  const { data: form } = await supabase
    .from("signup_forms")
    .select("id, title, description, theme, fields, status, visibility, member_autocomplete, show_responses, auto_close_date, max_submissions, hidden_custom_items, muted")
    .eq("slug", slug)
    .single()

  // Allow preview of draft/closed forms with ?preview=1
  if (!form || (!isPreview && form.status !== "active")) {
    return ApiError.notFound()
  }

  // Only close if admin set an explicit auto_close_date
  if (form.auto_close_date) {
    const closeDay = new Date(form.auto_close_date + "T23:59:59")
    if (new Date() > closeDay) {
      return ApiError.gone("This signup has ended")
    }
  }

  // Fetch responses if visibility is public and show_responses is enabled
  const showResponses = form.show_responses !== false
  let responses: { id: string; data: Record<string, unknown>; created_at: string }[] = []
  if (form.visibility === "public_link" && showResponses) {
    const { data: resps } = await supabase
      .from("signup_responses")
      .select("id, data, created_at")
      .eq("form_id", form.id)
      .order("created_at", { ascending: true })
      .limit(100)

    responses = (resps ?? []) as typeof responses
  }

  return NextResponse.json({
    form: {
      id: form.id,
      title: form.title,
      description: form.description,
      theme: form.theme,
      fields: form.fields,
      visibility: form.visibility,
      member_autocomplete: form.member_autocomplete,
      show_responses: showResponses,
      hidden_custom_items: form.hidden_custom_items || {},
      muted: form.muted || false,
    },
    responses,
    responseCount: responses.length,
    isAdmin,
  })
}
