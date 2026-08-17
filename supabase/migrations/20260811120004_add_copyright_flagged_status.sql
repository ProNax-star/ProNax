-- Add copyright_flagged status to videos table
-- This migration adds support for copyright flagged video status

-- Drop existing check constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'videos_status_check' 
        AND conrelid = 'public.videos'::regclass
    ) THEN
        ALTER TABLE public.videos DROP CONSTRAINT videos_status_check;
    END IF;
END $$;

-- Add new check constraint with copyright_flagged status
ALTER TABLE public.videos
ADD CONSTRAINT videos_status_check 
CHECK (status IN ('ready', 'processing', 'published', 'copyright_flagged', 'removed', 'error', 'pending_review'));

-- Add comment to document the new status
COMMENT ON COLUMN public.videos.status IS 'Video status: ready, processing, published, copyright_flagged, removed, error, pending_review';
