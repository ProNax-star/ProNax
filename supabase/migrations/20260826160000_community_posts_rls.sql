-- Community Posts RLS Policies and Missing Grants
-- This migration adds proper RLS policies for community_posts table

-- Enable RLS (already enabled, but ensuring)
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is subscribed to a creator
CREATE OR REPLACE FUNCTION is_subscribed_to_creator(p_creator_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.channel_subscriptions
    WHERE channel_id = p_creator_id
    AND user_id = p_user_id
  );
END;
$$;

-- Policy: Public can read public posts from anyone
DROP POLICY IF EXISTS "public_read_community_posts" ON public.community_posts;
CREATE POLICY "public_read_community_posts" ON public.community_posts
    FOR SELECT TO anon, authenticated
    USING (visibility = 'public');

-- Policy: Authenticated users can read their own posts and posts from creators they follow
DROP POLICY IF EXISTS "authenticated_read_community_posts" ON public.community_posts;
CREATE POLICY "authenticated_read_community_posts" ON public.community_posts
    FOR SELECT TO authenticated
    USING (
      creator_id = auth.uid()
      OR is_subscribed_to_creator(creator_id, auth.uid())
    );

-- Policy: Creators can insert their own posts
DROP POLICY IF EXISTS "creators_insert_community_posts" ON public.community_posts;
CREATE POLICY "creators_insert_community_posts" ON public.community_posts
    FOR INSERT TO authenticated
    WITH CHECK (creator_id = auth.uid());

-- Policy: Creators can update their own posts
DROP POLICY IF EXISTS "creators_update_community_posts" ON public.community_posts;
CREATE POLICY "creators_update_community_posts" ON public.community_posts
    FOR UPDATE TO authenticated
    USING (creator_id = auth.uid())
    WITH CHECK (creator_id = auth.uid());

-- Policy: Creators can delete their own posts
DROP POLICY IF EXISTS "creators_delete_community_posts" ON public.community_posts;
CREATE POLICY "creators_delete_community_posts" ON public.community_posts
    FOR DELETE TO authenticated
    USING (creator_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT SELECT ON public.community_posts TO anon;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_posts_creator_id ON public.community_posts(creator_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON public.community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_visibility ON public.community_posts(visibility);
CREATE INDEX IF NOT EXISTS idx_community_posts_is_pinned ON public.community_posts(is_pinned, created_at DESC) WHERE is_pinned = true;

-- Function to get community posts for a channel with pagination
CREATE OR REPLACE FUNCTION get_channel_community_posts(
    p_creator_id uuid,
    p_limit int DEFAULT 20,
    p_offset int DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    creator_id uuid,
    content text,
    media_urls text[],
    post_type text,
    poll_options jsonb,
    poll_expires_at timestamp with time zone,
    likes_count integer,
    comments_count integer,
    shares_count integer,
    is_pinned boolean,
    visibility text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    creator_name text,
    creator_avatar text,
    creator_handle text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cp.id,
        cp.creator_id,
        cp.content,
        cp.media_urls,
        cp.post_type,
        cp.poll_options,
        cp.poll_expires_at,
        cp.likes_count,
        cp.comments_count,
        cp.shares_count,
        cp.is_pinned,
        cp.visibility,
        cp.created_at,
        cp.updated_at,
        p.display_name as creator_name,
        p.avatar_url as creator_avatar,
        p.handle as creator_handle
    FROM public.community_posts cp
    LEFT JOIN public.profiles p ON p.id = cp.creator_id
    WHERE cp.creator_id = p_creator_id
      AND cp.visibility = 'public'
    ORDER BY cp.is_pinned DESC, cp.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_channel_community_posts(uuid, int, int) TO authenticated, anon;

-- Function to like/unlike a community post
CREATE OR REPLACE FUNCTION toggle_community_post_like(p_post_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_liked boolean;
    v_post_likes_count integer;
BEGIN
    -- Check if user already liked the post
    SELECT EXISTS (
        SELECT 1 FROM public.community_post_likes
        WHERE post_id = p_post_id AND user_id = p_user_id
    ) INTO v_is_liked;
    
    IF v_is_liked THEN
        -- Unlike
        DELETE FROM public.community_post_likes
        WHERE post_id = p_post_id AND user_id = p_user_id;
        
        UPDATE public.community_posts
        SET likes_count = GREATEST(likes_count - 1, 0)
        WHERE id = p_post_id;
        
        SELECT likes_count INTO v_post_likes_count
        FROM public.community_posts
        WHERE id = p_post_id;
        
        RETURN jsonb_build_object('liked', false, 'likes_count', v_post_likes_count);
    ELSE
        -- Like
        INSERT INTO public.community_post_likes (post_id, user_id)
        VALUES (p_post_id, p_user_id);
        
        UPDATE public.community_posts
        SET likes_count = likes_count + 1
        WHERE id = p_post_id;
        
        SELECT likes_count INTO v_post_likes_count
        FROM public.community_posts
        WHERE id = p_post_id;
        
        RETURN jsonb_build_object('liked', true, 'likes_count', v_post_likes_count);
    END IF;
END;
$$;

-- Create community_post_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.community_post_likes (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(post_id, user_id)
);

-- Create index on community_post_likes
CREATE INDEX IF NOT EXISTS idx_community_post_likes_post_id ON public.community_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_community_post_likes_user_id ON public.community_post_likes(user_id);

-- Enable RLS on community_post_likes
ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for community_post_likes
DROP POLICY IF EXISTS "users_insert_own_likes" ON public.community_post_likes;
CREATE POLICY "users_insert_own_likes" ON public.community_post_likes
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_delete_own_likes" ON public.community_post_likes;
CREATE POLICY "users_delete_own_likes" ON public.community_post_likes
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_read_own_likes" ON public.community_post_likes;
CREATE POLICY "users_read_own_likes" ON public.community_post_likes
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON public.community_post_likes TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_community_post_like(uuid, uuid) TO authenticated;

-- Add comments
COMMENT ON TABLE public.community_posts IS 'Community posts from creators to their subscribers';
COMMENT ON TABLE public.community_post_likes IS 'Likes on community posts';
COMMENT ON FUNCTION get_channel_community_posts IS 'Get paginated community posts for a channel';
COMMENT ON FUNCTION toggle_community_post_like IS 'Toggle like/unlike on a community post';