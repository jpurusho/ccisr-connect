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
  // Smart sections — auto-pull data from DB at compose time
  | "locations_auto"
  | "virtual_auto"
  | "details_auto"
  | "birthdays_auto"
  | "anniversaries_auto"
  | "helpers_auto"
  | "upcoming_auto"
  | "break_status"

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
  // Smart sections
  locations_auto: { label: "Locations (Auto)", emoji: "📍" },
  virtual_auto: { label: "Virtual (Auto)", emoji: "💻" },
  details_auto: { label: "Details (Auto)", emoji: "📋" },
  birthdays_auto: { label: "Birthdays (Auto)", emoji: "🎂" },
  anniversaries_auto: { label: "Anniversaries (Auto)", emoji: "💍" },
  helpers_auto: { label: "Helpers (Auto)", emoji: "🤝" },
  upcoming_auto: { label: "Upcoming (Auto)", emoji: "🔜" },
  break_status: { label: "Break Status", emoji: "🏖️" },
}

/** Section types that auto-pull data from the DB at compose time */
export const SMART_SECTION_TYPES: VisualSectionType[] = [
  "locations_auto",
  "virtual_auto",
  "details_auto",
  "birthdays_auto",
  "anniversaries_auto",
  "helpers_auto",
  "upcoming_auto",
  "break_status",
]

export function isSmartSection(type: VisualSectionType): boolean {
  return SMART_SECTION_TYPES.includes(type)
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
