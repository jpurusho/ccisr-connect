import type { TemplateStyleSettings } from "./card-builder"

export type VisualSectionType =
  | "header"
  | "banner_image"
  | "message"
  | "details"
  | "locations"
  | "virtual"
  | "quote"
  | "signup_cta"
  | "custom"
  | "resource_links"
  | "flyer"
  | "footer"

export interface VisualSection {
  id: string
  type: VisualSectionType
  enabled: boolean
  config: Record<string, unknown>
}

export interface VisualConfig {
  sections: VisualSection[]
  globalStyle?: TemplateStyleSettings
}

export const SECTION_LABELS: Record<VisualSectionType, { label: string; emoji: string }> = {
  header: { label: "Header", emoji: "🎨" },
  banner_image: { label: "Banner Image", emoji: "🖼️" },
  message: { label: "Message", emoji: "💬" },
  details: { label: "Event Details", emoji: "📋" },
  locations: { label: "Locations", emoji: "📍" },
  virtual: { label: "Virtual / Zoom", emoji: "💻" },
  quote: { label: "Quote / Verse", emoji: "✨" },
  signup_cta: { label: "Signup CTA", emoji: "📝" },
  custom: { label: "Custom Section", emoji: "🧩" },
  resource_links: { label: "Resource Links", emoji: "🔗" },
  flyer: { label: "Flyer Image", emoji: "📰" },
  footer: { label: "Footer", emoji: "👣" },
}

export const DEFAULT_SECTIONS: VisualSection[] = [
  { id: "s-header", type: "header", enabled: true, config: {} },
  { id: "s-details", type: "details", enabled: true, config: {} },
  { id: "s-locations", type: "locations", enabled: true, config: {} },
  { id: "s-message", type: "message", enabled: true, config: {} },
  { id: "s-custom", type: "custom", enabled: false, config: {} },
  { id: "s-resource", type: "resource_links", enabled: false, config: {} },
  { id: "s-footer", type: "footer", enabled: true, config: {} },
]
