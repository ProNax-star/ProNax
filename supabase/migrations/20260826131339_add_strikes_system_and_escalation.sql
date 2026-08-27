/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
-- Strikes system with escalation policy and automatic ban expiry

-- Drop existing user_strikes table to recreate with proper schema
DROP TABLE IF EXISTS public.user_strikes CASCADE;

-- Create user_strikes table with full schema
CREATE TABLE public.user_strikes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    issued_by uuid REFERENCES auth.users(id),
    reason text NOT NULL,
    category text NOT NULL CHECK (category IN ('copyright', 'spam', 'harassment', 'harmful', 'other')),
    severity smallint NOT NULL DEFAULT 1 CHECK (severity >= 1 AND severity <= 3),
    video_id uuid REFERENCES public.videos(id) ON DELETE SET NULL,
    source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'report', 'copyright_claim', 'auto')),
    expires_at timestamptz,
    revoked_at timestamptz,
    revoked_reason text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Grants
GRANT SELECT ON public.user_strikes TO authenticated;
GRANT ALL ON public.user_strikes TO service_role;

-- Enable RLS
ALTER TABLE public.user_strikes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own strikes
CREATE POLICY "users_view_own_strikes" ON public.user_strikes
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Admins and moderators have full access
CREATE POLICY "admins_full_access_strikes" ON public.user_strikes
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
    WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Indexes for performance
CREATE INDEX idx_user_strikes_user_created ON public.user_strikes(user_id, created_at DESC);
CREATE INDEX idx_user_strikes_expires_at ON public.user_strikes(expires_at);

-- Function to count active strikes for a user
CREATE OR REPLACE FUNCTION public.active_strike_count(_user_id uuid)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COUNT(*)
    FROM public.user_strikes
    WHERE user_id = _user_id
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > now());
$$;

-- RPC: Issue a strike with automatic escalation
CREATE OR REPLACE FUNCTION public.admin_issue_strike(
    p_user uuid,
    p_reason text,
    p_category text,
    p_severity smallint DEFAULT 1,
    p_video_id uuid DEFAULT NULL,
    p_source text DEFAULT 'manual'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_active_count int;
    v_ban_until timestamptz;
BEGIN
    -- Only admins and moderators can issue strikes
    IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
        RAISE EXCEPTION 'admin or moderator only';
    END IF;

    -- Insert the strike
    INSERT INTO public.user_strikes (
        user_id, issued_by, reason, category, severity, video_id, source, expires_at
    ) VALUES (
        p_user, auth.uid(), p_reason, p_category, p_severity, p_video_id, p_source, now() + interval '90 days'
    );

    -- Count active strikes after this one
    v_active_count := public.active_strike_count(p_user);

    -- Apply escalation policy
    IF v_active_count >= 3 THEN
        -- 3+ active strikes: permanent ban
        UPDATE public.profiles
        SET is_banned = true,
            banned_until = NULL,
            ban_reason = 'Multiple violations (3+ strikes)',
            status = 'banned'
        WHERE id = p_user;
        
        -- Log the action
        INSERT INTO public.admin_actions (admin_id, action, target_type, target_id, payload)
        VALUES (auth.uid(), 'escalate_ban_permanent', 'user', p_user::text, 
                jsonb_build_object('strike_count', v_active_count, 'reason', p_reason));
        
    ELSIF v_active_count = 2 THEN
        -- 2 active strikes: 7-day ban
        v_ban_until := now() + interval '7 days';
        UPDATE public.profiles
        SET is_banned = true,
            banned_until = v_ban_until,
            ban_reason = 'Multiple violations (2 strikes)',
            status = 'banned'
        WHERE id = p_user;
        
        -- Log the action
        INSERT INTO public.admin_actions (admin_id, action, target_type, target_id, payload)
        VALUES (auth.uid(), 'escalate_ban_temporary', 'user', p_user::text,
                jsonb_build_object('strike_count', v_active_count, 'until', v_ban_until, 'reason', p_reason));
        
    ELSE
        -- 1 active strike: warning only, no ban
        -- Log the warning
        INSERT INTO public.admin_actions (admin_id, action, target_type, target_id, payload)
        VALUES (auth.uid(), 'issue_strike_warning', 'user', p_user::text,
                jsonb_build_object('strike_count', v_active_count, 'reason', p_reason));
    END IF;

    -- Send notification to user
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
        p_user,
        CASE 
            WHEN v_active_count >= 3 THEN 'strike_permanent_ban'
            WHEN v_active_count = 2 THEN 'strike_temporary_ban'
            ELSE 'strike_warning'
        END,
        CASE 
            WHEN v_active_count >= 3 THEN 'Account Permanently Suspended'
            WHEN v_active_count = 2 THEN 'Account Temporarily Suspended'
            ELSE 'Strike Issued'
        END,
        CASE 
            WHEN v_active_count >= 3 THEN 'Your account has been permanently suspended due to multiple violations.'
            WHEN v_active_count = 2 THEN 'Your account has been suspended for 7 days due to multiple violations.'
            ELSE 'You have received a strike. Continued violations may result in account suspension.'
        END
    );

    RETURN jsonb_build_object('ok', true, 'active_strikes', v_active_count);
