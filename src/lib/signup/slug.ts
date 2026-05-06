const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789"

export function generateSlug(length = 8): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => CHARS[b % CHARS.length]).join("")
}
