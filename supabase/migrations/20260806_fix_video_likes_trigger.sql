-- Fix: Attach the update_video_like_count trigger to video_likes table
-- This ensures videos.likes_count is updated when likes are added/removed

DROP TRIGGER IF EXISTS trg_video_likes_count ON public.video_likes;

CREATE TRIGGER trg_video_likes_count
  AFTER INSERT OR DELETE ON public.video_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_video_like_count();
