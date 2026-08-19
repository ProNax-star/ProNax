-- Add video_data column to store base64 video data for local playback
-- This allows video playback without external R2 storage
ALTER TABLE public.videos 
ADD COLUMN video_data text;

-- Add comment to document the purpose
COMMENT ON COLUMN public.videos.video_data IS 'Base64 encoded video data for local playback (fallback when R2 is not configured)';