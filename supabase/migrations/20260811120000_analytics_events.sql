-- Create analytics events table for tracking real-time performance data
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE,
    event_type text NOT NULL CHECK (event_type IN ('view', 'impression', 'click', 'traffic_source', 'geography')),
    session_id text,
    event_data jsonb DEFAULT '{}'::jsonb,
    country_code text,
    country_name text,
    traffic_source text,
    referrer_url text,
    user_agent text,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    
    -- Indexes for common queries
    CONSTRAINT analytics_events_user_id_check CHECK (user_id IS NOT NULL)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_video_id ON public.analytics_events(video_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_country_code ON public.analytics_events(country_code);
CREATE INDEX IF NOT EXISTS idx_analytics_events_traffic_source ON public.analytics_events(traffic_source);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created ON public.analytics_events(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own analytics events
DROP POLICY IF EXISTS "Users can insert analytics events" ON public.analytics_events;
CREATE POLICY "Users can insert analytics events"
    ON public.analytics_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can read their own analytics events
DROP POLICY IF EXISTS "Users can read analytics events" ON public.analytics_events;
CREATE POLICY "Users can read analytics events"
    ON public.analytics_events FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can delete their own analytics events
DROP POLICY IF EXISTS "Users can delete analytics events" ON public.analytics_events;
CREATE POLICY "Users can delete analytics events"
    ON public.analytics_events FOR DELETE
    USING (auth.uid() = user_id);

-- Function to get aggregated analytics data
CREATE OR REPLACE FUNCTION get_aggregated_analytics(p_user_id uuid, p_days integer DEFAULT 28)
RETURNS TABLE (
    date text,
    views bigint,
    watch_time_hours numeric,
    subscribers bigint,
    revenue numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE_TRUNC('day', created_at)::date::text as date,
        COUNT(*) FILTER (WHERE event_type = 'view')::bigint as views,
        COALESCE(SUM((event_data->>'watch_time_seconds')::numeric) / 3600, 0) as watch_time_hours,
        0 as subscribers, -- Will be populated separately
        0 as revenue -- Will be populated separately
    FROM public.analytics_events
    WHERE user_id = p_user_id
    AND event_type = 'view'
    AND created_at >= NOW() - INTERVAL '1 day' * p_days
    GROUP BY DATE_TRUNC('day', created_at)
    ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get traffic sources distribution
CREATE OR REPLACE FUNCTION get_traffic_sources_analytics(p_user_id uuid)
RETURNS TABLE (
    source text,
    percentage numeric,
    views bigint
) AS $$
DECLARE
    total_views bigint;
BEGIN
    -- Get total views count
    SELECT COUNT(*) INTO total_views
    FROM public.analytics_events
    WHERE user_id = p_user_id
    AND event_type = 'view';
    
    -- Return traffic sources with percentages
    RETURN QUERY
    SELECT 
        COALESCE(traffic_source, 'Unknown') as source,
        CASE 
            WHEN total_views > 0 THEN 
                ROUND((COUNT(*)::numeric / total_views::numeric) * 100, 1)
            ELSE 0 
        END as percentage,
        COUNT(*)::bigint as views
    FROM public.analytics_events
    WHERE user_id = p_user_id
    AND event_type = 'view'
    GROUP BY COALESCE(traffic_source, 'Unknown')
    ORDER BY views DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get geography distribution
CREATE OR REPLACE FUNCTION get_geography_analytics(p_user_id uuid)
RETURNS TABLE (
    country_code text,
    country_name text,
    percentage numeric
) AS $$
DECLARE
    total_views bigint;
BEGIN
    -- Get total views count
    SELECT COUNT(*) INTO total_views
    FROM public.analytics_events
    WHERE user_id = p_user_id
    AND event_type = 'view';
    
    -- Return geography data with percentages
    RETURN QUERY
    SELECT 
        COALESCE(country_code, '🌍') as country_code,
        COALESCE(country_name, 'Unknown') as country_name,
        CASE 
            WHEN total_views > 0 THEN 
                ROUND((COUNT(*)::numeric / total_views::numeric) * 100, 1)
            ELSE 0 
        END as percentage
    FROM public.analytics_events
    WHERE user_id = p_user_id
    AND event_type = 'view'
    GROUP BY COALESCE(country_code, '🌍'), COALESCE(country_name, 'Unknown')
    ORDER BY COUNT(*) DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Function to get real-time views
CREATE OR REPLACE FUNCTION get_realtime_views(p_user_id uuid)
RETURNS TABLE (
    last_48_hours bigint,
    last_60_minutes bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (
            WHERE created_at >= NOW() - INTERVAL '48 hours'
            AND event_type = 'view'
        )::bigint as last_48_hours,
        COUNT(*) FILTER (
            WHERE created_at >= NOW() - INTERVAL '60 minutes'
            AND event_type = 'view'
        )::bigint as last_60_minutes
    FROM public.analytics_events
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get minute-by-minute views for real-time chart
CREATE OR REPLACE FUNCTION get_minute_views(p_user_id uuid, p_minutes integer DEFAULT 60)
RETURNS TABLE (
    minute_label text,
    views bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN EXTRACT(MINUTE FROM NOW() - (i * INTERVAL '1 minute')) = 0 THEN
                (EXTRACT(HOUR FROM NOW() - (i * INTERVAL '1 minute'))::integer || ':00')::text
            ELSE
                (EXTRACT(HOUR FROM NOW() - (i * INTERVAL '1 minute'))::integer || ':' || 
                 LPAD(EXTRACT(MINUTE FROM NOW() - (i * INTERVAL '1 minute'))::integer::text, 2, '0'))::text
        END as minute_label,
        COUNT(*) FILTER (
            WHERE created_at >= NOW() - (i + 1) * INTERVAL '1 minute'
            AND created_at < NOW() - i * INTERVAL '1 minute'
            AND event_type = 'view'
        )::bigint as views
    FROM generate_series(0, p_minutes - 1) AS s(i)
    ORDER BY i DESC;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically clean up old analytics events (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_analytics()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.analytics_events
    WHERE created_at < NOW() - INTERVAL '90 days';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a function to manually trigger cleanup
CREATE OR REPLACE FUNCTION cleanup_analytics_events()
RETURNS bigint AS $$
DECLARE
    deleted_count bigint;
BEGIN
    DELETE FROM public.analytics_events
    WHERE created_at < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;