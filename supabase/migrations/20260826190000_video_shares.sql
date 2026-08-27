-- Video Shares Migration
-- This migration adds a table to track video share events for analytics

-- Drop table if it exists to ensure clean schema
DROP TABLE IF EXISTS public.video_shares CASCADE;

CREATE TABLE public.video_shares (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    platform text NOT NULL CHECK (platform IN ('clipboard', 'twitter', 'facebook', 'whatsapp', 'telegram', 'native', 'other')),
    shared_at timestamp with time zone DEFAULT now() NOT NULL,
    user_agent text,
    ip_address inet
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_shares_video_id ON public.video_shares(video_id);
CREATE INDEX IF NOT EXISTS idx_video_shares_user_id ON public.video_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_video_shares_shared_at ON public.video_shares(shared_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_shares_platform ON public.video_shares(platform);

-- Enable RLS
ALTER TABLE public.video_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_shares
DROP POLICY IF EXISTS "anyone_can_insert_shares" ON public.video_shares;
CREATE POLICY "anyone_can_insert_shares" ON public.video_shares
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "users_can_view_own_shares" ON public.video_shares;
CREATE POLICY "users_can_view_own_shares" ON public.video_shares
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "video_owners_can_view_shares" ON public.video_shares;
CREATE POLICY "video_owners_can_view_shares" ON public.video_shares
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.videos
            WHERE videos.id = video_shares.video_id
            AND videos.owner_id = auth.uid()
        )
    );

-- Grant permissions
GRANT SELECT, INSERT ON public.video_shares TO authenticated;
GRANT SELECT, INSERT ON public.video_shares TO anon;

-- Function to record a video share
CREATE OR REPLACE FUNCTION record_video_share(
    p_video_id uuid,
    p_user_id uuid DEFAULT NULL,
    p_platform text DEFAULT 'clipboard',
    p_user_agent text DEFAULT NULL,
    p_ip_address inet DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_share_id uuid;
BEGIN
    INSERT INTO public.video_shares (
        video_id,
        user_id,
        platform,
        user_agent,
        ip_address
    ) VALUES (
        p_video_id,
        p_user_id,
        p_platform,
        p_user_agent,
        p_ip_address
    )
    RETURNING id
    INTO v_share_id;
    
    RETURN v_share_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION record_video_share(uuid, uuid, text, text, inet) TO authenticated;
GRANT EXECUTE ON FUNCTION record_video_share(uuid, uuid, text, text, inet) TO anon;

-- Function to get share count for a video
CREATE OR REPLACE FUNCTION get_video_share_count(p_video_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.video_shares
        WHERE video_id = p_video_id
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_video_share_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_video_share_count(uuid) TO anon;

-- Function to get share breakdown by platform for a video
CREATE OR REPLACE FUNCTION get_video_share_breakdown(p_video_id uuid)
RETURNS TABLE (
    platform text,
    count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        platform,
        COUNT(*) as count
    FROM public.video_shares
    WHERE video_id = p_video_id
    GROUP BY platform
    ORDER BY count DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_video_share_breakdown(uuid) TO authenticated;

-- Add comments
COMMENT ON TABLE public.video_shares IS 'Track video share events for analytics';
COMMENT ON FUNCTION record_video_share IS 'Record a video share event';
COMMENT ON FUNCTION get_video_share_count IS 'Get total share count for a video';
COMMENT ON FUNCTION get_video_share_breakdown IS 'Get share breakdown by platform for a video';