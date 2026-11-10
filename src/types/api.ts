/**
 * API Types
 *
 * Shared types for API request/response structures across the application.
 * These types ensure type safety and consistency in API communication.
 */

import type { Database } from "./database"

// ── Base API Response Types ─────────────────────────────────────────────────

export interface ApiSuccessResponse<T = unknown> {
  success: true
  data?: T
}

export interface ApiErrorResponse {
  success: false
  error: string
  details?: string | ValidationError[]
  statusCode?: number
}

export interface ValidationError {
  field: string
  message: string
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

// ── Common Request/Response Structures ──────────────────────────────────────

export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface DateRangeParams {
  startDate?: string
  endDate?: string
}

// ── SMTP & Email Types ──────────────────────────────────────────────────────

export interface SmtpConfig {
  id: string
  name: string
  host: string
  port: number
  username: string
  encrypted_password: string
  from_name: string | null
  from_email: string
  created_at: string
}

export interface SmtpTestRequest {
  smtpConfigId: string
  recipientEmail: string
}

export interface SmtpTestResponse {
  success: boolean
  message?: string
}

export interface EmailRecipients {
  to: string[]
  cc: string[]
  bcc: string[]
}

// ── Dispatch Queue Types ────────────────────────────────────────────────────

export type DispatchStatus = "draft" | "scheduled" | "sending" | "sent" | "failed" | "cancelled"

export interface DispatchRecord {
  id: string
  template_type: string | null
  subject: string
  body_html: string
  status: DispatchStatus
  scheduled_for: string | null
  sent_at: string | null
  error_message: string | null
  smtp_config_id: string | null
  mailing_list_id: string | null
  additional_recipients: string | null
  week_start: string | null
  created_at: string
  updated_at: string
}

export interface DispatchSendRequest {
  dispatchId: string
}

export interface DispatchSendResponse {
  success: boolean
  recipientCount: number
}

export interface DispatchTestRequest {
  dispatchId: string
  testEmail: string
}

// ── Card/Template Types ─────────────────────────────────────────────────────

export type CardType =
  | "birthday"
  | "anniversary"
  | "bible_study"
  | "womens_study"
  | "prayer_meeting"
  | "bulletin"
  | "shoebox_ministry"

export interface CardPreviewParams {
  type: CardType
  week?: string
  date?: string
  time?: string
  topic?: string
  host?: string
  address?: string
  phone?: string
  zoom?: string
  signup?: string
  dinner?: string
}

// ── Signup Form Types ───────────────────────────────────────────────────────

// Note: SignupFormStatus is defined in forms.ts to avoid duplication

export interface SignupFormSubmission {
  formId: string
  data: Record<string, unknown>
  honeypot?: string
}

export interface SignupFormSubmissionResponse {
  success: boolean
}

export interface SignupLookupRequest {
  phone: string
  formId?: string
}

export interface SignupLookupResponse {
  found: boolean
  member?: {
    id: string
    full_name: string
    primary_phone: string
    email: string | null
  }
}

export interface SignupUpdateRequest {
  responseId: string
  data: Record<string, unknown>
  phone: string
}

export interface SignupRemoveRequest {
  responseId: string
  phone: string
  reason?: string
}

export interface SignupCapacityUpdateRequest {
  formId: string
  fieldId: string
  itemValue: string
  newCapacity: number
}

export interface SignupHostAssignmentRequest {
  formId: string
  assignments: Array<{
    responseId: string
    hostFamilyId: string | null
  }>
}

// ── Mailing List Types ──────────────────────────────────────────────────────

export type RecipientType = "to" | "cc" | "bcc"

export interface MailingListMember {
  id: string
  mailing_list_id: string
  member_id: string | null
  external_email: string | null
  recipient_type: RecipientType
  created_at: string
}

export interface MailingList {
  id: string
  name: string
  description: string | null
  google_group_email: string | null
  created_at: string
  updated_at: string
}

// ── User Management Types ───────────────────────────────────────────────────

export type UserRole = Database["public"]["Enums"]["user_role"]

export interface UserInviteRequest {
  email: string
  displayName?: string
  role: UserRole
  allowedSmtpConfigs?: string[]
}

export interface UserInviteResponse {
  success: boolean
  userId?: string
  inviteUrl?: string
}

export interface UserUpdateRequest {
  userId: string
  displayName?: string
  role?: UserRole
  isActive?: boolean
  allowedSmtpConfigs?: string[]
}

// ── Bible/Scripture Types ───────────────────────────────────────────────────

export interface BibleVerseRequest {
  reference: string
  version?: string
}

export interface BibleVerseResponse {
  reference: string
  text: string
  version: string
}

// ── Audit Log Types ─────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  user_id: string | null
  ip_address: string | null
  changes: Record<string, unknown> | null
  created_at: string
}

export interface AuditLogQueryParams extends PaginationParams, DateRangeParams {
  entityType?: string
  entityId?: string
  userId?: string
  action?: string
}

// ── Database Stats Types ────────────────────────────────────────────────────

export interface DatabaseStats {
  tables: Array<{
    name: string
    rowCount: number
    sizeBytes: number
    sizeMB: number
  }>
  totalSizeMB: number
  lastUpdated: string
}

// ── Type Guards ─────────────────────────────────────────────────────────────

export function isApiSuccessResponse<T>(
  response: ApiResponse<T>
): response is ApiSuccessResponse<T> {
  return response.success === true
}

export function isApiErrorResponse(
  response: ApiResponse
): response is ApiErrorResponse {
  return response.success === false
}
