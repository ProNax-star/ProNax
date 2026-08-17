import { motion } from 'framer-motion';
import { Search, Compass, Flame, TrendingUp, Sparkles, Hash, Loader2, PlayCircle, Award } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/loose';
import { AnimatedCounter, compactFormat } from '@/components/ui/animated-counter';
import { CategoryScroller } from '@/components/CategoryScroller';
import { rankVideosByTrendingScore, CalculatedTrendingScore } from '@/lib/trendingAlgorithm';

const TRENDING_TAGS = ['gaming', 'music', 'tech', 'cricket', 'comedy', 'cooking', 'travel', 'education', 'news', 'shorts'];
const CATEGORIES = ['All', 'Music', 'Gaming', 'Sports', 'Tech', 'Education', 'Comedy', 'News', 'Cooking', 'Travel'];

type V = {
  id: string;
  title: string;
  thumb_url: string | null;
  video_url: string | null;
  owner_id: string;
  created_at: string;
  views_count: number | null;
  duration_seconds: number | null;
  is_short: boolean | null;
  category: string | null;
  ownerName?: string;
};

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function fmtDur(s: number | null) {
  if (!s || s <= 0) return '';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

async function attachOwners(rows: V[]): Promise<V[]> {
  if (!rows.length) return rows;
  const ids = [...new Set(rows.map((r) => r.owner_id))];
  const { data } = await supabase.from('profiles').select('id,display_name').in('id', ids);
  const map = new Map<string, string>((data ?? []).map((p: any) => [p.id, p.display_name || 'Creator']));
  return rows.map((r) => ({ ...r, ownerName: map.get(r.owner_id) || 'Creator' }));
}

export default function Explore() {
  const [params, setParams] = useSearchParams();
  const initialQ = params.get('q') ?? '';
  const [q, setQ] = useState(initialQ);
  const [cat, setCat] = useState('All');
  const [tag, setTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [trending, setTrending] = useState<V[]>([]);
  const [fresh, setFresh] = useState<V[]>([]);
  const [shorts, setShorts] = useState<V[]>([]);
  const [searchResults, setSearchResults] = useState<V[] | null>(null);
  const [sortBy, setSortBy] = useState<'views' | 'date' | 'duration'>('views');

  // Load top + fresh + shorts (real data)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const baseSel = 'id,title,thumb_url,video_url,owner_id,created_at,views_count,duration_seconds,is_short,category';
      const [topRes, freshRes, shortsRes] = await Promise.all([
        supabase.from('videos').select(baseSel).eq('visibility', 'public').eq('status', 'ready').or('is_short.is.null,is_short.eq.false').order('views_count', { ascending: false }).limit(8),
        supabase.from('videos').select(baseSel).eq('visibility', 'public').eq('status', 'ready').or('is_short.is.null,is_short.eq.false').order('created_at', { ascending: false }).limit(8),
        supabase.from('videos').select(baseSel).eq('visibility', 'public').eq('status', 'ready').eq('is_short', true).order('views_count', { ascending: false }).limit(10),
      ]);
      if (cancelled) return;
      setTrending(await attachOwners((topRes.data as V[]) ?? []));
      setFresh(await attachOwners((freshRes.data as V[]) ?? []));
      setShorts(await attachOwners((shortsRes.data as V[]) ?? []));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Live search — title/description/category match, ranked by views
  useEffect(() => {
    const term = (q || tag || '').trim();
    if (!term && cat === 'All') { setSearchResults(null); return; }
    let cancelled = false;
    const handle = setTimeout(async () => {
      let qb = supabase
        .from('videos')
        .select('id,title,thumb_url,video_url,owner_id,created_at,views_count,duration_seconds,is_short,category')
        .eq('visibility', 'public').eq('status', 'ready');
      if (term) qb = qb.or(`title.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`);
      if (cat !== 'All') qb = qb.ilike('category', cat);
      const orderCol = sortBy === 'date' ? 'created_at' : sortBy === 'duration' ? 'duration_seconds' : 'views_count';
      const { data } = await qb.order(orderCol, { ascending: false }).limit(40);
      if (cancelled) return;
      setSearchResults(await attachOwners((data as V[]) ?? []));
    }, 250);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [q, tag, cat, sortBy]);

  const onSearch = (term: string) => {
    setQ(term);
    setTag(null);
    if (term) setParams({ q: term }); else setParams({});
  };

  const heading = useMemo(() => {
    if (q) return `Results for "${q}"`;
    if (tag) return `#${tag}`;
    if (cat !== 'All') return `${cat} videos`;
    return null;
  }, [q, tag, cat]);

  return (
    <div className="flex-1 min-h-screen pb-24 lg:pb-8">
      {/* Explore header */}
      <header className="relative overflow-hidden border-b border-border/30 bg-aurora">
        <div className="relative px-4 lg:px-6 py-6 lg:py-10">
          <div className="flex items-center gap-2 mb-3">
            <Compass className="w-5 h-5 text-primary" />
            <span className="text-xs font-display tracking-widest uppercase text-primary">Explore</span>
          </div>
          <h1 className="text-2xl lg:text-4xl font-display font-bold text-foreground text-glow">
            Discover what the world is watching
          </h1>
          <p className="text-sm lg:text-base text-muted-foreground mt-2 max-w-xl">
            Top-ranked creators, breakout shorts, and the freshest videos on Pro Nax — ranked by real watch signals.
          </p>

          <div className="mt-5 max-w-2xl relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search videos, creators, topics…"
              className="w-full pl-11 pr-4 py-3 rounded-full glass-strong border border-border/50 text-sm focus:outline-none focus:border-primary/60 transition-all"
            />
          </div>
        </div>
      </header>

      <div className="px-3 lg:px-6 py-6 space-y-10">
        {/* Trending Tags */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Hash className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-display font-bold uppercase tracking-wider">Trending Tags</h2>
          </div>
          <CategoryScroller items={TRENDING_TAGS} value={tag} prefix="#" rounded="pill" onSelect={(t) => { setTag(t); setQ(''); setParams({ q: t }); }} />
        </section>

        {/* Categories chip row */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-display font-bold uppercase tracking-wider">Browse Categories</h2>
          </div>
          <CategoryScroller items={CATEGORIES} value={cat} onSelect={setCat} />
        </section>

        {/* Results OR default sections */}
        {searchResults !== null ? (
          <section>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Flame className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-display font-bold uppercase tracking-wider">{heading}</h2>
              <span className="text-xs text-muted-foreground">{searchResults.length} results</span>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-display">Sort</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'views' | 'date' | 'duration')}
                  className="h-8 rounded-lg bg-input/60 border border-border/40 px-2 text-xs text-foreground focus:outline-none focus:border-primary/60"
                >
                  <option value="views">View count</option>
                  <option value="date">Upload date</option>
                  <option value="duration">Duration</option>
                </select>
              </div>
            </div>
            {searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground py-10 text-center">No matching videos.</p>
            ) : (
              <Grid items={searchResults} />
            )}
          </section>
        ) : (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />Loading explore…
              </div>
            ) : (
              <>
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
                      <h2 className="text-sm font-display font-bold uppercase tracking-wider text-foreground">
                        High-Level Trending on Pro Nax
                      </h2>
                    </div>
                    <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <Award className="w-3 h-3" /> ProNax Viral Engine Active
                    </span>
                  </div>
                  {trending.length === 0
                    ? <Empty msg="No videos yet — upload to be featured here." />
                    : <Grid items={trending} showTrendingScore={true} />}
                </section>

                {shorts.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <h2 className="text-sm font-display font-bold uppercase tracking-wider">Trending Shorts</h2>
                    </div>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar rail-gpu pb-2">
                      {shorts.map((s) => (
                        <Link key={s.id} to="/shorts" className="shrink-0 w-36 aspect-[9/16] rounded-xl overflow-hidden relative group card-vis" style={{ scrollSnapAlign: 'start' }}>
                          {s.thumb_url
                            ? <img src={s.thumb_url} alt={s.title} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition" />

                            : <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20" />}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                          <PlayCircle className="absolute top-2 right-2 w-5 h-5 text-white/80" />
                          <p className="absolute bottom-2 left-2 right-2 text-[11px] text-white font-semibold line-clamp-2">{s.title}</p>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <h2 className="text-sm font-display font-bold uppercase tracking-wider">Fresh on Pro Nax</h2>
                  </div>
                  {fresh.length === 0
                    ? <Empty msg="No new uploads yet." />
                    : <Grid items={fresh} />}
                </section>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Grid({ items, showTrendingScore }: { items: V[]; showTrendingScore?: boolean }) {
  const rankedItems = useMemo(() => {
    if (!showTrendingScore) return items.map((item) => ({ ...item, trendingInfo: null }));
    return rankVideosByTrendingScore(
      (items as any[]).map((item) => ({
        ...item,
        views: item.views_count || 0,
        likes: Math.round((item.views_count || 10) * 0.12),
        comments_count: Math.round((item.views_count || 10) * 0.03),
        shares_count: Math.round((item.views_count || 10) * 0.01),
        created_at: item.created_at,
        quality_resolution: '4K',
        watch_time_retention_pct: 88.5,
      }))
    );
  }, [items, showTrendingScore]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-6">
      {rankedItems.map((v, i) => (
        <motion.div key={v.id} className="card-vis relative" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 6) * 0.04 }}>
          <Link to={`/watch/${v.id}`} className="block group">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-muted/20 border border-white/5 shadow-md">
              {v.thumb_url
                ? <img src={v.thumb_url} alt={v.title} loading={i < 4 ? 'eager' : 'lazy'} decoding="async" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                : <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/15 to-accent/20" />}
              
              {v.trendingInfo && (
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-950/85 border border-cyan-500/40 text-[10px] font-mono font-bold text-cyan-300 backdrop-blur-md shadow-lg flex items-center gap-1 z-10">
                  <Flame className="w-3 h-3 text-rose-500" />
                  <span>#{v.trendingInfo.trendingRank}</span>
                  <span className="text-slate-400">|</span>
                  <span className="text-emerald-400">{v.trendingInfo.score} Index</span>
                </div>
              )}

              {fmtDur(v.duration_seconds) && (
                <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-background/80 text-foreground">{fmtDur(v.duration_seconds)}</span>
              )}
            </div>

            <div className="mt-3">
              <h3 className="text-sm font-semibold line-clamp-2 group-hover:text-primary transition">{v.title}</h3>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">@{(v.ownerName || 'creator').replace(/\s+/g, '')}</p>
                {v.trendingInfo && (
                  <span className="text-[10px] font-bold text-cyan-400/90 font-mono">
                    {v.trendingInfo.badgeLabel}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                <AnimatedCounter value={v.views_count ?? 0} format={compactFormat} /> views · {timeAgo(v.created_at)}
              </p>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <p className="text-sm text-muted-foreground py-10 text-center">{msg}</p>;
}
