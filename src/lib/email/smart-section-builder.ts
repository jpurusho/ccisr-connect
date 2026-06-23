/**
 * Smart Section Builder
 *
 * Composes HTML for smart sections that auto-pull data from the DB at compose time.
 * Reuses the existing card-builder helpers (pastelBoxHtml, dataListHtml styling patterns)
 * to maintain visual consistency with built-in card types.
 */

import type { VisualSection } from "./visual-config-types"
import {
  type CardColors,
  type StyleContext,
  deriveColorsFromPrimary,
  EVENT_COLORS,
  SIZE_SCALES,
  pastelBoxHtml,
} from "./card-builder"

// ── Context Interface ──────────────────────────────────────────────────────────

export interface SmartSectionContext {
  eventTitle: string
  eventDate: string | null
  eventTime: string | null
  topic: string | null
  locations: {
    label: string
    hostName: string | null
    address: string | null
    city: string | null
    phone: string | null
    isOnBreak: boolean
    breakMessage: string | null
  }[]
  virtual: {
    zoomLink: string | null
    meetingId: string | null
    passcode: string | null
  } | null
  birthdays: { name: string; date: string }[]
  anniversaries: { names: string; date: string }[]
  helpers: { role: string; name: string }[]
  upcomingEvents: { title: string; details: string }[]
  weekLabel: string
  primaryColor: string | null
  style: StyleContext | null
}

// ── Main Builder ───────────────────────────────────────────────────────────────

/**
 * Build HTML for all enabled smart sections in order.
 * Non-smart sections are skipped (they are rendered by the existing card builder).
 */
export function buildSmartSectionsHtml(
  sections: VisualSection[],
  context: SmartSectionContext
): string {
  const colors = context.primaryColor
    ? deriveColorsFromPrimary(context.primaryColor)
    : EVENT_COLORS.bulletin
  const style = context.style ?? undefined

  return sections
    .filter((s) => s.enabled)
    .map((s) => buildSingleSmartSection(s, context, colors, style))
    .filter(Boolean)
    .join("")
}

// ── Per-Section Renderers ──────────────────────────────────────────────────────

function buildSingleSmartSection(
  section: VisualSection,
  ctx: SmartSectionContext,
  colors: CardColors,
  style?: StyleContext
): string {
  switch (section.type) {
    case "details_auto":
      return buildDetailsAuto(section, ctx, colors, style)
    case "locations_auto":
      return buildLocationsAuto(section, ctx, colors, style)
    case "virtual_auto":
      return buildVirtualAuto(section, ctx, colors, style)
    case "birthdays_auto":
      return buildBirthdaysAuto(section, ctx, colors, style)
    case "anniversaries_auto":
      return buildAnniversariesAuto(section, ctx, colors, style)
    case "helpers_auto":
      return buildHelpersAuto(section, ctx, colors, style)
    case "upcoming_auto":
      return buildUpcomingAuto(section, ctx, colors, style)
    case "break_status":
      return buildBreakStatus(section, ctx, colors, style)
    default:
      return ""
  }
}

// ── Shared Helpers ─────────────────────────────────────────────────────────────

function sectionLabel(icon: string, title: string, color: string, style?: StyleContext): string {
  const sz = style?.sizes ?? SIZE_SCALES.default
  return `<p style="margin:16px 0 4px;font-size:${sz.label + 1}px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.5px">${icon} ${title}</p>`
}

function detailRow(label: string, value: string, colors: CardColors, style?: StyleContext): string {
  const sz = style?.sizes ?? SIZE_SCALES.default
  return `<tr>
<td style="padding:6px 0;font-size:${sz.label}px;color:${colors.textLight};text-transform:uppercase;letter-spacing:0.5px;font-weight:600;vertical-align:top;width:80px">${label}</td>
<td style="padding:6px 0 6px 12px;font-size:${sz.body}px;color:${colors.textDark};font-weight:500">${value}</td>
</tr>`
}

