export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type Timestamp = string

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          updated_at?: Timestamp
          username: string
          full_name: string
          avatar_url?: string
          website?: string
          media_provider?: 'local' | 'supabase' | 'drive' | 'r2' | null
        }
        Insert: {
          id: string
          updated_at?: Timestamp
          username: string
          full_name: string
          avatar_url?: string
          website?: string
          media_provider?: 'local' | 'supabase' | 'drive' | 'r2' | null
        }
        Update: {
          id?: string
          updated_at?: Timestamp
          username?: string
          full_name?: string
          avatar_url?: string
          website?: string
          media_provider?: 'local' | 'supabase' | 'drive' | 'r2' | null
        }
      }
      players: {
        Row: {
          id: string
          created_at: Timestamp
          updated_at: Timestamp
          name: string
          user_id: string
          season_id: string
          avatar?: string | null
        }
        Insert: {
          id?: string
          created_at?: Timestamp
          updated_at?: Timestamp
          name: string
          user_id: string
          season_id: string
          avatar?: string | null
        }
        Update: {
          id?: string
          created_at?: Timestamp
          updated_at?: Timestamp
          name?: string
          user_id?: string
          season_id?: string
          avatar?: string | null
        }
      }
      clubs: {
        Row: {
          id: string
          name: string
          sport_id: string
          player_id: string
        }
        Insert: {
          id?: string
          name: string
          sport_id: string
          player_id: string
        }
        Update: {
          id?: string
          name?: string
          sport_id?: string
          player_id?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          club_id: string
          sport_id: string
          player_id: string
        }
        Insert: {
          id?: string
          name: string
          club_id: string
          sport_id: string
          player_id: string
        }
        Update: {
          id?: string
          name?: string
          club_id?: string
          sport_id?: string
          player_id?: string
        }
      }
      competitions: {
        Row: {
          id: string
          player_id: string
          season_id: string
          sport_id: string
          club_id: string | null
          team_id: string | null
          category_id: string | null
          name: string | null
        }
        Insert: {
          id?: string
          player_id: string
          season_id: string
          sport_id: string
          club_id?: string | null
          team_id?: string | null
          category_id?: string | null
          name?: string | null
        }
        Update: {
          id?: string
          player_id?: string
          season_id?: string
          sport_id?: string
          club_id?: string | null
          team_id?: string | null
          category_id?: string | null
          name?: string | null
        }
      }
      match_media: {
        Row: {
          id: string
          user_id: string
          match_id: string
          player_id: string | null
          kind: 'image' | 'video' | 'file'
          storage_provider: 'local' | 'supabase' | 'drive' | 'r2' | null
          storage_path: string | null
          google_drive_file_id: string | null
          device_uri: string | null
          mime_type: string | null
          size_bytes: number | null
          width: number | null
          height: number | null
          duration_ms: number | null
          taken_at: Timestamp | null
          synced_at: Timestamp | null
          created_at: Timestamp
        }
        Insert: {
          id?: string
          user_id: string
          match_id: string
          player_id?: string | null
          kind?: 'photo' | 'video' | 'file'
          storage_provider?: 'local' | 'supabase' | 'drive' | 'r2' | null
          storage_path?: string | null
          google_drive_file_id?: string | null
          device_uri?: string | null
          mime_type?: string | null
          size_bytes?: number | null
          width?: number | null
          height?: number | null
          duration_ms?: number | null
          taken_at?: Timestamp | null
          synced_at?: Timestamp | null
          created_at?: Timestamp
        }
        Update: {
          id?: string
          user_id?: string
          match_id?: string
          player_id?: string | null
          kind?: 'photo' | 'video' | 'file'
          storage_provider?: 'local' | 'supabase' | 'drive' | 'r2' | null
          storage_path?: string | null
          google_drive_file_id?: string | null
          device_uri?: string | null
          mime_type?: string | null
          size_bytes?: number | null
          width?: number | null
          height?: number | null
          duration_ms?: number | null
          taken_at?: Timestamp | null
          synced_at?: Timestamp | null
          created_at?: Timestamp
        }
      }
      storage_plans: {
        Row: {
          id: string
          name: string
          name_key: string | null
          gb_amount: number
          amount_cents: number
          currency: string
          stripe_price_id: string | null
          active: boolean
          created_at: Timestamp
        }
        Insert: {
          id?: string
          name: string
          name_key?: string | null
          gb_amount: number
          amount_cents: number
          currency?: string
          stripe_price_id?: string | null
          active?: boolean
          created_at?: Timestamp
        }
        Update: {
          id?: string
          name?: string
          name_key?: string | null
          gb_amount?: number
          amount_cents?: number
          currency?: string
          stripe_price_id?: string | null
          active?: boolean
          created_at?: Timestamp
        }
      }
      storage_subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string | null
          gb_amount: number
          amount_cents: number
          currency: string
          status: 'active' | 'expired' | 'cancelled'
          current_period_start: Timestamp
          current_period_end: Timestamp
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          created_at: Timestamp
          updated_at: Timestamp
        }
        Insert: {
          id?: string
          user_id: string
          plan_id?: string | null
          gb_amount: number
          amount_cents: number
          currency?: string
          status?: 'active' | 'expired' | 'cancelled'
          current_period_start?: Timestamp
          current_period_end: Timestamp
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          created_at?: Timestamp
          updated_at?: Timestamp
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string | null
          gb_amount?: number
          amount_cents?: number
          currency?: string
          status?: 'active' | 'expired' | 'cancelled'
          current_period_start?: Timestamp
          current_period_end?: Timestamp
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          created_at?: Timestamp
          updated_at?: Timestamp
        }
      }
      // Add other tables as needed
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_player_with_license: {
        Args: {
          p_code: string
          p_user_id: string
          p_player_id: string
        }
        Returns: { ok: boolean; message: string }[]
      }
      check_license: {
        Args: {
          p_user_id: string
          p_player_id: string
        }
        Returns: { ok: boolean; message: string; ends_at: string }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
