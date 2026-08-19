-- Add INSERT policy for video_views to allow authenticated users to record views
-- This fixes the issue where view counts weren't incrementing due to RLS blocking inserts

CREATE POLICY "video_views_insert_authenticated" ON public.video_views
FOR INSERT TO authenticated
WITH CHECK (true);
