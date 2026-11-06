/**
 * Component Prop Types
 *
 * Shared prop interfaces for React components.
 * Extract common patterns to reduce duplication.
 */

import type { ReactNode } from "react"
import type { EventType, EventInstance, SignupForm, Member, Family } from "./forms"
import type { TemplateStyleSettings } from "./cards"

// ── Common Component Props ──────────────────────────────────────────────────

export interface BaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export interface BaseSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export interface BaseFormProps {
  onSubmit: () => void
  onCancel?: () => void
}

// ── Calendar Component Props ────────────────────────────────────────────────
// Note: Calendar components use CalendarEvent type from @/components/calendar/types
// which is a union of event instances, birthdays, anniversaries, and dispatches

export interface WeekViewProps {
  days: Date[]
  events: Array<{
    id: string
    date: Date
    color: string
    title: string
    kind: "event" | "birthday" | "anniversary" | "dispatch"
    [key: string]: unknown
  }>
  onEventClick: (event: unknown) => void
  onDayClick?: (day: Date) => void
}

export interface EventDetailDialogProps extends BaseDialogProps {
  event: EventInstance | null
  eventType?: EventType
  onEdit?: () => void
  onDelete?: () => void
}

export interface EventFormDialogProps extends BaseDialogProps {
  eventTypeId: string
  date?: Date
  existingEvent?: EventInstance
  onSuccess?: () => void
}

export interface InstanceEditDialogProps extends BaseDialogProps {
  instance: EventInstance
  eventType: EventType
  onSuccess?: () => void
}

// ── Template Component Props ────────────────────────────────────────────────

export interface TemplateGridProps {
  templates: Array<{
    id: string
    name: string
    type: string
    subject_template: string
  }>
  onSelect?: (templateId: string) => void
  onEdit?: (templateId: string) => void
  onDelete?: (templateId: string) => void
}

export interface TemplateStyleEditorProps {
  settings: TemplateStyleSettings
  onChange: (settings: TemplateStyleSettings) => void
}

export interface TemplateFormBaseProps {
  templateId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

// ── Signup Component Props ──────────────────────────────────────────────────

export interface SignupFormListProps {
  forms: SignupForm[]
  onSelect?: (formId: string) => void
  onEdit?: (formId: string) => void
  onDelete?: (formId: string) => void
}

export interface SignupResponseListProps {
  formId: string
  responses: Array<{
    id: string
    member_id: string | null
    data: Record<string, unknown>
    created_at: string
  }>
  onEdit?: (responseId: string) => void
  onRemove?: (responseId: string) => void
}

export interface HostAssignmentSheetProps extends BaseSheetProps {
  formId: string
  responses: Array<{
    id: string
    data: Record<string, unknown>
  }>
  onAssignmentsSaved?: () => void
}

// ── Member/Family Component Props ───────────────────────────────────────────

export interface MemberListProps {
  members: Member[]
  onSelect?: (memberId: string) => void
  onEdit?: (memberId: string) => void
  selectedIds?: string[]
}

export interface FamilyListProps {
  families: Family[]
  onSelect?: (familyId: string) => void
  onEdit?: (familyId: string) => void
}

export interface MemberLookupProps {
  value: string
  onChange: (value: string, memberId?: string) => void
  placeholder?: string
  required?: boolean
}

// ── Settings Component Props ────────────────────────────────────────────────

export interface UserManagementProps {
  users: Array<{
    id: string
    email: string
    display_name: string | null
    role: string
    is_active: boolean
  }>
  onInvite?: () => void
  onEdit?: (userId: string) => void
  onDelete?: (userId: string) => void
}

export interface SmtpConfigListProps {
  configs: Array<{
    id: string
    name: string
    host: string
    port: number
    from_email: string
  }>
  onAdd?: () => void
  onEdit?: (configId: string) => void
  onTest?: (configId: string) => void
  onDelete?: (configId: string) => void
}

export interface ActivityLogProps {
  entries: Array<{
    id: string
    action: string
    entity_type: string
    user_id: string | null
    created_at: string
    changes: Record<string, unknown> | null
  }>
  onLoadMore?: () => void
  hasMore?: boolean
}

// ── Dashboard Component Props ───────────────────────────────────────────────

export interface DashboardCardProps {
  title: string
  subtitle?: string
  icon?: ReactNode
  children: ReactNode
  actions?: ReactNode
}

export interface StatTileProps {
  label: string
  value: string | number
  icon?: ReactNode
  trend?: {
    value: number
    direction: "up" | "down"
  }
}

// ── Shared UI Component Props ───────────────────────────────────────────────

export interface IconPickerProps {
  value: string
  onChange: (icon: string) => void
  size?: "sm" | "md" | "lg"
}

export interface VerseLookupProps {
  onSelect: (reference: string, text: string) => void
  initialReference?: string
}

export interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

// ── Loading States ──────────────────────────────────────────────────────────

export interface LoadingState {
  isLoading: boolean
  error?: string | null
}

export interface PaginationState {
  page: number
  pageSize: number
  total: number
}
