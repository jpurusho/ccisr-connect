/**
 * Shared validation schemas and regex patterns
 *
 * This module provides reusable validation patterns for common data types
 * used across API routes, forms, and signup fields.
 */

import { z } from "zod"

// ── Common Regex Patterns ───────────────────────────────────────────────────

/**
 * Phone number validation - allows digits, spaces, hyphens, parentheses, periods, and plus sign
 * Examples: (555) 123-4567, 555-123-4567, +1 555 123 4567
 */
export const PHONE_REGEX = /^[\d\s\-().+]+$/

/**
 * Email validation - basic RFC 5322 compliant pattern
 * Examples: user@example.com, firstname.lastname@company.co.uk
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * ISO date format validation (YYYY-MM-DD)
 * Examples: 2024-01-15, 2023-12-31
 */
export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

/**
 * UUID v4 validation
 * Example: 550e8400-e29b-41d4-a716-446655440000
 */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// ── Validation Functions ────────────────────────────────────────────────────

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim())
}

/**
 * Validate phone number format
 */
export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone) && phone.replace(/\D/g, "").length >= 7
}

/**
 * Validate ISO date format
 */
export function isValidISODate(date: string): boolean {
  if (!ISO_DATE_REGEX.test(date)) return false
  const parsed = new Date(date)
  return !isNaN(parsed.getTime())
}

/**
 * Extract last N digits from a phone number (strips non-digits)
 */
export function getPhoneLast4(phone: string): string {
  return phone.replace(/\D/g, "").slice(-4)
}

// ── Common Validation Limits ────────────────────────────────────────────────

export const TEXT_MAX_LENGTH = 1000
export const TEXTAREA_MAX_LENGTH = 2000
export const PHONE_MIN_LENGTH = 7

// ── Zod Schemas for API Routes ──────────────────────────────────────────────

/**
 * Card preview request validation
 */
export const cardPreviewSchema = z.object({
  type: z.enum([
    "birthday",
    "anniversary",
    "bible_study",
    "womens_study",
    "prayer_meeting",
    "bulletin",
  ]),
  week: z.string().max(100).optional(),
  date: z.string().max(100).optional(),
  time: z.string().max(50).optional(),
  topic: z.string().max(500).optional(),
  host: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  phone: z.string().regex(PHONE_REGEX).max(50).optional(),
  zoom: z.string().url().max(500).optional(),
  signup: z.string().url().max(500).optional(),
  dinner: z.string().max(500).optional(),
})

/**
 * Signup lookup request validation
 */
export const signupLookupSchema = z.object({
  formId: z.string().uuid("Invalid form ID format"),
  phoneLast4: z
    .string()
    .min(4, "Phone last 4 must be at least 4 characters")
    .max(20, "Phone input too long")
    .regex(/\d{4}/, "Must contain at least 4 digits"),
})

/**
 * Dispatch send request validation
 */
export const dispatchSendSchema = z.object({
  dispatchId: z.string().uuid("Invalid dispatch ID format"),
})

/**
 * Bible verse lookup request validation
 */
export const bibleVerseSchema = z.object({
  ref: z
    .string()
    .min(1, "Bible reference is required")
    .max(200, "Reference too long")
    .regex(
      /^[\w\s\d:,\-–.]+$/,
      "Reference contains invalid characters"
    ),
  translation: z
    .enum(["esv", "kjv", "niv", "nlt", "web", "nasb"])
    .default("esv")
    .optional(),
})

/**
 * HTML sanitization helper - removes script tags and dangerous attributes
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript:/gi, "")
}

/**
 * Generic validation wrapper for API routes
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (err) {
    if (err instanceof z.ZodError) {
      const errors = err.issues.map((e: z.ZodIssue) => `${e.path.join(".")}: ${e.message}`).join(", ")
      return { success: false, error: errors }
    }
    return { success: false, error: "Validation failed" }
  }
}
