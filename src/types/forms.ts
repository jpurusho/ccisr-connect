/**
 * Form Types
 *
 * Shared types for form data structures, validation, and signup forms.
 */

// ── Generic Form Types ──────────────────────────────────────────────────────

export interface FormFieldError {
  field: string
  message: string
}

export interface FormValidationResult<T = Record<string, unknown>> {
  success: boolean
  data?: T
  errors?: FormFieldError[]
}

// ── Signup Form Field Types ─────────────────────────────────────────────────

export type SignupFieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "member_lookup"
  | "checkbox"
  | "radio"
  | "select"
  | "claim_select"

export interface BaseFieldConfig {
  id: string
  type: SignupFieldType
  label: string
  required?: boolean
  placeholder?: string
  helpText?: string
}

export interface TextField extends BaseFieldConfig {
  type: "text"
  maxLength?: number
  minLength?: number
  pattern?: string
}

export interface TextAreaField extends BaseFieldConfig {
  type: "textarea"
  maxLength?: number
  rows?: number
}

export interface EmailField extends BaseFieldConfig {
  type: "email"
}

export interface PhoneField extends BaseFieldConfig {
  type: "phone"
}

export interface MemberLookupField extends BaseFieldConfig {
  type: "member_lookup"
  enableCreate?: boolean
}

export interface CheckboxField extends BaseFieldConfig {
  type: "checkbox"
  options: Array<{ label: string; value: string }>
}

export interface RadioField extends BaseFieldConfig {
  type: "radio"
  options: Array<{ label: string; value: string }>
}

export interface SelectField extends BaseFieldConfig {
  type: "select"
  options: Array<{ label: string; value: string }>
  multiple?: boolean
}

export interface ClaimSelectOption {
  label: string
  value: string
  capacity: number
  current_capacity?: number
}

export interface ClaimSelectField extends BaseFieldConfig {
  type: "claim_select"
  options: ClaimSelectOption[]
  maxSelections?: number
  allowCapacityIncrease?: boolean
  allowCustomItems?: boolean
}

export type SignupFieldConfig =
  | TextField
  | TextAreaField
  | EmailField
  | PhoneField
  | MemberLookupField
  | CheckboxField
  | RadioField
  | SelectField
  | ClaimSelectField

// ── Signup Form Types ───────────────────────────────────────────────────────

export type SignupFormStatus = "draft" | "active" | "closed" | "archived"

export interface SignupForm {
  id: string
  title: string
  slug: string
  description: string | null
  fields: SignupFieldConfig[]
  status: SignupFormStatus
  max_submissions: number | null
  rate_limit_per_hour: number
  allow_duplicates: boolean
  notify_on_submit: boolean
  notify_smtp_config_id: string | null
  notify_mailing_list_id: string | null
  muted: boolean
  created_at: string
  updated_at: string
}

export interface SignupResponse {
  id: string
  form_id: string
  member_id: string | null
  data: Record<string, unknown>
  ip_hash: string | null
  created_at: string
  updated_at: string
}

// ── Event Type & Calendar Types ─────────────────────────────────────────────

export type EventRecurrence = "none" | "weekly" | "biweekly" | "monthly" | "custom"

export interface EventType {
  id: string
  name: string
  comm_type: string
  color: string
  icon: string
  template_id: string | null
  signup_form_id: string | null
  recurrence: EventRecurrence
  default_time: string | null
  default_duration_minutes: number
  auto_schedule: boolean
  created_at: string
  updated_at: string
}

export interface EventInstance {
  id: string
  event_type_id: string
  date: string
  start_time: string | null
  end_time: string | null
  host_family_id: string | null
  location_override: string | null
  notes: string | null
  is_break: boolean
  break_reason: string | null
  created_at: string
  updated_at: string
}

// ── Host Family Types ───────────────────────────────────────────────────────

export interface HostFamily {
  id: string
  event_type_id: string
  family_id: string
  priority: number
  notes: string | null
  created_at: string
}

export interface HostFamilyWithDetails extends HostFamily {
  family_name: string
  primary_phone: string | null
  address: string | null
}

// ── Address Types ───────────────────────────────────────────────────────────

export interface Address {
  id: string
  family_id: string
  street: string
  city: string
  state: string
  zip: string
  full_address: string
  is_current: boolean
  created_at: string
}

// ── Member/Family Types ─────────────────────────────────────────────────────

export interface Member {
  id: string
  family_id: string
  full_name: string
  first_name: string | null
  last_name: string | null
  gender: string | null
  date_of_birth: string | null
  primary_phone: string | null
  email: string | null
  marital_status: string | null
  anniversary_date: string | null
  tags: string[]
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Family {
  id: string
  family_name: string
  primary_contact_id: string | null
  status: string
  created_at: string
  updated_at: string
}

// ── Type Guards ─────────────────────────────────────────────────────────────

export function isClaimSelectField(
  field: SignupFieldConfig
): field is ClaimSelectField {
  return field.type === "claim_select"
}

export function isMemberLookupField(
  field: SignupFieldConfig
): field is MemberLookupField {
  return field.type === "member_lookup"
}

export function isTextField(field: SignupFieldConfig): field is TextField {
  return field.type === "text"
}

export function isTextAreaField(
  field: SignupFieldConfig
): field is TextAreaField {
  return field.type === "textarea"
}
