-- ============ AUDIT LOGS ============
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  actor_email text,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  ip_address text,
  user_agent text,
  severity text NOT NULL DEFAULT 'info',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own audit entries"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all audit entries"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_user_created ON public.audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action_created ON public.audit_logs (action, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action text,
  p_entity_type text DEFAULT NULL,
  p_entity_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_severity text DEFAULT 'info',
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_email text;
  v_recent int;
BEGIN
  IF p_action IS NULL OR length(btrim(p_action)) = 0 OR length(p_action) > 128 THEN
    RAISE EXCEPTION 'invalid audit action';
  END IF;

  -- Cheap anti-flood guard: max 300 events per user per minute.
  IF v_uid IS NOT NULL THEN
    SELECT count(*) INTO v_recent FROM public.audit_logs
      WHERE user_id = v_uid AND created_at > now() - interval '1 minute';
    IF v_recent >= 300 THEN
      RETURN NULL;
    END IF;
    SELECT email INTO v_email FROM public.profiles WHERE id = v_uid;
  END IF;

  INSERT INTO public.audit_logs (user_id, actor_email, action, entity_type, entity_id,
                                 ip_address, user_agent, severity, metadata)
  VALUES (v_uid, v_email, p_action, left(p_entity_type, 64), left(p_entity_id, 128),
          left(p_ip_address, 64), left(p_user_agent, 512),
          CASE WHEN p_severity IN ('info','warning','critical') THEN p_severity ELSE 'info' END,
          COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.get_audit_logs(
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0,
  p_action text DEFAULT NULL,
  p_user uuid DEFAULT NULL,
  p_severity text DEFAULT NULL
) RETURNS SETOF public.audit_logs
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  RETURN QUERY
    SELECT * FROM public.audit_logs
     WHERE (p_action IS NULL OR action = p_action)
       AND (p_user IS NULL OR user_id = p_user)
       AND (p_severity IS NULL OR severity = p_severity)
     ORDER BY created_at DESC
     LIMIT GREATEST(LEAST(p_limit, 1000), 1) OFFSET GREATEST(p_offset, 0);
END; $$;

-- ============ RATE LIMITING ============
CREATE TABLE public.rate_limit_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  ip_address text,
  bucket text NOT NULL,
  hits integer NOT NULL DEFAULT 1,
  blocked boolean NOT NULL DEFAULT false,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.rate_limit_events TO authenticated;
GRANT ALL ON public.rate_limit_events TO service_role;
ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read rate limit events"
  ON public.rate_limit_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_rate_limit_events_created ON public.rate_limit_events (created_at DESC);
CREATE INDEX idx_rate_limit_events_ip ON public.rate_limit_events (ip_address, created_at DESC);

CREATE TABLE public.ip_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address text NOT NULL UNIQUE,
  mode text NOT NULL DEFAULT 'block',
  reason text,
  created_by uuid,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ip_rules TO authenticated;
GRANT ALL ON public.ip_rules TO service_role;
ALTER TABLE public.ip_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read ip rules"
  ON public.ip_rules FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_ip_rules_touch BEFORE UPDATE ON public.ip_rules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.admin_set_ip_rule(
  p_ip text, p_mode text, p_reason text DEFAULT NULL, p_expires timestamp with time zone DEFAULT NULL
) RETURNS public.ip_rules
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v public.ip_rules;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  IF p_mode NOT IN ('block','allow') THEN RAISE EXCEPTION 'mode must be block or allow'; END IF;
  IF p_ip IS NULL OR length(btrim(p_ip)) = 0 THEN RAISE EXCEPTION 'ip required'; END IF;
  INSERT INTO public.ip_rules (ip_address, mode, reason, created_by, expires_at)
    VALUES (btrim(p_ip), p_mode, p_reason, auth.uid(), p_expires)
    ON CONFLICT (ip_address) DO UPDATE
      SET mode = EXCLUDED.mode, reason = EXCLUDED.reason,
          expires_at = EXCLUDED.expires_at, updated_at = now()
    RETURNING * INTO v;
  PERFORM public.log_audit_event('ip_rule_set', 'ip', btrim(p_ip),
    jsonb_build_object('mode', p_mode, 'reason', p_reason), 'warning');
  RETURN v;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_delete_ip_rule(p_ip text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  DELETE FROM public.ip_rules WHERE ip_address = p_ip;
  PERFORM public.log_audit_event('ip_rule_removed', 'ip', p_ip, '{}'::jsonb, 'info');
  RETURN jsonb_build_object('ok', true);
END; $$;

-- ============ GDPR: DELETION REQUESTS ============
CREATE TABLE public.account_deletion_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  scheduled_purge_at timestamp with time zone NOT NULL DEFAULT (now() + interval '30 days'),
  confirmed_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  admin_note text,
  reviewed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.account_deletion_requests TO authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own deletion requests"
  ON public.account_deletion_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can request their own deletion"
  ON public.account_deletion_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can cancel their own deletion request"
  ON public.account_deletion_requests FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE UNIQUE INDEX idx_deletion_requests_one_pending
  ON public.account_deletion_requests (user_id) WHERE status = 'pending';

CREATE TRIGGER trg_deletion_requests_touch BEFORE UPDATE ON public.account_deletion_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ GDPR: CONSENT ============
CREATE TABLE public.user_consents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  anon_id text,
  necessary boolean NOT NULL DEFAULT true,
  analytics boolean NOT NULL DEFAULT false,
  advertising boolean NOT NULL DEFAULT false,
  policy_version text NOT NULL DEFAULT 'v1',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.user_consents TO authenticated;
GRANT ALL ON public.user_consents TO service_role;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own consent"
  ON public.user_consents FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users write their own consent"
  ON public.user_consents FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update their own consent"
  ON public.user_consents FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE UNIQUE INDEX idx_user_consents_user ON public.user_consents (user_id) WHERE user_id IS NOT NULL;

CREATE TRIGGER trg_user_consents_touch BEFORE UPDATE ON public.user_consents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ GDPR: DATA EXPORT ============
CREATE OR REPLACE FUNCTION public.export_my_data()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := auth.uid(); v jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT jsonb_build_object(
    'exported_at', now(),
    'profile', (SELECT to_jsonb(p) FROM public.profiles p WHERE p.id = v_uid),
    'wallet', (SELECT to_jsonb(w) FROM public.user_wallets w WHERE w.user_id = v_uid),
    'videos', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM public.videos x WHERE x.owner_id = v_uid), '[]'::jsonb),
    'comments', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM public.video_comments x WHERE x.user_id = v_uid), '[]'::jsonb),
    'likes', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM public.video_likes x WHERE x.user_id = v_uid), '[]'::jsonb),
    'saves', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM public.video_saves x WHERE x.user_id = v_uid), '[]'::jsonb),
    'watch_history', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM public.watch_history x WHERE x.user_id = v_uid), '[]'::jsonb),
    'playlists', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM public.playlists x WHERE x.user_id = v_uid), '[]'::jsonb),
    'follows', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM public.follows x WHERE x.follower_id = v_uid), '[]'::jsonb),
    'withdrawals', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM public.withdrawal_requests x WHERE x.user_id = v_uid), '[]'::jsonb),
    'wallet_transactions', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM public.wallet_transactions x WHERE x.user_id = v_uid), '[]'::jsonb),
    'notifications', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM public.notifications x WHERE x.user_id = v_uid), '[]'::jsonb),
    'consent', (SELECT to_jsonb(c) FROM public.user_consents c WHERE c.user_id = v_uid)
  ) INTO v;
  RETURN v;
