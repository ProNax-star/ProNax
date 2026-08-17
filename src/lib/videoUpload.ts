/**
 * Video Upload Service with Copyright Detection
 * Handles video upload to Cloudflare R2 and FastAPI copyright detection
 */

import { audioFingerprintService, RecognitionResult, FingerprintResult } from './audioFingerprint';
import { supabase } from '@/integrations/supabase/loose';

export interface VideoUploadResult {
  success: boolean;
  videoId?: string;
  status: 'published' | 'copyright_flagged' | 'error';
  message?: string;
  copyrightMatch?: {
    matched: boolean;
    songName?: string;
    confidence?: number;
  };
}

export interface VideoUploadParams {
  file: File;
  title: string;
  description: string;
  tags: string[];
  category: string;
  visibility: 'public' | 'unlisted' | 'private' | 'scheduled';
  scheduledAt?: string | null;
  monetizationEnabled: boolean;
  isShort: boolean;
  duration: number;
  thumbnailUrl: string;
  ownerId: string;
}

/**
 * Upload video to Cloudflare R2 and run copyright detection
 * This is a server-side function that should be called from the upload modal
 */
export async function uploadVideoWithCopyrightDetection(
  params: VideoUploadParams
): Promise<VideoUploadResult> {
  try {
    // Step 1: Upload video to Cloudflare R2
    // TODO: Implement actual R2 upload. For now, we'll simulate it
    const r2UploadResult = await uploadToR2(params.file);
    
    if (!r2UploadResult.success) {
      return {
        success: false,
        status: 'error',
        message: 'Failed to upload video to R2'
      };
    }

    // Step 2: Call FastAPI /recognize endpoint for copyright detection
    const recognitionResult = await audioFingerprintService.recognizeAudio(params.file);

    // Step 3: Handle copyright detection result
    if (recognitionResult.success && recognitionResult.matched) {
      // Copyright detected - flag the video
      const videoId = await createVideoRecord({
        ...params,
        r2VideoKey: r2UploadResult.r2VideoKey,
        videoUrl: r2UploadResult.videoUrl,
        status: 'copyright_flagged'
      });

      return {
        success: true,
        videoId,
        status: 'copyright_flagged',
        message: 'Copyright content detected!',
        copyrightMatch: {
          matched: true,
          songName: recognitionResult.song_name,
          confidence: recognitionResult.confidence
        }
      };
    } else {
      // No copyright match - register the audio and publish
      const fingerprintResult = await audioFingerprintService.fingerprintAudio(
        params.file,
        params.title,
        params.ownerId
      );

      const videoId = await createVideoRecord({
        ...params,
        r2VideoKey: r2UploadResult.r2VideoKey,
        videoUrl: r2UploadResult.videoUrl,
        status: 'ready'
      });

      return {
        success: true,
        videoId,
        status: 'published',
        message: 'Video published successfully',
        copyrightMatch: {
          matched: false
        }
      };
    }
  } catch (error) {
    console.error('Error in video upload with copyright detection:', error);
    return {
      success: false,
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Upload video file to Cloudflare R2
 * TODO: Implement actual R2 upload logic
 */
async function uploadToR2(file: File): Promise<{
  success: boolean;
  r2VideoKey?: string;
  videoUrl?: string;
}> {
  // TODO: Implement actual Cloudflare R2 upload
  // For now, return a simulated result
  const fileKey = `videos/${Date.now()}-${file.name}`;
  
  return {
    success: true,
    r2VideoKey: fileKey,
    videoUrl: `https://r2.example.com/${fileKey}`
  };
}

/**
 * Create video record in Supabase
 */
async function createVideoRecord(
  params: VideoUploadParams & { r2VideoKey: string; videoUrl: string; status: string }
): Promise<string> {
  // First check if the owner exists in profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', params.ownerId)
    .single();

  if (profileError || !profile) {
    throw new Error(`Owner profile not found: ${params.ownerId}`);
  }

  const { data, error } = await supabase
    .from('videos')
    .insert({
      owner_id: params.ownerId,
      title: params.title,
      description: params.description,
      tags: params.tags,
      category: params.category,
      visibility: params.visibility,
      scheduled_at: params.scheduledAt,
      monetization_enabled: params.monetizationEnabled,
      is_short: params.isShort,
      duration_seconds: params.duration,
      thumb_url: params.thumbnailUrl,
      r2_video_key: params.r2VideoKey,
      video_url: params.videoUrl,
      status: params.status,
      mime_type: params.file.type,
      size_bytes: params.file.size,
      published_at: params.visibility === 'public' && !params.scheduledAt ? new Date().toISOString() : null
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create video record: ${error.message}`);
  }

  return data.id;
}
