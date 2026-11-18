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
  let responses: { id: string; data: Record<string, unknown>; created_at: string; member_id?: string; display_name?: string }[] = []
  if (form.visibility === "public_link" && showResponses) {
    const { data: resps } = await supabase
      .from("signup_responses")
      .select(`
        id,
        data,
        created_at,
        member_id,
        members!inner(
          family_id,
          first_name,
          role_in_family,
          families!inner(
            id,
            family_name
          )
        )
      `)
      .eq("form_id", form.id)
      .order("created_at", { ascending: true })
      .limit(100)

    // Format family names for display
    if (resps) {
      const familyMembers = new Map<string, Array<{ first_name: string; role_in_family: string }>>()

      // Collect all active members per family
      for (const resp of resps) {
        if (resp.members && Array.isArray(resp.members)) {
          const member = resp.members[0]
          if (member?.families?.[0]?.id) {
            const familyId = member.families[0].id

            if (!familyMembers.has(familyId)) {
              // Fetch all family members for this family
              const { data: allMembers } = await supabase
                .from("members")
                .select("first_name, role_in_family")
                .eq("family_id", familyId)
                .eq("is_active", true)
                .in("role_in_family", ["husband", "wife"])
                .order("role_in_family")

              familyMembers.set(familyId, allMembers || [])
            }
          }
        }
      }

      // Build formatted responses
      responses = resps.map((resp: any) => {
        let displayName = String(resp.data[Object.keys(resp.data)[0]] || "Anonymous")

        if (resp.members && Array.isArray(resp.members) && resp.members.length > 0) {
          const member = resp.members[0]
          if (member?.families?.[0]?.id) {
            const familyId = member.families[0].id
            const members = familyMembers.get(familyId) || []

            if (members.length > 0) {
              const names = members.map(m => m.first_name).filter(Boolean)
              if (names.length > 1) {
                displayName = names.join(" & ")
              } else if (names.length === 1) {
                displayName = names[0]
              }
            }
          }
        }

        return {
          id: resp.id,
          data: resp.data,
          created_at: resp.created_at,
          member_id: resp.member_id,
          display_name: displayName,
        }
      })
    }
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
