-- PDQ and vPDQ Hashing Tables for Image/Video Copyright Detection
-- This migration adds tables to store PDQ image hashes and vPDQ video hashes

-- PDQ Image Hashes table
CREATE TABLE IF NOT EXISTS public.pdq_image_hashes (
    id SERIAL PRIMARY KEY,
    image_name TEXT NOT NULL,
    pdq_hash TEXT NOT NULL, -- 256-bit PDQ hash (64 hex characters)
    quality_score NUMERIC, -- PDQ quality score
    owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- vPDQ Video Hashes table
CREATE TABLE IF NOT EXISTS public.vpdq_video_hashes (
    id SERIAL PRIMARY KEY,
    video_name TEXT NOT NULL,
    vpdq_hash TEXT NOT NULL, -- vPDQ video hash
    frame_count INTEGER,
    quality_score NUMERIC,
    owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Indexes for faster hash matching
CREATE INDEX IF NOT EXISTS idx_pdq_image_hashes_hash ON public.pdq_image_hashes(pdq_hash);
CREATE INDEX IF NOT EXISTS idx_pdq_image_hashes_owner_id ON public.pdq_image_hashes(owner_id);
CREATE INDEX IF NOT EXISTS idx_pdq_image_hashes_video_id ON public.pdq_image_hashes(video_id);

CREATE INDEX IF NOT EXISTS idx_vpdq_video_hashes_hash ON public.vpdq_video_hashes(vpdq_hash);
CREATE INDEX IF NOT EXISTS idx_vpdq_video_hashes_owner_id ON public.vpdq_video_hashes(owner_id);
CREATE INDEX IF NOT EXISTS idx_vpdq_video_hashes_video_id ON public.vpdq_video_hashes(video_id);

-- RLS Policies
ALTER TABLE public.pdq_image_hashes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vpdq_video_hashes ENABLE ROW LEVEL SECURITY;

-- PDQ Image Hashes Policies
DROP POLICY IF EXISTS "users_can_read_own_pdq_hashes" ON public.pdq_image_hashes;
CREATE POLICY "users_can_read_own_pdq_hashes" ON public.pdq_image_hashes
    FOR SELECT TO authenticated
    USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "users_can_insert_own_pdq_hashes" ON public.pdq_image_hashes;
CREATE POLICY "users_can_insert_own_pdq_hashes" ON public.pdq_image_hashes
    FOR INSERT TO authenticated
    WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "users_can_update_own_pdq_hashes" ON public.pdq_image_hashes;
CREATE POLICY "users_can_update_own_pdq_hashes" ON public.pdq_image_hashes
    FOR UPDATE TO authenticated
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "users_can_delete_own_pdq_hashes" ON public.pdq_image_hashes;
CREATE POLICY "users_can_delete_own_pdq_hashes" ON public.pdq_image_hashes
    FOR DELETE TO authenticated
    USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "admins_can_read_all_pdq_hashes" ON public.pdq_image_hashes;
CREATE POLICY "admins_can_read_all_pdq_hashes" ON public.pdq_image_hashes
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "service_role_can_write_pdq_hashes" ON public.pdq_image_hashes;
CREATE POLICY "service_role_can_write_pdq_hashes" ON public.pdq_image_hashes
    FOR ALL TO service_role
    USING (true);

-- vPDQ Video Hashes Policies
DROP POLICY IF EXISTS "users_can_read_own_vpdq_hashes" ON public.vpdq_video_hashes;
CREATE POLICY "users_can_read_own_vpdq_hashes" ON public.vpdq_video_hashes
    FOR SELECT TO authenticated
    USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "users_can_insert_own_vpdq_hashes" ON public.vpdq_video_hashes;
CREATE POLICY "users_can_insert_own_vpdq_hashes" ON public.vpdq_video_hashes
    FOR INSERT TO authenticated
    WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "users_can_update_own_vpdq_hashes" ON public.vpdq_video_hashes;
CREATE POLICY "users_can_update_own_vpdq_hashes" ON public.vpdq_video_hashes
    FOR UPDATE TO authenticated
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "users_can_delete_own_vpdq_hashes" ON public.vpdq_video_hashes;
CREATE POLICY "users_can_delete_own_vpdq_hashes" ON public.vpdq_video_hashes
    FOR DELETE TO authenticated
    USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "admins_can_read_all_vpdq_hashes" ON public.vpdq_video_hashes;
CREATE POLICY "admins_can_read_all_vpdq_hashes" ON public.vpdq_video_hashes
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "service_role_can_write_vpdq_hashes" ON public.vpdq_video_hashes;
CREATE POLICY "service_role_can_write_vpdq_hashes" ON public.vpdq_video_hashes
    FOR ALL TO service_role
    USING (true);

-- Function to check PDQ hash match
CREATE OR REPLACE FUNCTION public.check_pdq_match(p_pdq_hash TEXT)
RETURNS TABLE (
    id INTEGER,
    image_name TEXT,
    pdq_hash TEXT,
    quality_score NUMERIC,
    owner_id uuid,
    video_id uuid,
    match_distance INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This is a placeholder - actual matching will be done by Python worker using ThreatExchange
    -- The Python worker will use PDQ similarity matching
    RETURN QUERY SELECT 
        h.id::INTEGER,
        h.image_name,
        h.pdq_hash,
        h.quality_score,
        h.owner_id,
        h.video_id,
        0::INTEGER
    FROM public.pdq_image_hashes h
    WHERE h.id IS NULL
    LIMIT 0;
END;
$$;

-- Function to check vPDQ hash match
CREATE OR REPLACE FUNCTION public.check_vpdq_match(p_vpdq_hash TEXT)
RETURNS TABLE (
    id INTEGER,
    video_name TEXT,
    vpdq_hash TEXT,
    frame_count INTEGER,
    quality_score NUMERIC,
    owner_id uuid,
    video_id uuid,
    match_distance INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This is a placeholder - actual matching will be done by Python worker using ThreatExchange
    -- The Python worker will use vPDQ similarity matching
    RETURN QUERY SELECT 
        h.id::INTEGER,
        h.video_name,
        h.vpdq_hash,
        h.frame_count,
        h.quality_score,
        h.owner_id,
        h.video_id,
        0::INTEGER
    FROM public.vpdq_video_hashes h
    WHERE h.id IS NULL
    LIMIT 0;
END;
$$;

-- Function to register PDQ hash
CREATE OR REPLACE FUNCTION public.register_pdq_hash(
    p_image_name TEXT,
    p_pdq_hash TEXT,
    p_quality_score NUMERIC,
    p_owner_id uuid,
    p_video_id uuid DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_hash_id INTEGER;
BEGIN
    INSERT INTO public.pdq_image_hashes (image_name, pdq_hash, quality_score, owner_id, video_id)
    VALUES (p_image_name, p_pdq_hash, p_quality_score, p_owner_id, p_video_id)
    RETURNING id INTO v_hash_id;
    
    RETURN v_hash_id;
END;
$$;

-- Function to register vPDQ hash
CREATE OR REPLACE FUNCTION public.register_vpdq_hash(
    p_video_name TEXT,
    p_vpdq_hash TEXT,
    p_frame_count INTEGER,
    p_quality_score NUMERIC,
    p_owner_id uuid,
    p_video_id uuid DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_hash_id INTEGER;
BEGIN
    INSERT INTO public.vpdq_video_hashes (video_name, vpdq_hash, frame_count, quality_score, owner_id, video_id)
    VALUES (p_video_name, p_vpdq_hash, p_frame_count, p_quality_score, p_owner_id, p_video_id)
    RETURNING id INTO v_hash_id;
    
    RETURN v_hash_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_pdq_match(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_vpdq_match(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.register_pdq_hash(TEXT, TEXT, NUMERIC, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.register_vpdq_hash(TEXT, TEXT, INTEGER, NUMERIC, uuid, uuid) TO authenticated, service_role;

-- Trigger to update updated_at timestamp for PDQ hashes
CREATE OR REPLACE FUNCTION public.update_pdq_hashes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_pdq_hashes_updated_at ON public.pdq_image_hashes;
CREATE TRIGGER trigger_update_pdq_hashes_updated_at
    BEFORE UPDATE ON public.pdq_image_hashes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_pdq_hashes_updated_at();

-- Trigger to update updated_at timestamp for vPDQ hashes
DROP TRIGGER IF EXISTS trigger_update_vpdq_hashes_updated_at ON public.vpdq_video_hashes;
CREATE TRIGGER trigger_update_vpdq_hashes_updated_at
    BEFORE UPDATE ON public.vpdq_video_hashes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_pdq_hashes_updated_at();
