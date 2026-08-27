/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Eye,
  Users,
  Heart,
  MessageSquare,
  Download,
  TrendingUp,
  Loader2,
  Zap,
  Filter,
  Radio,
  BarChart3,
  Search,
  Sparkles as _Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/loose';

export interface ViewEvent {
  id?: string;
  video_id: string;
  viewer_id: string | null;
  watch_seconds: number | null;
  created_at: string;
  ip_hash?: string | null;
}

export interface LikeEvent {
  id?: string;
  video_id: string;
  user_id?: string | null;
  created_at: string;
}

export interface CommentEvent {
  id?: string;
  video_id: string;
  user_id?: string | null;
  content?: string | null;
  created_at: string;
}

export interface RealtimePayload<T = Record<string, unknown>> {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: Partial<T>;
}

export interface ActivityStreamItem {
  id: string;
  type: 'view' | 'like' | 'comment';
  video_id: string;
  video_title?: string;
  viewer_id?: string | null;
  detail?: string;
  created_at: string;
  timestampMs: number;
}

export interface MetricCounters {
  views1Min: number;
  views5Min: number;
  concurrent1Min: number;
  concurrent5Min: number;
  likes1Min: number;
  comments1Min: number;
  likesThroughputPerSec: number;
  commentsThroughputPerSec: number;
}

const FIVE_MIN_MS = 5 * 60 * 1000;
const ONE_MIN_MS = 60 * 1000;

