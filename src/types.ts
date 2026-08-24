/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      ab_assignments: {
        Row: {
          created_at: string
          experiment_id: string | null
          id: string
          test_id: string
          user_id: string
          variant: string
        }
        Insert: {
          created_at?: string
          experiment_id?: string | null
          id?: string
          test_id: string
          user_id: string
          variant: string
        }
        Update: {
          created_at?: string
          experiment_id?: string | null
          id?: string
          test_id?: string
          user_id?: string
          variant?: string
        }
        Relationships: []
      }
      ab_events: {
        Row: {
          created_at: string
          event: string
          experiment_id: string | null
          id: string
          test_id: string
          user_id: string | null
          value: number
          variant: string
        }
        Insert: {
          created_at?: string
          event: string
          experiment_id?: string | null
          id?: string
          test_id: string
          user_id?: string | null
          value?: number
          variant: string
        }
        Update: {
          created_at?: string
          event?: string
          experiment_id?: string | null
          id?: string
          test_id?: string
          user_id?: string | null
          value?: number
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "ab_events_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "ab_experiments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ab_events_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "ab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      ab_experiments: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          metrics: Json
          name: string
          start_date: string | null
          status: string
          target_percentage: number
          updated_at: string
          variants: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          metrics?: Json
          name: string
          start_date?: string | null
          status?: string
          target_percentage?: number
          updated_at?: string
          variants?: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          metrics?: Json
          name?: string
          start_date?: string | null
          status?: string
          target_percentage?: number
          updated_at?: string
          variants?: Json
        }
        Relationships: []
      }
      ab_tests: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          metrics: Json
          name: string
          status: string
          target: string
          updated_at: string
          variants: Json
          winner: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metrics?: Json
          name: string
          status?: string
          target?: string
          updated_at?: string
          variants?: Json
          winner?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metrics?: Json
          name?: string
          status?: string
          target?: string
          updated_at?: string
          variants?: Json
          winner?: string | null
        }
        Relationships: []
      }
      account_deletion_requests: {
        Row: {
          admin_note: string | null
          cancelled_at: string | null
          confirmed_at: string | null
          created_at: string
          id: string
          reason: string | null
          reviewed_by: string | null
          scheduled_purge_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          reviewed_by?: string | null
          scheduled_purge_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          reviewed_by?: string | null
          scheduled_purge_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      activity_log: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ad_settings: {
        Row: {
          ad_unit_id: string | null
          created_at: string
          enabled: boolean
          frequency: number
          html_snippet: string | null
          id: string
          impressions_count: number
          kind: string
          network: string
          notes: string | null
          publisher_id: string | null
          slot: string
          updated_at: string
          vast_tag_url: string | null
        }
        Insert: {
          ad_unit_id?: string | null
          created_at?: string
          enabled?: boolean
          frequency?: number
          html_snippet?: string | null
          id?: string
          impressions_count?: number
          kind: string
          network?: string
          notes?: string | null
          publisher_id?: string | null
          slot: string
          updated_at?: string
          vast_tag_url?: string | null
        }
        Update: {
          ad_unit_id?: string | null
          created_at?: string
          enabled?: boolean
          frequency?: number
          html_snippet?: string | null
          id?: string
          impressions_count?: number
          kind?: string
          network?: string
          notes?: string | null
          publisher_id?: string | null
          slot?: string
          updated_at?: string
          vast_tag_url?: string | null
        }
        Relationships: []
      }
      admin_actions: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          payload: Json
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          payload?: Json
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          payload?: Json
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      algorithm_audit_log: {
        Row: {
          actor: string | null
          created_at: string
          id: string
          next: Json
          note: string | null
          previous: Json
        }
        Insert: {
          actor?: string | null
          created_at?: string
          id?: string
          next?: Json
          note?: string | null
          previous?: Json
        }
        Update: {
          actor?: string | null
          created_at?: string
          id?: string
          next?: Json
          note?: string | null
          previous?: Json
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          cpm: number | null
          created_at: string
          event: string
          event_type: string | null
          gross_revenue: number | null
          id: number
          props: Json | null
          revenue: number | null
          user_id: string | null
          video_id: string | null
        }
        Insert: {
          cpm?: number | null
          created_at?: string
          event: string
          event_type?: string | null
          gross_revenue?: number | null
          id?: number
          props?: Json | null
          revenue?: number | null
          user_id?: string | null
          video_id?: string | null
        }
        Update: {
          cpm?: number | null
          created_at?: string
          event?: string
          event_type?: string | null
          gross_revenue?: number | null
          id?: number
          props?: Json | null
          revenue?: number | null
          user_id?: string | null
          video_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      appeals: {
        Row: {
          admin_note: string | null
          created_at: string
          email: string | null
          id: string
          message: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          enabled: boolean
          icon: string | null
          id: string
          name: string
          position: number
          slug: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          icon?: string | null
          id?: string
          name: string
          position?: number
          slug: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          icon?: string | null
          id?: string
          name?: string
          position?: number
          slug?: string
        }
        Relationships: []
      }
      challenges: {
        Row: {
          banner_url: string | null
          created_at: string
          creator_id: string | null
          description: string | null
          end_date: string | null
          hashtag: string
          id: string
          is_active: boolean
          is_featured: boolean
          participant_count: number
          start_date: string
          title: string
          video_count: number
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          end_date?: string | null
          hashtag: string
          id?: string
          is_active?: boolean
          is_featured?: boolean
          participant_count?: number
          start_date: string
          title: string
          video_count?: number
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          end_date?: string | null
          hashtag?: string
          id?: string
          is_active?: boolean
          is_featured?: boolean
          participant_count?: number
          start_date?: string
          title?: string
          video_count?: number
        }
        Relationships: []
      }
      channel_notices: {
        Row: {
          action_label: string | null
          action_required: boolean
          action_url: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_read: boolean
          message: string
          notice_type: string
          read_at: string | null
          related_claim_id: string | null
          related_video_id: string | null
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_required?: boolean
          action_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message: string
          notice_type: string
          read_at?: string | null
          related_claim_id?: string | null
          related_video_id?: string | null
          severity?: string
          title: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_required?: boolean
          action_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message?: string
          notice_type?: string
          read_at?: string | null
          related_claim_id?: string | null
          related_video_id?: string | null
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_notices_related_claim_id_fkey"
            columns: ["related_claim_id"]
            isOneToOne: false
            referencedRelation: "copyright_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_notices_related_video_id_fkey"
            columns: ["related_video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      community_posts: {
        Row: {
          comments_count: number
          content: string
          created_at: string
          creator_id: string
          id: string
          is_pinned: boolean
          likes_count: number
          media_urls: string[] | null
          poll_expires_at: string | null
          poll_options: Json | null
          post_type: string
          shares_count: number
          updated_at: string
          visibility: string
        }
        Insert: {
          comments_count?: number
          content: string
          created_at?: string
          creator_id: string
          id?: string
          is_pinned?: boolean
          likes_count?: number
          media_urls?: string[] | null
          poll_expires_at?: string | null
          poll_options?: Json | null
          post_type?: string
          shares_count?: number
          updated_at?: string
          visibility?: string
        }
        Update: {
          comments_count?: number
          content?: string
          created_at?: string
          creator_id?: string
          id?: string
          is_pinned?: boolean
          likes_count?: number
          media_urls?: string[] | null
          poll_expires_at?: string | null
          poll_options?: Json | null
          post_type?: string
          shares_count?: number
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      copyright_claims: {
        Row: {
          action_taken: string | null
          claim_type: string
          claimant_id: string
          created_at: string
          detected_at: string
          dispute_evidence: string[] | null
          dispute_reason: string | null
          id: string
          match_percentage: number | null
          matched_content_id: string | null
          matched_content_owner: string | null
          matched_content_title: string | null
          notes: string | null
          policy_action: string | null
          resolved_at: string | null
          severity: string
          status: string
          updated_at: string
          video_id: string
        }
        Insert: {
          action_taken?: string | null
          claim_type: string
          claimant_id: string
          created_at?: string
          detected_at?: string
          dispute_evidence?: string[] | null
          dispute_reason?: string | null
          id?: string
          match_percentage?: number | null
          matched_content_id?: string | null
          matched_content_owner?: string | null
          matched_content_title?: string | null
          notes?: string | null
          policy_action?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          updated_at?: string
          video_id: string
        }
        Update: {
          action_taken?: string | null
          claim_type?: string
          claimant_id?: string
          created_at?: string
          detected_at?: string
          dispute_evidence?: string[] | null
          dispute_reason?: string | null
          id?: string
          match_percentage?: number | null
          matched_content_id?: string | null
          matched_content_owner?: string | null
          matched_content_title?: string | null
          notes?: string | null
          policy_action?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          updated_at?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copyright_claims_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      copyright_fingerprints: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          fingerprint_data: Json
          id: string
          is_active: boolean
          metadata: Json | null
          owner_id: string
          updated_at: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          fingerprint_data: Json
          id?: string
          is_active?: boolean
          metadata?: Json | null
          owner_id: string
          updated_at?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          fingerprint_data?: Json
          id?: string
          is_active?: boolean
          metadata?: Json | null
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      creator_earnings: {
        Row: {
          cpm: number | null
          created_at: string
          creator_id: string
          gross_amount: number | null
          impressions: number | null
          last_computed_at: string
          period_end: string
          period_start: string
          source: string | null
          status: string | null
          total_earned: number
          total_views: number
          total_watch_seconds: number
          updated_at: string | null
          user_id: string
          video_id: string | null
        }
        Insert: {
          cpm?: number | null
          created_at?: string
          creator_id: string
          gross_amount?: number | null
          impressions?: number | null
          last_computed_at?: string
          period_end: string
          period_start: string
          source?: string | null
          status?: string | null
          total_earned?: number
          total_views?: number
          total_watch_seconds?: number
          updated_at?: string | null
          user_id: string
          video_id?: string | null
        }
        Update: {
          cpm?: number | null
          created_at?: string
          creator_id?: string
          gross_amount?: number | null
          impressions?: number | null
          last_computed_at?: string
          period_end?: string
          period_start?: string
          source?: string | null
          status?: string | null
          total_earned?: number
          total_views?: number
          total_watch_seconds?: number
          updated_at?: string | null
          user_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_earnings_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_marketplace: {
        Row: {
          availability_status: string
          category: string
          created_at: string
          creator_id: string
          description: string | null
          id: string
          portfolio_urls: string[] | null
          price_max: number | null
          price_min: number | null
          pricing_type: string
          rating: number | null
          review_count: number
          title: string
          updated_at: string
          views_count: number
        }
        Insert: {
          availability_status?: string
          category: string
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          portfolio_urls?: string[] | null
          price_max?: number | null
          price_min?: number | null
          pricing_type: string
          rating?: number | null
          review_count?: number
          title: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          availability_status?: string
          category?: string
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          portfolio_urls?: string[] | null
          price_max?: number | null
          price_min?: number | null
          pricing_type?: string
          rating?: number | null
          review_count?: number
          title?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: []
      }
      dynamic_routes: {
        Row: {
          content: Json
          created_at: string
          enabled: boolean
          id: string
          path: string
          title: string | null
        }
        Insert: {
          content?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          path: string
          title?: string | null
        }
        Update: {
          content?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          path?: string
          title?: string | null
        }
        Relationships: []
      }
      dynamic_widgets: {
        Row: {
          config: Json
          created_at: string
          enabled: boolean
          id: string
          kind: string
          page: string
          position: number
          title: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          kind: string
          page: string
          position?: number
          title?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          kind?: string
          page?: string
          position?: number
          title?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          key: string
          rollout_percent: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          key: string
          rollout_percent?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          key?: string
          rollout_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_rules: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          ip_address: string
          mode: string
          reason: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          ip_address: string
          mode?: string
          reason?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string
          mode?: string
          reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      moderation_queue: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          escalated: boolean
          flagged_reason: string | null
          id: string
          notes: string | null
          owner_id: string | null
          priority: number
          reviewed_at: string | null
          reviewed_by: string | null
          snapshot: Json | null
          status: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          escalated?: boolean
          flagged_reason?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          priority?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          snapshot?: Json | null
          status?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          escalated?: boolean
          flagged_reason?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          priority?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          snapshot?: Json | null
          status?: string
        }
        Relationships: []
      }
      moderation_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          category: string | null
          created_at: string
          expires_at: string | null
          icon: string | null
          id: string
          payload: Json
          priority: string
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          category?: string | null
          created_at?: string
          expires_at?: string | null
          icon?: string | null
          id?: string
          payload?: Json
          priority?: string
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          category?: string | null
          created_at?: string
          expires_at?: string | null
          icon?: string | null
          id?: string
          payload?: Json
          priority?: string
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_revenue: {
        Row: {
          ad_network: string | null
          amount: number
          cpm: number | null
          created_at: string
          gross_revenue: number
          id: string
          source_user_id: string | null
          video_id: string
        }
        Insert: {
          ad_network?: string | null
          amount?: number
          cpm?: number | null
          created_at?: string
          gross_revenue?: number
          id?: string
          source_user_id?: string | null
          video_id: string
        }
        Update: {
          ad_network?: string | null
          amount?: number
          cpm?: number | null
          created_at?: string
          gross_revenue?: number
          id?: string
          source_user_id?: string | null
          video_id?: string
        }
        Relationships: []
      }
      playlist_items: {
        Row: {
          added_at: string
          id: string
          playlist_id: string
          position: number
          video_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          playlist_id: string
          position?: number
          video_id: string
        }
        Update: {
          added_at?: string
          id?: string
          playlist_id?: string
          position?: number
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          ban_reason: string | null
          banned_until: string | null
          banner_url: string | null
          bio: string | null
          bot_flag_reason: string | null
          bot_flagged_at: string | null
          created_at: string
          daily_earnings_usd: number | null
          display_name: string | null
          email: string | null
          follower_count: number | null
          following_count: number | null
          handle: string | null
          id: string
          is_banned: boolean
          is_bot_flagged: boolean
          status: string
          total_views: number | null
          updated_at: string
          upload_limit_mb: number
          verified: boolean | null
          video_count: number | null
        }
        Insert: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_until?: string | null
          banner_url?: string | null
          bio?: string | null
          bot_flag_reason?: string | null
          bot_flagged_at?: string | null
          created_at?: string
          daily_earnings_usd?: number | null
          display_name?: string | null
          email?: string | null
          follower_count?: number | null
          following_count?: number | null
          handle?: string | null
          id: string
          is_banned?: boolean
          is_bot_flagged?: boolean
          status?: string
          total_views?: number | null
          updated_at?: string
          upload_limit_mb?: number
          verified?: boolean | null
          video_count?: number | null
        }
        Update: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_until?: string | null
          banner_url?: string | null
          bio?: string | null
          bot_flag_reason?: string | null
          bot_flagged_at?: string | null
          created_at?: string
          daily_earnings_usd?: number | null
          display_name?: string | null
          email?: string | null
          follower_count?: number | null
          following_count?: number | null
          handle?: string | null
          id?: string
          is_banned?: boolean
          is_bot_flagged?: boolean
          status?: string
          total_views?: number | null
          updated_at?: string
          upload_limit_mb?: number
          verified?: boolean | null
          video_count?: number | null
        }
        Relationships: []
      }
      rate_limit_events: {
        Row: {
          blocked: boolean
          bucket: string
          created_at: string
          hits: number
          id: string
          ip_address: string | null
          metadata: Json
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          blocked?: boolean
          bucket: string
          created_at?: string
          hits?: number
          id?: string
          ip_address?: string | null
          metadata?: Json
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          blocked?: boolean
          bucket?: string
          created_at?: string
          hits?: number
          id?: string
          ip_address?: string | null
          metadata?: Json
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      revenue_logs: {
        Row: {
          ad_network: string | null
          amount_earned: number
          cpm: number | null
          created_at: string
          gross_revenue: number | null
          id: string
          user_id: string
          video_id: string
          views_count: number
        }
        Insert: {
          ad_network?: string | null
          amount_earned?: number
          cpm?: number | null
          created_at?: string
          gross_revenue?: number | null
          id?: string
          user_id: string
          video_id: string
          views_count?: number
        }
        Update: {
          ad_network?: string | null
          amount_earned?: number
          cpm?: number | null
          created_at?: string
          gross_revenue?: number | null
          id?: string
          user_id?: string
          video_id?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "revenue_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sidebar_menu: {
        Row: {
          created_at: string
          enabled: boolean
          href: string
          icon: string | null
          id: string
          label: string
          position: number
          section: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          href: string
          icon?: string | null
          id?: string
          label: string
          position?: number
          section?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          href?: string
          icon?: string | null
          id?: string
          label?: string
          position?: number
          section?: string
        }
        Relationships: []
      }
      streams: {
        Row: {
          category: string | null
          chat_enabled: boolean
          chat_message_count: number
          created_at: string
          description: string | null
          ended_at: string | null
          id: string
          is_live: boolean
          mux_playback_id: string | null
          mux_stream_id: string | null
          mux_stream_key: string | null
          playback_url: string | null
          recording_enabled: boolean
          recording_url: string | null
          scheduled_at: string | null
          started_at: string | null
          status: string
          stream_key: string | null
          stream_url: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          viewer_count: number
          viewer_peak: number
        }
        Insert: {
          category?: string | null
          chat_enabled?: boolean
          chat_message_count?: number
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          is_live?: boolean
          mux_playback_id?: string | null
          mux_stream_id?: string | null
          mux_stream_key?: string | null
          playback_url?: string | null
          recording_enabled?: boolean
          recording_url?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          stream_key?: string | null
          stream_url?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          viewer_count?: number
          viewer_peak?: number
        }
        Update: {
          category?: string | null
          chat_enabled?: boolean
          chat_message_count?: number
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          is_live?: boolean
          mux_playback_id?: string | null
          mux_stream_id?: string | null
          mux_stream_key?: string | null
          playback_url?: string | null
          recording_enabled?: boolean
          recording_url?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          stream_key?: string | null
          stream_url?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          viewer_count?: number
          viewer_peak?: number
        }
        Relationships: []
      }
      system_config: {
        Row: {
          ads_enabled: boolean
          created_at: string
          extra: Json
          favicon_url: string | null
          id: number
          logo_url: string | null
          maintenance_mode: boolean
          min_withdrawal: number
          primary_color: string | null
          signup_enabled: boolean
          site_description: string | null
          site_name: string
          updated_at: string
          uploads_enabled: boolean
        }
        Insert: {
          ads_enabled?: boolean
          created_at?: string
          extra?: Json
          favicon_url?: string | null
          id?: number
          logo_url?: string | null
          maintenance_mode?: boolean
          min_withdrawal?: number
          primary_color?: string | null
          signup_enabled?: boolean
          site_description?: string | null
          site_name?: string
          updated_at?: string
          uploads_enabled?: boolean
        }
        Update: {
          ads_enabled?: boolean
          created_at?: string
          extra?: Json
          favicon_url?: string | null
          id?: number
          logo_url?: string | null
          maintenance_mode?: boolean
          min_withdrawal?: number
          primary_color?: string | null
          signup_enabled?: boolean
          site_description?: string | null
          site_name?: string
          updated_at?: string
          uploads_enabled?: boolean
        }
        Relationships: []
      }
      trending_sounds: {
        Row: {
          artist: string | null
          audio_track_id: string
          category: string | null
          cover_url: string | null
          created_at: string
          id: string
          is_trending: boolean
          title: string | null
          trend_score: number
          updated_at: string
          usage_count: number
        }
        Insert: {
          artist?: string | null
          audio_track_id: string
          category?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          is_trending?: boolean
          title?: string | null
          trend_score?: number
          updated_at?: string
          usage_count?: number
        }
        Update: {
          artist?: string | null
          audio_track_id?: string
          category?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          is_trending?: boolean
          title?: string | null
          trend_score?: number
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      user_consents: {
        Row: {
          advertising: boolean
          analytics: boolean
          anon_id: string | null
          created_at: string
          id: string
          necessary: boolean
          policy_version: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          advertising?: boolean
          analytics?: boolean
          anon_id?: string | null
          created_at?: string
          id?: string
          necessary?: boolean
          policy_version?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          advertising?: boolean
          analytics?: boolean
          anon_id?: string | null
          created_at?: string
          id?: string
          necessary?: boolean
          policy_version?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_wallets: {
        Row: {
          balance: number
          total_earned: number
          total_withdrawn: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_withdrawal_methods: {
        Row: {
          account_holder_name: string | null
          account_identifier: string
          id: string
          is_default: boolean
          method_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_holder_name?: string | null
          account_identifier: string
          id?: string
          is_default?: boolean
          method_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_holder_name?: string | null
          account_identifier?: string
          id?: string
          is_default?: boolean
          method_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      video_ads: {
        Row: {
          ad_url: string
          created_at: string
          id: string
          status: string
          video_id: string
        }
        Insert: {
          ad_url: string
          created_at?: string
          id?: string
          status?: string
          video_id: string
        }
        Update: {
          ad_url?: string
          created_at?: string
          id?: string
          status?: string
          video_id?: string
        }
        Relationships: []
      }
      video_comments: {
        Row: {
          created_at: string
          id: string
          likes_count: number | null
          parent_id: string | null
          replies_count: number | null
          text: string
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          likes_count?: number | null
          parent_id?: string | null
          replies_count?: number | null
          text: string
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          likes_count?: number | null
          parent_id?: string | null
          replies_count?: number | null
          text?: string
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "video_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_downloads: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      video_likes: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string
          status: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          status?: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
          video_id?: string
        }
        Relationships: []
      }
      video_saves: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_shares: {
        Row: {
          channel: string
          created_at: string
          id: string
          platform: string | null
          user_id: string | null
          video_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          platform?: string | null
          user_id?: string | null
          video_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          platform?: string | null
          user_id?: string | null
          video_id?: string
        }
        Relationships: []
      }
      video_views: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          user_id: string | null
          video_id: string
          viewer_id: string | null
          watch_seconds: number
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
          video_id: string
          viewer_id?: string | null
          watch_seconds?: number
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
          video_id?: string
          viewer_id?: string | null
          watch_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_views_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          age_restriction: string | null
          aspect_ratio: number | null
          audio_track_id: string | null
          audio_track_title: string | null
          auto_suppressed: boolean
          boost_score: number
          category: string | null
          comments_count: number | null
          created_at: string
          description: string | null
          duet_source_video: string | null
          duration_seconds: number | null
          id: string
          is_pending_review: boolean
          is_removed: boolean
          is_shadow_banned: boolean
          is_short: boolean
          language: string | null
          license: string | null
          likes_count: number | null
          mime_type: string | null
          moderation_reason: string | null
          monetization_enabled: boolean | null
          original_sound_credit: string | null
          owner_id: string
          preview_sprite_frames: number | null
          preview_sprite_url: string | null
          preview_url: string | null
          published_at: string | null
          r2_thumb_key: string | null
          r2_video_key: string
          reaction_source_video: string | null
          report_count: number
          scheduled_at: string | null
          sha256: string | null
          shares_count: number | null
          size_bytes: number | null
          sound_usage_count: number
          status: string
          stitch_position: number | null
          stitch_source_videos: string[] | null
          tags: string[] | null
          thumb_url: string | null
          title: string
          trending_score: number
          updated_at: string
          variants: Json | null
          video_url: string
          views_count: number
          visibility: string
        }
        Insert: {
          age_restriction?: string | null
          aspect_ratio?: number | null
          audio_track_id?: string | null
          audio_track_title?: string | null
          auto_suppressed?: boolean
          boost_score?: number
          category?: string | null
          comments_count?: number | null
          created_at?: string
          description?: string | null
          duet_source_video?: string | null
          duration_seconds?: number | null
          id?: string
          is_pending_review?: boolean
          is_removed?: boolean
          is_shadow_banned?: boolean
          is_short?: boolean
          language?: string | null
          license?: string | null
          likes_count?: number | null
          mime_type?: string | null
          moderation_reason?: string | null
          monetization_enabled?: boolean | null
          original_sound_credit?: string | null
          owner_id: string
          preview_sprite_frames?: number | null
          preview_sprite_url?: string | null
          preview_url?: string | null
          published_at?: string | null
          r2_thumb_key?: string | null
          r2_video_key: string
          reaction_source_video?: string | null
          report_count?: number
          scheduled_at?: string | null
          sha256?: string | null
          shares_count?: number | null
          size_bytes?: number | null
          sound_usage_count?: number
          status?: string
          stitch_position?: number | null
          stitch_source_videos?: string[] | null
          tags?: string[] | null
          thumb_url?: string | null
          title: string
          trending_score?: number
          updated_at?: string
          variants?: Json | null
          video_url: string
          views_count?: number
          visibility?: string
        }
        Update: {
          age_restriction?: string | null
          aspect_ratio?: number | null
          audio_track_id?: string | null
          audio_track_title?: string | null
          auto_suppressed?: boolean
          boost_score?: number
          category?: string | null
          comments_count?: number | null
          created_at?: string
          description?: string | null
          duet_source_video?: string | null
          duration_seconds?: number | null
          id?: string
          is_pending_review?: boolean
          is_removed?: boolean
          is_shadow_banned?: boolean
          is_short?: boolean
          language?: string | null
          license?: string | null
          likes_count?: number | null
          mime_type?: string | null
          moderation_reason?: string | null
          monetization_enabled?: boolean | null
          original_sound_credit?: string | null
          owner_id?: string
          preview_sprite_frames?: number | null
          preview_sprite_url?: string | null
          preview_url?: string | null
          published_at?: string | null
          r2_thumb_key?: string | null
          r2_video_key?: string
          reaction_source_video?: string | null
          report_count?: number
          scheduled_at?: string | null
          sha256?: string | null
          shares_count?: number | null
          size_bytes?: number | null
          sound_usage_count?: number
          status?: string
          stitch_position?: number | null
          stitch_source_videos?: string[] | null
          tags?: string[] | null
          thumb_url?: string | null
          title?: string
          trending_score?: number
          updated_at?: string
          variants?: Json | null
          video_url?: string
          views_count?: number
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          balance_after: number | null
          created_at: string
          delta: number
          id: string
          kind: string
          performed_by: string | null
          reason: string | null
          reference_id: string | null
          user_id: string
        }
        Insert: {
          balance_after?: number | null
          created_at?: string
          delta: number
          id?: string
          kind: string
          performed_by?: string | null
          reason?: string | null
          reference_id?: string | null
          user_id: string
        }
        Update: {
          balance_after?: number | null
          created_at?: string
          delta?: number
          id?: string
          kind?: string
          performed_by?: string | null
          reason?: string | null
          reference_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      watch_history: {
        Row: {
          created_at: string | null
          id: string
          last_watched_at: string | null
          updated_at: string
          user_id: string
          video_id: string
          watch_seconds: number
          watched_at: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_watched_at?: string | null
          updated_at?: string
          user_id: string
          video_id: string
          watch_seconds?: number
          watched_at?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_watched_at?: string | null
          updated_at?: string
          user_id?: string
          video_id?: string
          watch_seconds?: number
          watched_at?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          admin_note: string | null
          amount: number
          country: string | null
          created_at: string
          destination: string | null
          id: string
          method: string | null
          payment_details: Json
          processed_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          country?: string | null
          created_at?: string
          destination?: string | null
          id?: string
          method?: string | null
          payment_details?: Json
          processed_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          country?: string | null
          created_at?: string
          destination?: string | null
          id?: string
          method?: string | null
          payment_details?: Json
          processed_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_wallet: {
        Args: { p_delta: number; p_set_balance?: number; p_user_id: string }
        Returns: {
          balance: number
          total_earned: number
          total_withdrawn: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_ban_user: {
        Args: { p_reason: string; p_until?: string; p_user: string }
        Returns: Json
      }
      admin_bootstrap_status: {
        Args: never
        Returns: {
          can_claim_initial_admin: boolean
          is_admin: boolean
        }[]
      }
      admin_delete_ip_rule: { Args: { p_ip: string }; Returns: Json }
      admin_flag_bot: {
        Args: { p_flag?: boolean; p_user: string }
        Returns: Json
      }
      admin_mark_withdrawal_processed: {
        Args: { p_note?: string; p_request_id: string }
        Returns: {
          admin_note: string | null
          amount: number
          country: string | null
          created_at: string
          destination: string | null
          id: string
          method: string | null
          payment_details: Json
          processed_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "withdrawal_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_ip_rule: {
        Args: {
          p_expires?: string
          p_ip: string
          p_mode: string
          p_reason?: string
        }
        Returns: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          ip_address: string
          mode: string
          reason: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "ip_rules"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_role: {
        Args: {
          p_grant: boolean
          p_role: Database["public"]["Enums"]["app_role"]
          p_user: string
        }
        Returns: Json
      }
      admin_set_video_boost: {
        Args: { p_score: number; p_video: string }
        Returns: Json
      }
      admin_unban_user: { Args: { p_user: string }; Returns: Json }
      admin_unflag_bot: { Args: { p_user: string }; Returns: Json }
      assign_ab_variant: { Args: { p_test: string }; Returns: string }
      bump_ad_slot_impression: { Args: { p_slot: string }; Returns: undefined }
      cancel_account_deletion: { Args: never; Returns: Json }
      claim_initial_admin: { Args: never; Returns: Json }
      create_copyright_claim: {
        Args: {
          p_claim_type: string
          p_claimant_id: string
          p_match_percentage?: number
          p_matched_content_id?: string
          p_matched_content_owner?: string
          p_matched_content_title?: string
          p_severity?: string
          p_video_id: string
        }
        Returns: string
      }
      dispute_copyright_claim: {
        Args: {
          p_claim_id: string
          p_dispute_evidence?: string[]
          p_dispute_reason: string
        }
        Returns: boolean
      }
      export_my_data: { Args: never; Returns: Json }
      get_algo_weights: { Args: never; Returns: Json }
      get_audit_logs: {
        Args: {
          p_action?: string
          p_limit?: number
          p_offset?: number
          p_severity?: string
          p_user?: string
        }
        Returns: {
          action: string
          actor_email: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json
          severity: string
          user_agent: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "audit_logs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_channel_notices: {
        Args: { p_limit?: number; p_unread_only?: boolean; p_user_id?: string }
        Returns: {
          action_label: string
          action_required: boolean
          action_url: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          notice_type: string
          related_video_id: string
          severity: string
          title: string
        }[]
      }
      get_creator_analytics: {
        Args: { p_days?: number; p_user?: string }
        Returns: Json
      }
      get_home_feed_v2: {
        Args: {
          p_category?: string
          p_is_short?: boolean
          p_kind?: string
          p_limit?: number
          p_max_per_category?: number
          p_max_per_creator?: number
          p_offset?: number
        }
        Returns: {
          category: string
          created_at: string
          description: string
          duration_seconds: number
          id: string
          is_short: boolean
          owner_id: string
          preview_sprite_frames: number
          preview_sprite_url: string
          thumb_url: string
          title: string
          video_url: string
          views_count: number
        }[]
      }
      get_platform_overview: { Args: never; Returns: Json }
      get_related_videos: {
        Args: { p_limit?: number; p_video: string }
        Returns: {
          age_restriction: string | null
          aspect_ratio: number | null
          audio_track_id: string | null
          audio_track_title: string | null
          auto_suppressed: boolean
          boost_score: number
          category: string | null
          comments_count: number | null
          created_at: string
          description: string | null
          duet_source_video: string | null
          duration_seconds: number | null
          id: string
          is_pending_review: boolean
          is_removed: boolean
          is_shadow_banned: boolean
          is_short: boolean
          language: string | null
          license: string | null
          likes_count: number | null
          mime_type: string | null
          moderation_reason: string | null
          monetization_enabled: boolean | null
          original_sound_credit: string | null
          owner_id: string
          preview_sprite_frames: number | null
          preview_sprite_url: string | null
          preview_url: string | null
          published_at: string | null
          r2_thumb_key: string | null
          r2_video_key: string
          reaction_source_video: string | null
          report_count: number
          scheduled_at: string | null
          sha256: string | null
          shares_count: number | null
          size_bytes: number | null
          sound_usage_count: number
          status: string
          stitch_position: number | null
          stitch_source_videos: string[] | null
          tags: string[] | null
          thumb_url: string | null
          title: string
          trending_score: number
          updated_at: string
          variants: Json | null
          video_url: string
          views_count: number
          visibility: string
        }[]
        SetofOptions: {
          from: "*"
          to: "videos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_shorts_feed: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          age_restriction: string | null
          aspect_ratio: number | null
          audio_track_id: string | null
          audio_track_title: string | null
          auto_suppressed: boolean
          boost_score: number
          category: string | null
          comments_count: number | null
          created_at: string
          description: string | null
          duet_source_video: string | null
          duration_seconds: number | null
          id: string
          is_pending_review: boolean
          is_removed: boolean
          is_shadow_banned: boolean
          is_short: boolean
          language: string | null
          license: string | null
          likes_count: number | null
          mime_type: string | null
          moderation_reason: string | null
          monetization_enabled: boolean | null
          original_sound_credit: string | null
          owner_id: string
          preview_sprite_frames: number | null
          preview_sprite_url: string | null
          preview_url: string | null
          published_at: string | null
          r2_thumb_key: string | null
          r2_video_key: string
          reaction_source_video: string | null
          report_count: number
          scheduled_at: string | null
          sha256: string | null
          shares_count: number | null
          size_bytes: number | null
          sound_usage_count: number
          status: string
          stitch_position: number | null
          stitch_source_videos: string[] | null
          tags: string[] | null
          thumb_url: string | null
          title: string
          trending_score: number
          updated_at: string
          variants: Json | null
          video_url: string
          views_count: number
          visibility: string
        }[]
        SetofOptions: {
          from: "*"
          to: "videos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_studio_dashboard: { Args: { p_user?: string }; Returns: Json }
      get_video_copyright_claims: {
        Args: { p_video_id: string }
        Returns: {
          action_taken: string
          claim_type: string
          detected_at: string
          id: string
          match_percentage: number
          matched_content_owner: string
          matched_content_title: string
          severity: string
          status: string
        }[]
      }
      get_video_retention: { Args: { p_video: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_entity_id?: string
          p_entity_type?: string
          p_ip_address?: string
          p_metadata?: Json
          p_severity?: string
          p_user_agent?: string
        }
        Returns: string
      }
      log_video_impression: {
        Args: { p_surface?: string; p_video: string }
        Returns: undefined
      }
      mark_notice_read: { Args: { p_notice_id: string }; Returns: boolean }
      pick_ad_for_video: { Args: { p_video: string }; Returns: Json }
      post_comment: {
        Args: {
          p_creator?: string
          p_parent?: string
          p_text: string
          p_video: string
        }
        Returns: {
          created_at: string
          id: string
          likes_count: number | null
          parent_id: string | null
          replies_count: number | null
          text: string
          updated_at: string
          user_id: string
          video_id: string
        }
        SetofOptions: {
          from: "*"
          to: "video_comments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_ab_event: {
        Args: {
          p_event: string
          p_test: string
          p_value?: number
          p_variant: string
        }
        Returns: undefined
      }
      record_ad_view: {
        Args: {
          p_ad_network?: string
          p_ad_revenue?: number
          p_cpm?: number
          p_video_id: string
        }
        Returns: Json
      }
      record_download: { Args: { p_video: string }; Returns: Json }
      record_heartbeat: {
        Args: { p_seconds?: number; p_video: string }
        Returns: Json
      }
      record_share:
        | { Args: { p_channel?: string; p_video: string }; Returns: Json }
        | { Args: { p_platform?: string; p_video: string }; Returns: Json }
      record_view:
        | {
            Args: {
              p_ip_hash?: string
              p_video: string
              p_watch_seconds?: number
            }
            Returns: Json
          }
        | {
            Args: {
              p_ip_hash?: string
              p_video: string
              p_watch_seconds?: number
            }
            Returns: Json
          }
      record_watch_history: {
        Args: { p_video: string; p_watch_seconds?: number }
        Returns: Json
      }
      record_watch_progress: {
        Args: { p_seconds?: number; p_video: string }
        Returns: Json
      }
      release_copyright_claim: {
        Args: { p_claim_id: string }
        Returns: boolean
      }
      request_account_deletion: {
        Args: { p_reason?: string }
        Returns: {
          admin_note: string | null
          cancelled_at: string | null
          confirmed_at: string | null
          created_at: string
          id: string
          reason: string | null
          reviewed_by: string | null
          scheduled_purge_at: string
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "account_deletion_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_withdrawal: {
        Args: { p_amount: number; p_details?: Json; p_method?: string }
        Returns: {
          admin_note: string | null
          amount: number
          country: string | null
          created_at: string
          destination: string | null
          id: string
          method: string | null
          payment_details: Json
          processed_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "withdrawal_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      search_videos_suggest: {
        Args: { p_limit?: number; p_q: string }
        Returns: {
          id: string
          thumb_url: string
          title: string
        }[]
      }
      settle_ad_impression: {
        Args: {
          p_ad_id: string
          p_completed: boolean
          p_creator_id: string
          p_video_id: string
        }
        Returns: {
          creator_share: number
          reason: string
          settled: boolean
        }[]
      }
      toggle_follow: { Args: { p_target: string }; Returns: Json }
      toggle_like: {
        Args: { p_creator?: string; p_video: string }
        Returns: Json
      }
      toggle_save:
        | {
            Args: { p_video: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.toggle_save(p_video => text), public.toggle_save(p_video => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { p_video: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.toggle_save(p_video => text), public.toggle_save(p_video => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      update_algorithm_weights: {
        Args: { p_note?: string; p_weights: Json }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
