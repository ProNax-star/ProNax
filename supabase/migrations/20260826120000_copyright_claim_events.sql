-- Copyright Claim Events Table for Audit Trail
-- This migration adds a table to track all claim-related events for auditability

CREATE TABLE IF NOT EXISTS public.copyright_claim_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id uuid NOT NULL REFERENCES public.copyright_claims(id) ON DELETE CASCADE,
    actor_type TEXT NOT NULL CHECK (actor_type IN ('system', 'admin', 'user', 'ai')),
    actor_id uuid, -- References profiles.id for human actors, null for system/ai
    action TEXT NOT NULL, -- 'ai_evaluation', 'status_change', 'policy_change', 'dispute_filed', etc.
    payload jsonb DEFAULT '{}'::jsonb, -- Event-specific data (evaluation results, old/new values, etc.)
    created_at timestamp with time zone DEFAULT now()
);

-- Indexes for querying events
CREATE INDEX IF NOT EXISTS idx_copyright_claim_events_claim_id ON public.copyright_claim_events(claim_id);
CREATE INDEX IF NOT EXISTS idx_copyright_claim_events_created_at ON public.copyright_claim_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_copyright_claim_events_actor ON public.copyright_claim_events(actor_type, actor_id);

-- RLS Policies
ALTER TABLE public.copyright_claim_events ENABLE ROW LEVEL SECURITY;

-- Admins can read all events
DROP POLICY IF EXISTS "admins_can_read_all_claim_events" ON public.copyright_claim_events;
CREATE POLICY "admins_can_read_all_claim_events" ON public.copyright_claim_events
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Users can read events for their own claims
DROP POLICY IF EXISTS "users_can_read_own_claim_events" ON public.copyright_claim_events;
CREATE POLICY "users_can_read_own_claim_events" ON public.copyright_claim_events
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.copyright_claims cc
            JOIN public.videos v ON cc.video_id = v.id
            WHERE cc.id = copyright_claim_events.claim_id
            AND v.owner_id = auth.uid()
        )
    );

-- Service role can insert events (for AI evaluations)
DROP POLICY IF EXISTS "service_role_can_insert_claim_events" ON public.copyright_claim_events;
CREATE POLICY "service_role_can_insert_claim_events" ON public.copyright_claim_events
    FOR INSERT TO service_role
    WITH CHECK (true);

-- Function to log AI evaluation event
CREATE OR REPLACE FUNCTION public.log_ai_evaluation_event(
    p_claim_id uuid,
    p_merit_score NUMERIC,
    p_merit_level TEXT,
    p_recommendation TEXT,
    p_reasoning TEXT,
    p_fair_use_factors jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event_id uuid;
BEGIN
    INSERT INTO public.copyright_claim_events (
        claim_id,
        actor_type,
        action,
        payload
    ) VALUES (
        p_claim_id,
        'ai',
        'ai_evaluation',
        jsonb_build_object(
            'merit_score', p_merit_score,
            'merit_level', p_merit_level,
            'recommendation', p_recommendation,
            'reasoning', p_reasoning,
            'fair_use_factors', p_fair_use_factors,
            'evaluated_at', now()
        )
    ) RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$;

-- Function to log status change event
CREATE OR REPLACE FUNCTION public.log_status_change_event(
    p_claim_id uuid,
    p_actor_id uuid,
    p_old_status TEXT,
    p_new_status TEXT,
    p_note TEXT DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event_id uuid;
BEGIN
    INSERT INTO public.copyright_claim_events (
        claim_id,
        actor_type,
        actor_id,
        action,
        payload
    ) VALUES (
        p_claim_id,
        'admin',
        p_actor_id,
        'status_change',
        jsonb_build_object(
            'old_status', p_old_status,
            'new_status', p_new_status,
            'note', p_note,
            'changed_at', now()
        )
    ) RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$;

-- Function to log policy change event
CREATE OR REPLACE FUNCTION public.log_policy_change_event(
    p_claim_id uuid,
    p_actor_id uuid,
    p_old_policy TEXT,
    p_new_policy TEXT,
    p_note TEXT DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event_id uuid;
BEGIN
    INSERT INTO public.copyright_claim_events (
        claim_id,
        actor_type,
        actor_id,
        action,
        payload
    ) VALUES (
        p_claim_id,
        'admin',
        p_actor_id,
        'policy_change',
        jsonb_build_object(
            'old_policy', p_old_policy,
            'new_policy', p_new_policy,
            'note', p_note,
            'changed_at', now()
        )
    ) RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.log_ai_evaluation_event(uuid, NUMERIC, TEXT, TEXT, TEXT, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_status_change_event(uuid, uuid, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_policy_change_event(uuid, uuid, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- Add comments
COMMENT ON TABLE public.copyright_claim_events IS 'Audit trail for all copyright claim events (AI evaluations, status changes, policy changes, disputes)';
COMMENT ON COLUMN public.copyright_claim_events.actor_type IS 'Type of actor: system, admin, user, or ai';
COMMENT ON COLUMN public.copyright_claim_events.action IS 'Event type: ai_evaluation, status_change, policy_change, dispute_filed, etc.';
COMMENT ON COLUMN public.copyright_claim_events.payload IS 'Event-specific data as JSONB';