function dataListHtml(
  entries: { primary: string; secondary: string }[],
  colors: CardColors,
  style?: StyleContext
): string {
  const layout = style?.sectionLayout ?? "table"
  const sz = style?.sizes ?? SIZE_SCALES.default

  if (layout === "paragraph") {
    const text = entries.map((e) => `<strong>${e.primary}</strong> (${e.secondary})`).join(", ")
    return `<div style="background:${colors.bgLight};border-radius:8px;padding:14px 16px;margin-top:8px;font-size:${sz.body}px;color:${colors.textDark};line-height:1.8">${text}</div>`
  }

  if (layout === "list") {
    const items = entries.map((e) => `<li style="padding:4px 0;font-size:${sz.body}px;color:${colors.textDark}"><strong>${e.primary}</strong> <span style="color:${colors.accent}">${e.secondary}</span></li>`).join("")
    return `<ul style="margin:8px 0 0;padding-left:20px;list-style:disc;color:${colors.textDark}">${items}</ul>`
  }

  const rows = entries.map((e) =>
    `<tr>
<td style="padding:10px 16px;font-size:${sz.body + 2}px;font-weight:600;color:${colors.textDark};border-bottom:1px solid ${colors.border}">${e.primary}</td>
<td style="padding:10px 16px;font-size:${sz.body}px;color:${colors.accent};text-align:right;border-bottom:1px solid ${colors.border};font-weight:500">${e.secondary}</td>
</tr>`
  ).join("")
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:${colors.bgLight};border-radius:8px;overflow:hidden;margin-top:8px">${rows}</table>`
}

// ── Individual Section Builders ────────────────────────────────────────────────

function buildDetailsAuto(
  section: VisualSection,
  ctx: SmartSectionContext,
  colors: CardColors,
  style?: StyleContext
): string {
  const allOnBreak = ctx.locations.length > 0 && ctx.locations.every((l) => l.isOnBreak)
  if (allOnBreak) return ""

  let rows = ""
  if (ctx.eventDate && ctx.eventTime) {
    rows += detailRow("When", `${ctx.eventDate} at ${ctx.eventTime}`, colors, style)
  } else if (ctx.eventDate) {
    rows += detailRow("When", ctx.eventDate, colors, style)
  }
  if (ctx.topic) {
    // Allow custom label via section config, default to "Topic"
    const topicLabel = (section.config.topicLabel as string) || "Topic"
    rows += detailRow(topicLabel, ctx.topic, colors, style)
  }
  if (!rows) return ""

  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">\n${rows}\n</table>`
}

function buildLocationsAuto(
  section: VisualSection,
  ctx: SmartSectionContext,
  colors: CardColors,
  style?: StyleContext
): string {
  if (ctx.locations.length === 0) return ""

  const sz = style?.sizes ?? SIZE_SCALES.default
  const showPhone = section.config.showPhone !== false
  const showAddress = section.config.showAddress !== false
  const showLabels = ctx.locations.length > 1

  const blocks = ctx.locations
    .map((loc) => {
      const locationHeader = showLabels
        ? `<p style="margin:0 0 8px;font-size:${sz.body}px;font-weight:700;color:${colors.primary}">${loc.label}</p>`
        : ""

      if (loc.isOnBreak) {
        const msg = loc.breakMessage || `${loc.label} is on break`
        return `${locationHeader}<div style="background:${colors.bgLight};border-radius:8px;padding:12px 16px;text-align:center">
<p style="margin:0;font-size:${sz.label + 1}px;color:${colors.textLight};font-style:italic">${msg}</p>
</div>`
      }

      let details = ""
      if (loc.hostName) details += detailRow("Host", loc.hostName, colors, style)
      if (showAddress) {
        const addrParts = [loc.address, loc.city].filter(Boolean).join("<br/>")
        if (addrParts) details += detailRow("Where", addrParts, colors, style)
      }
      if (showPhone && loc.phone) details += detailRow("Contact", loc.phone, colors, style)

      if (!details) return ""

      return `${locationHeader}<table width="100%" cellpadding="0" cellspacing="0" style="background:${colors.bgLight};border-radius:8px;padding:4px 16px">
${details}
</table>`
    })
    .filter(Boolean)
    .join(`<div style="height:16px"></div>`)

  return blocks
}

