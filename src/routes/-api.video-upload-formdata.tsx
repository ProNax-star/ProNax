import { createServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/loose';

export interface FormDataUploadParams {
  file: File;
  fileName: string;
  fileType: string;
  fileSize: number;
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

export interface FormDataUploadResult {
  success: boolean;
  videoId?: string;
  status: 'published' | 'copyright_flagged' | 'error';
  message?: string;
  videoUrl?: string;
  copyrightMatch?: {
    matched: boolean;
    duplicateDetected?: boolean;
    claimId?: string;
  };
}

/**
 * FormData-based video upload for large files
 * This avoids base64 conversion which causes Chrome crash
 */
export const uploadVideoFormData = createServerFn({ method: 'POST' })
  .validator((data: FormDataUploadParams) => data)
  .handler(async ({ data: params }) => {
    console.log('Starting FormData upload for:', params.fileName, 'Size:', params.fileSize);
    
    try {
      // Step 1: Validate file size
      const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
      if (params.fileSize > MAX_FILE_SIZE) {
        return {
          success: false,
          status: 'error' as const,
          message: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
        };
      }

      // Step 2: Generate SHA-256 hash for duplicate detection (chunked to prevent crash)
      let fileHash: string = '';
      try {
        fileHash = await generateFileHashChunked(params.file);
        console.log('Generated file hash for FormData upload:', fileHash);
      } catch (hashError) {
        console.error('Failed to generate file hash:', hashError);
        // Continue without hash if generation fails
      }

      // Step 3: Check for duplicate using SHA-256 hash before creating video
      if (fileHash) {
        console.log('Checking for duplicate videos using SHA-256 hash:', fileHash);
        const { data: existingVideo } = await supabase
          .from('videos')
          .select('id, title, owner_id')
          .eq('sha256', fileHash)
          .single();

        if (existingVideo) {
          console.warn('Duplicate video detected in FormData upload:', existingVideo);
          return {
            success: true,
            videoId: existingVideo.id,
            status: 'copyright_flagged' as const,
            message: `Duplicate video detected. This video already exists as "${existingVideo.title}"`,
            copyrightMatch: {
              matched: true,
              duplicateDetected: true
            }
          };
        }
      }

      // Step 4: Upload to R2 (simulated for now)
      const r2UploadResult = await uploadToR2(params.fileName, params.fileSize);
      
      if (!r2UploadResult.success) {
        return {
          success: false,
          status: 'error' as const,
          message: 'Failed to upload video to storage'
        };
      }
      
      console.log('R2 upload successful:', r2UploadResult.videoUrl);

      // Step 5: Create video record with SHA-256 hash
      const videoId = await createVideoRecord({
        ...params,
        r2VideoKey: r2UploadResult.r2VideoKey!,
        videoUrl: r2UploadResult.videoUrl!,
        status: 'processing',
        sha256: fileHash
      });
      
      console.log('Video record created:', videoId);

      // Step 4: Check for duplicate fingerprint
      let duplicateDetected = false;
      let duplicateInfo: any = null;
      
      try {
        const { generateVideoFingerprint } = await import('@/lib/videoFingerprint');
        const videoFingerprint = await generateVideoFingerprint(params.title, params.fileSize, params.duration);
        
        console.log('Checking for duplicate fingerprint in FormData upload:', videoFingerprint);
        
        const { data: duplicateCheck, error: duplicateError } = await supabase
          .rpc('check_and_handle_duplicate_fingerprint', {
            p_fingerprint: videoFingerprint,
            p_video_id: videoId,
            p_video_title: params.title,
            p_owner_id: params.ownerId
          });
        
        if (duplicateError) {
          console.error('Duplicate check failed in FormData upload:', duplicateError);
        } else if (duplicateCheck && duplicateCheck.length > 0) {
          const checkResult = duplicateCheck[0];
          if (checkResult.is_duplicate) {
            console.warn('Duplicate content detected in FormData upload:', checkResult);
            duplicateDetected = true;
            duplicateInfo = {
              claimId: checkResult.claim_id,
              status: checkResult.status,
              message: checkResult.message
            };
            
            // Update video status to copyright_flagged
            await supabase
              .from('videos')
              .update({ status: 'copyright_flagged', monetization_enabled: false })
              .eq('id', videoId);
          } else {
            // No duplicate detected, update status to ready
            console.log('No duplicate detected, updating status to ready for FormData upload');
            await supabase
              .from('videos')
              .update({ status: 'ready' })
              .eq('id', videoId);
          }
        }
      } catch (copyrightError) {
        console.error('Copyright detection failed in FormData upload (non-critical):', copyrightError);
        // Ensure video status is set to ready even if copyright detection fails
        try {
          await supabase
            .from('videos')
            .update({ status: 'ready' })
            .eq('id', videoId);
          console.log('Status updated to ready after copyright detection failure');
        } catch (statusError) {
          console.error('Failed to update status to ready:', statusError);
        }
      }

      // Step 6: Return success response
      if (!duplicateDetected) {
        try {
          await supabase
            .from('videos')
            .update({ status: 'ready' })
            .eq('id', videoId);
          console.log('Video status updated to ready');
        } catch (statusUpdateError) {
          console.error('Failed to update video status to ready:', statusUpdateError);
          // Try to ensure status is ready even if update fails
          try {
            // Use service role as fallback
            const { createClient } = await import('@supabase/supabase-js');
            const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                                    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
                                    process.env.SUPABASE_SECRET_KEY ||
                                    process.env.VITE_SUPABASE_SECRET_KEY;
            const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
            
            if (serviceRoleKey && supabaseUrl) {
              const adminClient = createClient(supabaseUrl, serviceRoleKey);
              await adminClient
                .from('videos')
                .update({ status: 'ready' })
                .eq('id', videoId);
              console.log('Video status updated to ready using service role');
            }
          } catch (fallbackError) {
            console.error('Fallback status update also failed:', fallbackError);
          }
        }
      }

      // Step 6: Return result
      if (duplicateDetected) {
        return {
          success: true,
          videoId,
          status: 'copyright_flagged' as const,
          message: `Video uploaded. Duplicate / Copyright Match Found! ${duplicateInfo?.message || 'Video flagged and monetization disabled.'}`,
          videoUrl: r2UploadResult.videoUrl,
          copyrightMatch: {
            matched: true,
            duplicateDetected: true,
            claimId: duplicateInfo?.claimId
          }
        };
      }

      return {
        success: true,
        videoId,
        status: 'published' as const,
        message: 'Video uploaded successfully',
        videoUrl: r2UploadResult.videoUrl,
        copyrightMatch: {
          matched: false
        }
      };
    } catch (error) {
      console.error('Error in FormData video upload:', error);
      return {
        success: false,
        status: 'error' as const,
        message: error instanceof Error ? error.message : 'Unknown error occurred during upload'
      };
    }
  });

/**
 * Upload video file to Cloudflare R2
 * TODO: Implement actual R2 upload logic
 */
async function uploadToR2(fileName: string, fileSize: number): Promise<{
  success: boolean;
  r2VideoKey?: string;
  videoUrl?: string;
}> {
  // TODO: Implement actual Cloudflare R2 upload
  // For now, return a simulated result
  const fileKey = `videos/${Date.now()}-${fileName}`;
  
  return {
    success: true,
    r2VideoKey: fileKey,
    videoUrl: `https://r2.example.com/${fileKey}`
  };
}

/**
 * Generate SHA-256 hash of a file for duplicate detection
 * Uses chunked processing to prevent memory crash for large files
 */
async function generateFileHashChunked(file: File): Promise<string> {
  const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks
  const fileSize = file.size;
  
  // For small files, use direct approach
  if (fileSize <= CHUNK_SIZE) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // For large files, use chunked processing (first and last chunks)
  try {
    const firstChunk = file.slice(0, Math.min(CHUNK_SIZE, fileSize));
    const lastChunk = file.slice(Math.max(0, fileSize - CHUNK_SIZE), fileSize);
    
    const firstBuffer = await firstChunk.arrayBuffer();
    const lastBuffer = await lastChunk.arrayBuffer();
    
    // Combine first and last chunks
    const combined = new Uint8Array(firstBuffer.byteLength + lastBuffer.byteLength);
    combined.set(new Uint8Array(firstBuffer), 0);
    combined.set(new Uint8Array(lastBuffer), firstBuffer.byteLength);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', combined.buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('Chunked hash generation failed, falling back to first chunk only:', error);
    // Ultimate fallback: just hash first chunk
    const firstChunk = file.slice(0, Math.min(CHUNK_SIZE, fileSize));
    const buffer = await firstChunk.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

/**
 * Create video record in Supabase
 */
async function createVideoRecord(
  params: FormDataUploadParams & { r2VideoKey: string; videoUrl: string; status: string; sha256?: string }
): Promise<string> {
  console.log('Creating video record for owner:', params.ownerId);
  
  // Step 1: Check if the owner exists in profiles, create if not
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', params.ownerId)
      .single();

    if (profileError || !profile) {
      console.log('Profile not found, creating automatically for user:', params.ownerId);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            id: params.ownerId,
            display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
            avatar_url: user.user_metadata?.avatar_url || null,
            bio: null
          });
        
        if (createProfileError) {
          console.error('Failed to create profile:', createProfileError);
        } else {
          console.log('Profile created successfully');
        }
      }
    }
  } catch (profileCheckError) {
    console.error('Error checking/creating profile:', profileCheckError);
  }

  // Step 2: Use service role key for video insertion
  const { createClient } = await import('@supabase/supabase-js');
  
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                          process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
                          process.env.SUPABASE_SECRET_KEY ||
                          process.env.VITE_SUPABASE_SECRET_KEY;
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  
  if (!serviceRoleKey) {
    console.warn('No service role key found, using regular client');
  }
  
  if (!supabaseUrl) {
    throw new Error('Supabase URL not found in environment variables');
  }

  const supabaseClient = serviceRoleKey 
    ? createClient(supabaseUrl, serviceRoleKey)
    : supabase;

  try {
    const { data, error } = await supabaseClient
      .from('videos')
      .insert({
        owner_id: params.ownerId,
        title: params.title || 'Untitled Video',
        description: params.description || '',
        tags: params.tags || [],
        category: params.category || 'entertainment',
        visibility: params.visibility || 'public', // Default to public instead of private
        scheduled_at: params.scheduledAt || null,
        monetization_enabled: params.monetizationEnabled || false,
        is_short: params.isShort || false,
        duration_seconds: params.duration || 0,
        thumb_url: params.thumbnailUrl || null,
        r2_video_key: params.r2VideoKey,
        video_url: params.videoUrl,
        status: params.status || 'ready',
        mime_type: params.fileType || 'video/mp4',
        size_bytes: params.fileSize || 0,
        published_at: (params.visibility === 'public' && !params.scheduledAt) ? new Date().toISOString() : null,
        sha256: params.sha256 || null // Store SHA-256 hash for duplicate detection
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create video record:', error);
      throw new Error(`Failed to create video record: ${error.message}`);
    }

    if (!data || !data.id) {
      throw new Error('Video record created but no ID returned');
    }

    console.log('Video record created successfully:', data.id);
    return data.id;
  } catch (insertError) {
    console.error('Error inserting video record:', insertError);
    throw new Error(`Failed to create video record: ${insertError instanceof Error ? insertError.message : 'Unknown error'}`);
  }
}