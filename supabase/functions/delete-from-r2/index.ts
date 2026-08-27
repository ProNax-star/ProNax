import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { S3Client, DeleteObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3@3.450.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// Get allowed origins from environment variable
function getAllowedOrigins(): string[] {
  const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS')
  return allowedOrigins ? allowedOrigins.split(',').map(o => o.trim()) : []
}

// Get CORS headers with origin check
function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowedOrigins = getAllowedOrigins()
  const origin = requestOrigin && allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0] || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

interface DeleteR2Request {
  fileKey: string
}

// Verify JWT token and return user ID
async function verifyAuth(req: Request): Promise<{ userId: string } | null> {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return null
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) {
      return null
    }

    return { userId: data.user.id }
  } catch (error) {
    console.error('Auth verification failed:', error)
    return null
  }
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'))
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authentication
    const auth = await verifyAuth(req)
    if (!auth) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or missing authentication' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

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
    const { fileKey }: DeleteR2Request = await req.json()

    if (!fileKey) {
      return new Response(
        JSON.stringify({ error: 'fileKey is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if user has admin role OR owns the video with this R2 key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: roleCheck } = await supabase
      .rpc('has_role', { 
        _user_id: auth.userId, 
        _role: 'admin' 
      })

    // If not admin, check if the fileKey belongs to a video the user owns
    if (!roleCheck) {
      const { data: video } = await supabase
        .from('videos')
        .select('id, owner_id')
        .eq('r2_video_key', fileKey)
        .maybeSingle()

      if (!video || video.owner_id !== auth.userId) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: You can only delete files from your own videos' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Initialize S3 client for R2
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })

    // Create DeleteObject command
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
    })

    // Delete the object from R2
    await s3Client.send(command)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'File deleted successfully from R2'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error deleting from R2:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to delete file from R2',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
