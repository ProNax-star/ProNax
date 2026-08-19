# R2 Video Upload Implementation

## Overview
This implementation enables direct video uploads to Cloudflare R2 using Supabase Edge Functions with pre-signed URLs, eliminating the need to proxy uploads through your server.

## Architecture

### 1. Supabase Edge Function (`upload-to-r2`)
**Location:** `supabase/functions/upload-to-r2/index.ts`

**Purpose:** Generates pre-signed upload URLs for R2 using AWS S3-compatible API.

**Key Features:**
- Uses AWS SDK v3 for S3-compatible R2 operations
- Generates unique file keys with timestamps and random strings
- Returns pre-signed URLs valid for 1 hour
- Uses environment variables for R2 credentials (stored in Supabase Vault)

**Environment Variables Required:**
- `R2_ACCOUNT_ID` - Your Cloudflare account ID
- `R2_ACCESS_KEY_ID` - R2 access key ID
- `R2_SECRET_ACCESS_KEY` - R2 secret access key
- `R2_BUCKET_NAME` - R2 bucket name

**API Endpoint:**
```
POST https://your-project.supabase.co/functions/v1/upload-to-r2
```

**Request Body:**
```json
{
  "fileName": "video.mp4",
  "fileType": "video/mp4",
  "fileSize": 12345678
}
```

**Response:**
```json
{
  "success": true,
  "presignedUrl": "https://...",
  "fileKey": "videos/1234567890-abc123-video.mp4",
  "publicUrl": "https://account.r2.cloudflarestorage.com/bucket/videos/1234567890-abc123-video.mp4"
}
```

### 2. Frontend Upload Handler (`src/lib/videoUpload.ts`)
**Modified Functions:**
- `uploadVideoWithCopyrightDetection()` - Main upload orchestration
- `getPresignedUploadUrl()` - Fetches pre-signed URL from Edge Function
- `uploadToR2WithPresignedUrl()` - Direct upload to R2 using pre-signed URL
- `createVideoRecord()` - Saves metadata to Supabase (already existed)

**Upload Flow:**
1. Get pre-signed URL from Supabase Edge Function
2. Upload video file directly to R2 using the pre-signed URL
3. Perform copyright detection using FastAPI
4. Save video metadata and R2 key/URL to Supabase `videos` table

## Database Schema
The `videos` table already contains the necessary columns:
- `r2_video_key` - Stores the R2 file key
- `video_url` - Stores the public R2 URL
- `status` - Video status (ready, copyright_flagged, etc.)
- `mime_type` - Video MIME type
- `size_bytes` - File size in bytes

## Security Benefits
1. **No Server-Side Upload:** Videos are uploaded directly from client to R2
2. **No Credential Exposure:** R2 credentials are stored in Supabase Vault, never exposed to client
3. **Time-Limited URLs:** Pre-signed URLs expire after 1 hour
4. **No Large File Handling:** Server doesn't need to process large video files

## Configuration Steps

### 1. Set Environment Variables in Supabase Vault
The following environment variables are already configured in your Supabase project:
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

### 2. Deploy Edge Function
```bash
supabase functions deploy upload-to-r2
```

### 3. Configure R2 Public Access (Optional)
If you want videos to be publicly accessible:
- Set up a custom domain in Cloudflare R2
- Update the `publicUrl` generation in the Edge Function to use your custom domain

## Testing

### Test the Edge Function Directly
```bash
curl -X POST https://your-project.supabase.co/functions/v1/upload-to-r2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "fileName": "test.mp4",
    "fileType": "video/mp4",
    "fileSize": 1000000
  }'
```

### Test Video Upload
The frontend upload flow is already integrated into your existing upload modal. When users upload a video:
1. The system will automatically fetch a pre-signed URL
2. Upload the video directly to R2
3. Perform copyright detection
4. Save metadata to the database

## Troubleshooting

### Common Issues

1. **"R2 credentials not configured"**
   - Verify environment variables are set in Supabase Vault
   - Check the Edge Function logs in Supabase Dashboard

2. **"Failed to generate presigned URL"**
   - Verify R2 credentials are correct
   - Check that the R2 bucket exists
   - Ensure the account has proper permissions

3. **"R2 upload failed"**
   - Check CORS settings on your R2 bucket
   - Verify the pre-signed URL is still valid (expires in 1 hour)
   - Check file size limits

4. **Videos not publicly accessible**
   - Configure R2 bucket with public access settings
   - Set up a custom domain in Cloudflare R2 dashboard
   - Update the `publicUrl` format in the Edge Function

## File Structure
```
E:\Pro Nax\
├── supabase/
│   └── functions/
│       └── upload-to-r2/
│           └── index.ts          # Edge Function for pre-signed URLs
└── src/
    └── lib/
        └── videoUpload.ts        # Updated frontend upload handler
```

## Next Steps
1. Test the upload flow with a small video file
2. Verify that videos are accessible via the public URL
3. Set up R2 custom domain for production use
4. Consider implementing upload progress tracking
5. Add error handling for network failures during upload
