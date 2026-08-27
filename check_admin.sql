-- Check if current user has admin role
SELECT 
  auth.uid() as current_user_id,
  public.has_role(auth.uid(), 'admin') as is_admin,
  (SELECT COUNT(*) FROM public.user_roles WHERE role = 'admin') as total_admins,
  (SELECT COUNT(*) FROM public.profiles) as total_users,
  (SELECT COUNT(*) FROM public.videos) as total_videos;
