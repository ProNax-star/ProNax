CREATE TABLE public.ab_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_id uuid NOT NULL,
    user_id uuid NOT NULL,
    variant text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    experiment_id uuid
);

ALTER TABLE ONLY public.ab_assignments
    ADD CONSTRAINT ab_assignments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ab_assignments
    ADD CONSTRAINT ab_assignments_test_id_user_id_key UNIQUE (test_id, user_id);

CREATE TABLE public.challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hashtag text NOT NULL,
    title text NOT NULL,
    description text,
    banner_url text,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone,
    creator_id uuid,
    participant_count integer DEFAULT 0 NOT NULL,
    video_count integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.challenges
    ADD CONSTRAINT challenges_hashtag_key UNIQUE (hashtag);

ALTER TABLE ONLY public.challenges
    ADD CONSTRAINT challenges_pkey PRIMARY KEY (id);

CREATE TABLE public.community_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creator_id uuid NOT NULL,
    content text NOT NULL,
    media_urls text[] DEFAULT '{}'::text[],
    post_type text DEFAULT 'text'::text NOT NULL,
    poll_options jsonb,
    poll_expires_at timestamp with time zone,
    likes_count integer DEFAULT 0 NOT NULL,
    comments_count integer DEFAULT 0 NOT NULL,
    shares_count integer DEFAULT 0 NOT NULL,
    is_pinned boolean DEFAULT false NOT NULL,
    visibility text DEFAULT 'public'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT community_posts_content_check CHECK ((length(content) <= 5000))
);

ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT community_posts_pkey PRIMARY KEY (id);

CREATE TABLE public.creator_marketplace (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creator_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    category text NOT NULL,
    price_min numeric,
    price_max numeric,
    pricing_type text NOT NULL,
    portfolio_urls text[] DEFAULT '{}'::text[],
    availability_status text DEFAULT 'available'::text NOT NULL,
    rating numeric,
    review_count integer DEFAULT 0 NOT NULL,
    views_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT creator_marketplace_rating_check CHECK (((rating >= (0)::numeric) AND (rating <= (5)::numeric)))
);

ALTER TABLE ONLY public.creator_marketplace
    ADD CONSTRAINT creator_marketplace_pkey PRIMARY KEY (id);

CREATE TABLE public.trending_sounds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    audio_track_id text NOT NULL,
    title text,
    artist text,
    cover_url text,
    usage_count integer DEFAULT 0 NOT NULL,
    trend_score numeric DEFAULT 0 NOT NULL,
    is_trending boolean DEFAULT false NOT NULL,
    category text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.trending_sounds
    ADD CONSTRAINT trending_sounds_audio_track_id_key UNIQUE (audio_track_id);

ALTER TABLE ONLY public.trending_sounds
    ADD CONSTRAINT trending_sounds_pkey PRIMARY KEY (id);

CREATE TABLE public.video_downloads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    video_id text NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.video_downloads
    ADD CONSTRAINT video_downloads_pkey PRIMARY KEY (id);

CREATE TABLE public.video_shares (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    video_id text NOT NULL,
    user_id uuid,
    channel text DEFAULT 'link'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    platform text DEFAULT 'link'::text,
    CONSTRAINT video_shares_platform_check CHECK ((platform = ANY (ARRAY['link'::text, 'twitter'::text, 'facebook'::text, 'whatsapp'::text, 'instagram'::text, 'pronax'::text])))
);

