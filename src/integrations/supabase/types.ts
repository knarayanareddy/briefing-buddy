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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      actions: {
        Row: {
          action_type: string
          briefing_script_id: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          evidence_source_ids: string[]
          id: string
          idempotency_key: string
          payload: Json
          provider: string
          provider_result: Json | null
          segment_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_type: string
          briefing_script_id?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          evidence_source_ids?: string[]
          id?: string
          idempotency_key: string
          payload?: Json
          provider: string
          provider_result?: Json | null
          segment_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_type?: string
          briefing_script_id?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          evidence_source_ids?: string[]
          id?: string
          idempotency_key?: string
          payload?: Json
          provider?: string
          provider_result?: Json | null
          segment_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "actions_briefing_script_id_fkey"
            columns: ["briefing_script_id"]
            isOneToOne: false
            referencedRelation: "briefing_scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      briefing_artifacts: {
        Row: {
          artifact_type: string
          content: Json
          created_at: string
          id: string
          script_id: string
          user_id: string
        }
        Insert: {
          artifact_type: string
          content?: Json
          created_at?: string
          id?: string
          script_id: string
          user_id: string
        }
        Update: {
          artifact_type?: string
          content?: Json
          created_at?: string
          id?: string
          script_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "briefing_artifacts_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "briefing_scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      briefing_module_state: {
        Row: {
          id: string
          last_seen_at: string | null
          module_id: string
          user_id: string
        }
        Insert: {
          id?: string
          last_seen_at?: string | null
          module_id: string
          user_id: string
        }
        Update: {
          id?: string
          last_seen_at?: string | null
          module_id?: string
          user_id?: string
        }
        Relationships: []
      }
      briefing_profiles: {
        Row: {
          created_at: string
          enabled_modules: string[]
          frequency: string
          id: string
          last_triggered_at: string | null
          module_catalog_version: number | null
          module_settings: Json
          name: string
          persona: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled_modules?: string[]
          frequency?: string
          id?: string
          last_triggered_at?: string | null
          module_catalog_version?: number | null
          module_settings?: Json
          name: string
          persona?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled_modules?: string[]
          frequency?: string
          id?: string
          last_triggered_at?: string | null
          module_catalog_version?: number | null
          module_settings?: Json
          name?: string
          persona?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      briefing_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          job_id: string | null
          profile_id: string
          script_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          job_id?: string | null
          profile_id: string
          script_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          job_id?: string | null
          profile_id?: string
          script_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      briefing_scripts: {
        Row: {
          archived: boolean
          created_at: string
          id: string
          persona: string | null
          plan_hash: string | null
          profile_id: string | null
          scheduled_for: string | null
          script_json: Json
          title: string | null
          trigger: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          id?: string
          persona?: string | null
          plan_hash?: string | null
          profile_id?: string | null
          scheduled_for?: string | null
          script_json?: Json
          title?: string | null
          trigger?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          id?: string
          persona?: string | null
          plan_hash?: string | null
          profile_id?: string | null
          scheduled_for?: string | null
          script_json?: Json
          title?: string | null
          trigger?: string
          user_id?: string
        }
        Relationships: []
      }
      briefing_shares: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          job_id: string | null
          revoked: boolean
          scope: string | null
          script_id: string
          token: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          job_id?: string | null
          revoked?: boolean
          scope?: string | null
          script_id: string
          token?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          job_id?: string | null
          revoked?: boolean
          scope?: string | null
          script_id?: string
          token?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "briefing_shares_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "briefing_scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      briefing_usage_limits: {
        Row: {
          day: string
          generate_count: number
          render_count: number
          user_id: string
        }
        Insert: {
          day?: string
          generate_count?: number
          render_count?: number
          user_id: string
        }
        Update: {
          day?: string
          generate_count?: number
          render_count?: number
          user_id?: string
        }
        Relationships: []
      }
      briefing_user_state: {
        Row: {
          latest_job_id: string | null
          latest_script_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          latest_job_id?: string | null
          latest_script_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          latest_job_id?: string | null
          latest_script_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      connector_configs: {
        Row: {
          config: Json
          created_at: string
          id: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      connector_connections: {
        Row: {
          created_at: string
          id: string
          last_sync_at: string | null
          provider: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_sync_at?: string | null
          provider: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_sync_at?: string | null
          provider?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      connector_health: {
        Row: {
          connected: boolean
          consecutive_failures: number
          cooldown_until: string | null
          id: string
          items_synced_last_run: number
          last_attempt_at: string | null
          last_error_code: string | null
          last_error_message: string | null
          last_success_at: string | null
          next_retry_at: string | null
          provider: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connected?: boolean
          consecutive_failures?: number
          cooldown_until?: string | null
          id?: string
          items_synced_last_run?: number
          last_attempt_at?: string | null
          last_error_code?: string | null
          last_error_message?: string | null
          last_success_at?: string | null
          next_retry_at?: string | null
          provider: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connected?: boolean
          consecutive_failures?: number
          cooldown_until?: string | null
          id?: string
          items_synced_last_run?: number
          last_attempt_at?: string | null
          last_error_code?: string | null
          last_error_message?: string | null
          last_success_at?: string | null
          next_retry_at?: string | null
          provider?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      connector_secrets: {
        Row: {
          created_at: string
          encrypted_payload: string
          id: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_payload: string
          id?: string
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_payload?: string
          id?: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      connector_sync_runs: {
        Row: {
          created_at: string
          error_code: string | null
          error_message: string | null
          finished_at: string | null
          id: string
          items_found: number | null
          items_upserted: number | null
          meta: Json | null
          outcome: string | null
          provider: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          items_found?: number | null
          items_upserted?: number | null
          meta?: Json | null
          outcome?: string | null
          provider: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          items_found?: number | null
          items_upserted?: number | null
          meta?: Json | null
          outcome?: string | null
          provider?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      cron_secrets: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      deep_dive_runs: {
        Row: {
          citations: Json
          completed_at: string | null
          created_at: string
          error_message: string | null
          evidence_source_ids: string[]
          id: string
          output_summary: string | null
          question: string | null
          run_type: string
          script_id: string | null
          segment_id: number | null
          started_at: string | null
          status: string
          tool_trace: Json
          user_id: string
        }
        Insert: {
          citations?: Json
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          evidence_source_ids?: string[]
          id?: string
          output_summary?: string | null
          question?: string | null
          run_type?: string
          script_id?: string | null
          segment_id?: number | null
          started_at?: string | null
          status?: string
          tool_trace?: Json
          user_id: string
        }
        Update: {
          citations?: Json
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          evidence_source_ids?: string[]
          id?: string
          output_summary?: string | null
          question?: string | null
          run_type?: string
          script_id?: string | null
          segment_id?: number | null
          started_at?: string | null
          status?: string
          tool_trace?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deep_dive_runs_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "briefing_scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_list: {
        Row: {
          created_at: string
          id: string
          source_id: string
          title: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_id: string
          title?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source_id?: string
          title?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      render_jobs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          script_id: string
          segments: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          script_id: string
          segments?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          script_id?: string
          segments?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "render_jobs_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "briefing_scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      rendered_asset_cache: {
        Row: {
          asset_key: string
          asset_url: string
          created_at: string
          id: string
          metadata: Json | null
          provider: string | null
        }
        Insert: {
          asset_key: string
          asset_url: string
          created_at?: string
          id?: string
          metadata?: Json | null
          provider?: string | null
        }
        Update: {
          asset_key?: string
          asset_url?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          provider?: string | null
        }
        Relationships: []
      }
      rendered_segments: {
        Row: {
          avatar_video_url: string | null
          b_roll_image_url: string | null
          created_at: string
          dialogue: string | null
          error: string | null
          grounding_source_id: string | null
          id: string
          job_id: string
          segment_id: number
          status: string
          ui_action_card: Json | null
          updated_at: string
        }
        Insert: {
          avatar_video_url?: string | null
          b_roll_image_url?: string | null
          created_at?: string
          dialogue?: string | null
          error?: string | null
          grounding_source_id?: string | null
          id?: string
          job_id: string
          segment_id: number
          status?: string
          ui_action_card?: Json | null
          updated_at?: string
        }
        Update: {
          avatar_video_url?: string | null
          b_roll_image_url?: string | null
          created_at?: string
          dialogue?: string | null
          error?: string | null
          grounding_source_id?: string | null
          id?: string
          job_id?: string
          segment_id?: number
          status?: string
          ui_action_card?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rendered_segments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "render_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      rss_feed_state: {
        Row: {
          feed_url: string
          id: string
          last_etag: string | null
          last_fetched_at: string | null
          last_modified: string | null
          user_id: string
        }
        Insert: {
          feed_url: string
          id?: string
          last_etag?: string | null
          last_fetched_at?: string | null
          last_modified?: string | null
          user_id: string
        }
        Update: {
          feed_url?: string
          id?: string
          last_etag?: string | null
          last_fetched_at?: string | null
          last_modified?: string | null
          user_id?: string
        }
        Relationships: []
      }
      synced_items: {
        Row: {
          created_at: string
          id: string
          occurred_at: string
          payload: Json | null
          provider: string
          source_id: string
          summary: string | null
          title: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          occurred_at?: string
          payload?: Json | null
          provider: string
          source_id: string
          summary?: string | null
          title?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          occurred_at?: string
          payload?: Json | null
          provider?: string
          source_id?: string
          summary?: string | null
          title?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tts_audio_cache: {
        Row: {
          created_at: string
          duration_seconds: number | null
          format: string
          id: string
          storage_path: string
          text_hash: string
          user_id: string
          voice_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          format?: string
          id?: string
          storage_path: string
          text_hash: string
          user_id: string
          voice_id?: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          format?: string
          id?: string
          storage_path?: string
          text_hash?: string
          user_id?: string
          voice_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          device_label: string | null
          id: string
          ip: string | null
          last_seen_at: string
          location_text: string | null
          session_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_label?: string | null
          id?: string
          ip?: string | null
          last_seen_at?: string
          location_text?: string | null
          session_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_label?: string | null
          id?: string
          ip?: string | null
          last_seen_at?: string
          location_text?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          location_lat: number | null
          location_lon: number | null
          location_text: string | null
          notification_prefs: Json
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          location_lat?: number | null
          location_lon?: number | null
          location_text?: string | null
          notification_prefs?: Json
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          location_lat?: number | null
          location_lon?: number | null
          location_text?: string | null
          notification_prefs?: Json
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      watch_rules: {
        Row: {
          created_at: string
          id: string
          module_id: string
          profile_id: string
          rule: Json
        }
        Insert: {
          created_at?: string
          id?: string
          module_id: string
          profile_id: string
          rule?: Json
        }
        Update: {
          created_at?: string
          id?: string
          module_id?: string
          profile_id?: string
          rule?: Json
        }
        Relationships: [
          {
            foreignKeyName: "watch_rules_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "briefing_profiles"
            referencedColumns: ["id"]
          },
        ]
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
  public: {
    Enums: {},
  },
} as const