function buildVirtualAuto(
  section: VisualSection,
  ctx: SmartSectionContext,
  colors: CardColors,
  style?: StyleContext
): string {
  if (!ctx.virtual || !ctx.virtual.zoomLink) return ""

  let rows = detailRow("Where", "Via Zoom", colors, style)
  rows += detailRow("Link", `<a href="${ctx.virtual.zoomLink}" style="color:${colors.primary};text-decoration:underline">Join Zoom Meeting</a>`, colors, style)
  if (ctx.virtual.meetingId) rows += detailRow("Meeting ID", ctx.virtual.meetingId, colors, style)
  if (ctx.virtual.passcode) rows += detailRow("Passcode", ctx.virtual.passcode, colors, style)

  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:${colors.bgLight};border-radius:8px;padding:4px 16px;margin-bottom:16px">\n${rows}\n</table>`
}

function buildBirthdaysAuto(
  section: VisualSection,
  ctx: SmartSectionContext,
  colors: CardColors,
  style?: StyleContext
): string {
  if (ctx.birthdays.length === 0) return ""

  const entries = ctx.birthdays.map((b) => ({ primary: b.name, secondary: b.date }))
  return sectionLabel("🎂", "Birthdays", EVENT_COLORS.birthday.primary, style) +
    dataListHtml(entries, colors, style)
}

function buildAnniversariesAuto(
  section: VisualSection,
  ctx: SmartSectionContext,
  colors: CardColors,
  style?: StyleContext
): string {
  if (ctx.anniversaries.length === 0) return ""

  const entries = ctx.anniversaries.map((a) => ({ primary: a.names, secondary: a.date }))
  return sectionLabel("💍", "Anniversaries", EVENT_COLORS.anniversary.primary, style) +
    dataListHtml(entries, colors, style)
}

function buildHelpersAuto(
  section: VisualSection,
  ctx: SmartSectionContext,
  colors: CardColors,
  style?: StyleContext
): string {
  if (ctx.helpers.length === 0) return ""

  const entries = ctx.helpers.map((h) => ({ primary: h.role, secondary: h.name }))
  return sectionLabel("🤝", "Helpers This Month", colors.primary, style) +
    dataListHtml(entries, colors, style)
}

function buildUpcomingAuto(
  section: VisualSection,
  ctx: SmartSectionContext,
  colors: CardColors,
  style?: StyleContext
): string {
  if (ctx.upcomingEvents.length === 0) return ""

  const weeksAhead = (section.config.weeksAhead as number) ?? 2
  // weeksAhead config is advisory — the caller should pre-filter, but we
  // respect the maximum count if provided
  const maxItems = (section.config.maxItems as number) ?? ctx.upcomingEvents.length
  const limited = ctx.upcomingEvents.slice(0, maxItems)

  const entries = limited.map((e) => ({ primary: e.title, secondary: e.details }))
  return sectionLabel("🔜", "Upcoming", colors.textLight, style) +
    dataListHtml(entries, colors, style)
}

function buildBreakStatus(
  section: VisualSection,
  ctx: SmartSectionContext,
  colors: CardColors,
  style?: StyleContext
): string {
  const onBreak = ctx.locations.filter((l) => l.isOnBreak)
  if (onBreak.length === 0) return ""

  const sz = style?.sizes ?? SIZE_SCALES.default
  const messages = onBreak.map((loc) => {
    const msg = loc.breakMessage || `${loc.label} is on break this week`
    return `<p style="margin:4px 0;font-size:${sz.body}px;color:${colors.textLight};font-style:italic;text-align:center">${msg}</p>`
  }).join("")

  const inner = `<div style="padding:12px 16px">${messages}</div>`
  return pastelBoxHtml(inner, "#FFFBD6", "margin:12px 0")
}
