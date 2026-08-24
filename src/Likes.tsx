/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { SignInGate } from '@/components/auth/SignInGate';
import { useEffect, useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { VideoGridSkeleton } from '@/components/NeonSkeleton';
import { supabase } from '@/integrations/supabase/loose';
import { VideoGrid, enrichVideos, type GridVideo } from '@/components/VideoGrid';

export default function Likes() {
  const [videos, setVideos] = useState<GridVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      setSignedIn(!!uid);
      if (!uid) { setLoading(false); return; }
      const { data: likes } = await supabase.from('video_likes')
        .select('video_id, created_at').eq('user_id', uid)
        .order('created_at', { ascending: false }).limit(80);
      const ids = (likes ?? []).map((s: any) => s.video_id);
      if (!ids.length) { setVideos([]); setLoading(false); return; }
      const { data: vids } = await supabase.from('videos')
        .select('id,title,thumb_url,video_url,owner_id,created_at,duration_seconds')
        .in('id', ids);
      const order = new Map(ids.map((id: string, i: number) => [id, i]));
      const sorted = (vids ?? []).slice().sort((a: any, b: any) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
      setVideos(await enrichVideos(supabase, sorted));
      setLoading(false);
    })();
  }, []);

  return (
    <div className="flex-1 min-h-screen px-3 lg:px-6 py-4">
      <div className="flex items-center gap-2 mb-4">
        <Heart className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-display font-bold text-foreground">Liked Videos</h1>
      </div>
      {loading ? (
        <VideoGridSkeleton count={8} />
      ) : signedIn === false ? (
        <SignInGate
          inline
          title="Sign in to see your likes"
          description="Videos you like are saved to your account so you can find them on any device."
        />
      ) : (
        <VideoGrid videos={videos} empty="Like videos to collect them here." />
      )}
    </div>
  );
}
