import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { S3Client, PutObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3@3.450.0'
import { getSignedUrl } from 'https://esm.sh/@aws-sdk/s3-request-presigner@3.450.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface PresignRequest {
  fileName: string
  fileType: string
  fileSize: number
  folder?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get R2 credentials from environment variables
    const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID')
    const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID')
    const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY')
    const R2_BUCKET_NAME = Deno.env.get('R2_BUCKET_NAME')

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
      return new Response(
        JSON.stringify({ error: 'R2 credentials not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    const { fileName, fileType, fileSize, folder = 'uploads' }: PresignRequest = await req.json()

    if (!fileName || !fileType) {
      return new Response(
        JSON.stringify({ error: 'fileName and fileType are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate unique file key
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileKey = `${folder}/${timestamp}-${randomString}-${fileName}`

    // Initialize S3 client for R2
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })

    // Create PutObject command
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
      ContentType: fileType,
      ContentLength: fileSize,
    })

    // Generate pre-signed URL (valid for 1 hour)
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

    // Generate the public URL
    const R2_PUBLIC_URL = Deno.env.get('R2_PUBLIC_URL') || `https://pub-${R2_ACCOUNT_ID}.r2.dev`
    const publicUrl = `${R2_PUBLIC_URL}/${fileKey}`

    return new Response(
      JSON.stringify({
        success: true,
        presignedUrl,
        fileKey,
        publicUrl
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error generating presigned URL:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate presigned URL',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
