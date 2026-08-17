-- Audio Fingerprinting Tables for Dejavu Copyright Detection
-- This migration adds tables to store audio fingerprints for copyright detection

-- Songs table to store registered audio content
CREATE TABLE IF NOT EXISTS public.audio_fingerprints_songs (
    id SERIAL PRIMARY KEY,
    song_name TEXT NOT NULL,
    file_sha1 TEXT,
    owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Fingerprints table to store audio fingerprint hashes
CREATE TABLE IF NOT EXISTS public.audio_fingerprints (
    hash TEXT NOT NULL,
    song_id INTEGER REFERENCES public.audio_fingerprints_songs(id) ON DELETE CASCADE,
    "offset" INTEGER NOT NULL,
    date_created timestamp with time zone DEFAULT now(),
    date_modified timestamp with time zone DEFAULT now()
);

-- Indexes for faster fingerprint matching
CREATE INDEX IF NOT EXISTS idx_audio_fingerprints_hash ON public.audio_fingerprints(hash);
CREATE INDEX IF NOT EXISTS idx_audio_fingerprints_song_id ON public.audio_fingerprints(song_id);
CREATE INDEX IF NOT EXISTS idx_audio_fingerprints_songs_owner_id ON public.audio_fingerprints_songs(owner_id);
CREATE INDEX IF NOT EXISTS idx_audio_fingerprints_songs_video_id ON public.audio_fingerprints_songs(video_id);

-- RLS Policies
ALTER TABLE public.audio_fingerprints_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_fingerprints ENABLE ROW LEVEL SECURITY;

-- Users can read their own songs
DROP POLICY IF EXISTS "users_can_read_own_songs" ON public.audio_fingerprints_songs;
CREATE POLICY "users_can_read_own_songs" ON public.audio_fingerprints_songs
    FOR SELECT TO authenticated
    USING (owner_id = auth.uid());

-- Users can insert their own songs
DROP POLICY IF EXISTS "users_can_insert_own_songs" ON public.audio_fingerprints_songs;
CREATE POLICY "users_can_insert_own_songs" ON public.audio_fingerprints_songs
    FOR INSERT TO authenticated
    WITH CHECK (owner_id = auth.uid());

-- Users can update their own songs
DROP POLICY IF EXISTS "users_can_update_own_songs" ON public.audio_fingerprints_songs;
CREATE POLICY "users_can_update_own_songs" ON public.audio_fingerprints_songs
    FOR UPDATE TO authenticated
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- Users can delete their own songs
DROP POLICY IF EXISTS "users_can_delete_own_songs" ON public.audio_fingerprints_songs;
CREATE POLICY "users_can_delete_own_songs" ON public.audio_fingerprints_songs
    FOR DELETE TO authenticated
    USING (owner_id = auth.uid());

-- Admins can read all songs
DROP POLICY IF EXISTS "admins_can_read_all_songs" ON public.audio_fingerprints_songs;
CREATE POLICY "admins_can_read_all_songs" ON public.audio_fingerprints_songs
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Fingerprints are read-only for authenticated users (for matching)
DROP POLICY IF EXISTS "authenticated_can_read_fingerprints" ON public.audio_fingerprints;
CREATE POLICY "authenticated_can_read_fingerprints" ON public.audio_fingerprints
    FOR SELECT TO authenticated
    USING (true);

-- Only service role can insert/update fingerprints (via Python worker)
DROP POLICY IF EXISTS "service_role_can_write_fingerprints" ON public.audio_fingerprints;
CREATE POLICY "service_role_can_write_fingerprints" ON public.audio_fingerprints
    FOR ALL TO service_role
    USING (true);

-- Function to check if audio matches copyrighted content
CREATE OR REPLACE FUNCTION public.check_audio_copyright(p_audio_url TEXT)
RETURNS TABLE (
    song_id INTEGER,
    song_name TEXT,
    owner_id uuid,
    video_id uuid,
    match_count INTEGER,
    confidence NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This is a placeholder - actual matching will be done by Python worker
    -- The Python worker will query fingerprints and return results
    RETURN QUERY SELECT 
        s.id::INTEGER,
        s.song_name,
        s.owner_id,
        s.video_id,
        0::INTEGER,
        0::NUMERIC
    FROM public.audio_fingerprints_songs s
    WHERE s.id IS NULL
    LIMIT 0;
END;
$$;

-- Function to register a new audio fingerprint
CREATE OR REPLACE FUNCTION public.register_audio_fingerprint(
    p_song_name TEXT,
    p_file_sha1 TEXT,
    p_owner_id uuid,
    p_video_id uuid DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_song_id INTEGER;
BEGIN
    INSERT INTO public.audio_fingerprints_songs (song_name, file_sha1, owner_id, video_id)
    VALUES (p_song_name, p_file_sha1, p_owner_id, p_video_id)
    RETURNING id INTO v_song_id;
    
    RETURN v_song_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_audio_fingerprint(TEXT, TEXT, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_audio_copyright(TEXT) TO authenticated, service_role;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_audio_fingerprints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_audio_fingerprints_songs_updated_at ON public.audio_fingerprints_songs;
CREATE TRIGGER trigger_update_audio_fingerprints_songs_updated_at
    BEFORE UPDATE ON public.audio_fingerprints_songs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_audio_fingerprints_updated_at();
