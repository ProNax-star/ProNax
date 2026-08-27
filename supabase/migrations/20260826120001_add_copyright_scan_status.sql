-- Add copyright scan status tracking to videos table
-- This migration adds columns to track the background copyright scan status

-- Add copyright scan status columns
ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS copyright_scan_status TEXT DEFAULT 'not_started' CHECK (copyright_scan_status IN ('not_started', 'pending', 'complete', 'failed')),
ADD COLUMN IF NOT EXISTS copyright_scan_completed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS copyright_scan_retry_count INTEGER DEFAULT 0;

-- Add comments
COMMENT ON COLUMN public.videos.copyright_scan_status IS 'Status of background copyright scan: not_started, pending, complete, failed';
COMMENT ON COLUMN public.videos.copyright_scan_completed_at IS 'Timestamp when copyright scan completed';
COMMENT ON COLUMN public.videos.copyright_scan_retry_count IS 'Number of retry attempts for failed copyright scans';

-- Create index for querying pending scans
CREATE INDEX IF NOT EXISTS idx_videos_copyright_scan_status ON public.videos(copyright_scan_status) WHERE copyright_scan_status = 'pending';
