const HTML_TAG_RE = /<[^>]*>/g
const MULTI_SPACE_RE = /\s{2,}/g

export function sanitizeText(input: unknown): string {
  if (typeof input !== "string") return ""
  return input.replace(HTML_TAG_RE, "").replace(MULTI_SPACE_RE, " ").trim()
}

export function sanitizeFormData(data: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") {
      clean[key] = sanitizeText(value)
    } else if (Array.isArray(value)) {
      clean[key] = value.map((v) => (typeof v === "string" ? sanitizeText(v) : v))
    } else if (value && typeof value === "object") {
      clean[key] = sanitizeFormData(value as Record<string, unknown>)
    } else {
      clean[key] = value
    }
  }
  return clean
}
