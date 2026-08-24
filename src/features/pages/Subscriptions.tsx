/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, useState } from 'react';
import { Users, LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/loose';
import { VideoGrid, enrichVideos, type GridVideo } from '@/components/VideoGrid';
import { EmptyState } from '@/components/EmptyState';
import { VideoGridSkeleton } from '@/components/NeonSkeleton';

export default function Subscriptions() {
  const [videos, setVideos] = useState<GridVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      setSignedIn(!!uid);
      if (!uid) { setLoading(false); return; }
      const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', uid);
      const ids = (follows ?? []).map((f: any) => f.following_id);
      if (!ids.length) { setVideos([]); setLoading(false); return; }
      const { data: vids } = await supabase.from('videos')
        .select('id,title,thumb_url,video_url,owner_id,created_at,duration_seconds')
        .in('owner_id', ids)
        .eq('visibility', 'public').eq('status', 'ready')
        .order('created_at', { ascending: false })
        .limit(60);
      const enriched = await enrichVideos(supabase, vids ?? []);
      setVideos(enriched);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="flex-1 min-h-screen px-3 lg:px-6 py-4">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-display font-bold text-foreground">Subscriptions</h1>
      </div>
      {loading ? (
        <VideoGridSkeleton count={8} />
      ) : signedIn === false ? (
        <EmptyState
          icon={LogIn}
          title="Sign in to see subscriptions"
          description="Follow your favourite creators to build a personalised feed of their latest uploads."
          ctaLabel="Sign in"
          ctaTo="/auth"
        />
      ) : videos.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No subscriptions yet"
          description="Discover creators you love and hit follow — their newest videos will light up right here."
          ctaLabel="Explore creators"
          ctaTo="/explore"
        />
      ) : (
        <VideoGrid videos={videos} />
      )}
    </div>
  );
}
