-- =========================================================
-- 1. GRANTS
-- =========================================================
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relkind='r'
  LOOP
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    IF t <> 'profiles' THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    END IF;
  END LOOP;
END $$;

-- profiles: never expose email to app roles
GRANT SELECT (id, display_name, bio, avatar_url, banner_url, handle, verified,
              follower_count, following_count, video_count, total_views,
              is_banned, banned_until, status, created_at, updated_at)
  ON public.profiles TO anon, authenticated;
GRANT UPDATE (display_name, bio, avatar_url, banner_url, handle, updated_at)
  ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO authenticated;

-- anon read-only on public surfaces
GRANT SELECT ON public.videos, public.categories, public.sidebar_menu, public.system_config,
  public.feature_flags, public.dynamic_routes, public.dynamic_widgets, public.ad_settings,
  public.trending_sounds, public.challenges, public.streams, public.video_comments,
  public.video_likes, public.video_shares, public.follows, public.playlists,
  public.playlist_items, public.community_posts, public.creator_marketplace,
  public.comment_likes, public.app_settings, public.video_ads
  TO anon;

-- =========================================================
-- 2. POLICIES
-- =========================================================

-- ---------- profiles ----------
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ---------- videos ----------
CREATE POLICY "videos_public_read" ON public.videos FOR SELECT USING (
  (visibility = 'public' AND status = 'ready' AND COALESCE(is_removed,false) = false)
  OR owner_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "videos_insert_own" ON public.videos FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "videos_update_own" ON public.videos FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "videos_delete_own" ON public.videos FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ---------- site config: public read, admin write ----------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['categories','sidebar_menu','system_config','feature_flags',
                           'dynamic_routes','dynamic_widgets','ad_settings','app_settings',
                           'trending_sounds','challenges','video_ads','moderation_settings']
  LOOP
    IF t = 'moderation_settings' THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.has_role(auth.uid(),''admin''))', t||'_read', t);
    ELSE
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (true)', t||'_read', t);
    END IF;
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(),''admin'')) WITH CHECK (public.has_role(auth.uid(),''admin''))', t||'_admin_write', t);
  END LOOP;
END $$;

-- ---------- social: public read, own write ----------
CREATE POLICY "video_comments_read" ON public.video_comments FOR SELECT USING (true);
CREATE POLICY "video_comments_write_own" ON public.video_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "video_comments_update_own" ON public.video_comments FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "video_comments_delete_own" ON public.video_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "video_likes_read" ON public.video_likes FOR SELECT USING (true);
CREATE POLICY "video_likes_write_own" ON public.video_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "video_likes_delete_own" ON public.video_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "comment_likes_read" ON public.comment_likes FOR SELECT USING (true);
CREATE POLICY "comment_likes_write_own" ON public.comment_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "comment_likes_delete_own" ON public.comment_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "video_shares_read" ON public.video_shares FOR SELECT USING (true);
CREATE POLICY "video_shares_insert" ON public.video_shares FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "follows_read" ON public.follows FOR SELECT USING (true);
CREATE POLICY "follows_write_own" ON public.follows FOR INSERT TO authenticated WITH CHECK (follower_id = auth.uid());
CREATE POLICY "follows_delete_own" ON public.follows FOR DELETE TO authenticated USING (follower_id = auth.uid());

CREATE POLICY "community_posts_read" ON public.community_posts FOR SELECT USING (visibility = 'public' OR creator_id = auth.uid());
CREATE POLICY "community_posts_own" ON public.community_posts FOR ALL TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());

CREATE POLICY "creator_marketplace_read" ON public.creator_marketplace FOR SELECT USING (true);
CREATE POLICY "creator_marketplace_own" ON public.creator_marketplace FOR ALL TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());

-- ---------- playlists ----------
CREATE POLICY "playlists_read" ON public.playlists FOR SELECT USING (visibility = 'public' OR user_id = auth.uid());
CREATE POLICY "playlists_own" ON public.playlists FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "playlist_items_read" ON public.playlist_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND (p.visibility = 'public' OR p.user_id = auth.uid()))
);
CREATE POLICY "playlist_items_own" ON public.playlist_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid()));

-- ---------- streams ----------
CREATE POLICY "streams_read" ON public.streams FOR SELECT USING (status <> 'draft' OR user_id = auth.uid());
CREATE POLICY "streams_own" ON public.streams FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---------- owner-only user data ----------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['user_wallets','wallet_transactions','withdrawal_requests',
                           'user_withdrawal_methods','revenue_logs','watch_history',
                           'video_saves','video_downloads','notifications','channel_notices',
                           'appeals','ab_assignments','copyright_fingerprints']
  LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s = auth.uid() OR public.has_role(auth.uid(),''admin''))',
      t||'_read_own', t, CASE WHEN t='copyright_fingerprints' THEN 'owner_id' ELSE 'user_id' END);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s = auth.uid())',
      t||'_insert_own', t, CASE WHEN t='copyright_fingerprints' THEN 'owner_id' ELSE 'user_id' END);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (%s = auth.uid()) WITH CHECK (%s = auth.uid())',
      t||'_update_own', t,
      CASE WHEN t='copyright_fingerprints' THEN 'owner_id' ELSE 'user_id' END,
      CASE WHEN t='copyright_fingerprints' THEN 'owner_id' ELSE 'user_id' END);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (%s = auth.uid())',
      t||'_delete_own', t, CASE WHEN t='copyright_fingerprints' THEN 'owner_id' ELSE 'user_id' END);
  END LOOP;
