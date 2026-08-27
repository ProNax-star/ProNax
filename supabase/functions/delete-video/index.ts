import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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

interface DeleteVideoRequest {
  videoId: string
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

    const { videoId }: DeleteVideoRequest = await req.json()

    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'videoId is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client with service role key to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if user is the video owner or has admin role
    const { data: video, error: fetchError } = await supabase
      .from("videos")
      .select("owner_id, r2_video_key")
      .eq("id", videoId)
      .maybeSingle()

    if (fetchError || !video) {
      console.error("Fetch video failed:", fetchError)
      return new Response(
        JSON.stringify({ error: 'Video not found', details: fetchError?.message }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if user is the owner
    if (video.owner_id !== auth.userId) {
      // Check if user has admin role
      const { data: roleCheck } = await supabase
        .rpc('has_role', { 
          _user_id: auth.userId, 
          _role: 'admin' 
        })

      if (!roleCheck) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: You can only delete your own videos' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Delete from R2 if file key exists
    if (video?.r2_video_key) {
      const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID')
      const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID')
      const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY')
      const R2_BUCKET_NAME = Deno.env.get('R2_BUCKET_NAME')

      if (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME) {
        try {
          const { S3Client, DeleteObjectCommand } = await import('https://esm.sh/@aws-sdk/client-s3@3.450.0')
          
          const s3Client = new S3Client({
            region: 'auto',
            endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
              accessKeyId: R2_ACCESS_KEY_ID,
              secretAccessKey: R2_SECRET_ACCESS_KEY,
            },
          })

          const command = new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: video.r2_video_key,
          })

          await s3Client.send(command)
          console.log(`Deleted from R2: ${video.r2_video_key}`)
        } catch (r2Error) {
          console.error("R2 deletion failed:", r2Error)
          // Continue with database deletion even if R2 deletion fails
        }
      }
    }

    // Delete from database using service role (bypasses RLS)
    const { error: deleteError } = await supabase
      .from("videos")
      .delete()
      .eq("id", videoId)

    if (deleteError) {
      console.error("Database deletion failed:", deleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete video from database', details: deleteError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Video deleted successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error deleting video:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to delete video',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