END; $$;

CREATE OR REPLACE FUNCTION public.request_account_deletion(p_reason text DEFAULT NULL)
RETURNS public.account_deletion_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := auth.uid(); v public.account_deletion_requests;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  INSERT INTO public.account_deletion_requests (user_id, reason)
    VALUES (v_uid, left(p_reason, 1000))
    RETURNING * INTO v;
  PERFORM public.log_audit_event('account_deletion_requested', 'user', v_uid::text,
    jsonb_build_object('scheduled_purge_at', v.scheduled_purge_at), 'warning');
  RETURN v;
END; $$;

CREATE OR REPLACE FUNCTION public.cancel_account_deletion()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  UPDATE public.account_deletion_requests
     SET status = 'cancelled', cancelled_at = now(), updated_at = now()
   WHERE user_id = v_uid AND status = 'pending';
  PERFORM public.log_audit_event('account_deletion_cancelled', 'user', v_uid::text, '{}'::jsonb, 'info');
  RETURN jsonb_build_object('ok', true);
END; $$;

-- ============ MISSING COLUMNS THE APP ALREADY WRITES ============
ALTER TABLE public.copyright_claims ADD COLUMN IF NOT EXISTS policy_action text;

ALTER TABLE public.moderation_queue ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.moderation_queue ADD COLUMN IF NOT EXISTS escalated boolean NOT NULL DEFAULT false;
ALTER TABLE public.moderation_queue ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0;

