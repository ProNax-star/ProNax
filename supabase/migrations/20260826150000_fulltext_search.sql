-- Full-Text Search Migration for Videos
-- This migration adds tsvector column for full-text search with GIN index and auto-update trigger

-- Add tsvector column to videos table
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS search_tsv tsvector;

-- Create a function to update the search_tsv column
CREATE OR REPLACE FUNCTION videos_search_tsv_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.search_tsv := 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update search_tsv on insert/update
DROP TRIGGER IF EXISTS videos_search_tsv_update ON public.videos;
CREATE TRIGGER videos_search_tsv_update
  BEFORE INSERT OR UPDATE OF title, description, tags ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION videos_search_tsv_trigger();

-- Create GIN index on the tsvector column for fast full-text search
CREATE INDEX IF NOT EXISTS idx_videos_search_tsv ON public.videos USING GIN(search_tsv);

-- Create index for combined search with visibility and status
CREATE INDEX IF NOT EXISTS idx_videos_search_composite ON public.videos(visibility, status, is_removed, is_shadow_banned) 
  WHERE visibility = 'public' AND status = 'ready' AND is_removed = false AND is_shadow_banned = false;

-- Function to perform full-text search on videos
CREATE OR REPLACE FUNCTION search_videos_fulltext(
  p_query text DEFAULT '',
  p_category text DEFAULT NULL,
  p_upload_date text DEFAULT NULL, -- 'today', 'week', 'month', 'year', 'any'
  p_duration_filter text DEFAULT NULL, -- 'short' (<4m), 'medium' (4-20m), 'long' (>20m), 'any'
  p_video_type text DEFAULT NULL, -- 'video', 'short', 'live', 'any'
  p_sort_by text DEFAULT 'relevance', -- 'relevance', 'date', 'views', 'rating'
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  thumb_url text,
  duration_seconds integer,
  views_count bigint,
  likes_count integer,
  comments_count integer,
  created_at timestamp with time zone,
  owner_id uuid,
  category text,
  tags text[],
  is_short boolean,
  rank real
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_search_query tsquery;
  v_time_threshold timestamp with time zone;
BEGIN
  -- Parse the search query using plainto_tsquery (handles AND/OR automatically)
  v_search_query := plainto_tsquery('english', p_query);
  
  -- If query is empty, return empty result
  IF v_search_query IS NULL THEN
    RETURN;
  END IF;
  
  -- Calculate time threshold based on upload_date filter
  CASE p_upload_date
    WHEN 'today' THEN v_time_threshold := now() - interval '24 hours';
    WHEN 'week' THEN v_time_threshold := now() - interval '7 days';
    WHEN 'month' THEN v_time_threshold := now() - interval '30 days';
    WHEN 'year' THEN v_time_threshold := now() - interval '365 days';
    ELSE v_time_threshold := '1970-01-01'::timestamp with time zone; -- Any time
  END CASE;
  
  RETURN QUERY
  SELECT 
    v.id,
    v.title,
    v.description,
    v.thumb_url,
    v.duration_seconds,
    v.views_count,
    v.likes_count,
    v.comments_count,
    v.created_at,
    v.owner_id,
    v.category,
    v.tags,
    v.is_short,
    ts_rank(v.search_tsv, v_search_query) as rank
  FROM public.videos v
  WHERE v.visibility = 'public'
    AND v.status = 'ready'
    AND v.is_removed = false
    AND v.is_shadow_banned = false
    AND v.search_tsv @@ v_search_query
    AND (p_category IS NULL OR v.category = p_category)
    AND v.created_at >= v_time_threshold
    AND (
      p_duration_filter IS NULL OR 
      p_duration_filter = 'any' OR
      (p_duration_filter = 'short' AND v.duration_seconds < 240) OR
      (p_duration_filter = 'medium' AND v.duration_seconds >= 240 AND v.duration_seconds <= 1200) OR
      (p_duration_filter = 'long' AND v.duration_seconds > 1200)
    )
    AND (
      p_video_type IS NULL OR
      p_video_type = 'any' OR
      (p_video_type = 'video' AND v.is_short = false) OR
      (p_video_type = 'short' AND v.is_short = true)
    )
  ORDER BY
    CASE p_sort_by
      WHEN 'relevance' THEN ts_rank(v.search_tsv, v_search_query)
      WHEN 'date' THEN v.created_at
      WHEN 'views' THEN v.views_count
      WHEN 'rating' THEN COALESCE(v.likes_count, 0)::float / NULLIF(v.views_count, 0)
      ELSE ts_rank(v.search_tsv, v_search_query)
    END DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION search_videos_fulltext(text, text, text, text, text, text, int, int) TO authenticated, service_role;

-- Add comments
COMMENT ON COLUMN public.videos.search_tsv IS 'Full-text search vector for title (weight A), description (weight B), and tags (weight C)';
COMMENT ON FUNCTION videos_search_tsv_trigger() IS 'Trigger to auto-update search_tsv column when title, description, or tags change';
COMMENT ON FUNCTION search_videos_fulltext IS 'Full-text search function with filters for category, upload date, duration, video type, and sorting options';

-- Update existing videos to populate search_tsv
UPDATE public.videos 
SET search_tsv = 
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'C')
WHERE search_tsv IS NULL;

