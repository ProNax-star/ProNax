import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ListVideo, Loader2, X, Play, Lock, Globe, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/loose';
import { VideoGrid, enrichVideos, type GridVideo } from '@/components/VideoGrid';
import { toast } from '@/hooks/use-toast';

const VisIcon = ({ v }: { v: string }) =>
  v === 'public' ? <Globe className="w-3.5 h-3.5" /> : v === 'unlisted' ? <EyeOff className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />;

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>();
  const [playlist, setPlaylist] = useState<any>(null);
  const [videos, setVideos] = useState<GridVideo[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: auth }, { data: pl }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('playlists').select('*').eq('id', id).single(),
    ]);
    if (!pl) { setLoading(false); return; }
    setPlaylist(pl);
    setIsOwner(auth?.user?.id === pl.user_id);
    const { data: pi } = await supabase.from('playlist_items')
      .select('id, video_id, position, added_at').eq('playlist_id', id)
      .order('position').order('added_at');
    setItems(pi ?? []);
    const ids = (pi ?? []).map((r: any) => r.video_id);
    if (!ids.length) { setVideos([]); setLoading(false); return; }
    const { data: vids } = await supabase.from('videos')
      .select('id,title,thumb_url,video_url,owner_id,created_at,duration_seconds').in('id', ids);
    const order = new Map(ids.map((v: string, i: number) => [v, i]));
    const sorted = (vids ?? []).slice().sort((a: any, b: any) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    setVideos(await enrichVideos(supabase, sorted));
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const removeItem = async (videoId: string) => {
    await supabase.from('playlist_items').delete().eq('playlist_id', id).eq('video_id', videoId);
    setItems(prev => prev.filter(i => i.video_id !== videoId));
    setVideos(prev => prev.filter(v => v.id !== videoId));
    toast({ title: 'Removed from playlist' });
  };

  if (loading) {
    return <div className="flex-1 min-h-screen flex items-center justify-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>;
  }
  if (!playlist) {
    return <div className="flex-1 min-h-screen flex items-center justify-center text-muted-foreground">Playlist not found.</div>;
  }

  const first = videos[0];

  return (
    <div className="flex-1 min-h-screen px-3 lg:px-6 py-4">
      <div className="glass border border-border/40 rounded-2xl p-6 mb-6 flex flex-col md:flex-row gap-6 items-start">
        <div className="w-full md:w-72 aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-primary/25 via-secondary/20 to-accent/25 flex items-center justify-center">
          {first?.thumb_url ? (
            <img src={first.thumb_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <ListVideo className="w-12 h-12 text-primary/60" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <span className="flex items-center gap-1 capitalize"><VisIcon v={playlist.visibility} /> {playlist.visibility}</span>
            <span>•</span>
            <span>{videos.length} video{videos.length === 1 ? '' : 's'}</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">{playlist.title}</h1>
          {playlist.description && <p className="text-sm text-muted-foreground mb-4">{playlist.description}</p>}
          {first && (
            <Link to={`/watch/${first.id}?playlist=${playlist.id}`} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-semibold glow-primary">
              <Play className="w-4 h-4" /> Play all
            </Link>
          )}
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm">
          {isOwner ? "This playlist is empty. Add videos from the watch page." : "No videos in this playlist."}
        </div>
      ) : isOwner ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map(v => (
            <div key={v.id} className="relative group">
              <VideoGrid videos={[v]} />
              <button onClick={() => removeItem(v.id)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/70 text-destructive opacity-0 group-hover:opacity-100 transition-all">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <VideoGrid videos={videos} />
      )}
    </div>
  );
}
