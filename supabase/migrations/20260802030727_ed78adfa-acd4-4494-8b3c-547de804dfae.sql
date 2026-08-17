-- 1. Re-point ownership FKs from auth.users to public.profiles so app/studio/admin share one graph
ALTER TABLE public.videos DROP CONSTRAINT IF EXISTS videos_owner_id_fkey;
ALTER TABLE public.videos ADD CONSTRAINT videos_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.video_comments DROP CONSTRAINT IF EXISTS video_comments_user_id_fkey;
ALTER TABLE public.video_comments ADD CONSTRAINT video_comments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.video_likes DROP CONSTRAINT IF EXISTS video_likes_user_id_fkey;
ALTER TABLE public.video_likes ADD CONSTRAINT video_likes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.video_saves DROP CONSTRAINT IF EXISTS video_saves_user_id_fkey;
ALTER TABLE public.video_saves ADD CONSTRAINT video_saves_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_follower_id_fkey;
ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_following_id_fkey;
ALTER TABLE public.follows ADD CONSTRAINT follows_follower_id_fkey
  FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.follows ADD CONSTRAINT follows_following_id_fkey
  FOREIGN KEY (following_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.user_wallets DROP CONSTRAINT IF EXISTS user_wallets_user_id_fkey;
ALTER TABLE public.user_wallets ADD CONSTRAINT user_wallets_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.playlists DROP CONSTRAINT IF EXISTS playlists_user_id_fkey;
ALTER TABLE public.playlists ADD CONSTRAINT playlists_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.revenue_logs DROP CONSTRAINT IF EXISTS revenue_logs_user_id_fkey;
ALTER TABLE public.revenue_logs ADD CONSTRAINT revenue_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Missing impression tracker used by the player
CREATE OR REPLACE FUNCTION public.log_video_impression(p_video text, p_surface text DEFAULT 'feed')
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  INSERT INTO public.analytics_events (event, user_id, video_id, props)
  VALUES ('video_impression', auth.uid(), p_video, jsonb_build_object('surface', p_surface));
$$;
GRANT EXECUTE ON FUNCTION public.log_video_impression(text, text) TO anon, authenticated, service_role;

-- 3. Shared studio dashboard report
CREATE OR REPLACE FUNCTION public.get_studio_dashboard(p_user uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := COALESCE(p_user, auth.uid()); v jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF v_uid <> auth.uid() AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT jsonb_build_object(
    'videos', (SELECT count(*) FROM public.videos WHERE owner_id = v_uid),
    'shorts', (SELECT count(*) FROM public.videos WHERE owner_id = v_uid AND is_short),
    'views', (SELECT COALESCE(sum(views_count),0) FROM public.videos WHERE owner_id = v_uid),
    'likes', (SELECT COALESCE(sum(likes_count),0) FROM public.videos WHERE owner_id = v_uid),
    'comments', (SELECT COALESCE(sum(comments_count),0) FROM public.videos WHERE owner_id = v_uid),
    'followers', (SELECT count(*) FROM public.follows WHERE following_id = v_uid),
    'balance', (SELECT COALESCE(balance,0) FROM public.user_wallets WHERE user_id = v_uid),
    'total_earned', (SELECT COALESCE(total_earned,0) FROM public.user_wallets WHERE user_id = v_uid),
    'top_videos', COALESCE((SELECT jsonb_agg(t) FROM (
        SELECT id, title, thumb_url, views_count, likes_count, comments_count, created_at
        FROM public.videos WHERE owner_id = v_uid
        ORDER BY views_count DESC LIMIT 5) t), '[]'::jsonb)
  ) INTO v;
  RETURN v;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_studio_dashboard(uuid) TO authenticated, service_role;

-- 4. Shared admin overview report
CREATE OR REPLACE FUNCTION public.get_platform_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  SELECT jsonb_build_object(
    'users', (SELECT count(*) FROM public.profiles),
    'banned_users', (SELECT count(*) FROM public.profiles WHERE is_banned),
    'videos', (SELECT count(*) FROM public.videos),
    'shorts', (SELECT count(*) FROM public.videos WHERE is_short),
    'pending_review', (SELECT count(*) FROM public.videos WHERE is_pending_review),
    'total_views', (SELECT COALESCE(sum(views_count),0) FROM public.videos),
    'comments', (SELECT count(*) FROM public.video_comments),
    'creator_payouts', (SELECT COALESCE(sum(total_earned),0) FROM public.user_wallets),
    'platform_revenue', (SELECT COALESCE(sum(amount),0) FROM public.platform_revenue),
    'pending_withdrawals', (SELECT count(*) FROM public.withdrawal_requests WHERE status = 'pending'),
    'moderation_queue', (SELECT count(*) FROM public.moderation_queue WHERE status = 'pending'),
    'open_reports', (SELECT count(*) FROM public.video_reports WHERE status = 'pending'),
    'top_creators', COALESCE((SELECT jsonb_agg(t) FROM (
        SELECT p.id, p.display_name, p.handle, p.avatar_url, p.follower_count, p.total_views
        FROM public.profiles p ORDER BY COALESCE(p.total_views,0) DESC LIMIT 5) t), '[]'::jsonb)
  ) INTO v;
  RETURN v;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_platform_overview() TO authenticated, service_role;

-- 5. Demo creators
INSERT INTO public.profiles (id, email, display_name, handle, bio, avatar_url, banner_url, verified, follower_count, following_count, video_count, total_views)
VALUES
 ('11111111-1111-4111-8111-111111111101','nova@pronax.demo','Nova Studios','novastudios','Cinematic shorts and behind-the-scenes.', 'https://i.pravatar.cc/300?img=12','https://picsum.photos/seed/nova/1200/300', true, 128400, 24, 3, 1840000),
 ('11111111-1111-4111-8111-111111111102','pixel@pronax.demo','Pixel Playground','pixelplay','Daily gaming highlights and reviews.','https://i.pravatar.cc/300?img=32','https://picsum.photos/seed/pixel/1200/300', true, 89230, 51, 2, 940000),
 ('11111111-1111-4111-8111-111111111103','codelab@pronax.demo','Code Lab','codelab','Learn to build real software.','https://i.pravatar.cc/300?img=52','https://picsum.photos/seed/codelab/1200/300', false, 45120, 8, 2, 512000),
 ('11111111-1111-4111-8111-111111111104','beatroom@pronax.demo','Beat Room','beatroom','Fresh music sessions every week.','https://i.pravatar.cc/300?img=7','https://picsum.photos/seed/beat/1200/300', true, 210500, 12, 2, 3120000),
 ('11111111-1111-4111-8111-111111111105','worldwire@pronax.demo','World Wire','worldwire','Global news, explained fast.','https://i.pravatar.cc/300?img=15','https://picsum.photos/seed/wire/1200/300', false, 33900, 3, 2, 288000),
 ('11111111-1111-4111-8111-111111111106','laughlab@pronax.demo','Laugh Lab','laughlab','Comedy sketches and fails.','https://i.pravatar.cc/300?img=25','https://picsum.photos/seed/laugh/1200/300', false, 67400, 19, 1, 402000)
ON CONFLICT (id) DO NOTHING;

-- 6. Demo videos
INSERT INTO public.videos (id, owner_id, title, description, category, tags, language, visibility, status,
  r2_video_key, video_url, thumb_url, duration_seconds, is_short, aspect_ratio, views_count, likes_count,
  comments_count, shares_count, monetization_enabled, published_at, created_at)
VALUES
 ('22222222-2222-4222-8222-000000000001','11111111-1111-4111-8111-111111111101','Chasing Light: A Cinematic Journey','Shot over three months across five countries.','film',ARRAY['cinematic','travel'],'en','public','ready','demo/1.mp4','https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4','https://picsum.photos/seed/v1/640/360',596,false,1.78,742000,38210,1240,2100,true, now() - interval '9 days', now() - interval '9 days'),
 ('22222222-2222-4222-8222-000000000002','11111111-1111-4111-8111-111111111101','Behind The Scenes: Night Shoot','How we lit an entire street with two lamps.','film',ARRAY['bts','film'],'en','public','ready','demo/2.mp4','https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4','https://picsum.photos/seed/v2/640/360',653,false,1.78,398000,15400,610,880,true, now() - interval '6 days', now() - interval '6 days'),
 ('22222222-2222-4222-8222-000000000003','11111111-1111-4111-8111-111111111101','60s Drone Reel','','film',ARRAY['drone','short'],'en','public','ready','demo/3.mp4','https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4','https://picsum.photos/seed/v3/360/640',60,true,0.56,700000,52000,2100,4200,true, now() - interval '2 days', now() - interval '2 days'),
 ('22222222-2222-4222-8222-000000000004','11111111-1111-4111-8111-111111111102','Ranked Grind: Road to Top 100','Full ranked session with commentary.','gaming',ARRAY['gaming','fps'],'en','public','ready','demo/4.mp4','https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4','https://picsum.photos/seed/v4/640/360',480,false,1.78,612000,29800,1980,1500,true, now() - interval '5 days', now() - interval '5 days'),
 ('22222222-2222-4222-8222-000000000005','11111111-1111-4111-8111-111111111102','Insane 1v4 Clutch','','gaming',ARRAY['clip','short'],'en','public','ready','demo/5.mp4','https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4','https://picsum.photos/seed/v5/360/640',45,true,0.56,328000,41200,905,3300,true, now() - interval '1 day', now() - interval '1 day'),
 ('22222222-2222-4222-8222-000000000006','11111111-1111-4111-8111-111111111103','Build a Video Platform in 30 Minutes','Full stack walkthrough with database design.','technology',ARRAY['coding','tutorial'],'en','public','ready','demo/6.mp4','https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4','https://picsum.photos/seed/v6/640/360',1820,false,1.78,286000,19400,2410,1200,true, now() - interval '12 days', now() - interval '12 days'),
 ('22222222-2222-4222-8222-000000000007','11111111-1111-4111-8111-111111111103','SQL Joins Explained Fast','','education',ARRAY['sql','short'],'en','public','ready','demo/7.mp4','https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4','https://picsum.photos/seed/v7/360/640',58,true,0.56,226000,17800,640,990,true, now() - interval '3 days', now() - interval '3 days'),
 ('22222222-2222-4222-8222-000000000008','11111111-1111-4111-8111-111111111104','Late Night Live Session','A full acoustic set recorded in one take.','music',ARRAY['music','live'],'en','public','ready','demo/8.mp4','https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4','https://picsum.photos/seed/v8/640/360',888,false,1.78,1840000,124000,8900,15000,true, now() - interval '15 days', now() - interval '15 days'),
 ('22222222-2222-4222-8222-000000000009','11111111-1111-4111-8111-111111111104','Hook of the Week','','music',ARRAY['music','short'],'en','public','ready','demo/9.mp4','https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4','https://picsum.photos/seed/v9/360/640',38,true,0.56,1280000,98000,4100,22000,true, now() - interval '4 hours', now() - interval '4 hours'),
 ('22222222-2222-4222-8222-000000000010','11111111-1111-4111-8111-111111111105','What Happened This Week','Five stories that shaped the week.','news',ARRAY['news'],'en','public','ready','demo/10.mp4','https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4','https://picsum.photos/seed/v10/640/360',734,false,1.78,188000,7400,930,410,true, now() - interval '2 days', now() - interval '2 days'),
 ('22222222-2222-4222-8222-000000000011','11111111-1111-4111-8111-111111111105','60 Second Briefing','','news',ARRAY['news','short'],'en','public','ready','demo/11.mp4','https://storage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4','https://picsum.photos/seed/v11/360/640',60,true,0.56,100000,5100,220,300,true, now() - interval '8 hours', now() - interval '8 hours'),
 ('22222222-2222-4222-8222-000000000012','11111111-1111-4111-8111-111111111106','The Worst Roommate Ever (Sketch)','New sketch every Friday.','comedy',ARRAY['comedy','sketch'],'en','public','ready','demo/12.mp4','https://storage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4','https://picsum.photos/seed/v12/640/360',312,false,1.78,402000,33900,2800,5100,true, now() - interval '7 days', now() - interval '7 days')
ON CONFLICT (id) DO NOTHING;

-- 7. Demo social graph
INSERT INTO public.follows (follower_id, following_id)
SELECT a.id, b.id FROM public.profiles a, public.profiles b
WHERE a.id <> b.id AND a.email LIKE '%@pronax.demo' AND b.email LIKE '%@pronax.demo'
ON CONFLICT DO NOTHING;

INSERT INTO public.video_likes (video_id, user_id)
SELECT v.id::text, p.id FROM public.videos v
JOIN public.profiles p ON p.email LIKE '%@pronax.demo' AND p.id <> v.owner_id
WHERE v.id::text LIKE '22222222%'
ON CONFLICT DO NOTHING;

INSERT INTO public.video_comments (video_id, user_id, text)
SELECT v.id::text, p.id, c.txt
FROM public.videos v
JOIN public.profiles p ON p.email LIKE '%@pronax.demo' AND p.id <> v.owner_id
JOIN (VALUES ('Incredible work, the pacing is perfect.'),('This deserves way more views.'),('Saved this for later, thanks!')) AS c(txt) ON true
WHERE v.id::text LIKE '22222222%' AND random() < 0.35;

-- 8. Demo money data
INSERT INTO public.user_wallets (user_id, balance, total_earned, total_withdrawn)
SELECT p.id, round((random()*400 + 40)::numeric, 2), round((random()*2200 + 300)::numeric, 2), round((random()*800)::numeric, 2)
FROM public.profiles p WHERE p.email LIKE '%@pronax.demo'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.revenue_logs (user_id, video_id, views_count, amount_earned, ad_network, cpm, gross_revenue)
SELECT v.owner_id, v.id::text, v.views_count, round((v.views_count * 0.0012)::numeric, 4), 'direct', 2.40, round((v.views_count * 0.002)::numeric, 4)
FROM public.videos v WHERE v.id::text LIKE '22222222%';

INSERT INTO public.platform_revenue (source_user_id, video_id, amount, gross_revenue, ad_network, cpm)
SELECT v.owner_id, v.id::text, round((v.views_count * 0.0008)::numeric, 4), round((v.views_count * 0.002)::numeric, 4), 'direct', 2.40
FROM public.videos v WHERE v.id::text LIKE '22222222%';