import { useEffect, useState } from 'react';
import { Bookmark, Loader2, LogIn, Compass } from 'lucide-react';
import { supabase } from '@/integrations/supabase/loose';
import { VideoGrid, enrichVideos, type GridVideo } from '@/components/VideoGrid';
import { EmptyState } from '@/components/EmptyState';

export default function Saved() {
  const [videos, setVideos] = useState<GridVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      setSignedIn(!!uid);
      if (!uid) { setLoading(false); return; }
      const { data: saves } = await supabase.from('video_saves')
        .select('video_id, created_at').eq('user_id', uid)
        .order('created_at', { ascending: false }).limit(80);
      const ids = (saves ?? []).map((s: any) => s.video_id);
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
        <Bookmark className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-display font-bold text-foreground">Saved Videos</h1>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>
      ) : signedIn === false ? (
        <EmptyState
          icon={LogIn}
          title="Sign in to save videos"
          description="Bookmark videos you love so they're always one tap away — no matter what device you're on."
          ctaLabel="Sign in"
          ctaTo="/auth"
        />
      ) : videos.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Nothing saved yet"
          description="Tap the bookmark on any video to keep it here for later — your personal PRO NAX vault."
          ctaLabel="Discover videos"
          ctaTo="/explore"
        />
      ) : (
        <VideoGrid videos={videos} />
      )}
    </div>
  );
}
