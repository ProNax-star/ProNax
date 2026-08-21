/**
 * Video Upload Service with Copyright Detection
 * Handles video upload to Cloudflare R2 via pre-signed URLs and FastAPI copyright detection
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
    // Step 1: Get pre-signed URL from Supabase Edge Function
    const presignedUrlResult = await getPresignedUploadUrl(params.file);
    
    if (!presignedUrlResult.success) {
      return {
        success: false,
        status: 'error',
        message: presignedUrlResult.error || 'Failed to get upload URL'
      };
    }

    // Step 2: Upload video directly to R2 using pre-signed URL
    if (!presignedUrlResult.presignedUrl) {
      return {
        success: false,
        status: 'error',
        message: 'No presigned URL returned from Edge Function'
      };
    }

    const r2UploadResult = await uploadToR2WithPresignedUrl(
      params.file,
      presignedUrlResult.presignedUrl
    );
    
    if (!r2UploadResult.success) {
      return {
        success: false,
        status: 'error',
        message: 'Failed to upload video to R2'
      };
    }

    // Step 3: Call FastAPI /recognize endpoint for copyright detection
    const recognitionResult = await audioFingerprintService.recognizeAudio(params.file);

    // Step 4: Handle copyright detection result
    if (recognitionResult.success && recognitionResult.matched) {
      // Copyright detected - flag the video
      const videoId = await createVideoRecord({
        ...params,
        r2VideoKey: presignedUrlResult.fileKey ?? '',
        videoUrl: presignedUrlResult.publicUrl ?? '',
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
    } else if (!recognitionResult.success) {
      // Audio fingerprinting service unavailable - proceed without copyright check
      console.warn('Audio fingerprinting service unavailable, proceeding without copyright check:', recognitionResult.error);
      const videoId = await createVideoRecord({
        ...params,
        r2VideoKey: presignedUrlResult.fileKey ?? '',
        videoUrl: presignedUrlResult.publicUrl ?? '',
        status: 'ready'
      });

      return {
        success: true,
        videoId,
        status: 'ready',
        message: 'Video uploaded successfully (copyright check unavailable)',
        copyrightMatch: {
          matched: false,
          songName: undefined,
          confidence: undefined
        }
      };
    } else {
      // No copyright match - register the audio and publish
      const fingerprintResult = await audioFingerprintService.fingerprintAudio(
        params.file,
        params.title,
        params.ownerId
      );

      if (!fingerprintResult.success) {
        console.warn('Audio fingerprinting failed, proceeding without registration:', fingerprintResult.error);
        // Proceed with video creation even if fingerprinting fails
        const videoId = await createVideoRecord({
          ...params,
          r2VideoKey: presignedUrlResult.fileKey ?? '',
          videoUrl: presignedUrlResult.publicUrl ?? '',
          status: 'ready'
        });

        return {
          success: true,
          videoId,
          status: 'ready',
          message: 'Video uploaded successfully (fingerprinting unavailable)',
          copyrightMatch: {
            matched: false,
            songName: undefined,
            confidence: undefined
          }
        };
      }

      const videoId = await createVideoRecord({
        ...params,
        r2VideoKey: presignedUrlResult.fileKey ?? '',
        videoUrl: presignedUrlResult.publicUrl ?? '',
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
 * Get pre-signed upload URL from Supabase Edge Function
 */
async function getPresignedUploadUrl(file: File): Promise<{
  success: boolean;
  presignedUrl?: string;
  fileKey?: string;
  publicUrl?: string;
  error?: string;
}> {
  try {
    console.log('[videoUpload] Calling Edge Function via Supabase client');
    
    const { data, error } = await supabase.functions.invoke('upload-to-r2', {
      body: {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      }
    });

    if (error) {
      console.error('[videoUpload] Edge Function error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get presigned URL'
      };
    }

    console.log('[videoUpload] Edge Function response:', data);
    
    return {
      success: true,
      presignedUrl: data.presignedUrl,
      fileKey: data.fileKey,
      publicUrl: data.publicUrl
    };
  } catch (error) {
    console.error('Error getting presigned URL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Upload video file to Cloudflare R2 using pre-signed URL
 */
async function uploadToR2WithPresignedUrl(
  file: File,
  presignedUrl: string
): Promise<{ success: boolean }> {
  try {
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      body: file
    });

    if (!response.ok) {
      console.error('R2 upload failed:', response.status, response.statusText);
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error('Error uploading to R2:', error);
    return { success: false };
  }
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

  console.log('[videoUpload] Creating video record with:', {
    visibility: params.visibility,
    status: params.status,
    title: params.title,
    ownerId: params.ownerId
  });

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
    .select('id, visibility, status, title')
    .single();

  console.log('[videoUpload] Video record created:', data, 'Error:', error);

  if (error) {
    throw new Error(`Failed to create video record: ${error.message}`);
  }

  return data.id;
}
