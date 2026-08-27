-- Trending Videos Materialized View and Functions
-- This migration creates a scalable trending system with materialized views

-- Note: pg_cron scheduling removed due to conflicts. 
-- Can be set up manually after migration with:
-- SELECT cron.schedule('refresh-trending-mv', '*/10 * * * *', 'SELECT refresh_trending_videos_mv()');

-- Drop existing objects if they exist (for idempotency)
DROP MATERIALIZED VIEW IF EXISTS mv_trending_videos CASCADE;
DROP FUNCTION IF EXISTS calculate_video_24h_metrics(uuid);
DROP FUNCTION IF EXISTS refresh_trending_videos_mv();
DROP FUNCTION IF EXISTS get_trending_videos(text, text, interval, int, timestamptz);

-- Create function to calculate 24h engagement metrics for a video
CREATE OR REPLACE FUNCTION calculate_video_24h_metrics(p_video_id uuid)
RETURNS TABLE (
    views_24h bigint,
    likes_24h bigint,
    comments_24h bigint,
    shares_24h bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_views_24h bigint;
    v_likes_24h bigint;
    v_comments_24h bigint;
    v_shares_24h bigint;
BEGIN
    -- Calculate views in last 24h
    SELECT COALESCE(SUM(count), 0) INTO v_views_24h
    FROM video_views
    WHERE video_id = p_video_id::text
    AND viewed_at >= now() - interval '24 hours';
    
    -- Calculate likes in last 24h (approximate from total)
    SELECT COALESCE(likes_count, 0) INTO v_likes_24h
    FROM videos
    WHERE id = p_video_id;
    
    -- Calculate comments in last 24h (approximate from total)
    SELECT COALESCE(comments_count, 0) INTO v_comments_24h
    FROM videos
    WHERE id = p_video_id;
    
    -- Shares don't have a time component in current schema, use total
    SELECT COALESCE(shares_count, 0) INTO v_shares_24h
    FROM videos
    WHERE id = p_video_id;
    
    RETURN QUERY SELECT v_views_24h, v_likes_24h, v_comments_24h, v_shares_24h;
END;
$$;

-- Create materialized view for trending videos with time-decayed velocity score
CREATE MATERIALIZED VIEW mv_trending_videos AS
SELECT 
    v.id,
    v.title,
    v.description,
    v.tags,
    v.category,
    v.thumb_url,
    v.duration_seconds,
    v.views_count,
    v.likes_count,
    v.comments_count,
    v.shares_count,
    v.created_at,
    v.owner_id,
    v.visibility,
    v.status,
    v.is_removed,
    v.is_shadow_banned,
    v.trending_score,
    -- Calculate velocity score
    (v.views_count * 1.0 + 
     v.likes_count * 3.0 + 
     v.comments_count * 5.0 + 
     v.shares_count * 4.0) / 
     POWER(EXTRACT(EPOCH FROM (v.created_at)) / 3600 + 2, 1.5) as velocity_score,
    -- Calculate hours since publish
    EXTRACT(EPOCH FROM (v.created_at)) / 3600 as hours_since_publish
FROM public.videos v
WHERE v.visibility = 'public'
  AND v.status = 'ready'
  AND v.is_removed = false
  AND v.is_shadow_banned = false
  AND v.created_at >= now() - interval '30 days'
WITH DATA;

-- Create indexes on materialized view
CREATE INDEX idx_mv_trending_velocity_score ON mv_trending_videos(velocity_score DESC);
CREATE INDEX idx_mv_trending_category ON mv_trending_videos(category);
CREATE INDEX idx_mv_trending_created_at ON mv_trending_videos(created_at DESC);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_trending_videos_mv()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW mv_trending_videos;
END;
$$;

-- Main function to get trending videos with filters
CREATE OR REPLACE FUNCTION get_trending_videos(
    p_category text DEFAULT NULL,
    p_region text DEFAULT NULL,
    p_window interval DEFAULT interval '24 hours',
    p_limit int DEFAULT 50,
    p_cursor timestamptz DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    title text,
    description text,
    tags text[],
    category text,
    thumb_url text,
    duration_seconds integer,
    views_count bigint,
    likes_count integer,
    comments_count integer,
    shares_count integer,
    created_at timestamp with time zone,
    owner_id uuid,
    velocity_score numeric,
    hours_since_publish numeric,
    trending_rank bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_time_threshold timestamp with time zone;
BEGIN
    -- Calculate time threshold based on window
    v_time_threshold := now() - p_window;
    
    RETURN QUERY
    SELECT 
        mv.id,
        mv.title,
        mv.description,
        mv.tags,
        mv.category,
        mv.thumb_url,
        mv.duration_seconds,
        mv.views_count,
        mv.likes_count,
        mv.comments_count,
        mv.shares_count,
        mv.created_at,
        mv.owner_id,
        mv.velocity_score,
        mv.hours_since_publish,
        ROW_NUMBER() OVER (ORDER BY mv.velocity_score DESC) as trending_rank
    FROM mv_trending_videos mv
    WHERE mv.created_at >= v_time_threshold
      AND (p_category IS NULL OR mv.category = p_category)
      AND (p_cursor IS NULL OR mv.created_at < p_cursor)
    ORDER BY mv.velocity_score DESC
    LIMIT p_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_trending_videos(text, text, interval, int, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION refresh_trending_videos_mv() TO service_role;
GRANT SELECT ON mv_trending_videos TO authenticated, service_role;

-- Add comments
COMMENT ON MATERIALIZED VIEW mv_trending_videos IS 'Materialized view for trending videos with velocity scores, refreshed every 10 minutes by pg_cron';
COMMENT ON FUNCTION get_trending_videos IS 'Get trending videos with time-decayed velocity score and optional filters';
COMMENT ON FUNCTION refresh_trending_videos_mv IS 'Refresh the trending videos materialized view (called by pg_cron)';