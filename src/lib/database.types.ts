/**
 * Tipos generados desde el proyecto Supabase real.
 * Regenerar: `pnpm db:types:generate` (requiere `SUPABASE_ACCESS_TOKEN` y `SUPABASE_PROJECT_REF`).
 * Comprobar desfase: `pnpm db:types:check`.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
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
      access_code_redemptions: {
        Row: {
          access_code_id: string
          id: string
          player_id: string
          redeemed_at: string
        }
        Insert: {
          access_code_id: string
          id?: string
          player_id: string
          redeemed_at?: string
        }
        Update: {
          access_code_id?: string
          id?: string
          player_id?: string
          redeemed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_code_redemptions_access_code_id_fkey"
            columns: ["access_code_id"]
            isOneToOne: false
            referencedRelation: "access_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_code_redemptions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      access_code_usages: {
        Row: {
          code_id: string
          created_at: string
          id: string
          player_id: string | null
          user_id: string
        }
        Insert: {
          code_id: string
          created_at?: string
          id?: string
          player_id?: string | null
          user_id: string
        }
        Update: {
          code_id?: string
          created_at?: string
          id?: string
          player_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_code_usages_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "access_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_code_usages_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      access_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          is_active: boolean | null
          max_uses: number
          num_days: number
          prescriber: string | null
          usage_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_uses: number
          num_days: number
          prescriber?: string | null
          usage_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_uses?: number
          num_days?: number
          prescriber?: string | null
          usage_count?: number
        }
        Relationships: []
      }
      clubs: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          id: string
          name: string
          player_id: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name: string
          player_id?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name?: string
          player_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clubs_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          category_id: string | null
          club_id: string | null
          created_at: string
          id: string
          name: string
          player_id: string | null
          season_id: string
          sport_id: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          club_id?: string | null
          created_at?: string
          id?: string
          name: string
          player_id?: string | null
          season_id: string
          sport_id: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          club_id?: string | null
          created_at?: string
          id?: string
          name?: string
          player_id?: string | null
          season_id?: string
          sport_id?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "sport_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitions_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitions_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      google_drive_connections: {
        Row: {
          connected_at: string
          last_error: string | null
          last_refresh_at: string | null
          refresh_token_encrypted: string
          scope: string | null
          status: string
          token_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          connected_at?: string
          last_error?: string | null
          last_refresh_at?: string | null
          refresh_token_encrypted: string
          scope?: string | null
          status?: string
          token_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          connected_at?: string
          last_error?: string | null
          last_refresh_at?: string | null
          refresh_token_encrypted?: string
          scope?: string | null
          status?: string
          token_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      match_media: {
        Row: {
          checksum: string | null
          created_at: string
          deleted_at: string | null
          device_uri: string | null
          duration_ms: number | null
          google_drive_file_id: string | null
          height: number | null
          id: string
          kind: string
          match_id: string
          mime_type: string | null
          player_id: string | null
          size_bytes: number | null
          storage_path: string | null
          storage_provider: string | null
          synced_at: string | null
          taken_at: string | null
          updated_at: string
          user_id: string
          width: number | null
        }
        Insert: {
          checksum?: string | null
          created_at?: string
          deleted_at?: string | null
          device_uri?: string | null
          duration_ms?: number | null
          google_drive_file_id?: string | null
          height?: number | null
          id?: string
          kind: string
          match_id: string
          mime_type?: string | null
          player_id?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          storage_provider?: string | null
          synced_at?: string | null
          taken_at?: string | null
          updated_at?: string
          user_id: string
          width?: number | null
        }
        Update: {
          checksum?: string | null
          created_at?: string
          deleted_at?: string | null
          device_uri?: string | null
          duration_ms?: number | null
          google_drive_file_id?: string | null
          height?: number | null
          id?: string
          kind?: string
          match_id?: string
          mime_type?: string | null
          player_id?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          storage_provider?: string | null
          synced_at?: string | null
          taken_at?: string | null
          updated_at?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_media_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_media_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_media_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          competition_id: string | null
          created_at: string
          date_at: string
          id: string
          is_home: boolean
          my_score: number | null
          notes: string | null
          place: string | null
          player_id: string
          rival_score: number | null
          rival_team_name: string | null
          season_id: string | null
          sport_id: string
          stats: Json
          status: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          competition_id?: string | null
          created_at?: string
          date_at: string
          id?: string
          is_home?: boolean
          my_score?: number | null
          notes?: string | null
          place?: string | null
          player_id: string
          rival_score?: number | null
          rival_team_name?: string | null
          season_id?: string | null
          sport_id: string
          stats?: Json
          status?: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          competition_id?: string | null
          created_at?: string
          date_at?: string
          id?: string
          is_home?: boolean
          my_score?: number | null
          notes?: string | null
          place?: string | null
          player_id?: string
          rival_score?: number | null
          rival_team_name?: string | null
          season_id?: string | null
          sport_id?: string
          stats?: Json
          status?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      media_storage_preferences: {
        Row: {
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          provider?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          description: string | null
          id: string
          paid_at: string
          provider: string
          receipt_url: string | null
          status: string
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          paid_at?: string
          provider?: string
          receipt_url?: string | null
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          paid_at?: string
          provider?: string
          receipt_url?: string | null
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      player_credits: {
        Row: {
          created_at: string
          id: string
          plan_id: string
          remaining_units: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          total_units: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_id: string
          remaining_units: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          total_units: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_id?: string
          remaining_units?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          total_units?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_credits_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_credits_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans_view"
            referencedColumns: ["id"]
          },
        ]
      }
      player_images: {
        Row: {
          captured_at: string | null
          checksum: string | null
          created_at: string
          device_id: string | null
          height: number | null
          id: string
          local_path: string
          match_id: string | null
          mime_type: string | null
          notes: string | null
          player_id: string
          tags: string[] | null
          user_id: string
          width: number | null
        }
        Insert: {
          captured_at?: string | null
          checksum?: string | null
          created_at?: string
          device_id?: string | null
          height?: number | null
          id?: string
          local_path: string
          match_id?: string | null
          mime_type?: string | null
          notes?: string | null
          player_id: string
          tags?: string[] | null
          user_id: string
          width?: number | null
        }
        Update: {
          captured_at?: string | null
          checksum?: string | null
          created_at?: string
          device_id?: string | null
          height?: number | null
          id?: string
          local_path?: string
          match_id?: string | null
          mime_type?: string | null
          notes?: string | null
          player_id?: string
          tags?: string[] | null
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_images_match_fk"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_images_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_licenses: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          ends_at: string
          external_price_id: string | null
          external_subscription_id: string | null
          id: string
          player_id: string
          provider: string
          starts_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          currency?: string
          ends_at?: string
          external_price_id?: string | null
          external_subscription_id?: string | null
          id?: string
          player_id: string
          provider?: string
          starts_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          ends_at?: string
          external_price_id?: string | null
          external_subscription_id?: string | null
          id?: string
          player_id?: string
          provider?: string
          starts_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_licenses_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_licenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      player_seasons: {
        Row: {
          avatar: string | null
          created_at: string
          id: string
          notes: string | null
          player_id: string
          season_id: string
          updated_at: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          player_id: string
          season_id: string
          updated_at?: string
        }
        Update: {
          avatar?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          player_id?: string
          season_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_seasons_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_seasons_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          birthday: string | null
          created_at: string
          full_name: string
          id: string
          status: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          birthday?: string | null
          created_at?: string
          full_name: string
          id?: string
          status?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          birthday?: string | null
          created_at?: string
          full_name?: string
          id?: string
          status?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          id: string
          year_end: number
          year_start: number
        }
        Insert: {
          id?: string
          year_end: number
          year_start: number
        }
        Update: {
          id?: string
          year_end?: number
          year_start?: number
        }
        Relationships: []
      }
      sport_categories: {
        Row: {
          age_max: number | null
          age_min: number | null
          created_at: string
          gender: string
          id: string
          name: string
          slug: string
          sort_order: number
          sport_id: string
          updated_at: string
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          created_at?: string
          gender?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          sport_id: string
          updated_at?: string
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          created_at?: string
          gender?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          sport_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sport_categories_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      sports: {
        Row: {
          active: boolean
          created_at: string
          id: string
          is_team: boolean
          name: string
          slug: string
          stats: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          is_team?: boolean
          name: string
          slug: string
          stats?: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          is_team?: boolean
          name?: string
          slug?: string
          stats?: Json
          updated_at?: string
        }
        Relationships: []
      }
      storage_plans: {
        Row: {
          active: boolean
          amount_cents: number
          created_at: string
          currency: string
          gb_amount: number
          id: string
          name: string
          name_key: string | null
          stripe_price_id: string | null
        }
        Insert: {
          active?: boolean
          amount_cents: number
          created_at?: string
          currency?: string
          gb_amount: number
          id?: string
          name: string
          name_key?: string | null
          stripe_price_id?: string | null
        }
        Update: {
          active?: boolean
          amount_cents?: number
          created_at?: string
          currency?: string
          gb_amount?: number
          id?: string
          name?: string
          name_key?: string | null
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      storage_subscriptions: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          current_period_end: string
          current_period_start: string
          gb_amount: number
          id: string
          plan_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          current_period_end: string
          current_period_start?: string
          gb_amount: number
          id?: string
          plan_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          current_period_end?: string
          current_period_start?: string
          gb_amount?: number
          id?: string
          plan_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "storage_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_checkout_fulfillments: {
        Row: {
          created_at: string
          id: string
          stripe_checkout_session_id: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          stripe_checkout_session_id: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          stripe_checkout_session_id?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_checkout_fulfillments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          active: boolean
          amount_cents: number
          created_at: string
          currency: string
          days: number
          description: string | null
          free: boolean
          id: string
          metadata: Json | null
          name: string
          stripe_price_id: string
        }
        Insert: {
          active?: boolean
          amount_cents: number
          created_at?: string
          currency?: string
          days: number
          description?: string | null
          free?: boolean
          id?: string
          metadata?: Json | null
          name: string
          stripe_price_id: string
        }
        Update: {
          active?: boolean
          amount_cents?: number
          created_at?: string
          currency?: string
          days?: number
          description?: string | null
          free?: boolean
          id?: string
          metadata?: Json | null
          name?: string
          stripe_price_id?: string
        }
        Relationships: []
      }
      subscription_players: {
        Row: {
          access_code_id: string | null
          amount_cents: number | null
          created_at: string
          currency: string
          id: string
          linked_at: string
          player_id: string
          source: string | null
          subscription_id: string
          unlinked_at: string | null
        }
        Insert: {
          access_code_id?: string | null
          amount_cents?: number | null
          created_at?: string
          currency?: string
          id?: string
          linked_at?: string
          player_id: string
          source?: string | null
          subscription_id: string
          unlinked_at?: string | null
        }
        Update: {
          access_code_id?: string | null
          amount_cents?: number | null
          created_at?: string
          currency?: string
          id?: string
          linked_at?: string
          player_id?: string
          source?: string | null
          subscription_id?: string
          unlinked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_players_player_fk"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_players_subscription_fk"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_players_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          access_code_id: string | null
          amount: number | null
          cancel_at_period_end: boolean | null
          created_at: string
          currency: string
          current_period_end: string | null
          id: string
          notified_expiry_7d_at: string | null
          plan_id: string | null
          seats: number
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_code_id?: string | null
          amount?: number | null
          cancel_at_period_end?: boolean | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          id?: string
          notified_expiry_7d_at?: string | null
          plan_id?: string | null
          seats?: number
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_code_id?: string | null
          amount?: number | null
          cancel_at_period_end?: boolean | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          id?: string
          notified_expiry_7d_at?: string | null
          plan_id?: string | null
          seats?: number
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_access_code_id_fkey"
            columns: ["access_code_id"]
            isOneToOne: false
            referencedRelation: "access_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans_view"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_user_debug: {
        Row: {
          email: string | null
          err: string | null
          happened_at: string
          id: number
          payload: Json | null
          phase: string
        }
        Insert: {
          email?: string | null
          err?: string | null
          happened_at?: string
          id?: number
          payload?: Json | null
          phase: string
        }
        Update: {
          email?: string | null
          err?: string | null
          happened_at?: string
          id?: number
          payload?: Json | null
          phase?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          club_id: string | null
          created_at: string
          id: string
          name: string
          player_id: string | null
          sport_id: string | null
          updated_at: string
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          id?: string
          name: string
          player_id?: string | null
          sport_id?: string | null
          updated_at?: string
        }
        Update: {
          club_id?: string | null
          created_at?: string
          id?: string
          name?: string
          player_id?: string | null
          sport_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          accepted_marketing: boolean
          accepted_terms: boolean
          created_at: string
          email: string | null
          id: string
          locale: string | null
          name: string
          phone: string | null
          role: string | null
          status: boolean
          surname: string
          updated_at: string
        }
        Insert: {
          accepted_marketing?: boolean
          accepted_terms?: boolean
          created_at?: string
          email?: string | null
          id: string
          locale?: string | null
          name?: string
          phone?: string | null
          role?: string | null
          status?: boolean
          surname?: string
          updated_at?: string
        }
        Update: {
          accepted_marketing?: boolean
          accepted_terms?: boolean
          created_at?: string
          email?: string | null
          id?: string
          locale?: string | null
          name?: string
          phone?: string | null
          role?: string | null
          status?: boolean
          surname?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      player_active_access: {
        Row: {
          assigned_at: string | null
          code_id: string | null
          player_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_code_usages_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "access_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_code_usages_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans_view: {
        Row: {
          active: boolean | null
          created_at: string | null
          currency: string | null
          days: number | null
          free: boolean | null
          id: string | null
          name: string | null
          price_cents: number | null
          stripe_price_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          currency?: never
          days?: number | null
          free?: boolean | null
          id?: string | null
          name?: string | null
          price_cents?: number | null
          stripe_price_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          currency?: never
          days?: number | null
          free?: boolean | null
          id?: string | null
          name?: string | null
          price_cents?: number | null
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          current_period_end: string | null
          status: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_licenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _calc_start_for_player: {
        Args: { p_player: string; p_user: string }
        Returns: string
      }
      _remaining_seats_core: { Args: { p_user_id: string }; Returns: number }
      assign_credit_to_player:
        | { Args: { p_player_id: string; p_user_id: string }; Returns: Json }
        | {
            Args: { p_plan_id: string; p_player_id: string; p_user_id: string }
            Returns: {
              ends_at: string
              message: string
              ok: boolean
              remaining_credits: number
              starts_at: string
            }[]
          }
      assign_free_seat_to_player: {
        Args: { p_player_id: string; p_user_id: string }
        Returns: Json
      }
      create_code_subscription: {
        Args: { p_code: string; p_plan_id: string; p_user_id?: string }
        Returns: Json
      }
      create_player_and_link_code: {
        Args: {
          p_access_code_id: string
          p_birthday: string
          p_full_name: string
          p_status?: boolean
        }
        Returns: string
      }
      create_player_link_subscription: {
        Args: {
          p_birthday?: string
          p_code_text?: string
          p_full_name: string
          p_memberships?: Json
          p_season_id?: string
          p_status?: boolean
        }
        Returns: {
          player_id: string
          subscription_id: string
        }[]
      }
      ensure_profile: {
        Args: {
          p_email: string
          p_locale?: string
          p_name?: string
          p_phone?: string
          p_surname?: string
          p_user_id: string
        }
        Returns: undefined
      }
      ensure_profile_server: { Args: never; Returns: undefined }
      has_active_access: { Args: { p_player_id: string }; Returns: boolean }
      link_player_to_subscription: {
        Args: { p_player_id: string; p_user_id?: string }
        Returns: {
          message: string
          ok: boolean
        }[]
      }
      preview_code: {
        Args: { p_code: string }
        Returns: {
          message: string
          num_days: number
          ok: boolean
          remaining_uses: number
        }[]
      }
      redeem_access_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: {
          ends_at: string
          message: string
          ok: boolean
        }[]
      }
      redeem_access_code_for_player: {
        Args: { p_code: string; p_player_id: string; p_user_id: string }
        Returns: Json
      }
      redeem_code_and_link_player:
        | {
            Args: { p_code: string; p_player_id: string }
            Returns: {
              ends_at: string
              message: string
              ok: boolean
              subscription_id: string
            }[]
          }
        | {
            Args: { p_code: string; p_player_id: string; p_user_id?: string }
            Returns: {
              ends_at: string
              message: string
              ok: boolean
            }[]
          }
      remaining_seats_for_user:
        | { Args: never; Returns: number }
        | { Args: { p_user_id: string }; Returns: number }
      seats_remaining: { Args: { p_user_id: string }; Returns: number }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
    Enums: {},
  },
} as const
