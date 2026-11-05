/**
 * Email Card Utilities
 *
 * Shared utility functions for card building to eliminate code duplication.
 * These functions generate common HTML patterns used across multiple card types.
 */

import type { CardColors, StyleContext } from "./card-builder"
import { SIZE_SCALES } from "./card-builder"

/**
 * Builds a single detail row (label + value) for use in card detail tables.
 * This pattern is repeated in Bible Study, Women's Study, Prayer Meeting, and Generic Event cards.
 */
export function buildDetailRow(
  label: string,
  value: string,
  colors: CardColors,
  style?: StyleContext
): string {
  const sz = style?.sizes ?? SIZE_SCALES.default
  return `<tr>
<td style="padding:6px 0;font-size:${sz.label}px;color:${colors.textLight};text-transform:uppercase;letter-spacing:0.5px;font-weight:600;vertical-align:top;width:80px">${label}</td>
<td style="padding:6px 0 6px 12px;font-size:${sz.body}px;color:${colors.textDark};font-weight:500">${value}</td>
</tr>`
}

/**
 * Builds a complete detail table from an array of label/value pairs.
 * Wraps the rows in a table with optional background styling.
 */
export function buildDetailTable(
  details: { label: string; value: string }[],
  colors: CardColors,
  style?: StyleContext,
  options?: {
    withBackground?: boolean
    marginBottom?: string
  }
): string {
  if (details.length === 0) return ""

  const rows = details.map(d => buildDetailRow(d.label, d.value, colors, style)).join("\n")
  const bgStyle = options?.withBackground ? `background:${colors.bgLight};border-radius:8px;padding:4px 16px;` : ""
  const marginStyle = options?.marginBottom ? `margin-bottom:${options.marginBottom};` : ""

  return `<table width="100%" cellpadding="0" cellspacing="0" style="${bgStyle}${marginStyle}">
${rows}
</table>`
}

/**
 * Builds a section label header (emoji + title) commonly used in bulletin cards.
 */
export function buildSectionLabel(
  icon: string,
  title: string,
  color: string,
  style?: StyleContext
): string {
  const sz = style?.sizes ?? SIZE_SCALES.default
  return `<p style="margin:16px 0 4px;font-size:${sz.label + 1}px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.5px">${icon} ${title}</p>`
}

/**
 * Builds a button-style link (CTA) centered in a container.
 */
export function buildButtonLink(
  url: string,
  label: string,
  colors: CardColors,
  style?: StyleContext,
  options?: {
    marginTop?: string
    paddingY?: string
    paddingX?: string
    rounded?: boolean
  }
): string {
  const sz = style?.sizes ?? SIZE_SCALES.default
  const marginTop = options?.marginTop ?? "12px"
  const paddingY = options?.paddingY ?? "10px"
  const paddingX = options?.paddingX ?? "24px"
  const borderRadius = options?.rounded ? "20px" : "6px"

  return `<div style="text-align:center;margin-top:${marginTop}">
<a href="${url}" style="display:inline-block;padding:${paddingY} ${paddingX};background:${colors.primary};color:#fff;border-radius:${borderRadius};text-decoration:none;font-size:${sz.body}px;font-weight:600">${label}</a>
</div>`
}

/**
 * Builds a centered divider line (commonly used between message and content).
 */
export function buildDivider(
  colors: CardColors,
  options?: {
    width?: string
    height?: string
    margin?: string
  }
): string {
  const width = options?.width ?? "60px"
  const height = options?.height ?? "3px"
  const margin = options?.margin ?? "20px auto"

  return `<div style="margin:${margin};width:${width};height:${height};background:${colors.border};border-radius:2px"></div>`
}

/**
 * Builds a spacer div for consistent vertical spacing.
 */
export function buildSpacer(height = "16px"): string {
  return `<div style="height:${height}"></div>`
}

/**
 * Builds a plain text paragraph with consistent styling.
 */
export function buildTextParagraph(
  text: string,
  colors: CardColors,
  style?: StyleContext,
  options?: {
    centered?: boolean
    color?: string
    margin?: string
  }
): string {
  const sz = style?.sizes ?? SIZE_SCALES.default
  const textAlign = options?.centered ? "center" : "left"
  const color = options?.color ?? colors.textDark
  const margin = options?.margin ?? "0 0 12px"

  return `<p style="margin:${margin};font-size:${sz.body}px;color:${color};text-align:${textAlign};line-height:1.6">${text}</p>`
}

/**
 * Builds a boxed message block with optional background color and border.
 * Useful for highlighted messages or notices.
 */
export function buildMessageBox(
  message: string,
  colors: CardColors,
  style?: StyleContext,
  options?: {
    backgroundColor?: string
    borderColor?: string
    margin?: string
    centered?: boolean
  }
): string {
  const sz = style?.sizes ?? SIZE_SCALES.default
  const bg = options?.backgroundColor ?? colors.bgLight
  const border = options?.borderColor ?? colors.border
  const margin = options?.margin ?? "16px 0"
  const textAlign = options?.centered ? "center" : "left"

  return `<div style="margin:${margin};padding:12px 16px;background:${bg};border:1.5px solid ${border};border-radius:8px;font-size:${sz.body}px;color:${colors.textDark};text-align:${textAlign};line-height:1.6;white-space:pre-wrap">${message}</div>`
}

/**
 * Builds location information block for event cards.
 * Handles break messages and normal location details.
 */
export function buildLocationBlock(
  location: {
    label?: string
    hostName?: string
    address?: string
    city?: string
    phone?: string
    isOnBreak?: boolean
    breakMessage?: string
  },
  colors: CardColors,
  style?: StyleContext,
  showLabel = false
): string {
  const sz = style?.sizes ?? SIZE_SCALES.default

  const locationHeader = showLabel && location.label
    ? `<p style="margin:0 0 8px;font-size:${sz.body}px;font-weight:700;color:${colors.primary}">${location.label}</p>`
    : ""

  if (location.isOnBreak) {
    const msg = location.breakMessage || `${location.label || "Location"} is on break`
    return `${locationHeader}<div style="background:${colors.bgLight};border-radius:8px;padding:12px 16px;text-align:center">
<p style="margin:0;font-size:${sz.label + 1}px;color:${colors.textLight};font-style:italic">${msg}</p>
</div>`
  }

  const details: { label: string; value: string }[] = []
  if (location.hostName) details.push({ label: "Host", value: location.hostName })

  const addrParts = [location.address, location.city].filter(Boolean).join("<br/>")
  if (addrParts) details.push({ label: "Where", value: addrParts })

  if (location.phone) details.push({ label: "Contact", value: location.phone })

  if (details.length === 0) return ""

  return `${locationHeader}${buildDetailTable(details, colors, style, { withBackground: true })}`
}
