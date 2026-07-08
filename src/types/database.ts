export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string
          created_at: string
          family_id: string
          full_address: string
          id: string
          is_current: boolean
          state: string
          street: string
          zip: string
        }
        Insert: {
          city: string
          created_at?: string
          family_id: string
          full_address: string
          id?: string
          is_current?: boolean
          state: string
          street: string
          zip: string
        }
        Update: {
          city?: string
          created_at?: string
          family_id?: string
          full_address?: string
          id?: string
          is_current?: boolean
          state?: string
          street?: string
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      app_users: {
        Row: {
          allowed_smtp_configs: string[]
          created_at: string
          created_by: string | null
          display_name: string | null
          email: string
          id: string
          is_active: boolean
          last_login: string | null
          permissions: Json
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          allowed_smtp_configs?: string[]
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          email: string
          id: string
          is_active?: boolean
          last_login?: string | null
          permissions?: Json
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          allowed_smtp_configs?: string[]
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          email?: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          permissions?: Json
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bulletin_items: {
        Row: {
          created_at: string
          details: string | null
          id: string
          is_active: boolean
          is_recurring: boolean
          sort_order: number
          title: string
          week_start: string | null
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          sort_order?: number
          title: string
          week_start?: string | null
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          sort_order?: number
          title?: string
          week_start?: string | null
        }
        Relationships: []
      }
      composed_instances: {
        Row: {
          additional_recipients: string | null
          created_at: string
          created_by: string | null
          form_data: Json
          id: string
          is_active: boolean
          is_recurring: boolean
          mailing_list_id: string | null
          name: string
          recur_until: string | null
          smtp_config_id: string | null
          style_overrides: Json | null
          subject: string
          template_type: string
          updated_at: string
          week_start: string | null
        }
        Insert: {
          additional_recipients?: string | null
          created_at?: string
          created_by?: string | null
          form_data: Json
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          mailing_list_id?: string | null
          name: string
          recur_until?: string | null
          smtp_config_id?: string | null
          style_overrides?: Json | null
          subject: string
          template_type: string
          updated_at?: string
          week_start?: string | null
        }
        Update: {
          additional_recipients?: string | null
          created_at?: string
          created_by?: string | null
          form_data?: Json
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          mailing_list_id?: string | null
          name?: string
          recur_until?: string | null
          smtp_config_id?: string | null
          style_overrides?: Json | null
          subject?: string
          template_type?: string
          updated_at?: string
          week_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "composed_instances_mailing_list_id_fkey"
            columns: ["mailing_list_id"]
            isOneToOne: false
            referencedRelation: "mailing_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "composed_instances_smtp_config_id_fkey"
            columns: ["smtp_config_id"]
            isOneToOne: false
            referencedRelation: "smtp_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_history: {
        Row: {
          dispatch_id: string
          full_snapshot: Json
          id: string
          sent_at: string
        }
        Insert: {
          dispatch_id: string
          full_snapshot: Json
          id?: string
          sent_at?: string
        }
        Update: {
          dispatch_id?: string
          full_snapshot?: Json
          id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_history_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_queue: {
        Row: {
          additional_recipients: string | null
          approved_by: string | null
          body_html: string
          created_at: string
          created_by: string | null
          email_template_id: string | null
          error_message: string | null
          event_instance_id: string | null
          id: string
          mailing_list_id: string | null
          scheduled_at: string
          sent_at: string | null
          smtp_config_id: string | null
          status: Database["public"]["Enums"]["dispatch_status"]
          subject: string
          template_type: string | null
          updated_at: string
          week_start: string | null
        }
        Insert: {
          additional_recipients?: string | null
          approved_by?: string | null
          body_html: string
          created_at?: string
          created_by?: string | null
          email_template_id?: string | null
          error_message?: string | null
          event_instance_id?: string | null
          id?: string
          mailing_list_id?: string | null
          scheduled_at: string
          sent_at?: string | null
          smtp_config_id?: string | null
          status?: Database["public"]["Enums"]["dispatch_status"]
          subject: string
          template_type?: string | null
          updated_at?: string
          week_start?: string | null
        }
        Update: {
          additional_recipients?: string | null
          approved_by?: string | null
          body_html?: string
          created_at?: string
          created_by?: string | null
          email_template_id?: string | null
          error_message?: string | null
          event_instance_id?: string | null
          id?: string
          mailing_list_id?: string | null
          scheduled_at?: string
          sent_at?: string | null
          smtp_config_id?: string | null
          status?: Database["public"]["Enums"]["dispatch_status"]
          subject?: string
          template_type?: string | null
          updated_at?: string
          week_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_queue_email_template_id_fkey"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_queue_event_instance_id_fkey"
            columns: ["event_instance_id"]
            isOneToOne: false
            referencedRelation: "event_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_queue_mailing_list_id_fkey"
            columns: ["mailing_list_id"]
            isOneToOne: false
            referencedRelation: "mailing_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_queue_smtp_config_id_fkey"
            columns: ["smtp_config_id"]
            isOneToOne: false
            referencedRelation: "smtp_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_recipients: {
        Row: {
          delivery_status: Database["public"]["Enums"]["delivery_status"]
          dispatch_id: string
          email: string
          id: string
          name: string | null
          recipient_type: Database["public"]["Enums"]["recipient_type"]
        }
        Insert: {
          delivery_status?: Database["public"]["Enums"]["delivery_status"]
          dispatch_id: string
          email: string
          id?: string
          name?: string | null
          recipient_type?: Database["public"]["Enums"]["recipient_type"]
        }
        Update: {
          delivery_status?: Database["public"]["Enums"]["delivery_status"]
          dispatch_id?: string
          email?: string
          id?: string
          name?: string | null
          recipient_type?: Database["public"]["Enums"]["recipient_type"]
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_recipients_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "dispatch_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_template: string
          created_at: string
          created_by: string | null
          event_type_id: string | null
          header_image_url: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          signature_template: string | null
          style_settings: Json | null
          subject_template: string
          updated_at: string
          visual_config: Json | null
        }
        Insert: {
          body_template: string
          created_at?: string
          created_by?: string | null
          event_type_id?: string | null
          header_image_url?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          signature_template?: string | null
          style_settings?: Json | null
          subject_template: string
          updated_at?: string
          visual_config?: Json | null
        }
        Update: {
          body_template?: string
          created_at?: string
          created_by?: string | null
          event_type_id?: string | null
          header_image_url?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          signature_template?: string | null
          style_settings?: Json | null
          subject_template?: string
          updated_at?: string
          visual_config?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "event_types"
            referencedColumns: ["id"]
          },
        ]
      }
      event_breaks: {
        Row: {
          created_at: string
          end_date: string
          event_id: string
          id: string
          location_id: string | null
          message: string | null
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          event_id: string
          id?: string
          location_id?: string | null
          message?: string | null
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          event_id?: string
          id?: string
          location_id?: string | null
          message?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_breaks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_breaks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "event_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_instance_locations: {
        Row: {
          address_override: string | null
          created_at: string
          host_family_id: string | null
          id: string
          instance_id: string
          location_id: string
          notes: string | null
          phone_override: string | null
          status: Database["public"]["Enums"]["event_instance_status"]
        }
        Insert: {
          address_override?: string | null
          created_at?: string
          host_family_id?: string | null
          id?: string
          instance_id: string
          location_id: string
          notes?: string | null
          phone_override?: string | null
          status?: Database["public"]["Enums"]["event_instance_status"]
        }
        Update: {
          address_override?: string | null
          created_at?: string
          host_family_id?: string | null
          id?: string
          instance_id?: string
          location_id?: string
          notes?: string | null
          phone_override?: string | null
          status?: Database["public"]["Enums"]["event_instance_status"]
        }
        Relationships: [
          {
            foreignKeyName: "event_instance_locations_host_family_id_fkey"
            columns: ["host_family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_instance_locations_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "event_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_instance_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "event_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_instances: {
        Row: {
          created_at: string
          event_id: string
          host_family_id: string | null
          id: string
          info_sections: Json | null
          instance_date: string
          instance_end_time: string | null
          instance_time: string | null
          location_override: string | null
          notes: string | null
          signup_response_id: string | null
          status: Database["public"]["Enums"]["event_instance_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          host_family_id?: string | null
          id?: string
          info_sections?: Json | null
          instance_date: string
          instance_end_time?: string | null
          instance_time?: string | null
          location_override?: string | null
          notes?: string | null
          signup_response_id?: string | null
          status?: Database["public"]["Enums"]["event_instance_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          host_family_id?: string | null
          id?: string
          info_sections?: Json | null
          instance_date?: string
          instance_end_time?: string | null
          instance_time?: string | null
          location_override?: string | null
          notes?: string | null
          signup_response_id?: string | null
          status?: Database["public"]["Enums"]["event_instance_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_instances_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_instances_host_family_id_fkey"
            columns: ["host_family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_instances_signup_response_id_fkey"
            columns: ["signup_response_id"]
            isOneToOne: false
            referencedRelation: "signup_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      event_locations: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          event_id: string
          host_family_id: string | null
          host_until: string | null
          id: string
          is_active: boolean
          label: string
          phone: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          event_id: string
          host_family_id?: string | null
          host_until?: string | null
          id?: string
          is_active?: boolean
          label: string
          phone?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          event_id?: string
          host_family_id?: string | null
          host_until?: string | null
          id?: string
          is_active?: boolean
          label?: string
          phone?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_locations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_locations_host_family_id_fkey"
            columns: ["host_family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      event_types: {
        Row: {
          bulletin_detail_template: string | null
          color_scheme: Json | null
          comm_type: string | null
          created_at: string
          default_template_id: string | null
          icon: string | null
          id: string
          info_sections: Json | null
          is_active: boolean
          linked_signup_form_id: string | null
          name: string
          show_info_in_bulletin: boolean | null
          signup_field_map: Json | null
        }
        Insert: {
          bulletin_detail_template?: string | null
          color_scheme?: Json | null
          comm_type?: string | null
          created_at?: string
          default_template_id?: string | null
          icon?: string | null
          id?: string
          info_sections?: Json | null
          is_active?: boolean
          linked_signup_form_id?: string | null
          name: string
          show_info_in_bulletin?: boolean | null
          signup_field_map?: Json | null
        }
        Update: {
          bulletin_detail_template?: string | null
          color_scheme?: Json | null
          comm_type?: string | null
          created_at?: string
          default_template_id?: string | null
          icon?: string | null
          id?: string
          info_sections?: Json | null
          is_active?: boolean
          linked_signup_form_id?: string | null
          name?: string
          show_info_in_bulletin?: boolean | null
          signup_field_map?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "event_types_linked_signup_form_id_fkey"
            columns: ["linked_signup_form_id"]
            isOneToOne: false
            referencedRelation: "signup_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_event_types_default_template"
            columns: ["default_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      event_virtual_config: {
        Row: {
          created_at: string
          event_id: string
          id: string
          is_active: boolean
          meeting_id: string | null
          meeting_link: string
          passcode: string | null
          platform: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          is_active?: boolean
          meeting_id?: string | null
          meeting_link: string
          passcode?: string | null
          platform?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          is_active?: boolean
          meeting_id?: string | null
          meeting_link?: string
          passcode?: string | null
          platform?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_virtual_config_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          default_end_time: string | null
          default_time: string | null
          description: string | null
          dinner_note: string | null
          end_date: string | null
          event_type_id: string
          host_family_id: string | null
          host_until: string | null
          id: string
          is_active: boolean
          promote_from: string | null
          recurrence_rule: string | null
          show_break_in_bulletin: boolean
          signup_link: string | null
          start_date: string | null
          title: string
          topic: string | null
          updated_at: string
          zoom_link: string | null
        }
        Insert: {
          created_at?: string
          default_end_time?: string | null
          default_time?: string | null
          description?: string | null
          dinner_note?: string | null
          end_date?: string | null
          event_type_id: string
          host_family_id?: string | null
          host_until?: string | null
          id?: string
          is_active?: boolean
          promote_from?: string | null
          recurrence_rule?: string | null
          show_break_in_bulletin?: boolean
          signup_link?: string | null
          start_date?: string | null
          title: string
          topic?: string | null
          updated_at?: string
          zoom_link?: string | null
        }
        Update: {
          created_at?: string
          default_end_time?: string | null
          default_time?: string | null
          description?: string | null
          dinner_note?: string | null
          end_date?: string | null
          event_type_id?: string
          host_family_id?: string | null
          host_until?: string | null
          id?: string
          is_active?: boolean
          promote_from?: string | null
          recurrence_rule?: string | null
          show_break_in_bulletin?: boolean
          signup_link?: string | null
          start_date?: string | null
          title?: string
          topic?: string | null
          updated_at?: string
          zoom_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "event_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_host_family_id_fkey"
            columns: ["host_family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          family_name: string
          home_phone: string | null
          id: string
          is_active: boolean
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          family_name: string
          home_phone?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          family_name?: string
          home_phone?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      mailing_list_members: {
        Row: {
          created_at: string
          external_email: string | null
          id: string
          mailing_list_id: string
          member_id: string | null
          recipient_type: Database["public"]["Enums"]["recipient_type"]
        }
        Insert: {
          created_at?: string
          external_email?: string | null
          id?: string
          mailing_list_id: string
          member_id?: string | null
          recipient_type?: Database["public"]["Enums"]["recipient_type"]
        }
        Update: {
          created_at?: string
          external_email?: string | null
          id?: string
          mailing_list_id?: string
          member_id?: string | null
          recipient_type?: Database["public"]["Enums"]["recipient_type"]
        }
        Relationships: [
          {
            foreignKeyName: "mailing_list_members_mailing_list_id_fkey"
            columns: ["mailing_list_id"]
            isOneToOne: false
            referencedRelation: "mailing_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mailing_list_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      mailing_lists: {
        Row: {
          created_at: string
          description: string | null
          google_group_email: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          google_group_email?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          google_group_email?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      member_tags: {
        Row: {
          created_at: string
          id: string
          member_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_tags_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          birth_day: number | null
          birth_month: number | null
          birth_year: number | null
          cell_phone: string | null
          created_at: string
          email: string | null
          family_id: string
          first_name: string
          full_name: string
          id: string
          is_active: boolean
          is_newcomer: boolean
          last_name: string
          newcomer_acknowledged: boolean
          newcomer_date: string | null
          notes: string | null
          role_in_family: Database["public"]["Enums"]["family_role"]
          updated_at: string
        }
        Insert: {
          birth_day?: number | null
          birth_month?: number | null
          birth_year?: number | null
          cell_phone?: string | null
          created_at?: string
          email?: string | null
          family_id: string
          first_name: string
          full_name: string
          id?: string
          is_active?: boolean
          is_newcomer?: boolean
          last_name: string
          newcomer_acknowledged?: boolean
          newcomer_date?: string | null
          notes?: string | null
          role_in_family: Database["public"]["Enums"]["family_role"]
          updated_at?: string
        }
        Update: {
          birth_day?: number | null
          birth_month?: number | null
          birth_year?: number | null
          cell_phone?: string | null
          created_at?: string
          email?: string | null
          family_id?: string
          first_name?: string
          full_name?: string
          id?: string
          is_active?: boolean
          is_newcomer?: boolean
          last_name?: string
          newcomer_acknowledged?: boolean
          newcomer_date?: string | null
          notes?: string | null
          role_in_family?: Database["public"]["Enums"]["family_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_forms: {
        Row: {
          allow_count_selection: boolean
          allow_duplicates: boolean
          auto_close_date: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_type: string
          end_date: string | null
          event_date: string | null
          event_id: string | null
          event_type_id: string | null
          fields: Json
          hidden_custom_items: Json | null
          id: string
          mailing_list_id: string | null
          max_submissions: number | null
          member_autocomplete: boolean
          muted: boolean
          notify_mailing_list_id: string | null
          notify_on_submit: boolean
          notify_smtp_config_id: string | null
          rate_limit_per_hour: number | null
          show_responses: boolean
          slug: string
          start_date: string | null
          status: string
          target_month: number | null
          target_year: number | null
          theme: Json
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          allow_count_selection?: boolean
          allow_duplicates?: boolean
          auto_close_date?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_type?: string
          end_date?: string | null
          event_date?: string | null
          event_id?: string | null
          event_type_id?: string | null
          fields?: Json
          hidden_custom_items?: Json | null
          id?: string
          mailing_list_id?: string | null
          max_submissions?: number | null
          member_autocomplete?: boolean
          muted?: boolean
          notify_mailing_list_id?: string | null
          notify_on_submit?: boolean
          notify_smtp_config_id?: string | null
          rate_limit_per_hour?: number | null
          show_responses?: boolean
          slug: string
          start_date?: string | null
          status?: string
          target_month?: number | null
          target_year?: number | null
          theme?: Json
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          allow_count_selection?: boolean
          allow_duplicates?: boolean
          auto_close_date?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_type?: string
          end_date?: string | null
          event_date?: string | null
          event_id?: string | null
          event_type_id?: string | null
          fields?: Json
          hidden_custom_items?: Json | null
          id?: string
          mailing_list_id?: string | null
          max_submissions?: number | null
          member_autocomplete?: boolean
          muted?: boolean
          notify_mailing_list_id?: string | null
          notify_on_submit?: boolean
          notify_smtp_config_id?: string | null
          rate_limit_per_hour?: number | null
          show_responses?: boolean
          slug?: string
          start_date?: string | null
          status?: string
          target_month?: number | null
          target_year?: number | null
          theme?: Json
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "signup_forms_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_forms_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "event_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_forms_mailing_list_id_fkey"
            columns: ["mailing_list_id"]
            isOneToOne: false
            referencedRelation: "mailing_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_forms_notify_mailing_list_id_fkey"
            columns: ["notify_mailing_list_id"]
            isOneToOne: false
            referencedRelation: "mailing_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_forms_notify_smtp_config_id_fkey"
            columns: ["notify_smtp_config_id"]
            isOneToOne: false
            referencedRelation: "smtp_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_rate_limits: {
        Row: {
          attempt_at: string
          form_id: string
          id: string
          ip_hash: string
        }
        Insert: {
          attempt_at?: string
          form_id: string
          id?: string
          ip_hash: string
        }
        Update: {
          attempt_at?: string
          form_id?: string
          id?: string
          ip_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "signup_rate_limits_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "signup_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_remove_attempts: {
        Row: {
          attempted_at: string
          form_id: string
          id: string
          ip_hash: string
          success: boolean
        }
        Insert: {
          attempted_at?: string
          form_id: string
          id?: string
          ip_hash: string
          success?: boolean
        }
        Update: {
          attempted_at?: string
          form_id?: string
          id?: string
          ip_hash?: string
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "signup_remove_attempts_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "signup_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_responses: {
        Row: {
          assigned_at: string | null
          assigned_event_id: string | null
          created_at: string
          data: Json
          form_id: string
          id: string
          ip_hash: string | null
          member_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_event_id?: string | null
          created_at?: string
          data: Json
          form_id: string
          id?: string
          ip_hash?: string | null
          member_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_event_id?: string | null
          created_at?: string
          data?: Json
          form_id?: string
          id?: string
          ip_hash?: string | null
          member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signup_responses_assigned_event_id_fkey"
            columns: ["assigned_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "signup_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_responses_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      smtp_configs: {
        Row: {
          created_at: string
          created_by: string | null
          encrypted_password: string
          from_email: string
          from_name: string
          host: string
          id: string
          is_active: boolean
          is_admin_only: boolean
          name: string
          port: number
          username: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          encrypted_password: string
          from_email: string
          from_name: string
          host: string
          id?: string
          is_active?: boolean
          is_admin_only?: boolean
          name: string
          port: number
          username: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          encrypted_password?: string
          from_email?: string
          from_name?: string
          host?: string
          id?: string
          is_active?: boolean
          is_admin_only?: boolean
          name?: string
          port?: number
          username?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      wedding_anniversaries: {
        Row: {
          anniversary_day: number
          anniversary_month: number
          anniversary_year: number | null
          created_at: string
          family_id: string
          husband_member_id: string
          id: string
          wife_member_id: string
        }
        Insert: {
          anniversary_day: number
          anniversary_month: number
          anniversary_year?: number | null
          created_at?: string
          family_id: string
          husband_member_id: string
          id?: string
          wife_member_id: string
        }
        Update: {
          anniversary_day?: number
          anniversary_month?: number
          anniversary_year?: number | null
          created_at?: string
          family_id?: string
          husband_member_id?: string
          id?: string
          wife_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_anniversaries_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wedding_anniversaries_husband_member_id_fkey"
            columns: ["husband_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wedding_anniversaries_wife_member_id_fkey"
            columns: ["wife_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_db_size: {
        Args: never
        Returns: {
          size: string
        }[]
      }
      get_table_schema: {
        Args: { p_table_name: string }
        Returns: {
          character_maximum_length: number
          column_default: string
          column_name: string
          data_type: string
          is_nullable: string
        }[]
      }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_week_status: {
        Args: { p_end: string; p_start: string }
        Returns: {
          break_message: string
          event_id: string
          event_title: string
          event_topic: string
          event_type_name: string
          host_address: string
          host_city: string
          host_family_id: string
          host_family_name: string
          host_phone: string
          instance_date: string
          instance_id: string
          instance_status: string
          instance_time: string
          is_on_break: boolean
          location_id: string
          location_label: string
          location_sort: number
        }[]
      }
    }
    Enums: {
      delivery_status: "pending" | "sent" | "bounced" | "failed"
      dispatch_status:
        | "pending"
        | "previewed"
        | "approved"
        | "sending"
        | "sent"
        | "failed"
        | "cancelled"
      event_instance_status: "draft" | "confirmed" | "cancelled"
      family_role: "husband" | "wife" | "child"
      recipient_type: "to" | "cc" | "bcc"
      user_role: "super_admin" | "admin" | "operator"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      delivery_status: ["pending", "sent", "bounced", "failed"],
      dispatch_status: [
        "pending",
        "previewed",
        "approved",
        "sending",
        "sent",
        "failed",
        "cancelled",
      ],
      event_instance_status: ["draft", "confirmed", "cancelled"],
      family_role: ["husband", "wife", "child"],
      recipient_type: ["to", "cc", "bcc"],
      user_role: ["super_admin", "admin", "operator"],
    },
  },
} as const

// Helper type exports for common database row types
export type Address = Database["public"]["Tables"]["addresses"]["Row"]
export type AppUser = Database["public"]["Tables"]["app_users"]["Row"]
export type AuditLog = Database["public"]["Tables"]["audit_log"]["Row"]
export type ComposedInstance = Database["public"]["Tables"]["composed_instances"]["Row"]
export type DispatchQueue = Database["public"]["Tables"]["dispatch_queue"]["Row"]
export type EmailTemplate = Database["public"]["Tables"]["email_templates"]["Row"]
export type Event = Database["public"]["Tables"]["events"]["Row"]
export type EventInstance = Database["public"]["Tables"]["event_instances"]["Row"]
export type EventType = Database["public"]["Tables"]["event_types"]["Row"]
export type Family = Database["public"]["Tables"]["families"]["Row"]
export type FamilyInsert = Database["public"]["Tables"]["families"]["Insert"]
export type MailingList = Database["public"]["Tables"]["mailing_lists"]["Row"]
export type Member = Database["public"]["Tables"]["members"]["Row"]
export type MemberInsert = Database["public"]["Tables"]["members"]["Insert"]
export type SignupForm = Database["public"]["Tables"]["signup_forms"]["Row"]
export type SignupResponse = Database["public"]["Tables"]["signup_responses"]["Row"]
export type SmtpConfig = Database["public"]["Tables"]["smtp_configs"]["Row"]
export type Tag = Database["public"]["Tables"]["tags"]["Row"]
export type WeddingAnniversary = Database["public"]["Tables"]["wedding_anniversaries"]["Row"]

// Enum exports
export type DeliveryStatus = Database["public"]["Enums"]["delivery_status"]
export type DispatchStatus = Database["public"]["Enums"]["dispatch_status"]
export type EventInstanceStatus = Database["public"]["Enums"]["event_instance_status"]
export type FamilyRole = Database["public"]["Enums"]["family_role"]
export type RecipientType = Database["public"]["Enums"]["recipient_type"]
export type UserRole = Database["public"]["Enums"]["user_role"]
