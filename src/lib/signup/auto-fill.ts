import { createClient } from "@/lib/supabase/client"

export interface SignupFieldMapping {
  signup_field: string
  card_field: "host_name" | "host_address" | "host_city" | "host_phone" | "helper_role" | "helper_name"
}

export interface SignupFieldMap {
  match_field: string
  location_index?: number
  mappings: SignupFieldMapping[]
}

export interface AutoFillResult {
  hostName?: string
  address?: string
  city?: string
  phone?: string
  respondentName?: string
  helpers?: { role: string; name: string }[]
  source: "signup" | "none"
  formTitle?: string
}

const MONTHS = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

export async function resolveSignupAutoFill(
  linkedFormId: string,
  fieldMap: SignupFieldMap,
  weekDate: Date
): Promise<AutoFillResult> {
  const supabase = createClient()
  const month = weekDate.getMonth() + 1

  const { data: form } = await supabase
    .from("signup_forms")
    .select("id, fields")
    .eq("id", linkedFormId)
    .returns<{ id: string; fields: unknown[] }[]>()
    .single()

  if (!form) return { source: "none" }

  const { data: responses } = await supabase
    .from("signup_responses")
    .select("id, data, member_id, created_at")
    .eq("form_id", linkedFormId)
    .order("created_at", { ascending: false })
    .returns<{ id: string; data: Record<string, unknown>; member_id: string | null; created_at: string }[]>()

  if (!responses || responses.length === 0) return { source: "none" }

  const matchingResponse = responses.find((r) => {
    const matchVal = r.data[fieldMap.match_field]
    if (typeof matchVal === "number") return matchVal === month
    if (typeof matchVal === "string") {
      const monthIdx = MONTHS.findIndex((m) => m.toLowerCase() === matchVal.toLowerCase())
      if (monthIdx > 0) return monthIdx === month
    }
    return false
  })

  // Check if this is a helpers-type mapping (collects multiple responses)
  const hasHelperFields = fieldMap.mappings.some((m) => m.card_field === "helper_role" || m.card_field === "helper_name")

  if (hasHelperFields) {
    // For helpers: collect ALL matching responses (multiple signups per week)
    const allMatching = responses.filter((r) => {
      const matchVal = r.data[fieldMap.match_field]
      if (typeof matchVal === "number") return matchVal === month
      if (typeof matchVal === "string") {
        const monthIdx = MONTHS.findIndex((m) => m.toLowerCase() === matchVal.toLowerCase())
        if (monthIdx > 0) return monthIdx === month
      }
      return false
    })

    if (allMatching.length === 0) return { source: "none" }

    const result: AutoFillResult = { source: "signup", helpers: [] }
    const roleField = fieldMap.mappings.find((m) => m.card_field === "helper_role")
    const nameField = fieldMap.mappings.find((m) => m.card_field === "helper_name")

    for (const resp of allMatching) {
      const role = roleField ? String(resp.data[roleField.signup_field] ?? "") : ""
      const name = nameField ? String(resp.data[nameField.signup_field] ?? "") : ""
      if (role || name) {
        result.helpers!.push({ role, name })
      }
    }

    const { data: formInfo } = await supabase
      .from("signup_forms")
      .select("title")
      .eq("id", linkedFormId)
      .returns<{ title: string }[]>()
      .single()
    if (formInfo) result.formTitle = formInfo.title

    return result
  }

  // Standard host-type mapping (first matching response)
  if (!matchingResponse) return { source: "none" }

  const result: AutoFillResult = { source: "signup" }

  const { data: formInfo } = await supabase
    .from("signup_forms")
    .select("title")
    .eq("id", linkedFormId)
    .returns<{ title: string }[]>()
    .single()
  if (formInfo) result.formTitle = formInfo.title

  for (const mapping of fieldMap.mappings) {
    const val = matchingResponse.data[mapping.signup_field]
    if (!val) continue

    switch (mapping.card_field) {
      case "host_name":
        if (typeof val === "string") result.hostName = val
        break
      case "host_address":
        if (typeof val === "object" && val !== null) {
          const addr = val as { street?: string; city?: string; state?: string; zip?: string }
          result.address = [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(", ")
          if (addr.city && !result.city) result.city = addr.city
        } else if (typeof val === "string") {
          result.address = val
        }
        break
      case "host_city":
        if (typeof val === "string") result.city = val
        break
      case "host_phone":
        if (typeof val === "string") result.phone = val
        break
      case "helper_role":
      case "helper_name":
        break
    }
  }

  if (matchingResponse.data[fieldMap.match_field]) {
    const memberField = fieldMap.mappings.find((m) => m.card_field === "host_name")
    if (memberField) {
      result.respondentName = String(matchingResponse.data[memberField.signup_field] ?? "")
    }
  }

  return result
}

export function getMonthName(month: number): string {
  return MONTHS[month] || ""
}
