// ── Enums ────────────────────────────────────────────────────────────────────

export type FamilyRole = 'husband' | 'wife' | 'child'
export type EventInstanceStatus = 'draft' | 'confirmed' | 'cancelled'
export type DispatchStatus =
  | 'pending'
  | 'previewed'
  | 'approved'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'cancelled'
export type RecipientType = 'to' | 'cc' | 'bcc'
export type DeliveryStatus = 'pending' | 'sent' | 'bounced' | 'failed'
export type UserRole = 'super_admin' | 'admin' | 'operator'

export type JsonColorScheme = {
  primary: string
  secondary: string
  accent: string
}

// ── Row types ────────────────────────────────────────────────────────────────

export type Family = {
  id: string
  family_name: string
  home_phone: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Address = {
  id: string
  family_id: string
  street: string | null
  city: string | null
  state: string | null
  zip: string | null
  full_address: string | null
  is_current: boolean
  created_at: string
}

export type Member = {
  id: string
  family_id: string
  first_name: string
  last_name: string
  full_name: string
  role_in_family: FamilyRole
  cell_phone: string | null
  email: string | null
  birth_month: number | null
  birth_day: number | null
  birth_year: number | null
  is_active: boolean
  is_newcomer: boolean
  newcomer_acknowledged: boolean
  newcomer_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type WeddingAnniversary = {
  id: string
  family_id: string
  husband_member_id: string
  wife_member_id: string
  anniversary_month: number
  anniversary_day: number
  anniversary_year: number | null
  created_at: string
}

export type EventType = {
  id: string
  name: string
  color_scheme: JsonColorScheme | null
  icon: string | null
  default_template_id: string | null
  created_at: string
}

export type Event = {
  id: string
  event_type_id: string
  title: string
  description: string | null
  recurrence_rule: string | null
  default_time: string | null
  zoom_link: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type EventInstance = {
  id: string
  event_id: string
  instance_date: string
  instance_time: string | null
  host_family_id: string | null
  location_override: string | null
  notes: string | null
  status: EventInstanceStatus
  created_at: string
  updated_at: string
}

export type EmailTemplate = {
  id: string
  name: string
  event_type_id: string | null
  subject_template: string
  body_template: string
  signature_template: string | null
  header_image_url: string | null
  is_default: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export type SmtpConfig = {
  id: string
  name: string
  host: string
  port: number
  username: string
  encrypted_password: string
  from_name: string
  from_email: string
  is_admin_only: boolean
  created_by: string | null
  is_active: boolean
  created_at: string
}

export type MailingList = {
  id: string
  name: string
  description: string | null
  google_group_email: string | null
  created_at: string
  updated_at: string
}

export type MailingListMember = {
  id: string
  mailing_list_id: string
  member_id: string | null
  external_email: string | null
  recipient_type: RecipientType
  created_at: string
}

export type DispatchQueue = {
  id: string
  event_instance_id: string | null
  email_template_id: string
  smtp_config_id: string
  mailing_list_id: string
  subject: string
  body_html: string
  scheduled_at: string | null
  status: DispatchStatus
  created_by: string
  approved_by: string | null
  sent_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export type DispatchRecipient = {
  id: string
  dispatch_id: string
  email: string
  name: string | null
  recipient_type: RecipientType
  delivery_status: DeliveryStatus
}

export type DispatchHistory = {
  id: string
  dispatch_id: string
  full_snapshot: Record<string, unknown>
  sent_at: string
}

export type AppUser = {
  id: string
  email: string
  display_name: string | null
  role: UserRole
  is_active: boolean
  permissions: Record<string, boolean>
  allowed_smtp_configs: string[]
  created_by: string | null
  created_at: string
  last_login: string | null
}

export type AuditLog = {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  changes: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export type Tag = {
  id: string
  name: string
  color: string
  created_at: string
}

export type MemberTag = {
  id: string
  member_id: string
  tag_id: string
  created_at: string
}

// ── Insert types (omit server-generated fields) ─────────────────────────────

export type FamilyInsert = Omit<Family, 'id' | 'created_at' | 'updated_at'>
export type AddressInsert = Omit<Address, 'id' | 'created_at'>
export type MemberInsert = Omit<Member, 'id' | 'created_at' | 'updated_at'>
export type WeddingAnniversaryInsert = Omit<WeddingAnniversary, 'id' | 'created_at'>
export type EventTypeInsert = Omit<EventType, 'id' | 'created_at'>
export type EventInsert = Omit<Event, 'id' | 'created_at' | 'updated_at'>
export type EventInstanceInsert = Omit<EventInstance, 'id' | 'created_at' | 'updated_at'>
export type EmailTemplateInsert = Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>
export type SmtpConfigInsert = Omit<SmtpConfig, 'id' | 'created_at'>
export type MailingListInsert = Omit<MailingList, 'id' | 'created_at' | 'updated_at'>
export type MailingListMemberInsert = Omit<MailingListMember, 'id' | 'created_at'>
export type DispatchQueueInsert = Omit<DispatchQueue, 'id' | 'created_at' | 'updated_at'>
export type DispatchRecipientInsert = Omit<DispatchRecipient, 'id'>
export type DispatchHistoryInsert = Omit<DispatchHistory, 'id'>
export type AppUserInsert = Omit<AppUser, 'id' | 'created_at'>
export type AuditLogInsert = Omit<AuditLog, 'id' | 'created_at'>

// ── Update types (all fields optional) ──────────────────────────────────────

export type FamilyUpdate = Partial<FamilyInsert>
export type AddressUpdate = Partial<AddressInsert>
export type MemberUpdate = Partial<MemberInsert>
export type WeddingAnniversaryUpdate = Partial<WeddingAnniversaryInsert>
export type EventTypeUpdate = Partial<EventTypeInsert>
export type EventUpdate = Partial<EventInsert>
export type EventInstanceUpdate = Partial<EventInstanceInsert>
export type EmailTemplateUpdate = Partial<EmailTemplateInsert>
export type SmtpConfigUpdate = Partial<SmtpConfigInsert>
export type MailingListUpdate = Partial<MailingListInsert>
export type MailingListMemberUpdate = Partial<MailingListMemberInsert>
export type DispatchQueueUpdate = Partial<DispatchQueueInsert>
export type DispatchRecipientUpdate = Partial<DispatchRecipientInsert>
export type DispatchHistoryUpdate = Partial<DispatchHistoryInsert>
export type AppUserUpdate = Partial<AppUserInsert>
export type AuditLogUpdate = Partial<AuditLogInsert>

// ── Database type for Supabase client generic ───────────────────────────────

export type Database = {
  public: {
    Tables: {
      families: {
        Row: Family
        Insert: FamilyInsert
        Update: FamilyUpdate
      }
      addresses: {
        Row: Address
        Insert: AddressInsert
        Update: AddressUpdate
      }
      members: {
        Row: Member
        Insert: MemberInsert
        Update: MemberUpdate
      }
      wedding_anniversaries: {
        Row: WeddingAnniversary
        Insert: WeddingAnniversaryInsert
        Update: WeddingAnniversaryUpdate
      }
      event_types: {
        Row: EventType
        Insert: EventTypeInsert
        Update: EventTypeUpdate
      }
      events: {
        Row: Event
        Insert: EventInsert
        Update: EventUpdate
      }
      event_instances: {
        Row: EventInstance
        Insert: EventInstanceInsert
        Update: EventInstanceUpdate
      }
      email_templates: {
        Row: EmailTemplate
        Insert: EmailTemplateInsert
        Update: EmailTemplateUpdate
      }
      smtp_configs: {
        Row: SmtpConfig
        Insert: SmtpConfigInsert
        Update: SmtpConfigUpdate
      }
      mailing_lists: {
        Row: MailingList
        Insert: MailingListInsert
        Update: MailingListUpdate
      }
      mailing_list_members: {
        Row: MailingListMember
        Insert: MailingListMemberInsert
        Update: MailingListMemberUpdate
      }
      dispatch_queue: {
        Row: DispatchQueue
        Insert: DispatchQueueInsert
        Update: DispatchQueueUpdate
      }
      dispatch_recipients: {
        Row: DispatchRecipient
        Insert: DispatchRecipientInsert
        Update: DispatchRecipientUpdate
      }
      dispatch_history: {
        Row: DispatchHistory
        Insert: DispatchHistoryInsert
        Update: DispatchHistoryUpdate
      }
      app_users: {
        Row: AppUser
        Insert: AppUserInsert
        Update: AppUserUpdate
      }
      audit_log: {
        Row: AuditLog
        Insert: AuditLogInsert
        Update: AuditLogUpdate
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      family_role: FamilyRole
      event_instance_status: EventInstanceStatus
      dispatch_status: DispatchStatus
      recipient_type: RecipientType
      delivery_status: DeliveryStatus
      user_role: UserRole
    }
    CompositeTypes: Record<string, never>
  }
}
