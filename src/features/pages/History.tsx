import { useEffect, useState } from 'react';
import { History as HistoryIcon, Loader2, Trash2, LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/loose';
import { VideoGrid, enrichVideos, type GridVideo } from '@/components/VideoGrid';
import { EmptyState } from '@/components/EmptyState';
import { toast } from '@/hooks/use-toast';

export default function History() {
  const [videos, setVideos] = useState<GridVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    setSignedIn(!!uid);
    if (!uid) { setLoading(false); return; }
    const { data: hist } = await supabase.from('watch_history')
      .select('video_id, watched_at')
      .eq('user_id', uid)
      .order('watched_at', { ascending: false })
      .limit(80);
    const ids = (hist ?? []).map((h: any) => h.video_id);
    if (!ids.length) { setVideos([]); setLoading(false); return; }
    const { data: vids } = await supabase.from('videos')
      .select('id,title,thumb_url,video_url,owner_id,created_at,duration_seconds')
      .in('id', ids);
    const order = new Map(ids.map((id: string, i: number) => [id, i]));
    const sorted = (vids ?? []).slice().sort((a: any, b: any) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    const enriched = await enrichVideos(supabase, sorted);
    setVideos(enriched);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const clearAll = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return;
    await supabase.from('watch_history').delete().eq('user_id', uid);
    toast({ title: 'History cleared' });
    setVideos([]);
  };

  return (
    <div className="flex-1 min-h-screen px-3 lg:px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <HistoryIcon className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-display font-bold text-foreground">Watch History</h1>
        </div>
        {videos.length > 0 && (
          <button onClick={clearAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Clear all
          </button>
        )}
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>
      ) : signedIn === false ? (
        <EmptyState
          icon={LogIn}
          title="Sign in for watch history"
          description="Your recently watched videos will appear here so you can pick up right where you left off."
          ctaLabel="Sign in"
          ctaTo="/auth"
        />
      ) : videos.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No watch history yet"
          description="Start watching videos across PRO NAX and they'll show up here in the order you viewed them."
          ctaLabel="Start watching"
          ctaTo="/"
        />
      ) : (
        <VideoGrid videos={videos} />
      )}
    </div>
  );
}
