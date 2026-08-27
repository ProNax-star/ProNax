-- Push Subscriptions and Notification Preferences Migration
-- This migration adds tables for Web Push notifications and user notification preferences

-- Push Subscriptions Table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(user_id, endpoint)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_created_at ON public.push_subscriptions(created_at DESC);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for push_subscriptions
DROP POLICY IF EXISTS "users_manage_own_subscriptions" ON public.push_subscriptions;
CREATE POLICY "users_manage_own_subscriptions" ON public.push_subscriptions
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;

-- Notification Preferences Table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    new_video boolean DEFAULT true NOT NULL,
    live_start boolean DEFAULT true NOT NULL,
    comment_reply boolean DEFAULT true NOT NULL,
    mention boolean DEFAULT true NOT NULL,
    copyright boolean DEFAULT true NOT NULL,
    payout boolean DEFAULT true NOT NULL,
    marketing boolean DEFAULT false NOT NULL,
    channel_overrides jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_notification_preferences_updated_at ON public.notification_preferences(updated_at DESC);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_preferences
DROP POLICY IF EXISTS "users_manage_own_preferences" ON public.notification_preferences;
CREATE POLICY "users_manage_own_preferences" ON public.notification_preferences
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;

-- Function to get user notification preferences
CREATE OR REPLACE FUNCTION get_notification_preferences(p_user_id uuid)
RETURNS TABLE (
    user_id uuid,
    new_video boolean,
    live_start boolean,
    comment_reply boolean,
    mention boolean,
    copyright boolean,
    payout boolean,
    marketing boolean,
    channel_overrides jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        np.user_id,
        np.new_video,
        np.live_start,
        np.comment_reply,
        np.mention,
        np.copyright,
        np.payout,
        np.marketing,
        np.channel_overrides
    FROM public.notification_preferences np
    WHERE np.user_id = p_user_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_notification_preferences(uuid) TO authenticated;

-- Function to update notification preferences
CREATE OR REPLACE FUNCTION update_notification_preferences(
    p_user_id uuid,
    p_new_video boolean DEFAULT NULL,
    p_live_start boolean DEFAULT NULL,
    p_comment_reply boolean DEFAULT NULL,
    p_mention boolean DEFAULT NULL,
    p_copyright boolean DEFAULT NULL,
    p_payout boolean DEFAULT NULL,
    p_marketing boolean DEFAULT NULL,
    p_channel_overrides jsonb DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.notification_preferences
    SET 
        new_video = COALESCE(p_new_video, new_video),
        live_start = COALESCE(p_live_start, live_start),
        comment_reply = COALESCE(p_comment_reply, comment_reply),
        mention = COALESCE(p_mention, mention),
        copyright = COALESCE(p_copyright, copyright),
        payout = COALESCE(p_payout, payout),
        marketing = COALESCE(p_marketing, marketing),
        channel_overrides = COALESCE(p_channel_overrides, channel_overrides),
        updated_at = now()
    WHERE user_id = p_user_id;
    
    RETURN FOUND;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_notification_preferences(
    uuid, boolean, boolean, boolean, boolean, boolean, boolean, boolean, jsonb
) TO authenticated;

-- Function to register push subscription
CREATE OR REPLACE FUNCTION register_push_subscription(
    p_user_id uuid,
    p_endpoint text,
    p_p256dh text,
    p_auth text,
    p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_subscription_id uuid;
BEGIN
    INSERT INTO public.push_subscriptions (
        user_id,
        endpoint,
        p256dh,
        auth,
        user_agent
    ) VALUES (
        p_user_id,
        p_endpoint,
        p_p256dh,
        p_auth,
        p_user_agent
    )
    ON CONFLICT (user_id, endpoint) DO UPDATE SET
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_agent = p_user_agent,
        updated_at = now()
    RETURNING id
    INTO v_subscription_id;
    
    RETURN v_subscription_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION register_push_subscription(uuid, text, text, text, text) TO authenticated;

-- Function to remove push subscription
CREATE OR REPLACE FUNCTION remove_push_subscription(p_user_id uuid, p_endpoint text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.push_subscriptions
    WHERE user_id = p_user_id AND endpoint = p_endpoint;
    RETURN FOUND;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION remove_push_subscription(uuid, text) TO authenticated;

-- Function to send push notification (server-side)
CREATE OR REPLACE FUNCTION send_push_notification(
    p_user_id uuid,
    p_title text,
    p_body text,
    p_icon text DEFAULT NULL,
    p_data jsonb DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_endpoint text;
    v_p256dh text;
    v_auth text;
BEGIN
    -- Get user's push subscription
    SELECT endpoint, p256dh, auth INTO v_endpoint, v_p256dh, v_auth
    FROM public.push_subscriptions
    WHERE user_id = p_user_id
    LIMIT 1;
    
    IF v_endpoint IS NULL THEN
        RETURN false;
    END IF;
    
    -- This function would normally call a push service (VAPID)
    -- For now, return true to indicate the user has a subscription
    -- In production, you'd integrate with a push service like web-push
    RETURN true;
END;
$$;

-- Grant execute permission to service_role
GRANT EXECUTE ON FUNCTION send_push_notification(uuid, text, text, text, jsonb) TO service_role;

-- Add comments
COMMENT ON TABLE public.push_subscriptions IS 'Web Push subscriptions for notifications';
COMMENT ON TABLE public.notification_preferences IS 'User notification preferences for different event types';
COMMENT ON FUNCTION get_notification_preferences IS 'Get user notification preferences';
COMMENT ON FUNCTION update_notification_preferences IS 'Update user notification preferences';
COMMENT ON FUNCTION register_push_subscription IS 'Register a Web Push subscription';
COMMENT ON FUNCTION remove_push_subscription IS 'Remove a Web Push subscription';
COMMENT ON FUNCTION send_push_notification IS 'Send a push notification to a user';