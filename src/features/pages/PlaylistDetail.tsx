/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ListVideo, Loader2, Play, ArrowLeft, Plus, Trash2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/loose';
import { enrichVideos, type GridVideo } from '@/components/VideoGrid';
import { toast } from 'sonner';

function timeAgo(iso?: string) {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString();
}

function fmtDuration(s?: number | null) {
  if (!s || s <= 0) return '';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<any>(null);
  const [owner, setOwner] = useState<{ name?: string; avatar?: string }>({});
  const [videos, setVideos] = useState<GridVideo[]>([]);
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
    setIsOwner(auth?.user?.id === (pl as any).user_id);

    const { data: prof } = await supabase
      .from('profiles').select('display_name, username, avatar_url').eq('id', (pl as any).user_id).maybeSingle();
    if (prof) setOwner({ name: (prof as any).display_name ?? (prof as any).username, avatar: (prof as any).avatar_url });

    const { data: pi } = await supabase.from('playlist_items')
      .select('id, video_id, position, added_at').eq('playlist_id', id)
      .order('position').order('added_at');
    const ids = ((pi ?? []) as any[]).map((r) => r.video_id);
    if (!ids.length) { setVideos([]); setLoading(false); return; }
    const { data: vids } = await supabase.from('videos')
      .select('id,title,thumb_url,video_url,owner_id,created_at,duration_seconds').in('id', ids);
    const order = new Map(ids.map((v: string, i: number) => [v, i]));
    const sorted = ((vids ?? []) as any[]).slice().sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    setVideos(await enrichVideos(supabase, sorted));
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const removeItem = async (videoId: string) => {
    await supabase.from('playlist_items').delete().eq('playlist_id', id).eq('video_id', videoId);
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
    toast('Removed from playlist');
  };

  if (loading) {
    return <div className="flex-1 min-h-screen flex items-center justify-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>;
  }
  if (!playlist) {
    return <div className="flex-1 min-h-screen flex items-center justify-center text-muted-foreground">Playlist not found.</div>;
  }

  const first = videos[0];
  const totalViews = videos.reduce((s, v) => s + (v.views ?? 0), 0);

  return (
    <div className="flex-1 min-h-screen pb-10">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-3 lg:px-6">
        <button onClick={() => navigate(-1)} aria-label="Back" className="rounded-full p-2 text-foreground hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Link to="/explore" aria-label="Search" className="rounded-full p-2 text-foreground hover:bg-muted">
          <Search className="h-5 w-5" />
        </Link>
      </div>

      {/* Header */}
      <div className="px-4 lg:px-6">
        <div className="mx-auto w-full max-w-xl overflow-hidden rounded-2xl bg-muted/40 aspect-video lg:max-w-md">
          {first?.thumb_url ? (
            <img src={first.thumb_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center"><ListVideo className="h-10 w-10 text-primary/60" /></div>
          )}
        </div>

        <h1 className="mt-5 text-3xl font-bold text-foreground">{playlist.title}</h1>

        <div className="mt-3 flex items-center gap-2">
          <div className="h-8 w-8 overflow-hidden rounded-full bg-muted">
            {owner.avatar ? <img src={owner.avatar} alt="" className="h-full w-full object-cover" /> : null}
          </div>
          <span className="text-sm font-medium text-foreground">by {owner.name ?? 'Creator'}</span>
        </div>

        <p className="mt-3 text-sm capitalize text-muted-foreground">
          Playlist • {playlist.visibility} • {videos.length} video{videos.length === 1 ? '' : 's'} •{' '}
          {totalViews > 0 ? `${compact(totalViews)} views` : 'No views'}
        </p>

        <div className="mt-4 flex items-center gap-3">
          {first ? (
            <Link
              to={`/watch/${first.id}?playlist=${playlist.id}`}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-base font-semibold text-background"
            >
              <Play className="h-5 w-5 fill-current" /> Play all
            </Link>
          ) : null}
          <Link to="/explore" aria-label="Add videos" className="grid h-12 w-12 place-items-center rounded-full bg-muted text-foreground">
            <Plus className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Items */}
      <div className="mt-6">
        {videos.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {isOwner ? 'This playlist is empty. Save videos from any card menu.' : 'No videos in this playlist.'}
          </p>
        ) : (
          <ul>
            {videos.map((v) => (
              <li key={v.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/30 lg:px-6">
                <Link to={v.is_short ? `/shorts/${v.id}` : `/watch/${v.id}`} className="relative aspect-video w-36 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-44">
                  {v.thumb_url ? <img src={v.thumb_url} alt={v.title} loading="lazy" className="h-full w-full object-cover" /> : null}
                  {fmtDuration(v.duration_seconds) ? (
                    <span className="absolute bottom-1 right-1 rounded bg-background/85 px-1 py-0.5 text-[10px] font-semibold text-foreground">
                      {fmtDuration(v.duration_seconds)}
                    </span>
                  ) : null}
                </Link>
                <Link to={v.is_short ? `/shorts/${v.id}` : `/watch/${v.id}`} className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-[15px] font-semibold leading-5 text-foreground">{v.title}</h3>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{v.ownerName ?? 'Creator'}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {compact(v.views ?? 0)} views • {timeAgo(v.created_at)}
                  </p>
                </Link>
                {isOwner ? (
                  <button
                    onClick={() => removeItem(v.id)}
                    aria-label="Remove from playlist"
                    className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
