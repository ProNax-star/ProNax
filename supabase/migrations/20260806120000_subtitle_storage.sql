-- Create table for storing video subtitles
CREATE TABLE IF NOT EXISTS public.video_subtitles (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    label text NOT NULL,
    language text NOT NULL,
    src text NOT NULL,
    kind text DEFAULT 'subtitles' NOT NULL CHECK (kind IN ('subtitles', 'captions')),
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create index for faster lookups by video_id
CREATE INDEX IF NOT EXISTS idx_video_subtitles_video_id ON public.video_subtitles(video_id);

-- Enable RLS
ALTER TABLE public.video_subtitles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read subtitles for any video (public access)
DROP POLICY IF EXISTS "Subtitles are publicly viewable" ON public.video_subtitles;
CREATE POLICY "Subtitles are publicly viewable"
    ON public.video_subtitles FOR SELECT
    USING (true);

-- Policy: Only video owners can insert/update/delete subtitles
DROP POLICY IF EXISTS "Video owners can manage subtitles" ON public.video_subtitles;
CREATE POLICY "Video owners can manage subtitles"
    ON public.video_subtitles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.videos
            WHERE videos.id = video_subtitles.video_id
            AND videos.owner_id = auth.uid()
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_video_subtitles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS video_subtitles_updated_at ON public.video_subtitles;
CREATE TRIGGER video_subtitles_updated_at
    BEFORE UPDATE ON public.video_subtitles
    FOR EACH ROW
    EXECUTE FUNCTION update_video_subtitles_updated_at();
