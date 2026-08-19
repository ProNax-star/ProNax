import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface DeleteVideoRequest {
  videoId: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    // First, get the video record to retrieve the R2 file key
    const { data: video, error: fetchError } = await supabase
      .from("videos")
      .select("r2_video_key")
      .eq("id", videoId)
      .single()

    if (fetchError) {
      console.error("Fetch video failed:", fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch video', details: fetchError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
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
