/**
 * Shared validation schemas and regex patterns
 *
 * This module provides reusable validation patterns for common data types
 * used across API routes, forms, and signup fields.
 */

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