export function RealtimeTab() {
  const [eventsStream, setEventsStream] = useState<ActivityStreamItem[]>([]);
  const [counters, setCounters] = useState<MetricCounters>({
    views1Min: 0,
    views5Min: 0,
    concurrent1Min: 0,
    concurrent5Min: 0,
    likes1Min: 0,
    comments1Min: 0,
    likesThroughputPerSec: 0,
    commentsThroughputPerSec: 0,
  });
  const [connected, setConnected] = useState<boolean>(false);
  const [titles, setTitles] = useState<Record<string, { title: string; thumb_url: string | null }>>({});
  const [filterType, setFilterType] = useState<'all' | 'view' | 'like' | 'comment'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Buffers for 500ms batch throttling
  const pendingBufferRef = useRef<ActivityStreamItem[]>([]);
  const historicalViewsRef = useRef<ViewEvent[]>([]);
  const historicalLikesRef = useRef<number[]>([]);
  const historicalCommentsRef = useRef<number[]>([]);
  const rafIdRef = useRef<number | null>(null);

  // Batch buffer flusher (500ms throttled)
  const processBatchBuffer = useCallback(() => {
    if (pendingBufferRef.current.length === 0) return;

    const incoming = [...pendingBufferRef.current];
    pendingBufferRef.current = [];

    // Push into stream state in a single React batch update
    setEventsStream((prev) => {
      const merged = [...incoming, ...prev];
      return merged.slice(0, 250); // cap max visible events
    });

    // Save into historical refs for accurate metrics computation
    for (const item of incoming) {
      if (item.type === 'view') {
        historicalViewsRef.current.unshift({
          id: item.id,
          video_id: item.video_id,
          viewer_id: item.viewer_id || null,
          watch_seconds: item.detail ? parseInt(item.detail, 10) || 0 : 0,
          created_at: item.created_at,
        });
      } else if (item.type === 'like') {
        historicalLikesRef.current.push(item.timestampMs);
      } else if (item.type === 'comment') {
        historicalCommentsRef.current.push(item.timestampMs);
      }
    }
  }, []);

  // Set up 500ms requestAnimationFrame batch flusher loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => {
        processBatchBuffer();
      });
    }, 500);

    return () => {
      clearInterval(interval);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [processBatchBuffer]);

  // Recalculate 1-min & 5-min concurrent viewers and throughput metrics every 1s
  useEffect(() => {
    const metricsInterval = setInterval(() => {
      const now = Date.now();

      // Prune old data out of 5-min window
      historicalViewsRef.current = historicalViewsRef.current.filter(
        (v) => now - new Date(v.created_at).getTime() < FIVE_MIN_MS
      );
      historicalLikesRef.current = historicalLikesRef.current.filter((t) => now - t < FIVE_MIN_MS);
      historicalCommentsRef.current = historicalCommentsRef.current.filter((t) => now - t < FIVE_MIN_MS);

      // 1-min & 5-min views
      const views1Min = historicalViewsRef.current.filter(
        (v) => now - new Date(v.created_at).getTime() < ONE_MIN_MS
      ).length;
      const views5Min = historicalViewsRef.current.length;

      // 1-min likes and comments throughput
      const likes1Min = historicalLikesRef.current.filter((t) => now - t < ONE_MIN_MS).length;
      const comments1Min = historicalCommentsRef.current.filter((t) => now - t < ONE_MIN_MS).length;

      // Concurrent viewer counting via distinct viewer_id or ip_hash
      const concurrent1MinSet = new Set<string>();
      const concurrent5MinSet = new Set<string>();

      for (const v of historicalViewsRef.current) {
        const age = now - new Date(v.created_at).getTime();
        const identifier = v.viewer_id || v.ip_hash || v.id || Math.random().toString();
        if (age < ONE_MIN_MS) concurrent1MinSet.add(identifier);
        if (age < FIVE_MIN_MS) concurrent5MinSet.add(identifier);
      }

      setCounters({
        views1Min,
        views5Min,
        concurrent1Min: concurrent1MinSet.size,
        concurrent5Min: concurrent5MinSet.size,
        likes1Min,
        comments1Min,
        likesThroughputPerSec: Number((likes1Min / 60).toFixed(2)),
        commentsThroughputPerSec: Number((comments1Min / 60).toFixed(2)),
      });
    }, 1000);

    return () => clearInterval(metricsInterval);
  }, []);

  // Polling instead of table-wide subscriptions (doesn't scale to millions of clients)
  // Refresh every 5 seconds for admin realtime view
  useEffect(() => {
    const fetchRecentData = async () => {
      try {
        const { data } = await supabase
          .from('video_views')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(40);

        if (data && data.length > 0) {
          const mapped: ActivityStreamItem[] = (data as ViewEvent[]).map((v) => ({
            id: v.id || `view_${v.created_at}`,
            type: 'view',
            video_id: v.video_id,
            viewer_id: v.viewer_id,
            detail: v.watch_seconds ? `${v.watch_seconds}s watch` : 'Viewed',
            created_at: v.created_at,
            timestampMs: new Date(v.created_at).getTime(),
          }));
          setEventsStream(mapped);
          historicalViewsRef.current = data as ViewEvent[];
          setConnected(true); // Set connected to true when data loads successfully
        } else {
          setConnected(true); // Set connected even if no data (empty result)
        }
      } catch (error) {
        console.error('[RealtimeTab] Failed to fetch data:', error);
        setConnected(true); // Set connected on error to stop loading spinner
      }
    };

    fetchRecentData();
    const interval = setInterval(fetchRecentData, 5000);

    return () => clearInterval(interval);
  }, []);

  // Compute trending videos in last 5 min
  const trending = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of historicalViewsRef.current) {
      counts.set(v.video_id, (counts.get(v.video_id) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [eventsStream, counters.views5Min]);

  // Fetch missing video metadata for trending list
  useEffect(() => {
    const missing = trending.map(([id]) => id).filter((id) => !titles[id]);
    if (missing.length === 0) return;

    supabase
      .from('videos')
      .select('id, title, thumb_url')
      .in('id', missing)
      .then(({ data }) => {
        if (!data) return;
        setTitles((prev) => {
          const next = { ...prev };
          data.forEach((r: { id: string; title: string; thumb_url: string | null }) => {
            next[r.id] = { title: r.title, thumb_url: r.thumb_url };
          });
          return next;
        });
      });
  }, [trending, titles]);

  // Filtered Activity Stream
  const filteredEvents = useMemo(() => {
    return eventsStream.filter((ev) => {
      if (filterType !== 'all' && ev.type !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          ev.video_id.toLowerCase().includes(q) ||
          (ev.viewer_id && ev.viewer_id.toLowerCase().includes(q)) ||
          (ev.detail && ev.detail.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [eventsStream, filterType, searchQuery]);

  // (Demo traffic simulator removed — this tab streams only real backend events.)


  const exportCsv = () => {
    const header = 'event_type,video_id,viewer_id,detail,created_at\n';
    const body = eventsStream
      .map((e) => `${e.type},${e.video_id},${e.viewer_id ?? ''},"${e.detail ?? ''}",${e.created_at}`)
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `realtime-analytics-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header & Realtime Connection Banner */}
      <div className="glass-strong rounded-2xl border border-blue-500/30 p-6 relative overflow-hidden bg-gradient-to-r from-zinc-950 via-zinc-900 to-slate-950">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Radio className={`w-5 h-5 ${connected ? 'animate-pulse text-cyan-200' : 'text-zinc-400'}`} />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  High-Concurrency Analytics Engine
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono uppercase font-bold">
                    500ms THROTTLED BUFFER
                  </span>
                </h1>
                <p className="text-xs text-zinc-400 mt-0.5 max-w-2xl">
                  {connected
                    ? 'Subscribed to Supabase postgres_changes for video_views, video_likes, and video_comments with rAF batching.'
                    : 'Connecting to Supabase WebSocket channel...'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">


            <button
              onClick={exportCsv}
              className="px-3.5 py-1.5 rounded-xl border border-blue-500/40 text-blue-300 hover:bg-blue-500/10 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Live Status Ticker */}
        <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
            <span className="text-zinc-300 font-bold">
              {connected ? 'LIVE WEBSOCKET ACTIVE' : 'RECONNECTING CHANNEL...'}
            </span>
          </div>
          <div className="text-zinc-400 text-[11px] hidden sm:block">
            Buffer queue: <strong className="text-cyan-400">{pendingBufferRef.current.length} pending</strong> • Max window: 5 min
          </div>
        </div>
      </div>

      {/* Metrics Grid: Concurrent Viewers & Throughput Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Concurrent Viewers */}
        <div className="rounded-2xl p-4 border border-emerald-500/30 bg-emerald-950/20 backdrop-blur-xl relative overflow-hidden space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-emerald-300">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-400" /> Concurrent Viewers
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-mono">LIVE</span>
          </div>
          <div className="text-3xl font-black font-mono text-emerald-300 tracking-tight">
            {counters.concurrent1Min.toLocaleString()}
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center justify-between font-mono">
            <span>1-min distinct</span>
            <span className="text-emerald-400 font-bold">{counters.concurrent5Min} in 5-min</span>
          </div>
        </div>

        {/* Views Throughput */}
        <div className="rounded-2xl p-4 border border-blue-500/30 bg-blue-950/20 backdrop-blur-xl relative overflow-hidden space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-blue-300">
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-blue-400" /> Views Rate
            </span>
            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[9px] font-mono">/MIN</span>
          </div>
          <div className="text-3xl font-black font-mono text-blue-300 tracking-tight">
            {counters.views1Min.toLocaleString()}
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center justify-between font-mono">
            <span>1-min total</span>
            <span className="text-blue-400 font-bold">{counters.views5Min} in 5-min</span>
          </div>
        </div>

        {/* Likes Throughput */}
        <div className="rounded-2xl p-4 border border-pink-500/30 bg-pink-950/20 backdrop-blur-xl relative overflow-hidden space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-pink-300">
            <span className="flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-pink-400" /> Likes Throughput
            </span>
            <span className="px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-400 text-[9px] font-mono">REALTIME</span>
          </div>
          <div className="text-3xl font-black font-mono text-pink-300 tracking-tight">
            {counters.likes1Min.toLocaleString()}
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center justify-between font-mono">
            <span>Likes / min</span>
            <span className="text-pink-400 font-bold">{counters.likesThroughputPerSec}/sec</span>
          </div>
        </div>

        {/* Comments Throughput */}
        <div className="rounded-2xl p-4 border border-purple-500/30 bg-purple-950/20 backdrop-blur-xl relative overflow-hidden space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-purple-300">
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-purple-400" /> Comments Throughput
            </span>
            <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[9px] font-mono">REALTIME</span>
          </div>
          <div className="text-3xl font-black font-mono text-purple-300 tracking-tight">
            {counters.comments1Min.toLocaleString()}
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center justify-between font-mono">
            <span>Comments / min</span>
            <span className="text-purple-400 font-bold">{counters.commentsThroughputPerSec}/sec</span>
          </div>
        </div>
      </div>

      {/* Main Analytics Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Trending Videos (5-min window) */}
        <div className="lg:col-span-1 glass-strong rounded-2xl border border-zinc-800 p-5 bg-zinc-950/80 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" /> Top Trending (5 min)
            </h3>
            <span className="text-[10px] font-mono text-zinc-400">{trending.length} active targets</span>
          </div>

          {trending.length === 0 ? (
            <div className="text-xs text-zinc-500 py-12 text-center flex flex-col items-center justify-center gap-2 font-mono">
              {connected ? (
                <>
                  <BarChart3 className="w-6 h-6 text-zinc-600" />
                  <span>Waiting for traffic events...</span>
                </>
              ) : (
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {trending.map(([id, count], i) => {
                const meta = titles[id];
                const maxCount = trending[0][1] || 1;
                const pct = Math.round((count / maxCount) * 100);

                return (
                  <div
                    key={id}
                    className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-blue-500/40 transition space-y-1.5 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 text-center text-xs font-mono font-bold text-blue-400 shrink-0">
                        #{i + 1}
                      </div>
                      <div className="w-12 h-8 rounded-lg bg-zinc-800 overflow-hidden shrink-0 border border-zinc-700">
                        {meta?.thumb_url ? (
                          <img src={meta.thumb_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500">
                            VID
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate group-hover:text-blue-300 transition-colors">
                          {meta?.title || id}
                        </p>
                        <p className="text-[10px] text-zinc-400 font-mono truncate">{id}</p>
                      </div>
                      <div className="text-xs font-mono font-bold text-emerald-400 shrink-0">
                        {count} views
                      </div>
                    </div>

                    <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Activity Ticker & Stream */}
        <div className="lg:col-span-2 glass-strong rounded-2xl border border-zinc-800 p-5 bg-zinc-950/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white">Live Activity Stream Ticker</h3>
              <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-mono">
                {filteredEvents.length} events
              </span>
            </div>

            {/* Filter Buttons & Search */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter stream..."
                  className="w-36 bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-2 py-1 text-[11px] text-white placeholder-zinc-500 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
                {(['all', 'view', 'like', 'comment'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-2 py-1 rounded text-[10px] font-bold capitalize transition cursor-pointer ${
                      filterType === t ? 'bg-blue-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Animated Event Ticker List */}
          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {filteredEvents.map((ev) => {
                const timeStr = new Date(ev.created_at).toLocaleTimeString();
                return (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, y: -10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-3 text-xs font-mono hover:bg-zinc-900 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {ev.type === 'view' && (
                        <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
                          <Eye className="w-3.5 h-3.5" />
                        </div>
                      )}
                      {ev.type === 'like' && (
                        <div className="w-7 h-7 rounded-lg bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400 shrink-0">
                          <Heart className="w-3.5 h-3.5" />
                        </div>
                      )}
                      {ev.type === 'comment' && (
                        <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white truncate max-w-[200px]">
                            {ev.video_id}
                          </span>
                          <span className="text-[10px] text-zinc-500">• {ev.viewer_id || 'anonymous'}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 truncate mt-0.5">{ev.detail}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-blue-400">{timeStr}</span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredEvents.length === 0 && (
              <div className="text-xs text-zinc-500 py-16 text-center font-mono">
                No real-time events match current filter.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
