CREATE OR REPLACE FUNCTION public.request_withdrawal(p_amount numeric, p_method text DEFAULT 'paypal'::text, p_details jsonb DEFAULT '{}'::jsonb)
 RETURNS withdrawal_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_row public.withdrawal_requests; v_bal numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  SELECT balance INTO v_bal FROM public.user_wallets WHERE user_id = v_uid;
  IF COALESCE(v_bal,0) < p_amount THEN RAISE EXCEPTION 'insufficient balance'; END IF;
  INSERT INTO public.withdrawal_requests(user_id, amount, method, payment_details, status)
    VALUES (v_uid, p_amount, p_method, COALESCE(p_details,'{}'::jsonb), 'pending') RETURNING * INTO v_row;
  UPDATE public.user_wallets SET balance = balance - p_amount, updated_at = now() WHERE user_id = v_uid;
  INSERT INTO public.wallet_transactions(user_id, delta, kind, reference_id, reason)
    VALUES (v_uid, -p_amount, 'withdrawal_request', v_row.id::text, 'Withdrawal requested');
  RETURN v_row;
END; $function$
;

CREATE OR REPLACE FUNCTION public.search_videos_suggest(p_q text, p_limit integer DEFAULT 10)
 RETURNS TABLE(id uuid, title text, thumb_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT v.id, v.title, v.thumb_url FROM public.videos v
   WHERE v.visibility='public' AND v.status='ready'
     AND (v.title ILIKE '%' || p_q || '%' OR v.description ILIKE '%' || p_q || '%')
   ORDER BY v.views_count DESC
   LIMIT p_limit;
$function$
;

CREATE OR REPLACE FUNCTION public.settle_ad_impression(p_ad_id text, p_video_id text, p_creator_id uuid, p_completed boolean)
 RETURNS TABLE(settled boolean, creator_share numeric, reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_ad_revenue numeric := 0.001;
  v_creator_share numeric;
  v_platform_share numeric;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT false, 0::numeric, 'auth_required'::text;
    RETURN;
  END IF;

  v_creator_share := v_ad_revenue * 0.70;
  v_platform_share := v_ad_revenue * 0.30;

  BEGIN
    INSERT INTO public.analytics_events (event, user_id, video_id, props)
    VALUES (
      'ad_impression_settled',
      v_uid,
      p_video_id,
      jsonb_build_object(
        'ad_id', p_ad_id,
        'creator_id', p_creator_id,
        'completed', p_completed,
        'revenue', v_ad_revenue,
        'creator_share', v_creator_share,
        'platform_share', v_platform_share
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL; END;

  IF p_creator_id IS NOT NULL AND p_completed = true THEN
    BEGIN
      INSERT INTO public.wallet_transactions (user_id, delta, balance_after, kind, reference_id, reason)
      VALUES (
        p_creator_id,
        v_creator_share,
        (SELECT COALESCE(balance, 0) + v_creator_share FROM public.user_wallets WHERE user_id = p_creator_id),
        'ad_revenue',
        p_ad_id,
        'Ad impression revenue'
      );
    EXCEPTION WHEN OTHERS THEN NULL; END;

    BEGIN
      INSERT INTO public.user_wallets (user_id, balance, total_earned, updated_at)
      VALUES (p_creator_id, v_creator_share, v_creator_share, now())
      ON CONFLICT (user_id) DO UPDATE SET
        balance = public.user_wallets.balance + v_creator_share,
        total_earned = public.user_wallets.total_earned + v_creator_share,
        updated_at = now();
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  RETURN QUERY SELECT true, v_creator_share, 'settled'::text;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.toggle_follow(p_target uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_exists UUID;
  v_count INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_uid = p_target THEN
    RAISE EXCEPTION 'Cannot follow yourself';
  END IF;

  SELECT id INTO v_exists FROM public.follows
  WHERE follower_id = v_uid AND following_id = p_target;

  IF v_exists IS NOT NULL THEN
    DELETE FROM public.follows WHERE id = v_exists;
  ELSE
    INSERT INTO public.follows (follower_id, following_id)
    VALUES (v_uid, p_target);

    INSERT INTO public.notifications (user_id, type, payload, category)
    VALUES (p_target, 'follow',
            jsonb_build_object('follower_id', v_uid, 'title', 'New follower'),
            'social');
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.follows
  WHERE following_id = p_target;

  RETURN jsonb_build_object('following', v_exists IS NULL, 'followers', v_count);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.toggle_like(p_video uuid, p_creator uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_exists UUID;
  v_count INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT id INTO v_exists FROM public.video_likes
  WHERE video_id = p_video::text AND user_id = v_uid;

  IF v_exists IS NOT NULL THEN
    DELETE FROM public.video_likes WHERE id = v_exists;
  ELSE
    INSERT INTO public.video_likes (video_id, user_id)
    VALUES (p_video::text, v_uid);

    IF p_creator IS NOT NULL AND p_creator <> v_uid THEN
      INSERT INTO public.notifications (user_id, type, payload, category)
      VALUES (p_creator, 'like',
              jsonb_build_object('video_id', p_video, 'liker_id', v_uid, 'title', 'New like'),
              'social');
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.video_likes
  WHERE video_id = p_video::text;

  RETURN jsonb_build_object('liked', v_exists IS NULL, 'likes', v_count);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.toggle_save(p_video text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_exists uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT id INTO v_exists FROM public.video_saves WHERE video_id = p_video AND user_id = v_uid;
  IF v_exists IS NOT NULL THEN
    DELETE FROM public.video_saves WHERE id = v_exists;
    RETURN jsonb_build_object('saved', false);
  ELSE
    INSERT INTO public.video_saves (video_id, user_id) VALUES (p_video, v_uid);
    RETURN jsonb_build_object('saved', true);
  END IF;
END; $function$
;

CREATE OR REPLACE FUNCTION public.toggle_save(p_video uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.toggle_save(p_video::text);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.touch_ad_settings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END $function$
;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $function$
;

CREATE OR REPLACE FUNCTION public.update_algorithm_weights(p_weights jsonb, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_prev jsonb; k text; v jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  v_prev := COALESCE(public.get_algo_weights(), '{}'::jsonb);
  FOR k, v IN SELECT * FROM jsonb_each(p_weights) LOOP
    IF k NOT IN ('algo_category_affinity','algo_freshness_boost','algo_ctr_weight','algo_retention_weight','algo_watched_penalty') THEN CONTINUE; END IF;
    INSERT INTO public.app_settings(key, value, updated_at) VALUES (k, v, now())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  END LOOP;
  INSERT INTO public.algorithm_audit_log(actor, previous, next, note)
    VALUES (auth.uid(), v_prev, p_weights, p_note);
  RETURN public.get_algo_weights();
END; $function$
;

CREATE OR REPLACE FUNCTION public.update_challenge_participants()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.challenges
    SET participant_count = participant_count + 1,
        video_count = video_count + 1
    WHERE id = NEW.challenge_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.challenges
    SET participant_count = participant_count - 1,
        video_count = video_count - 1
    WHERE id = OLD.challenge_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_comment_like_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.video_comments
    SET likes_count = COALESCE(likes_count,0) + 1
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.video_comments
    SET likes_count = GREATEST(COALESCE(likes_count,0) - 1, 0)
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_follower_counts()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
    SET following_count = COALESCE(following_count,0) + 1
    WHERE id = NEW.follower_id;

    UPDATE public.profiles
    SET follower_count = COALESCE(follower_count,0) + 1
    WHERE id = NEW.following_id;

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
    SET following_count = GREATEST(COALESCE(following_count,0) - 1, 0)
    WHERE id = OLD.follower_id;

    UPDATE public.profiles
    SET follower_count = GREATEST(COALESCE(follower_count,0) - 1, 0)
    WHERE id = OLD.following_id;

    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_marketplace_stats()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.creator_marketplace
    SET views_count = views_count + 1
    WHERE id = NEW.listing_id;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_post_counts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_profile_video_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'ready' THEN
    UPDATE public.profiles
    SET video_count = COALESCE(video_count,0) + 1
    WHERE id = NEW.owner_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status <> 'ready' AND NEW.status = 'ready' THEN
      UPDATE public.profiles
      SET video_count = COALESCE(video_count,0) + 1
      WHERE id = NEW.owner_id;
    ELSIF OLD.status = 'ready' AND NEW.status <> 'ready' THEN
      UPDATE public.profiles
      SET video_count = GREATEST(COALESCE(video_count,0) - 1, 0)
      WHERE id = NEW.owner_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'ready' THEN
    UPDATE public.profiles
    SET video_count = GREATEST(COALESCE(video_count,0) - 1, 0)
    WHERE id = OLD.owner_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_sound_usage()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.audio_track_id IS NOT NULL THEN
    INSERT INTO public.trending_sounds (audio_track_id, usage_count, trend_score)
    VALUES (NEW.audio_track_id, 1, 1.0)
    ON CONFLICT (audio_track_id)
    DO UPDATE SET
      usage_count = public.trending_sounds.usage_count + 1,
      trend_score = public.trending_sounds.usage_count * 0.1 + public.trending_sounds.trend_score * 0.9,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_video_comment_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos
    SET comments_count = COALESCE(comments_count,0) + 1
    WHERE id::text = NEW.video_id;

    IF NEW.parent_id IS NOT NULL THEN
      UPDATE public.video_comments
      SET replies_count = COALESCE(replies_count,0) + 1
      WHERE id = NEW.parent_id;
    END IF;

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.videos
    SET comments_count = GREATEST(COALESCE(comments_count,0) - 1, 0)
    WHERE id::text = OLD.video_id;

    IF OLD.parent_id IS NOT NULL THEN
      UPDATE public.video_comments
      SET replies_count = GREATEST(COALESCE(replies_count,0) - 1, 0)
      WHERE id = OLD.parent_id;
    END IF;

    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_video_like_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos
    SET likes_count = COALESCE(likes_count,0) + 1
    WHERE id::text = NEW.video_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.videos
    SET likes_count = GREATEST(COALESCE(likes_count,0) - 1, 0)
    WHERE id::text = OLD.video_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_video_share_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos
    SET shares_count = COALESCE(shares_count,0) + 1
    WHERE id::text = NEW.video_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_video_view_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos
    SET views_count = COALESCE(views_count,0) + 1
    WHERE id = NEW.video_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$function$
;