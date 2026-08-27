-- Add missing admin tables and columns

-- Add created_at to user_wallets
ALTER TABLE public.user_wallets ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;

-- Create user_strikes table
CREATE TABLE IF NOT EXISTS public.user_strikes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    reason text NOT NULL,
    severity text DEFAULT 'warning'::text NOT NULL,
    expires_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);

-- Create moderation_settings table (drop if exists to ensure correct structure)
DROP TABLE IF EXISTS public.moderation_settings;

CREATE TABLE public.moderation_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auto_moderation_enabled boolean DEFAULT true NOT NULL,
    spam_threshold numeric DEFAULT 0.7 NOT NULL,
    copyright_threshold numeric DEFAULT 0.8 NOT NULL,
    adult_content_threshold numeric DEFAULT 0.9 NOT NULL,
    auto_suppress_threshold integer DEFAULT 5 NOT NULL,
    manual_review_required boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add admin_response and reviewed_at to appeals
ALTER TABLE public.appeals 
ADD COLUMN IF NOT EXISTS admin_response text,
ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone;

-- Create admin moderation function
CREATE OR REPLACE FUNCTION public.admin_moderate_video(p_action text, p_reason text, p_video uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_action = 'approve' THEN
        UPDATE public.videos 
        SET is_pending_review = false, 
            moderation_reason = NULL,
            updated_at = now()
        WHERE id = p_video;
        RETURN jsonb_build_object('success', true, 'action', 'approved');
    ELSIF p_action = 'reject' THEN
        UPDATE public.videos 
        SET is_removed = true,
            is_pending_review = false,
            moderation_reason = p_reason,
            updated_at = now()
        WHERE id = p_video;
        RETURN jsonb_build_object('success', true, 'action', 'rejected');
    ELSIF p_action = 'shadow_ban' THEN
        UPDATE public.videos 
        SET is_shadow_banned = true,
            is_pending_review = false,
            moderation_reason = p_reason,
            updated_at = now()
        WHERE id = p_video;
        RETURN jsonb_build_object('success', true, 'action', 'shadow_banned');
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Invalid action');
    END IF;
END;
$$;

-- Create admin set video boost function
CREATE OR REPLACE FUNCTION public.admin_set_video_boost(p_video uuid, p_boost_score numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.videos 
    SET boost_score = p_boost_score,
        updated_at = now()
    WHERE id = p_video;
    RETURN jsonb_build_object('success', true, 'boost_score', p_boost_score);
END;
$$;

-- Drop existing admin_team_list function if it exists
DROP FUNCTION IF EXISTS public.admin_team_list();

-- Create admin team list function
CREATE OR REPLACE FUNCTION public.admin_team_list()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', p.id,
            'email', p.email,
            'display_name', p.display_name,
            'role', p.status,
            'created_at', p.created_at
        )
    )
    FROM profiles p
    WHERE p.status IN ('admin', 'moderator');
$$;

-- Insert default moderation settings if table is empty
INSERT INTO public.moderation_settings (auto_moderation_enabled, spam_threshold, copyright_threshold, adult_content_threshold, auto_suppress_threshold, manual_review_required)
SELECT true, 0.7, 0.8, 0.9, 5, false
WHERE NOT EXISTS (SELECT 1 FROM public.moderation_settings);
