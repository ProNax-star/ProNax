-- User Settings Migration
-- This migration adds a table for user settings that sync across devices

CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    theme text DEFAULT 'system' NOT NULL CHECK (theme IN ('light', 'dark', 'system')),
    language text DEFAULT 'en' NOT NULL,
    autoplay_videos boolean DEFAULT true NOT NULL,
    autoplay_shorts boolean DEFAULT true NOT NULL,
    muted boolean DEFAULT false NOT NULL,
    quality_preference text DEFAULT 'auto' NOT NULL CHECK (quality_preference IN ('auto', '360p', '480p', '720p', '1080p', '4k')),
    captions_enabled boolean DEFAULT false NOT NULL,
    captions_language text DEFAULT 'en' NOT NULL,
    mini_player_enabled boolean DEFAULT true NOT NULL,
    notifications_enabled boolean DEFAULT true NOT NULL,
    restricted_mode boolean DEFAULT false NOT NULL,
    playback_speed numeric DEFAULT 1.0 NOT NULL CHECK (playback_speed >= 0.25 AND playback_speed <= 2.0),
    custom_settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_settings_updated_at ON public.user_settings(updated_at DESC);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_settings
DROP POLICY IF EXISTS "users_manage_own_settings" ON public.user_settings;
CREATE POLICY "users_manage_own_settings" ON public.user_settings
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.user_settings TO authenticated;

-- Function to get user settings
CREATE OR REPLACE FUNCTION get_user_settings(p_user_id uuid)
RETURNS TABLE (
    user_id uuid,
    theme text,
    language text,
    autoplay_videos boolean,
    autoplay_shorts boolean,
    muted boolean,
    quality_preference text,
    captions_enabled boolean,
    captions_language text,
    mini_player_enabled boolean,
    notifications_enabled boolean,
    restricted_mode boolean,
    playback_speed numeric,
    custom_settings jsonb,
    updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.user_id,
        us.theme,
        us.language,
        us.autoplay_videos,
        us.autoplay_shorts,
        us.muted,
        us.quality_preference,
        us.captions_enabled,
        us.captions_language,
        us.mini_player_enabled,
        us.notifications_enabled,
        us.restricted_mode,
        us.playback_speed,
        us.custom_settings,
        us.updated_at
    FROM public.user_settings us
    WHERE us.user_id = p_user_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_settings(uuid) TO authenticated;

-- Function to update user settings
CREATE OR REPLACE FUNCTION update_user_settings(
    p_user_id uuid,
    p_theme text DEFAULT NULL,
    p_language text DEFAULT NULL,
    p_autoplay_videos boolean DEFAULT NULL,
    p_autoplay_shorts boolean DEFAULT NULL,
    p_muted boolean DEFAULT NULL,
    p_quality_preference text DEFAULT NULL,
    p_captions_enabled boolean DEFAULT NULL,
    p_captions_language text DEFAULT NULL,
    p_mini_player_enabled boolean DEFAULT NULL,
    p_notifications_enabled boolean DEFAULT NULL,
    p_restricted_mode boolean DEFAULT NULL,
    p_playback_speed numeric DEFAULT NULL,
    p_custom_settings jsonb DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.user_settings (
        user_id,
        theme,
        language,
        autoplay_videos,
        autoplay_shorts,
        muted,
        quality_preference,
        captions_enabled,
        captions_language,
        mini_player_enabled,
        notifications_enabled,
        restricted_mode,
        playback_speed,
        custom_settings
    ) VALUES (
        p_user_id,
        COALESCE(p_theme, 'system'),
        COALESCE(p_language, 'en'),
        COALESCE(p_autoplay_videos, true),
        COALESCE(p_autoplay_shorts, true),
        COALESCE(p_muted, false),
        COALESCE(p_quality_preference, 'auto'),
        COALESCE(p_captions_enabled, false),
        COALESCE(p_captions_language, 'en'),
        COALESCE(p_mini_player_enabled, true),
        COALESCE(p_notifications_enabled, true),
        COALESCE(p_restricted_mode, false),
        COALESCE(p_playback_speed, 1.0),
        COALESCE(p_custom_settings, '{}'::jsonb)
    )
    ON CONFLICT (user_id) DO UPDATE SET
        theme = COALESCE(p_theme, user_settings.theme),
        language = COALESCE(p_language, user_settings.language),
        autoplay_videos = COALESCE(p_autoplay_videos, user_settings.autoplay_videos),
        autoplay_shorts = COALESCE(p_autoplay_shorts, user_settings.autoplay_shorts),
        muted = COALESCE(p_muted, user_settings.muted),
        quality_preference = COALESCE(p_quality_preference, user_settings.quality_preference),
        captions_enabled = COALESCE(p_captions_enabled, user_settings.captions_enabled),
        captions_language = COALESCE(p_captions_language, user_settings.captions_language),
        mini_player_enabled = COALESCE(p_mini_player_enabled, user_settings.mini_player_enabled),
        notifications_enabled = COALESCE(p_notifications_enabled, user_settings.notifications_enabled),
        restricted_mode = COALESCE(p_restricted_mode, user_settings.restricted_mode),
        playback_speed = COALESCE(p_playback_speed, user_settings.playback_speed),
        custom_settings = COALESCE(p_custom_settings, user_settings.custom_settings),
        updated_at = now();
    
    RETURN true;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_user_settings(
    uuid, text, text, boolean, boolean, boolean, text, boolean, text, boolean, boolean, boolean, numeric, jsonb
) TO authenticated;

-- Function to initialize user settings (trigger on new user)
CREATE OR REPLACE FUNCTION initialize_user_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION initialize_user_settings() TO service_role;

-- Trigger to auto-initialize settings for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION initialize_user_settings();

-- Add comments
COMMENT ON TABLE public.user_settings IS 'User settings that sync across devices';
COMMENT ON FUNCTION get_user_settings IS 'Get user settings';
COMMENT ON FUNCTION update_user_settings IS 'Update user settings (upsert)';
COMMENT ON FUNCTION initialize_user_settings IS 'Initialize default settings for new users';