-- Duplicate Fingerprint Check for Content ID
-- This migration adds RPC functions to check for duplicate/copyrighted content
-- before completing the Content ID scan

-- Drop all existing versions of the function to avoid ambiguity
DROP FUNCTION IF EXISTS public.check_duplicate_fingerprint(TEXT);
DROP FUNCTION IF EXISTS public.check_duplicate_fingerprint(TEXT, uuid);
DROP FUNCTION IF EXISTS public.check_duplicate_fingerprint(TEXT, uuid, uuid);

-- Function to check if a fingerprint already exists in the database
CREATE OR REPLACE FUNCTION public.check_duplicate_fingerprint(
    p_fingerprint TEXT,
    p_video_id uuid DEFAULT NULL,
    p_owner_id uuid DEFAULT NULL
)
RETURNS TABLE (
    is_duplicate BOOLEAN,
    existing_video_id uuid,
    existing_video_title TEXT,
    existing_owner_id uuid,
    match_type TEXT,
    confidence NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_match_count INTEGER;
BEGIN
    -- Check in copyright_fingerprints table (DO NOT filter by owner_id - flag all duplicates)
    SELECT COUNT(*) INTO v_match_count
    FROM public.copyright_fingerprints
    WHERE (fingerprint_data->>'fingerprint' = p_fingerprint OR fingerprint_data::text LIKE '%' || p_fingerprint || '%')
    AND is_active = true
    AND (p_video_id IS NULL OR content_id::text != p_video_id::text);
    
    IF v_match_count > 0 THEN
        RETURN QUERY SELECT 
            true::BOOLEAN,
            (cf.content_id::uuid),
            (cf.metadata->>'title')::TEXT,
            cf.owner_id,
            'exact_fingerprint'::TEXT,
            100.0::NUMERIC
        FROM public.copyright_fingerprints cf
        WHERE (cf.fingerprint_data->>'fingerprint' = p_fingerprint OR cf.fingerprint_data::text LIKE '%' || p_fingerprint || '%')
        AND cf.is_active = true
        AND (p_video_id IS NULL OR cf.content_id::text != p_video_id::text)
        LIMIT 1;
        
        RETURN;
    END IF;
    
    -- Check in videos table for SHA256 hash match (DO NOT filter by owner_id)
    SELECT COUNT(*) INTO v_match_count
    FROM public.videos
    WHERE sha256 = p_fingerprint
    AND (p_video_id IS NULL OR id != p_video_id);
    
    IF v_match_count > 0 THEN
        RETURN QUERY SELECT 
            true::BOOLEAN,
            v.id,
            v.title,
            v.owner_id,
            'file_hash'::TEXT,
            100.0::NUMERIC
        FROM public.videos v
        WHERE v.sha256 = p_fingerprint
        AND (p_video_id IS NULL OR v.id != p_video_id)
        LIMIT 1;
        
        RETURN;
    END IF;
    
    -- Check in audio_fingerprints_songs table (DO NOT filter by owner_id)
    SELECT COUNT(*) INTO v_match_count
    FROM public.audio_fingerprints_songs
    WHERE file_sha1 = p_fingerprint
    AND (p_video_id IS NULL OR video_id != p_video_id);
    
    IF v_match_count > 0 THEN
        RETURN QUERY SELECT 
            true::BOOLEAN,
            afs.video_id,
            afs.song_name,
            afs.owner_id,
            'audio_fingerprint'::TEXT,
            95.0::NUMERIC
        FROM public.audio_fingerprints_songs afs
        WHERE afs.file_sha1 = p_fingerprint
        AND (p_video_id IS NULL OR afs.video_id != p_video_id)
        LIMIT 1;
        
        RETURN;
    END IF;
    
    -- No duplicate found
    RETURN QUERY SELECT 
        false::BOOLEAN,
        NULL::uuid,
        NULL::TEXT,
        NULL::uuid,
        NULL::TEXT,
        0.0::NUMERIC;
END;
$$;

-- Function to create a copyright claim when duplicate is detected
CREATE OR REPLACE FUNCTION public.create_copyright_claim_from_duplicate(
    p_video_id uuid,
    p_existing_video_id uuid,
    p_existing_owner_id uuid,
    p_match_type TEXT,
    p_confidence NUMERIC
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_claim_id uuid;
    v_existing_title TEXT;
BEGIN
    -- Get existing video title
    SELECT title INTO v_existing_title
    FROM public.videos
    WHERE id = p_existing_video_id;
    
    -- Create copyright claim
    INSERT INTO public.copyright_claims (
        video_id,
        claimant_id,
        claim_type,
        severity,
        status,
        match_percentage,
        matched_content_id,
        matched_content_title,
        matched_content_owner,
        action_taken,
        detected_at
    ) VALUES (
        p_video_id,
        p_existing_owner_id,
        CASE p_match_type
            WHEN 'exact_fingerprint' THEN 'video'
            WHEN 'file_hash' THEN 'video'
            WHEN 'audio_fingerprint' THEN 'audio'
            ELSE 'video'
        END,
        'block',
        'active',
        p_confidence,
        p_existing_video_id::text,
        v_existing_title,
        (SELECT display_name FROM public.profiles WHERE id = p_existing_owner_id),
        'auto_blocked',
        now()
    ) RETURNING id INTO v_claim_id;
    
    -- Update video status to copyright_flagged
    UPDATE public.videos
    SET status = 'copyright_flagged',
        monetization_enabled = false
    WHERE id = p_video_id;
    
    -- Create channel notice for the uploader
    INSERT INTO public.channel_notices (
        user_id,
        notice_type,
        severity,
        title,
        message,
        action_required,
        related_video_id,
        related_claim_id
    ) SELECT 
        v.owner_id,
        'copyright_claim',
        'warning',
        'Copyright Claim Detected',
        'Your video "' || v.title || '" has been flagged for copyright infringement. Duplicate content detected with ' || p_confidence::text || '% confidence.',
        true,
        p_video_id,
        v_claim_id
    FROM public.videos v
    WHERE v.id = p_video_id;
    
    RETURN v_claim_id;
END;
$$;

-- Function to check and handle duplicate fingerprint in one call
CREATE OR REPLACE FUNCTION public.check_and_handle_duplicate_fingerprint(
    p_fingerprint TEXT,
    p_video_id uuid,
    p_video_title TEXT,
    p_owner_id uuid
)
RETURNS TABLE (
    is_duplicate BOOLEAN,
    claim_id uuid,
    status TEXT,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_duplicate_record RECORD;
    v_claim_id uuid;
BEGIN
    -- Check for duplicate (pass owner_id but don't filter by it - flag all duplicates)
    FOR v_duplicate_record IN 
        SELECT * FROM public.check_duplicate_fingerprint(p_fingerprint, p_video_id, p_owner_id)
    LOOP
        IF v_duplicate_record.is_duplicate THEN
            -- Create copyright claim
            v_claim_id := public.create_copyright_claim_from_duplicate(
                p_video_id,
                v_duplicate_record.existing_video_id,
                v_duplicate_record.existing_owner_id,
                v_duplicate_record.match_type,
                v_duplicate_record.confidence
            );
            
            RETURN QUERY SELECT 
                true::BOOLEAN,
                v_claim_id,
                'copyright_flagged'::TEXT,
                'Duplicate / Copyright Match Found. Video flagged and monetization disabled.'::TEXT;
            RETURN;
        END IF;
    END LOOP;
    
    -- No duplicate found
    RETURN QUERY SELECT 
        false::BOOLEAN,
        NULL::uuid,
        'ready'::TEXT,
        'No duplicate content found.'::TEXT;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_duplicate_fingerprint(TEXT, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_copyright_claim_from_duplicate(uuid, uuid, uuid, TEXT, NUMERIC) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_and_handle_duplicate_fingerprint(TEXT, uuid, TEXT, uuid) TO authenticated, service_role;

-- Add comment to document the functions
COMMENT ON FUNCTION public.check_duplicate_fingerprint IS 'Checks if a fingerprint already exists in copyright_fingerprints, videos, or audio_fingerprints_songs tables';
COMMENT ON FUNCTION public.create_copyright_claim_from_duplicate IS 'Creates a copyright claim when a duplicate fingerprint is detected and flags the video';
COMMENT ON FUNCTION public.check_and_handle_duplicate_fingerprint IS 'Combined function to check for duplicate and automatically create copyright claim if match found';
