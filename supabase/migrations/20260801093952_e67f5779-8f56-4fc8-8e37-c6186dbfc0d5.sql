CREATE OR REPLACE FUNCTION public.get_algo_weights()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_weights jsonb;
BEGIN
  v_weights := jsonb_build_object(
    'views_weight', 0.4,
    'likes_weight', 0.3,
    'comments_weight', 0.2,
    'shares_weight', 0.1,
    'recency_weight', 0.5,
    'creator_score_weight', 0.3
  );

  RETURN v_weights;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_channel_notices(p_user_id uuid DEFAULT NULL::uuid, p_unread_only boolean DEFAULT false, p_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, notice_type text, severity text, title text, message text, action_required boolean, action_url text, action_label text, related_video_id text, is_read boolean, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    cn.id,
    cn.notice_type,
    cn.severity,
    cn.title,
    cn.message,
    cn.action_required,
    cn.action_url,
    cn.action_label,
    cn.related_video_id,
    cn.is_read,
    cn.created_at
  FROM public.channel_notices cn
  WHERE cn.user_id = COALESCE(p_user_id, auth.uid())
    AND (p_unread_only = false OR cn.is_read = false)
    AND (cn.expires_at IS NULL OR cn.expires_at > now())
  ORDER BY cn.severity DESC, cn.created_at DESC
  LIMIT p_limit;
$function$
;

CREATE OR REPLACE FUNCTION public.get_creator_analytics(p_user uuid DEFAULT NULL::uuid, p_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := COALESCE(p_user, auth.uid()); v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF v_uid <> auth.uid() AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT jsonb_build_object(
    'videos', (SELECT count(*) FROM public.videos WHERE owner_id = v_uid),
    'views', (SELECT COALESCE(sum(views_count),0) FROM public.videos WHERE owner_id = v_uid),
    'followers', (SELECT count(*) FROM public.follows WHERE following_id = v_uid),
    'earnings', (SELECT COALESCE(total_earned,0) FROM public.user_wallets WHERE user_id = v_uid),
    'recent_views', (SELECT count(*) FROM public.video_views vv
       JOIN public.videos v ON v.id = vv.video_id
       WHERE v.owner_id = v_uid AND vv.created_at > now() - (p_days || ' days')::interval)
  ) INTO v_result;
  RETURN v_result;
END; $function$
;

CREATE OR REPLACE FUNCTION public.get_home_feed_v2(p_kind text DEFAULT 'foryou'::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, p_category text DEFAULT NULL::text, p_is_short boolean DEFAULT false, p_max_per_creator integer DEFAULT 2, p_max_per_category integer DEFAULT 4)
 RETURNS TABLE(id text, title text, description text, thumb_url text, video_url text, owner_id uuid, created_at timestamp with time zone, views_count bigint, duration_seconds integer, is_short boolean, category text, preview_sprite_url text, preview_sprite_frames integer)
 LANGUAGE sql
AS $function$
  SELECT
    v.id::text,
    v.title,
    v.description,
    v.thumb_url,
    v.video_url,
    v.owner_id,
    v.created_at,
    COALESCE(v.views_count, 0) as views_count,
    v.duration_seconds,
    COALESCE(v.is_short, false) as is_short,
    v.category,
    v.preview_sprite_url,
    v.preview_sprite_frames
  FROM public.videos v
  WHERE v.visibility = 'public'
    AND v.status = 'ready'
    AND (p_category IS NULL OR v.category ILIKE p_category)
    AND (p_is_short IS NULL OR COALESCE(v.is_short, false) = p_is_short)
  ORDER BY
    CASE
      WHEN p_kind = 'trending' THEN COALESCE(v.views_count, 0)
      ELSE 0
    END DESC,
    v.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$function$
;

CREATE OR REPLACE FUNCTION public.get_related_videos(p_video text, p_limit integer DEFAULT 12)
 RETURNS SETOF videos
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH base AS (SELECT category, owner_id FROM public.videos WHERE id::text = p_video LIMIT 1)
  SELECT v.* FROM public.videos v, base b
   WHERE v.id::text <> p_video
     AND v.visibility='public' AND v.status='ready'
     AND COALESCE(v.is_removed,false)=false
     AND (v.category = b.category OR v.owner_id = b.owner_id)
   ORDER BY v.views_count DESC, v.created_at DESC
   LIMIT p_limit;
$function$
;

CREATE OR REPLACE FUNCTION public.get_shorts_feed(p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS SETOF videos
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT v.* FROM public.videos v
   WHERE v.visibility='public' AND v.status='ready'
     AND COALESCE(v.is_short,false)=true
     AND COALESCE(v.is_removed,false)=false
   ORDER BY v.created_at DESC
   LIMIT GREATEST(p_limit,1) OFFSET GREATEST(p_offset,0);
$function$
;

CREATE OR REPLACE FUNCTION public.get_video_copyright_claims(p_video_id uuid)
 RETURNS TABLE(id uuid, claim_type text, severity text, status text, detected_at timestamp with time zone, action_taken text, match_percentage numeric, matched_content_title text, matched_content_owner text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    cc.id,
    cc.claim_type,
    cc.severity,
    cc.status,
    cc.detected_at,
    cc.action_taken,
    cc.match_percentage,
    cc.matched_content_title,
    cc.matched_content_owner
  FROM public.copyright_claims cc
  WHERE cc.video_id = p_video_id
  ORDER BY cc.detected_at DESC;
$function$
;

CREATE OR REPLACE FUNCTION public.get_video_retention(p_video text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'video', p_video,
    'avg_watch', COALESCE((SELECT avg(watch_seconds) FROM public.video_views WHERE video_id = p_video::uuid), 0),
    'views', COALESCE((SELECT count(*) FROM public.video_views WHERE video_id = p_video::uuid), 0)
  );
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$function$
;

CREATE OR REPLACE FUNCTION public.mark_notice_read(p_notice_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.channel_notices
  SET is_read = true, read_at = now()
  WHERE id = p_notice_id AND user_id = auth.uid();
  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.moderate_comment()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.text IS NULL OR length(btrim(NEW.text)) = 0 THEN
    RAISE EXCEPTION 'Comment cannot be empty';
  END IF;
  IF length(NEW.text) > 2000 THEN
    RAISE EXCEPTION 'Comment too long';
  END IF;
  IF public.contains_profanity(NEW.text) THEN
    RAISE EXCEPTION 'Comment blocked: inappropriate language detected';
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.moderate_video_meta()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.contains_profanity(NEW.title) OR public.contains_profanity(NEW.description) THEN
    RAISE EXCEPTION 'Video blocked: inappropriate language in title or description';
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.pick_ad_for_video(p_video text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT to_jsonb(a) FROM public.video_ads a WHERE a.video_id = p_video LIMIT 1),
    '{}'::jsonb
  );
$function$
;

CREATE OR REPLACE FUNCTION public.post_comment(p_video text, p_text text, p_parent uuid DEFAULT NULL::uuid, p_creator uuid DEFAULT NULL::uuid)
 RETURNS video_comments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_row public.video_comments;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  INSERT INTO public.video_comments (video_id, user_id, parent_id, text)
    VALUES (p_video, v_uid, p_parent, p_text) RETURNING * INTO v_row;
  IF p_creator IS NOT NULL AND p_creator <> v_uid THEN
    INSERT INTO public.notifications (user_id, type, payload)
      VALUES (p_creator, 'comment', jsonb_build_object('video_id', p_video, 'comment_id', v_row.id, 'commenter_id', v_uid));
  END IF;
  RETURN v_row;
END; $function$
;

CREATE OR REPLACE FUNCTION public.record_ab_event(p_test uuid, p_variant text, p_event text, p_value numeric DEFAULT 1)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  INSERT INTO public.ab_events(test_id, variant, user_id, event, value)
    VALUES (p_test, p_variant, auth.uid(), p_event, p_value);
$function$
;

CREATE OR REPLACE FUNCTION public.record_ad_view(p_video_id text, p_ad_revenue numeric DEFAULT 0.001, p_ad_network text DEFAULT 'direct'::text, p_cpm numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_gross NUMERIC; v_creator NUMERIC; v_platform NUMERIC;
  v_recent_count INT; v_wallet public.user_wallets;
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
     AND session_user <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden: ad revenue must be settled by server-side ad verification';
  END IF;
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required to record ad view'; END IF;
  v_gross := GREATEST(0, LEAST(COALESCE(p_ad_revenue, 0), 1));
  v_creator := ROUND(v_gross * 0.6, 6);
  v_platform := ROUND(v_gross * 0.4, 6);
  SELECT COUNT(*) INTO v_recent_count FROM public.revenue_logs
   WHERE user_id = v_uid AND video_id = p_video_id AND created_at > now() - interval '24 hours';
  IF v_recent_count >= 3 THEN RETURN jsonb_build_object('paid', false, 'reason', 'daily_cap_reached', 'cap', 3); END IF;
  IF v_gross <= 0 THEN RETURN jsonb_build_object('paid', false, 'reason', 'no_revenue'); END IF;
  INSERT INTO public.user_wallets (user_id, balance, total_earned, updated_at)
  VALUES (v_uid, v_creator, v_creator, now())
  ON CONFLICT (user_id) DO UPDATE SET balance = public.user_wallets.balance + v_creator,
    total_earned = public.user_wallets.total_earned + v_creator, updated_at = now()
  RETURNING * INTO v_wallet;
  INSERT INTO public.revenue_logs (user_id, video_id, views_count, amount_earned, ad_network, cpm, gross_revenue)
  VALUES (v_uid, p_video_id, 1, v_creator, p_ad_network, p_cpm, v_gross);
  INSERT INTO public.platform_revenue (source_user_id, video_id, amount, gross_revenue, ad_network, cpm)
  VALUES (v_uid, p_video_id, v_platform, v_gross, p_ad_network, p_cpm);
  RETURN jsonb_build_object('paid', true, 'gross', v_gross, 'creator_share', v_creator,
    'platform_share', v_platform, 'balance', v_wallet.balance, 'total_earned', v_wallet.total_earned);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.record_download(p_video text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_recent int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT count(*) INTO v_recent FROM public.video_downloads
    WHERE user_id = v_uid AND video_id = p_video AND created_at > now() - interval '24 hours';
  IF v_recent >= 5 THEN
    RETURN jsonb_build_object('logged', false, 'reason', 'rate_limited');
  END IF;
  INSERT INTO public.video_downloads (video_id, user_id) VALUES (p_video, v_uid);
  RETURN jsonb_build_object('logged', true);
END; $function$
;

CREATE OR REPLACE FUNCTION public.record_heartbeat(p_video text, p_seconds integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.record_watch_progress(p_video, p_seconds);
  RETURN jsonb_build_object('ok', true);
END; $function$
;

CREATE OR REPLACE FUNCTION public.record_share(p_video uuid, p_platform text DEFAULT 'link'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO public.video_shares (video_id, user_id, platform)
  VALUES (p_video, auth.uid(), p_platform);

  SELECT COUNT(*) INTO v_count FROM public.video_shares
  WHERE video_id = p_video;

  RETURN jsonb_build_object('shares', v_count);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.record_share(p_video text, p_channel text DEFAULT 'link'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_count int;
BEGIN
  INSERT INTO public.video_shares (video_id, user_id, channel) VALUES (p_video, auth.uid(), COALESCE(p_channel,'link'));
  SELECT count(*) INTO v_count FROM public.video_shares WHERE video_id = p_video;
  RETURN jsonb_build_object('shares', v_count);
END; $function$
;

CREATE OR REPLACE FUNCTION public.record_view(p_video text, p_watch_seconds integer DEFAULT 0, p_ip_hash text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_dup int; v_total int;
BEGIN
  SELECT count(*) INTO v_dup FROM public.video_views
    WHERE video_id = p_video::uuid
      AND created_at > now() - interval '30 minutes'
      AND ((v_uid IS NOT NULL AND viewer_id = v_uid) OR (v_uid IS NULL AND ip_address IS NOT NULL AND ip_address = p_ip_hash));
  IF v_dup = 0 THEN
    INSERT INTO public.video_views (video_id, viewer_id, watch_seconds, ip_address)
      VALUES (p_video::uuid, v_uid, GREATEST(p_watch_seconds,0), p_ip_hash);
  END IF;

  SELECT count(*) INTO v_total FROM public.video_views WHERE video_id = p_video::uuid;
  RETURN jsonb_build_object('counted', v_dup = 0, 'views', v_total);
END; $function$
;

CREATE OR REPLACE FUNCTION public.record_view(p_video uuid, p_watch_seconds integer DEFAULT 0, p_ip_hash text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_dup INTEGER;
  v_total INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_dup FROM public.video_views
  WHERE video_id = p_video
    AND created_at > NOW() - INTERVAL '30 minutes'
    AND ((v_uid IS NOT NULL AND viewer_id = v_uid)
         OR (v_uid IS NULL AND ip_address IS NOT NULL AND ip_address = p_ip_hash));

  IF v_dup = 0 THEN
    INSERT INTO public.video_views (video_id, viewer_id, watch_seconds, ip_address)
    VALUES (p_video, v_uid, GREATEST(p_watch_seconds, 0), p_ip_hash);
  END IF;

  SELECT COUNT(*) INTO v_total FROM public.video_views
  WHERE video_id = p_video;

  RETURN jsonb_build_object('counted', v_dup = 0, 'views', v_total);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.record_watch_history(p_video text, p_watch_seconds integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason','auth_required'); END IF;
  INSERT INTO public.watch_history (user_id, video_id, watched_at, watch_seconds, updated_at)
    VALUES (v_uid, p_video, now(), GREATEST(p_watch_seconds,0), now())
    ON CONFLICT (user_id, video_id) DO UPDATE
      SET watched_at = now(),
          watch_seconds = GREATEST(public.watch_history.watch_seconds, EXCLUDED.watch_seconds),
          updated_at = now();
  RETURN jsonb_build_object('ok', true);
END; $function$
;

CREATE OR REPLACE FUNCTION public.record_watch_progress(p_video text, p_seconds integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason','auth_required'); END IF;
  INSERT INTO public.watch_history (user_id, video_id, watched_at, watch_seconds, updated_at)
    VALUES (v_uid, p_video, now(), GREATEST(p_seconds,0), now())
    ON CONFLICT (user_id, video_id) DO UPDATE
      SET watched_at = now(),
          watch_seconds = GREATEST(public.watch_history.watch_seconds, EXCLUDED.watch_seconds),
          updated_at = now();
  RETURN jsonb_build_object('ok', true);
END; $function$
;

CREATE OR REPLACE FUNCTION public.release_copyright_claim(p_claim_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_video_owner_id uuid;
BEGIN
  UPDATE public.copyright_claims
  SET status = 'released',
      resolved_at = now(),
      updated_at = now()
  WHERE id = p_claim_id
  RETURNING (SELECT videos.owner_id FROM public.videos WHERE videos.id::text = copyright_claims.video_id) INTO v_video_owner_id;

  INSERT INTO public.channel_notices (
    user_id, notice_type, severity, title, message, action_required, related_video_id
  ) VALUES (
    v_video_owner_id,
    'copyright_claim',
    'info',
    'Copyright Claim Released',
    'A copyright claim on your video has been released.',
    false,
    (SELECT video_id FROM public.copyright_claims WHERE id = p_claim_id)
  );

  RETURN true;
END;
$function$
;