ALTER TABLE ONLY public.video_shares
    ADD CONSTRAINT video_shares_pkey PRIMARY KEY (id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ab_assignments TO authenticated;

GRANT ALL ON public.ab_assignments TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenges TO authenticated;

GRANT SELECT ON public.challenges TO anon;

GRANT ALL ON public.challenges TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;

GRANT SELECT ON public.community_posts TO anon;

GRANT ALL ON public.community_posts TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_marketplace TO authenticated;

GRANT SELECT ON public.creator_marketplace TO anon;

GRANT ALL ON public.creator_marketplace TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trending_sounds TO authenticated;

GRANT SELECT ON public.trending_sounds TO anon;

GRANT ALL ON public.trending_sounds TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_downloads TO authenticated;

GRANT ALL ON public.video_downloads TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_shares TO authenticated;

GRANT SELECT ON public.video_shares TO anon;

GRANT ALL ON public.video_shares TO service_role;

ALTER TABLE public.ab_assignments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.creator_marketplace ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.trending_sounds ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.video_downloads ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.video_shares ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.admin_adjust_wallet(p_user_id uuid, p_delta numeric, p_set_balance numeric DEFAULT NULL::numeric)
 RETURNS user_wallets
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v public.user_wallets;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  INSERT INTO public.user_wallets (user_id, balance, total_earned)
  VALUES (p_user_id, COALESCE(p_set_balance, GREATEST(p_delta, 0)), GREATEST(p_delta, 0))
  ON CONFLICT (user_id) DO UPDATE
    SET balance = COALESCE(p_set_balance, public.user_wallets.balance + p_delta),
        updated_at = now()
  RETURNING * INTO v;
  RETURN v;
END; $function$
;

CREATE OR REPLACE FUNCTION public.admin_ban_user(p_user uuid, p_reason text, p_until timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  UPDATE public.profiles SET is_banned = true, ban_reason = p_reason, banned_until = p_until WHERE id = p_user;
  INSERT INTO public.admin_actions (admin_id, action, target_type, target_id, payload)
    VALUES (auth.uid(), 'ban_user', 'user', p_user::text, jsonb_build_object('reason', p_reason, 'until', p_until));
  INSERT INTO public.notifications (user_id, type, payload)
    VALUES (p_user, 'ban', jsonb_build_object('reason', p_reason, 'until', p_until));
  RETURN jsonb_build_object('ok', true);
END; $function$
;

CREATE OR REPLACE FUNCTION public.admin_bootstrap_status()
 RETURNS TABLE(is_admin boolean, can_claim_initial_admin boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_count int;
  v_user_id uuid := auth.uid();
BEGIN
  SELECT count(*) INTO v_admin_count
  FROM public.user_roles
  WHERE role = 'admin';

  RETURN QUERY SELECT
    public.has_role(v_user_id, 'admin'::app_role) as is_admin,
    (v_admin_count = 0 AND v_user_id IS NOT NULL) as can_claim_initial_admin;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_flag_bot(p_user uuid, p_flag boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  UPDATE public.profiles SET is_bot_flagged = p_flag WHERE id = p_user;
  RETURN jsonb_build_object('ok', true, 'flagged', p_flag);
END; $function$
;

CREATE OR REPLACE FUNCTION public.admin_mark_withdrawal_processed(p_request_id uuid, p_note text DEFAULT NULL::text)
 RETURNS withdrawal_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v public.withdrawal_requests;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  UPDATE public.withdrawal_requests
    SET status = 'processed',
        processed_at = now(),
        admin_note = COALESCE(p_note, admin_note),
        updated_at = now()
    WHERE id = p_request_id
    RETURNING * INTO v;
  UPDATE public.user_wallets
    SET total_withdrawn = total_withdrawn + v.amount,
        updated_at = now()
    WHERE user_id = v.user_id;
  RETURN v;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_set_role(p_user uuid, p_role app_role, p_grant boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  IF p_user = auth.uid() AND p_role = 'admin' AND p_grant = false THEN
    RAISE EXCEPTION 'cannot revoke your own admin role';
  END IF;

  IF p_grant THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (p_user, p_role)
      ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = p_user AND role = p_role;
  END IF;

  INSERT INTO public.admin_actions (admin_id, action, target_type, target_id, payload)
    VALUES (auth.uid(),
            CASE WHEN p_grant THEN 'grant_role' ELSE 'revoke_role' END,
            'user', p_user::text,
            jsonb_build_object('role', p_role::text));

  INSERT INTO public.notifications (user_id, type, payload)
    VALUES (p_user, CASE WHEN p_grant THEN 'role_granted' ELSE 'role_revoked' END,
            jsonb_build_object('role', p_role::text));

  RETURN jsonb_build_object('ok', true, 'granted', p_grant, 'role', p_role::text);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_set_video_boost(p_video text, p_score numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  UPDATE public.videos SET boost_score = p_score WHERE id::text = p_video;
  RETURN jsonb_build_object('ok', true, 'boost', p_score);
END; $function$
;

CREATE OR REPLACE FUNCTION public.admin_unban_user(p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  UPDATE public.profiles SET is_banned = false, ban_reason = NULL, banned_until = NULL WHERE id = p_user;
  INSERT INTO public.admin_actions (admin_id, action, target_type, target_id, payload)
    VALUES (auth.uid(), 'unban_user', 'user', p_user::text, '{}'::jsonb);
  RETURN jsonb_build_object('ok', true);
END; $function$
;

CREATE OR REPLACE FUNCTION public.admin_unflag_bot(p_user uuid)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.admin_flag_bot(p_user, false);
$function$
;

CREATE OR REPLACE FUNCTION public.assign_ab_variant(p_test uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_variants jsonb; v_names text[]; v_pick text; v_hash int;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;
  SELECT variant INTO v_pick FROM public.ab_assignments WHERE test_id = p_test AND user_id = v_uid;
  IF v_pick IS NOT NULL THEN RETURN v_pick; END IF;
  SELECT variants INTO v_variants FROM public.ab_tests WHERE id = p_test AND status = 'running';
  IF v_variants IS NULL OR jsonb_array_length(v_variants) = 0 THEN RETURN NULL; END IF;
  SELECT array_agg(x->>'name') INTO v_names FROM jsonb_array_elements(v_variants) x;
  v_hash := abs(hashtext(v_uid::text || p_test::text));
  v_pick := v_names[(v_hash % array_length(v_names,1)) + 1];
  INSERT INTO public.ab_assignments(test_id, user_id, variant) VALUES (p_test, v_uid, v_pick)
    ON CONFLICT (test_id, user_id) DO NOTHING;
  RETURN v_pick;
END; $function$
;

CREATE OR REPLACE FUNCTION public.auto_classify_short()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.duration_seconds IS NOT NULL THEN
    IF NEW.aspect_ratio IS NOT NULL THEN
      NEW.is_short := (NEW.duration_seconds <= 120 AND NEW.aspect_ratio::numeric <= 1.05);
    ELSE
      NEW.is_short := (NEW.duration_seconds <= 120);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.bump_ad_slot_impression(p_slot text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.ad_settings
     SET impressions_count = impressions_count + 1, updated_at = now()
   WHERE slot = p_slot AND enabled = true;
$function$
;

CREATE OR REPLACE FUNCTION public.claim_initial_admin()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_count int;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT count(*) INTO v_admin_count
  FROM public.user_roles
  WHERE role = 'admin';

  IF v_admin_count > 0 THEN
    RAISE EXCEPTION 'Admin already exists, cannot claim initial admin';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.admin_actions (admin_id, action, target_type, target_id, payload)
  VALUES (v_user_id, 'claim_initial_admin', 'user', v_user_id::text, '{}'::jsonb);

  RETURN jsonb_build_object('ok', true, 'message', 'Admin role claimed successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_copyright_claim(p_video_id uuid, p_claimant_id uuid, p_claim_type text, p_severity text DEFAULT 'warning'::text, p_match_percentage numeric DEFAULT NULL::numeric, p_matched_content_id text DEFAULT NULL::text, p_matched_content_title text DEFAULT NULL::text, p_matched_content_owner text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_claim_id uuid;
BEGIN
  INSERT INTO public.copyright_claims (
    video_id, claimant_id, claim_type, severity, match_percentage,
    matched_content_id, matched_content_title, matched_content_owner
  ) VALUES (
    p_video_id, p_claimant_id, p_claim_type, p_severity, p_match_percentage,
    p_matched_content_id, p_matched_content_title, p_matched_content_owner
  ) RETURNING id INTO v_claim_id;

  INSERT INTO public.channel_notices (
    user_id, notice_type, severity, title, message, action_required,
    related_video_id, related_claim_id
  ) SELECT
    videos.owner_id,
    'copyright_claim',
    p_severity,
    'Copyright Claim Detected',
    'A copyright claim has been detected on your video: ' || COALESCE(p_matched_content_title, 'Unknown Content'),
    true,
    p_video_id,
    v_claim_id
  FROM public.videos
  WHERE videos.id = p_video_id;

  RETURN v_claim_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.dispute_copyright_claim(p_claim_id uuid, p_dispute_reason text, p_dispute_evidence text[] DEFAULT NULL::text[])
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_video_owner_id uuid;
BEGIN
  UPDATE public.copyright_claims
  SET status = 'disputed',
      dispute_reason = p_dispute_reason,
      dispute_evidence = p_dispute_evidence,
      updated_at = now()
  WHERE id = p_claim_id
  RETURNING (SELECT videos.owner_id FROM public.videos WHERE videos.id::text = copyright_claims.video_id) INTO v_video_owner_id;

  UPDATE public.channel_notices
  SET is_read = true, read_at = now()
  WHERE related_claim_id = p_claim_id AND user_id = v_video_owner_id;

  RETURN true;
END;
$function$
;