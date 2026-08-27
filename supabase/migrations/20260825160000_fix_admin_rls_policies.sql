-- Fix RLS policies for admin panel tables
-- Ensure admin users can read all admin tables

-- Enable RLS on admin tables if not already enabled
ALTER TABLE public.video_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_strikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "video_reports_insert" ON public.video_reports;
DROP POLICY IF EXISTS "video_reports_read" ON public.video_reports;
DROP POLICY IF EXISTS "appeals_read" ON public.appeals;
DROP POLICY IF EXISTS "appeals_insert" ON public.appeals;
DROP POLICY IF EXISTS "user_strikes_read" ON public.user_strikes;
DROP POLICY IF EXISTS "categories_read" ON public.categories;
DROP POLICY IF EXISTS "app_settings_read" ON public.app_settings;
DROP POLICY IF EXISTS "moderation_settings_read" ON public.moderation_settings;
DROP POLICY IF EXISTS "activity_log_read" ON public.activity_log;

-- Create proper admin policies
CREATE POLICY "video_reports_insert" ON public.video_reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "video_reports_read" ON public.video_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "appeals_insert" ON public.appeals FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "appeals_read" ON public.appeals FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "user_strikes_read" ON public.user_strikes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "categories_read" ON public.categories FOR SELECT USING (true);

CREATE POLICY "app_settings_read" ON public.app_settings FOR SELECT USING (true);

CREATE POLICY "moderation_settings_read" ON public.moderation_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "activity_log_read" ON public.activity_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- Ensure profiles table has proper admin read policy
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "profiles_admin_read" ON public.profiles;
CREATE POLICY "profiles_admin_read" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
