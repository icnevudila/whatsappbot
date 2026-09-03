// Supabase semasindan uretilmis tipler.
// Yeniden uretmek icin repo kokunde: npm run db:types
//
// Not: dosya sonundaki Tables / TablesInsert / TablesUpdate yardimcilari
// Supabase'in urettigi cok semali genel surumlerinin sadelestirilmis hali.
// Tek sema (public) kullandigimiz icin davranis ayni.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_events: {
        Row: {
          account_id: string | null
          created_at: string
          detail: Json
          event: string
          id: number
          level: string
          owner_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          detail?: Json
          event: string
          id?: never
          level?: string
          owner_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          detail?: Json
          event?: string
          id?: never
          level?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          connected_at: string | null
          created_at: string
          daily_send_limit: number
          enabled: boolean
          id: string
          is_locked: boolean
          label: string
          last_disconnect_code: number | null
          last_seen_at: string | null
          lock_reason: string | null
          locked_at: string | null
          owner_id: string
          pairing_code: string | null
          pairing_expires_at: string | null
          phone_e164: string | null
          qr_code: string | null
          qr_expires_at: string | null
          schema_version: number
          sent_today: number
          sent_today_on: string | null
          status: string
          status_detail: string | null
          updated_at: string
          wa_jid: string | null
          wa_lid: string | null
          wa_version: string | null
          warmup_started_at: string | null
          new_chat_quota_total: number | null
          new_chat_quota_used: number | null
          new_chat_quota_cycle_end: string | null
          reachout_locked_until: string | null
          reachout_lock_type: string | null
        }
        Insert: {
          connected_at?: string | null
          created_at?: string
          daily_send_limit?: number
          enabled?: boolean
          id?: string
          is_locked?: boolean
          label: string
          last_disconnect_code?: number | null
          last_seen_at?: string | null
          lock_reason?: string | null
          locked_at?: string | null
          owner_id: string
          pairing_code?: string | null
          pairing_expires_at?: string | null
          phone_e164?: string | null
          qr_code?: string | null
          qr_expires_at?: string | null
          schema_version?: number
          sent_today?: number
          sent_today_on?: string | null
          status?: string
          status_detail?: string | null
          updated_at?: string
          wa_jid?: string | null
          wa_lid?: string | null
          wa_version?: string | null
          warmup_started_at?: string | null
          new_chat_quota_total?: number | null
          new_chat_quota_used?: number | null
          new_chat_quota_cycle_end?: string | null
          reachout_locked_until?: string | null
          reachout_lock_type?: string | null
        }
        Update: {
          connected_at?: string | null
          created_at?: string
          daily_send_limit?: number
          enabled?: boolean
          id?: string
          is_locked?: boolean
          label?: string
          last_disconnect_code?: number | null
          last_seen_at?: string | null
          lock_reason?: string | null
          locked_at?: string | null
          owner_id?: string
          pairing_code?: string | null
          pairing_expires_at?: string | null
          phone_e164?: string | null
          qr_code?: string | null
          qr_expires_at?: string | null
          schema_version?: number
          sent_today?: number
          sent_today_on?: string | null
          status?: string
          status_detail?: string | null
          updated_at?: string
          wa_jid?: string | null
          wa_lid?: string | null
          wa_version?: string | null
          warmup_started_at?: string | null
          new_chat_quota_total?: number | null
          new_chat_quota_used?: number | null
          new_chat_quota_cycle_end?: string | null
          reachout_locked_until?: string | null
          reachout_lock_type?: string | null
        }
        Relationships: []
      }
      blacklist: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          phone_e164: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          phone_e164: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          phone_e164?: string
          reason?: string | null
        }
        Relationships: []
      }
      brand_kits: {
        Row: {
          colors: Json
          created_at: string
          fonts: Json
          id: string
          is_default: boolean
          logo_path: string | null
          name: string
          owner_id: string
          tone: string | null
          updated_at: string
        }
        Insert: {
          colors?: Json
          created_at?: string
          fonts?: Json
          id?: string
          is_default?: boolean
          logo_path?: string | null
          name: string
          owner_id: string
          tone?: string | null
          updated_at?: string
        }
        Update: {
          colors?: Json
          created_at?: string
          fonts?: Json
          id?: string
          is_default?: boolean
          logo_path?: string | null
          name?: string
          owner_id?: string
          tone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      campaign_accounts: {
        Row: {
          account_id: string
          campaign_id: string
          owner_id: string
          sent_count: number
        }
        Insert: {
          account_id: string
          campaign_id: string
          owner_id: string
          sent_count?: number
        }
        Update: {
          account_id?: string
          campaign_id?: string
          owner_id?: string
          sent_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_accounts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_targets: {
        Row: {
          account_id: string | null
          attempts: number
          campaign_id: string
          contact_id: string | null
          created_at: string
          error: string | null
          id: number
          owner_id: string
          personalized_body: string | null
          phone_e164: string
          scheduled_for: string | null
          sent_at: string | null
          status: string
          updated_at: string
          wa_message_id: string | null
        }
        Insert: {
          account_id?: string | null
          attempts?: number
          campaign_id: string
          contact_id?: string | null
          created_at?: string
          error?: string | null
          id?: never
          owner_id: string
          personalized_body?: string | null
          phone_e164: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          wa_message_id?: string | null
        }
        Update: {
          account_id?: string | null
          attempts?: number
          campaign_id?: string
          contact_id?: string | null
          created_at?: string
          error?: string | null
          id?: never
          owner_id?: string
          personalized_body?: string | null
          phone_e164?: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_targets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_targets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_targets_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          body: string | null
          completed_at: string | null
          created_at: string
          creative_id: string | null
          daily_cap_per_account: number
          failed_count: number
          id: string
          max_delay_seconds: number
          media_mime: string | null
          media_url: string | null
          message_type: string
          min_delay_seconds: number
          name: string
          owner_id: string
          paused_at: string | null
          scheduled_at: string | null
          sent_count: number
          skipped_count: number
          source_list_ids: string[]
          started_at: string | null
          status: string
          stop_reason: string | null
          total_targets: number
          updated_at: string
        }
        Insert: {
          body?: string | null
          completed_at?: string | null
          created_at?: string
          creative_id?: string | null
          daily_cap_per_account?: number
          failed_count?: number
          id?: string
          max_delay_seconds?: number
          media_mime?: string | null
          media_url?: string | null
          message_type?: string
          min_delay_seconds?: number
          name: string
          owner_id: string
          paused_at?: string | null
          scheduled_at?: string | null
          sent_count?: number
          skipped_count?: number
          source_list_ids?: string[]
          started_at?: string | null
          status?: string
          stop_reason?: string | null
          total_targets?: number
          updated_at?: string
        }
        Update: {
          body?: string | null
          completed_at?: string | null
          created_at?: string
          creative_id?: string | null
          daily_cap_per_account?: number
          failed_count?: number
          id?: string
          max_delay_seconds?: number
          media_mime?: string | null
          media_url?: string | null
          message_type?: string
          min_delay_seconds?: number
          name?: string
          owner_id?: string
          paused_at?: string | null
          scheduled_at?: string | null
          sent_count?: number
          skipped_count?: number
          source_list_ids?: string[]
          started_at?: string | null
          status?: string
          stop_reason?: string | null
          total_targets?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "creatives"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_list_members: {
        Row: {
          added_at: string
          contact_id: string
          list_id: string
          owner_id: string
        }
        Insert: {
          added_at?: string
          contact_id: string
          list_id: string
          owner_id: string
        }
        Update: {
          added_at?: string
          contact_id?: string
          list_id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_list_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_list_members_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "contact_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_lists: {
        Row: {
          contact_count: number
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          source: string
          updated_at: string
        }
        Insert: {
          contact_count?: number
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          source?: string
          updated_at?: string
        }
        Update: {
          contact_count?: number
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          created_at: string
          extra: Json
          id: string
          name: string | null
          owner_id: string
          phone_e164: string
          source: string
          updated_at: string
          wa_checked_at: string | null
          wa_jid: string | null
          wa_status: string
        }
        Insert: {
          created_at?: string
          extra?: Json
          id?: string
          name?: string | null
          owner_id: string
          phone_e164: string
          source?: string
          updated_at?: string
          wa_checked_at?: string | null
          wa_jid?: string | null
          wa_status?: string
        }
        Update: {
          created_at?: string
          extra?: Json
          id?: string
          name?: string | null
          owner_id?: string
          phone_e164?: string
          source?: string
          updated_at?: string
          wa_checked_at?: string | null
          wa_jid?: string | null
          wa_status?: string
        }
        Relationships: []
      }
      creatives: {
        Row: {
          brand_kit_id: string | null
          created_at: string
          error: string | null
          format: string
          height: number | null
          id: string
          owner_id: string
          payload: Json
          public_url: string | null
          status: string
          storage_path: string | null
          template: string
          updated_at: string
          width: number | null
        }
        Insert: {
          brand_kit_id?: string | null
          created_at?: string
          error?: string | null
          format?: string
          height?: number | null
          id?: string
          owner_id: string
          payload?: Json
          public_url?: string | null
          status?: string
          storage_path?: string | null
          template?: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          brand_kit_id?: string | null
          created_at?: string
          error?: string | null
          format?: string
          height?: number | null
          id?: string
          owner_id?: string
          payload?: Json
          public_url?: string | null
          status?: string
          storage_path?: string | null
          template?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creatives_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          account_id: string | null
          attempts: number
          campaign_id: string | null
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          error: string | null
          finished_at: string | null
          id: number
          max_attempts: number
          owner_id: string | null
          payload: Json
          priority: number
          result: Json | null
          run_after: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          attempts?: number
          campaign_id?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: never
          max_attempts?: number
          owner_id?: string | null
          payload?: Json
          priority?: number
          result?: Json | null
          run_after?: string
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          attempts?: number
          campaign_id?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: never
          max_attempts?: number
          owner_id?: string | null
          payload?: Json
          priority?: number
          result?: Json | null
          run_after?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      message_log: {
        Row: {
          account_id: string | null
          body: string | null
          campaign_id: string | null
          created_at: string
          direction: string
          error: string | null
          id: number
          media_url: string | null
          message_type: string
          owner_id: string
          phone_e164: string | null
          remote_jid: string | null
          status: string
          wa_message_id: string | null
        }
        Insert: {
          account_id?: string | null
          body?: string | null
          campaign_id?: string | null
          created_at?: string
          direction?: string
          error?: string | null
          id?: never
          media_url?: string | null
          message_type?: string
          owner_id: string
          phone_e164?: string | null
          remote_jid?: string | null
          status?: string
          wa_message_id?: string | null
        }
        Update: {
          account_id?: string | null
          body?: string | null
          campaign_id?: string | null
          created_at?: string
          direction?: string
          error?: string | null
          id?: never
          media_url?: string | null
          message_type?: string
          owner_id?: string
          phone_e164?: string | null
          remote_jid?: string | null
          status?: string
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_log_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_log_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accounts_quota: number
          company: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          monthly_message_quota: number
          onboarded_at: string | null
          onboarding_step: string
          plan: string
          updated_at: string
        }
        Insert: {
          accounts_quota?: number
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          monthly_message_quota?: number
          onboarded_at?: string | null
          onboarding_step?: string
          plan?: string
          updated_at?: string
        }
        Update: {
          accounts_quota?: number
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          monthly_message_quota?: number
          onboarded_at?: string | null
          onboarding_step?: string
          plan?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicTables = Database["public"]["Tables"]

export type Tables<T extends keyof PublicTables> = PublicTables[T]["Row"]
export type TablesInsert<T extends keyof PublicTables> = PublicTables[T]["Insert"]
export type TablesUpdate<T extends keyof PublicTables> = PublicTables[T]["Update"]