END;
$$;

-- RPC: Revoke a strike and recompute ban state
CREATE OR REPLACE FUNCTION public.admin_revoke_strike(p_strike_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_active_count int;
BEGIN
    -- Only admins can revoke strikes
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'admin only';
    END IF;

    -- Get the user_id before revoking
    SELECT user_id INTO v_user_id
    FROM public.user_strikes
    WHERE id = p_strike_id;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'strike not found';
    END IF;

    -- Revoke the strike
    UPDATE public.user_strikes
    SET revoked_at = now(),
        revoked_reason = p_reason
    WHERE id = p_strike_id;

    -- Recount active strikes
    v_active_count := public.active_strike_count(v_user_id);

    -- Lift ban if count drops below threshold
    IF v_active_count < 2 THEN
        UPDATE public.profiles
        SET is_banned = false,
            banned_until = NULL,
            ban_reason = NULL,
            status = 'active'
        WHERE id = v_user_id;
        
        -- Log the action
        INSERT INTO public.admin_actions (admin_id, action, target_type, target_id, payload)
        VALUES (auth.uid(), 'lift_ban_strike_revoked', 'user', v_user_id::text,
                jsonb_build_object('strike_count', v_active_count, 'revoke_reason', p_reason));
    ELSE
        -- Log the strike revocation
        INSERT INTO public.admin_actions (admin_id, action, target_type, target_id, payload)
        VALUES (auth.uid(), 'revoke_strike', 'strike', p_strike_id::text,
                jsonb_build_object('user_id', v_user_id, 'active_count', v_active_count, 'reason', p_reason));
    END IF;

    -- Send notification to user
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
        v_user_id,
        'strike_revoked',
        'Strike Revoked',
        'A strike has been removed from your account. ' || 
        CASE WHEN v_active_count < 2 THEN 'Your account has been restored.' ELSE 'You still have active strikes.' END
    );

    RETURN jsonb_build_object('ok', true, 'active_strikes', v_active_count);
END;
$$;

-- RPC: Resolve an appeal with automatic strike/ban handling
CREATE OR REPLACE FUNCTION public.admin_resolve_appeal(p_appeal_id uuid, p_decision text, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_appeal RECORD;
    v_user_id uuid;
BEGIN
    -- Only admins and moderators can resolve appeals
    IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
        RAISE EXCEPTION 'admin or moderator only';
    END IF;

    -- Validate decision
    IF p_decision NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'invalid decision, must be approved or rejected';
    END IF;

    -- Get appeal details
    SELECT * INTO v_appeal
    FROM public.appeals
    WHERE id = p_appeal_id;

    IF v_appeal IS NULL THEN
        RAISE EXCEPTION 'appeal not found';
    END IF;

    v_user_id := v_appeal.user_id;

    -- Update the appeal
    UPDATE public.appeals
    SET status = p_decision,
        admin_response = p_note,
        reviewed_at = now()
    WHERE id = p_appeal_id;

    -- Log the action
    INSERT INTO public.admin_actions (admin_id, action, target_type, target_id, payload)
    VALUES (auth.uid(), 'resolve_appeal', 'appeal', p_appeal_id::text,
            jsonb_build_object('decision', p_decision, 'note', p_note, 'user_id', v_user_id));

    IF p_decision = 'approved' THEN
        -- Revoke all active strikes for this user
        UPDATE public.user_strikes
        SET revoked_at = now(),
            revoked_reason = 'Appeal approved: ' || COALESCE(p_note, 'Administrative decision')
        WHERE user_id = v_user_id
          AND revoked_at IS NULL
          AND (expires_at IS NULL OR expires_at > now());

        -- Unban the user
        UPDATE public.profiles
        SET is_banned = false,
            banned_until = NULL,
            ban_reason = NULL,
            status = 'active'
        WHERE id = v_user_id;

        -- Send approval notification
        INSERT INTO public.notifications (user_id, type, title, message)
        VALUES (
            v_user_id,
            'appeal_approved',
            'Appeal Approved',
            COALESCE(p_note, 'Your appeal has been approved. Your account has been restored and all strikes have been removed.')
        );

    ELSE
        -- Send rejection notification
        INSERT INTO public.notifications (user_id, type, title, message)
        VALUES (
            v_user_id,
            'appeal_rejected',
            'Appeal Reviewed',
            COALESCE(p_note, 'After review, we have decided to maintain the current action on your account.')
        );
    END IF;

    RETURN jsonb_build_object('ok', true, 'decision', p_decision);
END;
$$;

-- Function to automatically expire temporary bans
CREATE OR REPLACE FUNCTION public.expire_bans()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.profiles
    SET is_banned = false,
        banned_until = NULL,
        ban_reason = NULL,
        status = 'active'
    WHERE is_banned = true
      AND banned_until IS NOT NULL
      AND banned_until < now();
END;
$$;

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION public.active_strike_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_issue_strike(uuid, text, text, smallint, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_strike(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_appeal(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_bans() TO authenticated;
