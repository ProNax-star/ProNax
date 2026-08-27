/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from '@/lib/router-compat';
import { ArrowLeft, Music2, Play, Bookmark, Video as VideoIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/loose';

interface SoundVideo {
  id: string;
  title: string;
  thumb: string | null;
  src: string;
}

interface TrendingSound {
  id: string;
  title: string | null;
  artist: string | null;
  cover_url: string | null;
  audio_track_id: string;
  usage_count: number;
  trend_score: number;
  category: string | null;
}

export default function SoundPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [soundTitle, setSoundTitle] = useState('Original Sound');
  const [creator, setCreator] = useState<{ handle: string; name: string; avatar?: string } | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [videos, setVideos] = useState<SoundVideo[]>([]);
  const [soundData, setSoundData] = useState<TrendingSound | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      
      // First try to get from trending_sounds table
      const { data: sound } = await supabase
        .from('trending_sounds')
        .select('*')
        .eq('audio_track_id', id)
        .maybeSingle();

      if (sound && !cancelled) {
        setSoundData(sound);
        setCover(sound.cover_url ?? null);
        setSoundTitle(sound.title || `Original Sound`);
        setCreator({ handle: sound.artist || 'creator', name: sound.artist || 'creator' });
      } else {
        // Fallback to original video if not in trending_sounds
        const { data: origin } = await supabase
          .from('videos')
          .select('id,title,thumb_url,video_url,owner_id,audio_track_title')
          .eq('id', id)
          .maybeSingle();

        if (origin && !cancelled) {
          setCover(origin.thumb_url ?? null);
          const { data: prof } = await supabase
            .from('profiles')
            .select('handle,display_name,avatar_url')
            .eq('id', origin.owner_id)
            .maybeSingle();
          const name = prof?.display_name || prof?.handle || 'creator';
          setSoundTitle(origin.audio_track_title || `Original Sound — ${name}`);
          setCreator({ handle: prof?.handle || name, name, avatar: prof?.avatar_url ?? undefined });
        }
      }

      // Get videos using this sound
      const { data } = await supabase
        .from('videos')
        .select('id,title,thumb_url,video_url')
        .or(`audio_track_id.eq.${id},id.eq.${id}`)
        .eq('is_removed', false)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(60);

      if (cancelled) return;
      setVideos(
        (data ?? []).map((v: any) => ({ id: v.id, title: v.title, thumb: v.thumb_url, src: v.video_url })),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="min-h-[100dvh] bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 h-14 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-bold truncate">Sound</h1>
      </div>

      {/* Sound hero */}
      <div className="px-4 pt-6 pb-5 flex items-center gap-4">
        <div className="relative w-24 h-24 shrink-0 rounded-2xl overflow-hidden border border-white/15 shadow-[0_10px_40px_-10px_rgba(254,44,85,0.6)]">
          {cover ? (
            <img src={cover} alt={soundTitle} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#FE2C55]/40 to-[#25F4EE]/30 flex items-center justify-center">
              <Music2 className="w-9 h-9 text-white" />
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-zinc-950 border border-white/20 flex items-center justify-center animate-spin-slow">
            <Music2 className="w-4 h-4 text-[#25F4EE]" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold leading-tight line-clamp-2">{soundTitle}</h2>
          {creator && (
            <Link
              to={`/channel/${encodeURIComponent(creator.handle.replace(/^@/, ''))}`}
              className="text-sm text-zinc-300 hover:underline"
            >
              {creator.name}
            </Link>
          )}
          <p className="text-xs text-zinc-500 mt-1">
            {videos.length} video{videos.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 flex items-center gap-3 pb-6">
        <Button asChild className="flex-1 rounded-full bg-[#FE2C55] hover:bg-[#e02447] font-bold h-11">
          <Link to={`/upload?sound=${id}`}>
            <VideoIcon className="w-4 h-4 mr-2" />
            Use this sound
          </Link>
        </Button>
        <button
          aria-label="Save sound"
          className="w-11 h-11 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <Bookmark className="w-5 h-5" />
        </button>
      </div>

      {/* Video grid */}
      <div className="px-1 pb-24">
        {loading ? (
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-[9/16] bg-zinc-900 animate-pulse" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <p className="text-center text-sm text-zinc-500 py-16">No videos use this sound yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {videos.map((v) => (
              <Link key={v.id} to={`/shorts/${v.id}`} className="relative aspect-[9/16] overflow-hidden group bg-zinc-900">
                {v.thumb ? (
                  <img src={v.thumb} alt={v.title} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <video src={v.src} muted className="absolute inset-0 w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <span className="absolute bottom-1 left-1.5 flex items-center gap-1 text-[10px] font-bold">
                  <Play className="w-3 h-3 fill-white" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
