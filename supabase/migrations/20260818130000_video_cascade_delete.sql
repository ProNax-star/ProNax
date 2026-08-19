-- Cascade Delete for Videos
-- When a video is deleted from the database, also delete it from R2/Supabase Storage
-- This ensures storage doesn't accumulate orphaned files

-- Function to delete video from storage when video record is deleted
CREATE OR REPLACE FUNCTION public.delete_video_from_storage()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete from Supabase Storage if r2_video_key contains a storage path
    IF OLD.r2_video_key IS NOT NULL AND OLD.r2_video_key != '' THEN
        -- Note: Storage deletion must be done via client-side or edge function
        -- This trigger marks the video for cleanup
        INSERT INTO public.storage_cleanup_queue (video_id, storage_path, created_at)
        VALUES (OLD.id, OLD.r2_video_key, NOW())
        ON CONFLICT (video_id) DO UPDATE SET 
            storage_path = EXCLUDED.storage_path,
            created_at = NOW();
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create storage cleanup queue table
CREATE TABLE IF NOT EXISTS public.storage_cleanup_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    video_id uuid NOT NULL,
    storage_path text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    cleaned_at timestamp with time zone,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed'))
);

-- Create index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_storage_cleanup_queue_status ON public.storage_cleanup_queue(status, created_at);

-- Enable RLS
ALTER TABLE public.storage_cleanup_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can manage cleanup queue
DROP POLICY IF EXISTS "Service role can manage cleanup queue" ON public.storage_cleanup_queue;
CREATE POLICY "Service role can manage cleanup queue"
    ON public.storage_cleanup_queue
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create trigger on videos table
DROP TRIGGER IF EXISTS on_video_delete_cleanup_storage ON public.videos;
CREATE TRIGGER on_video_delete_cleanup_storage
    BEFORE DELETE ON public.videos
    FOR EACH ROW
    EXECUTE FUNCTION public.delete_video_from_storage();

-- Function to manually delete video from both database and storage
CREATE OR REPLACE FUNCTION public.delete_video_with_storage(p_video_id uuid)
RETURNS JSONB AS $$
DECLARE
    v_storage_path text;
    v_result jsonb;
BEGIN
    -- Get storage path before deletion
    SELECT r2_video_key INTO v_storage_path
    FROM public.videos
    WHERE id = p_video_id;
    
    -- Delete video from database
    DELETE FROM public.videos WHERE id = p_video_id;
    
    -- Add to cleanup queue
    IF v_storage_path IS NOT NULL AND v_storage_path != '' THEN
        INSERT INTO public.storage_cleanup_queue (video_id, storage_path, created_at)
        VALUES (p_video_id, v_storage_path, NOW());
    END IF;
    
    -- Return result
    v_result := jsonb_build_object(
        'success', true,
        'video_id', p_video_id,
        'storage_path', v_storage_path,
        'message', 'Video deleted from database, storage cleanup queued'
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.delete_video_with_storage(uuid) TO authenticated, service_role;

-- Function to get pending storage cleanup items
CREATE OR REPLACE FUNCTION public.get_pending_storage_cleanup()
RETURNS TABLE (
    id uuid,
    video_id uuid,
    storage_path text,
    created_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT id, video_id, storage_path, created_at
    FROM public.storage_cleanup_queue
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_pending_storage_cleanup() TO service_role;

-- Function to mark storage cleanup as completed
CREATE OR REPLACE FUNCTION public.mark_storage_cleanup_completed(p_queue_id uuid, p_status text DEFAULT 'completed')
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.storage_cleanup_queue
    SET status = p_status,
        cleaned_at = NOW()
    WHERE id = p_queue_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.mark_storage_cleanup_completed(uuid, text) TO service_role;

-- Add comments
COMMENT ON FUNCTION public.delete_video_from_storage() IS 'Trigger function to queue storage cleanup when video is deleted';
COMMENT ON FUNCTION public.delete_video_with_storage(uuid) IS 'Delete video from database and queue storage cleanup';
COMMENT ON FUNCTION public.get_pending_storage_cleanup() IS 'Get pending storage cleanup items for background processing';
COMMENT ON FUNCTION public.mark_storage_cleanup_completed(uuid, text) IS 'Mark storage cleanup as completed or failed';
COMMENT ON TABLE public.storage_cleanup_queue IS 'Queue for cleaning up orphaned storage files';
