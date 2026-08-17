import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/loose';
import { Radio } from 'lucide-react';

type LiveStream = {
  id: string;
  title: string;
  category: string | null;
  mux_playback_id: string | null;
  viewer_count: number;
  user_id: string;
};

export function LiveNowRail() {
  const [streams, setStreams] = useState<LiveStream[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('streams')
          .select('id,title,category,mux_playback_id,viewer_count,user_id')
          .eq('is_live', true)
          .not('mux_playback_id', 'is', null)
          .order('viewer_count', { ascending: false })
          .limit(8);
        if (cancelled) return;
        if (error) { setStreams([]); return; }
        setStreams((data as LiveStream[]) ?? []);
      } catch { if (!cancelled) setStreams([]); }
    };
    // The `streams` table is optional and may not exist in every deployment.
    // Skip the fetch entirely to avoid noisy 404s in the console. If/when
    // live streaming is provisioned, remove this guard.
    if (typeof window !== 'undefined' && (window as any).__ENABLE_LIVE_RAIL__) load();
    return () => { cancelled = true; };
  }, []);

  if (streams.length === 0) return null;


  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
        <h2 className="text-sm font-display font-bold uppercase tracking-widest text-destructive">Live now</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
        {streams.map((s) => (
          <Link key={s.id} to={`/live/${s.mux_playback_id}`}
            className="snap-start shrink-0 w-64 glass-strong rounded-xl overflow-hidden border border-border/40 hover:border-destructive/60 transition group">
            <div className="relative aspect-video bg-black overflow-hidden">
              {s.mux_playback_id && (
                <img
                  src={`https://image.mux.com/${s.mux_playback_id}/thumbnail.jpg?width=400&fit_mode=preserve`}
                  alt={s.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive text-white text-[10px] font-semibold animate-pulse">
                <Radio className="w-2.5 h-2.5" />LIVE
              </div>
            </div>
            <div className="p-3">
              <p className="text-sm font-semibold line-clamp-2">{s.title}</p>
              {s.category && <p className="text-xs text-muted-foreground mt-1">{s.category}</p>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
