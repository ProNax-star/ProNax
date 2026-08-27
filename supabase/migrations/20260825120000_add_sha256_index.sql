-- Add SHA-256 index for duplicate detection optimization
-- This index improves performance when checking for duplicate videos by file hash

-- Create index on sha256 column for fast duplicate detection
CREATE INDEX IF NOT EXISTS idx_videos_sha256 ON public.videos(sha256) WHERE sha256 IS NOT NULL;
