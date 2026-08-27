-- Live Chat Messages Table for Real-time Chat
-- This migration creates a table for live stream chat messages with proper RLS

CREATE TABLE IF NOT EXISTS public.live_chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id uuid NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    body TEXT NOT NULL CHECK (char_length(body) <= 500),
    created_at timestamp with time zone DEFAULT now(),
    is_deleted boolean DEFAULT false,
    deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_live_chat_messages_stream_id ON public.live_chat_messages(stream_id);
CREATE INDEX IF NOT EXISTS idx_live_chat_messages_stream_created ON public.live_chat_messages(stream_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_chat_messages_user_id ON public.live_chat_messages(user_id);

-- RLS Policies
ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read messages for any live stream
DROP POLICY IF EXISTS "authenticated_can_read_chat_messages" ON public.live_chat_messages;
CREATE POLICY "authenticated_can_read_chat_messages" ON public.live_chat_messages
    FOR SELECT TO authenticated
    USING (true);

-- Users can only insert their own messages
DROP POLICY IF EXISTS "users_can_insert_own_messages" ON public.live_chat_messages;
CREATE POLICY "users_can_insert_own_messages" ON public.live_chat_messages
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can only soft-delete their own messages
DROP POLICY IF EXISTS "users_can_delete_own_messages" ON public.live_chat_messages;
CREATE POLICY "users_can_delete_own_messages" ON public.live_chat_messages
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid() OR deleted_by = auth.uid());

-- Streamers can delete any message in their stream
DROP POLICY IF EXISTS "streamers_can_delete_stream_messages" ON public.live_chat_messages;
CREATE POLICY "streamers_can_delete_stream_messages" ON public.live_chat_messages
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.streams s
            WHERE s.id = live_chat_messages.stream_id
            AND s.user_id = auth.uid()
        )
    )
    WITH CHECK (deleted_by = auth.uid());

-- Function to rate limit chat messages (1 message per 2 seconds per user)
CREATE OR REPLACE FUNCTION public.rate_limit_chat_message(p_user_id uuid, p_stream_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    recent_count integer;
BEGIN
    -- Check if user sent a message in the last 2 seconds
    SELECT COUNT(*) INTO recent_count
    FROM public.live_chat_messages
    WHERE user_id = p_user_id
    AND stream_id = p_stream_id
    AND created_at > now() - interval '2 seconds';
    
    -- If they sent a message recently, reject
    IF recent_count > 0 THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.rate_limit_chat_message(uuid, uuid) TO authenticated;

-- Add comments
COMMENT ON TABLE public.live_chat_messages IS 'Real-time chat messages for live streams';
COMMENT ON COLUMN public.live_chat_messages.body IS 'Message text (max 500 characters)';
COMMENT ON COLUMN public.live_chat_messages.is_deleted IS 'Soft delete flag for message moderation';
COMMENT ON COLUMN public.live_chat_messages.deleted_by IS 'User ID of moderator who deleted the message';
COMMENT ON FUNCTION public.rate_limit_chat_message IS 'Rate limiting function: allows 1 message per 2 seconds per user per stream';