END $$;

-- creator_earnings (creator_id)
CREATE POLICY "creator_earnings_read_own" ON public.creator_earnings FOR SELECT TO authenticated
  USING (creator_id = auth.uid() OR user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- video_views: creator/admin analytics only
CREATE POLICY "video_views_read_owner" ON public.video_views FOR SELECT TO authenticated USING (
  viewer_id = auth.uid() OR public.has_role(auth.uid(),'admin')
  OR EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_id AND v.owner_id = auth.uid())
);

-- user_roles: read own, admin manages via RPC
CREATE POLICY "user_roles_read_own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- reports: create own, admins review
CREATE POLICY "video_reports_insert" ON public.video_reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "video_reports_read" ON public.video_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- copyright claims: video owner, claimant, or admin
CREATE POLICY "copyright_claims_read" ON public.copyright_claims FOR SELECT TO authenticated USING (
  claimant_id = auth.uid() OR public.has_role(auth.uid(),'admin')
  OR EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_id AND v.owner_id = auth.uid())
);
CREATE POLICY "copyright_claims_admin_write" ON public.copyright_claims FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- analytics + ab events: insert allowed, read restricted
CREATE POLICY "analytics_events_insert" ON public.analytics_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "analytics_events_admin_read" ON public.analytics_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "ab_events_insert" ON public.ab_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ab_events_admin_read" ON public.ab_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "ab_tests_read" ON public.ab_tests FOR SELECT TO authenticated USING (true);
CREATE POLICY "ab_tests_admin_write" ON public.ab_tests FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "ab_experiments_read" ON public.ab_experiments FOR SELECT TO authenticated USING (true);
CREATE POLICY "ab_experiments_admin_write" ON public.ab_experiments FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ---------- admin-only tables ----------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['moderation_queue','platform_revenue','admin_actions',
                           'algorithm_audit_log','activity_log']
  LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(),''admin'')) WITH CHECK (public.has_role(auth.uid(),''admin''))', t||'_admin_only', t);
  END LOOP;
END $$;

-- =========================================================
-- 3. SEED DEFAULTS
-- =========================================================
INSERT INTO public.categories (slug, name, icon, position, enabled) VALUES
  ('all','All','sparkles',0,true),
  ('music','Music','music',1,true),
  ('gaming','Gaming','gamepad-2',2,true),
  ('education','Education','graduation-cap',3,true),
  ('technology','Technology','cpu',4,true),
  ('sports','Sports','trophy',5,true),
  ('news','News','newspaper',6,true),
  ('comedy','Comedy','laugh',7,true),
  ('film','Film & Animation','clapperboard',8,true),
  ('vlogs','Vlogs','video',9,true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.sidebar_menu (section, label, icon, href, position, enabled)
SELECT * FROM (VALUES
  ('main','Home','home','/',0,true),
  ('main','Shorts','play-circle','/shorts',1,true),
  ('main','Subscriptions','users','/subscriptions',2,true),
  ('main','Explore','compass','/explore',3,true),
  ('main','Trending','flame','/trending',4,true),
  ('you','History','history','/history',0,true),
  ('you','Playlists','list-video','/playlists',1,true),
  ('you','Liked videos','thumbs-up','/likes',2,true),
  ('you','Saved','bookmark','/saved',3,true),
  ('you','Wallet','wallet','/wallet',4,true)
) AS v(section,label,icon,href,position,enabled)
WHERE NOT EXISTS (SELECT 1 FROM public.sidebar_menu);

INSERT INTO public.system_config (id, site_name, site_description, maintenance_mode, signup_enabled, uploads_enabled, ads_enabled, min_withdrawal)
VALUES (1, 'Pro Nax Video', 'Watch, share and earn on Pro Nax Video.', false, true, true, true, 10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.feature_flags (key, enabled, description, rollout_percent) VALUES
  ('shorts', true, 'Shorts feed', 100),
  ('live_streaming', true, 'Live streaming', 100),
  ('monetization', true, 'Creator monetization & wallet', 100),
  ('ads', true, 'Advertising slots', 100),
  ('community_posts', false, 'Community posts tab', 0)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.ad_settings (slot, kind, network, enabled, frequency, notes)
SELECT * FROM (VALUES
  ('home_banner','banner','direct',false,1,'Top of home feed'),
  ('watch_preroll','video','direct',false,1,'Pre-roll before watch page video'),
  ('shorts_interstitial','banner','direct',false,5,'Every 5 shorts'),
  ('sidebar','banner','direct',false,1,'Watch page sidebar')
) AS v(slot,kind,network,enabled,frequency,notes)
WHERE NOT EXISTS (SELECT 1 FROM public.ad_settings);