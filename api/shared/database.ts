import type { AIAuthMode, AIBudgetMode, AIKeyCheckStatus, AIProvider, AIRequestKind, AIRequestStatus, CookingEquipment, RecipeCategoryId } from '../../src/types/index.js'

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      ai_provider_settings: {
        Row: {
          user_id: string
          ai_provider: 'google_gemini'
          auth_mode: AIAuthMode
          google_model: string
          token_budget_mode: AIBudgetMode
          monthly_token_limit: number | null
          budget_amount: number | null
          is_key_configured: boolean
          key_last4: string | null
          last_key_check_at: string | null
          last_key_check_status: AIKeyCheckStatus
          last_key_check_error: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          ai_provider?: 'google_gemini'
          auth_mode?: AIAuthMode
          google_model?: string
          token_budget_mode?: AIBudgetMode
          monthly_token_limit?: number | null
          budget_amount?: number | null
          is_key_configured?: boolean
          key_last4?: string | null
          last_key_check_at?: string | null
          last_key_check_status?: AIKeyCheckStatus
          last_key_check_error?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          ai_provider?: 'google_gemini'
          auth_mode?: AIAuthMode
          google_model?: string
          token_budget_mode?: AIBudgetMode
          monthly_token_limit?: number | null
          budget_amount?: number | null
          is_key_configured?: boolean
          key_last4?: string | null
          last_key_check_at?: string | null
          last_key_check_status?: AIKeyCheckStatus
          last_key_check_error?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_provider_secrets: {
        Row: {
          user_id: string
          ai_provider: 'google_gemini'
          encrypted_key: string
          key_iv: string
          key_tag: string
          updated_at: string
        }
        Insert: {
          user_id: string
          ai_provider?: 'google_gemini'
          encrypted_key: string
          key_iv: string
          key_tag: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          ai_provider?: 'google_gemini'
          encrypted_key?: string
          key_iv?: string
          key_tag?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_request_usage: {
        Row: {
          id: string
          user_id: string
          provider: AIProvider
          model: string
          auth_mode: AIAuthMode
          request_kind: AIRequestKind
          request_status: AIRequestStatus
          prompt_token_count: number
          candidates_token_count: number
          total_token_count: number
          budget_mode: AIBudgetMode
          remaining_percent: number | null
          error_code: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: AIProvider
          model: string
          auth_mode: AIAuthMode
          request_kind: AIRequestKind
          request_status: AIRequestStatus
          prompt_token_count?: number
          candidates_token_count?: number
          total_token_count?: number
          budget_mode: AIBudgetMode
          remaining_percent?: number | null
          error_code?: string | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: AIProvider
          model?: string
          auth_mode?: AIAuthMode
          request_kind?: AIRequestKind
          request_status?: AIRequestStatus
          prompt_token_count?: number
          candidates_token_count?: number
          total_token_count?: number
          budget_mode?: AIBudgetMode
          remaining_percent?: number | null
          error_code?: string | null
          error_message?: string | null
          created_at?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          id: string
          category_id: RecipeCategoryId
          name: string
          icon: string | null
          emoji: string | null
          ingredient: string
          description: string
          equipment: CookingEquipment | null
          tip: string | null
          portion_label_singular: string | null
          portion_label_plural: string | null
          is_published: boolean
        }
        Insert: never
        Update: never
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          recipe_id: string
          sort_order: number
          name: string
          emoji: string | null
          indispensable: boolean
          p1: string
          p2: string
          p4: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
      recipe_substeps: {
        Row: {
          recipe_id: string
          substep_order: number
          step_number: number | null
          step_name: string | null
          substep_name: string
          notes: string | null
          is_timer: boolean
          p1: string
          p2: string
          p4: string
          fire_level: 'low' | 'medium' | 'high' | null
          equipment: CookingEquipment | null
        }
        Insert: never
        Update: never
        Relationships: []
      }
      weekly_plan_items: {
        Row: {
          id: string
        }
        Insert: {
          id?: string
        }
        Update: {
          id?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type DbAIProviderSettings = Database['public']['Tables']['ai_provider_settings']['Row']
export type DbAIProviderSecret = Pick<Database['public']['Tables']['ai_provider_secrets']['Row'], 'encrypted_key' | 'key_iv' | 'key_tag'>
export type DbAIRequestUsage = Database['public']['Tables']['ai_request_usage']['Row']
export type DbRecipeRow = Database['public']['Tables']['recipes']['Row']
export type DbRecipeIngredientRow = Database['public']['Tables']['recipe_ingredients']['Row']
export type DbRecipeSubstepRow = Database['public']['Tables']['recipe_substeps']['Row']
export type DbInsertAIProviderSettings = Database['public']['Tables']['ai_provider_settings']['Insert']
export type DbInsertAIProviderSecret = Database['public']['Tables']['ai_provider_secrets']['Insert']
export type DbInsertAIRequestUsage = Database['public']['Tables']['ai_request_usage']['Insert']

export type JsonValue = Json