-- Channel search function
CREATE OR REPLACE FUNCTION search_channels(
  p_query text DEFAULT '',
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  display_name text,
  handle text,
  avatar_url text,
  description text,
  followers_count bigint,
  videos_count bigint,
  rank real
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_search_query tsquery;
BEGIN
  v_search_query := plainto_tsquery('english', p_query);
  
  IF v_search_query IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.display_name,
    p.handle,
    p.avatar_url,
    p.bio as description,
    COALESCE(p.follower_count, 0)::bigint as followers_count,
    COALESCE(p.video_count, 0)::bigint as videos_count,
    ts_rank(
      setweight(to_tsvector('english', coalesce(p.display_name, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(p.handle, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(p.bio, '')), 'B'),
      v_search_query
    ) as rank
  FROM public.profiles p
  WHERE 
    (setweight(to_tsvector('english', coalesce(p.display_name, '')), 'A') ||
     setweight(to_tsvector('english', coalesce(p.handle, '')), 'A') ||
     setweight(to_tsvector('english', coalesce(p.bio, '')), 'B')
    ) @@ v_search_query
  ORDER BY rank DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permissions for channel search
GRANT EXECUTE ON FUNCTION search_channels(text, int) TO authenticated, service_role;

-- Combined search function (videos, channels, playlists)
CREATE OR REPLACE FUNCTION search_videos(
  p_query text DEFAULT '',
  p_category text DEFAULT NULL,
  p_upload_date text DEFAULT NULL,
  p_duration_filter text DEFAULT NULL,
  p_video_type text DEFAULT NULL,
  p_sort_by text DEFAULT 'relevance',
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0,
  p_include_channels boolean DEFAULT true,
  p_include_playlists boolean DEFAULT false
)
RETURNS TABLE (
  result_type text, -- 'video', 'channel', 'playlist'
  id uuid,
  title text,
  description text,
  thumb_url text,
  duration_seconds integer,
  views_count bigint,
  likes_count integer,
  comments_count integer,
  created_at timestamp with time zone,
  owner_id uuid,
  category text,
  tags text[],
  is_short boolean,
  display_name text,
  handle text,
  avatar_url text,
  followers_count bigint,
  videos_count bigint,
  rank real
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return videos
  RETURN QUERY
  SELECT 
    'video'::text as result_type,
    v.id,
    v.title,
    v.description,
    v.thumb_url,
    v.duration_seconds,
    v.views_count,
    v.likes_count,
    v.comments_count,
    v.created_at,
    v.owner_id,
    v.category,
    v.tags,
    v.is_short,
    NULL::text as display_name,
    NULL::text as handle,
    NULL::text as avatar_url,
    NULL::bigint as followers_count,
    NULL::bigint as videos_count,
    ts_rank(v.search_tsv, plainto_tsquery('english', p_query)) as rank
  FROM search_videos_fulltext(
    p_query, p_category, p_upload_date, p_duration_filter, p_video_type, p_sort_by, p_limit, p_offset
  ) v;
  
  -- Return channels if requested
  IF p_include_channels THEN
    RETURN QUERY
    SELECT 
      'channel'::text as result_type,
      c.id,
      c.display_name as title,
      c.description,
      c.avatar_url as thumb_url,
      NULL::integer as duration_seconds,
      NULL::bigint as views_count,
      NULL::integer as likes_count,
      NULL::integer as comments_count,
      c.created_at,
      c.id as owner_id,
      NULL::text as category,
      NULL::text[] as tags,
      NULL::boolean as is_short,
      c.display_name,
      c.handle,
      c.avatar_url,
      c.followers_count,
      c.videos_count,
      c.rank
    FROM search_channels(p_query, p_limit) c;
  END IF;
  
  -- Note: Playlists would be added here when playlist table exists
END;
$$;

-- Grant execute permissions for combined search
GRANT EXECUTE ON FUNCTION search_videos(text, text, text, text, text, text, int, int, boolean, boolean) TO authenticated, service_role;

COMMENT ON FUNCTION search_channels IS 'Search channels by display name, handle, and description';
COMMENT ON FUNCTION search_videos IS 'Combined search function returning videos, channels, and optionally playlists';

-- Make user_id nullable in analytics_events for anonymous search tracking
ALTER TABLE public.analytics_events ALTER COLUMN user_id DROP NOT NULL;

-- Update the check constraint
ALTER TABLE public.analytics_events DROP CONSTRAINT IF EXISTS analytics_events_user_id_check;

-- Update event_type check to include 'search'
ALTER TABLE public.analytics_events DROP CONSTRAINT IF EXISTS analytics_events_event_type_check;
ALTER TABLE public.analytics_events ADD CONSTRAINT analytics_events_event_type_check 
  CHECK (event_type IN ('view', 'impression', 'click', 'traffic_source', 'geography', 'search'));

-- Update RLS policy to allow inserts without user_id (for anonymous search logging)
DROP POLICY IF EXISTS "Users can insert analytics events" ON public.analytics_events;
CREATE POLICY "Users can insert analytics events"
    ON public.analytics_events FOR INSERT
    WITH CHECK (auth.uid() IS NULL OR auth.uid() = user_id);

-- Search analytics logging function
CREATE OR REPLACE FUNCTION log_search_analytics(
  p_user_id uuid DEFAULT NULL,
  p_query text DEFAULT '',
  p_results_count int DEFAULT 0,
  p_filters jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.analytics_events (
    user_id,
    event_type,
    event_data,
    created_at
  ) VALUES (
    p_user_id,
    'search',
    jsonb_build_object(
      'query', p_query,
      'results_count', p_results_count,
      'filters', p_filters
    ),
    now()
  );
END;
$$;

-- Grant execute permissions for analytics logging
GRANT EXECUTE ON FUNCTION log_search_analytics(uuid, text, int, jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION log_search_analytics IS 'Log search queries to analytics_events for ranking work';