ALTER TABLE public.streams ADD COLUMN IF NOT EXISTS mux_stream_id text;
ALTER TABLE public.streams ADD COLUMN IF NOT EXISTS mux_stream_key text;
ALTER TABLE public.streams ADD COLUMN IF NOT EXISTS mux_playback_id text;
ALTER TABLE public.streams ADD COLUMN IF NOT EXISTS is_live boolean NOT NULL DEFAULT false;

-- ============ DATA INTEGRITY CONSTRAINTS ============
ALTER TABLE public.videos ADD CONSTRAINT videos_views_count_nonneg CHECK (views_count >= 0) NOT VALID;
ALTER TABLE public.videos ADD CONSTRAINT videos_likes_count_nonneg CHECK (likes_count IS NULL OR likes_count >= 0) NOT VALID;
ALTER TABLE public.videos ADD CONSTRAINT videos_comments_count_nonneg CHECK (comments_count IS NULL OR comments_count >= 0) NOT VALID;
ALTER TABLE public.videos ADD CONSTRAINT videos_shares_count_nonneg CHECK (shares_count IS NULL OR shares_count >= 0) NOT VALID;
ALTER TABLE public.videos ADD CONSTRAINT videos_report_count_nonneg CHECK (report_count >= 0) NOT VALID;

ALTER TABLE public.user_wallets ADD CONSTRAINT wallets_balance_nonneg CHECK (balance >= 0) NOT VALID;
ALTER TABLE public.user_wallets ADD CONSTRAINT wallets_total_earned_nonneg CHECK (total_earned >= 0) NOT VALID;
ALTER TABLE public.user_wallets ADD CONSTRAINT wallets_total_withdrawn_nonneg CHECK (total_withdrawn >= 0) NOT VALID;

ALTER TABLE public.withdrawal_requests ADD CONSTRAINT withdrawal_amount_positive CHECK (amount > 0) NOT VALID;
ALTER TABLE public.video_views ADD CONSTRAINT video_views_watch_seconds_nonneg CHECK (watch_seconds >= 0) NOT VALID;
ALTER TABLE public.watch_history ADD CONSTRAINT watch_history_seconds_nonneg CHECK (watch_seconds >= 0) NOT VALID;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_counts_nonneg CHECK (
  (follower_count IS NULL OR follower_count >= 0) AND
  (following_count IS NULL OR following_count >= 0) AND
  (video_count IS NULL OR video_count >= 0) AND
  (total_views IS NULL OR total_views >= 0)
) NOT VALID;

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_payload_gin
  ON public.notifications USING gin (payload);
CREATE INDEX IF NOT EXISTS idx_creator_earnings_creator_period
  ON public.creator_earnings (creator_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_creator_earnings_video
  ON public.creator_earnings (video_id);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status_created
  ON public.moderation_queue (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_streams_live
  ON public.streams (is_live, viewer_count DESC) WHERE is_live = true;