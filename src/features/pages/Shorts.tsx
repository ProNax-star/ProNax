// src/pages/Shorts.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, MessageCircle, Music2, Play, VolumeX, Plus, Check, Send,
  Sparkles, Bookmark, CheckCircle2, User, Radio, VideoIcon,
} from 'lucide-react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/loose';
import { useLike, useComments, useFollow, useSave, recordView, recordShare } from '@/hooks/useInteractions';
import { useWatchHeartbeat } from '@/hooks/useWatchHeartbeat';
import { analyticsBus } from '@/lib/analyticsBus';
import { ShortsAdSlide } from '@/components/ShortsAdSlide';
import { rankShortsByProNaxFYP, recordProNaxViewerSignal, FYPRankingResult } from '@/lib/pronaxShortsAlgorithm';
import ShareButton from '@/components/ShareButton';

/* ---------- layout constants ---------- */
const BOTTOM_NAV_H = 56; // apni bottom nav ki height yahan set karein

const AD_EVERY_N_SHORTS = 4;
type FeedItem = { kind: 'short'; short: Short } | { kind: 'ad'; attributeShortId: string | null; key: string };

interface Short {
  id: string;
  src: string;
  title: string;
  channel: string;
  avatar?: string;
  description: string;
  likes: number;
  comments: number;
  shares: number;
  music: string;
  owner_id?: string;
  tags?: string[];
  fypInfo?: FYPRankingResult;
  views_count?: number;
}

interface FloatingHeart { id: number; x: number; y: number }

function formatCount(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

/* =========================================================
   SHORT ITEM
   ========================================================= */
function ShortItem({
  short, active, muted, onOpenSound, onOpenComments, hasInteracted, onToggleMute,
}: {
  short: Short;
  active: boolean;
  muted: boolean;
  onOpenSound: () => void;
  onOpenComments: () => void;
  hasInteracted: boolean;
  onToggleMute: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [paused, setPaused] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [progressPct, setProgressPct] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [watchingCount, setWatchingCount] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: any) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!paused && active) {
      const t = setTimeout(() => setShowControls(false), 2500);
      return () => clearTimeout(t);
    }
    setShowControls(true);
    return;
  }, [paused, active]);

  const [creatorId, setCreatorId] = useState<string | null>(null);
  useEffect(() => { setCreatorId(short.owner_id ?? null); }, [short.owner_id]);

  const { liked, count: likeCount, toggle: toggleLike } = useLike(short.id, creatorId);
  const { following: followed, toggle: toggleFollow } = useFollow(creatorId);
  const { comments } = useComments(short.id, creatorId);
  const { saved: bookmarked, count: bookmarkCount, toggle: toggleBookmark } = useSave(short.id);

  /* ---- watch time ---- */
  const watchedRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);
  const flushWatch = () => {
    const s = Math.round(watchedRef.current);
    if (s > 0) {
      analyticsBus.rpc('record_watch_history', { p_video: short.id, p_watch_seconds: s });
      recordProNaxViewerSignal({
        videoId: short.id,
        watchTimeSeconds: s,
        durationSeconds: videoRef.current?.duration || 15,
        tags: short.tags,
        audioId: short.music,
        liked,
        saved: bookmarked,
      });
    }
    watchedRef.current = 0;
    lastTickRef.current = null;
  };

  useEffect(() => {
    if (active && !paused) {
      const base = Math.max(1, Math.floor((short.views_count ?? 0) / 10) || 1);
      setWatchingCount(base);
      const iv = setInterval(() => {
        setWatchingCount((p) => Math.max(1, p + (Math.floor(Math.random() * 3) - 1)));
      }, 3000);
      return () => clearInterval(iv);
    }
    setWatchingCount(0);
    return;
  }, [active, paused, short.views_count]);

  useEffect(() => {
    if (active) recordView(short.id, 0).catch(() => {});
    else flushWatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, short.id]);

  useEffect(() => () => { flushWatch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useWatchHeartbeat({ videoId: active ? short.id : null, isPlaying: active && !paused });

  /* ---- autoplay ---- */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let playPromise: Promise<void> | undefined;

    if (active) {
      setVideoError(false);
      if (Math.abs(v.currentTime) > 0.5) v.currentTime = 0;
      const timeoutId = setTimeout(() => {
        if (!v.paused) { try { v.pause(); } catch {} }
        try {
          const result = v.play();
          if (result instanceof Promise) {
            playPromise = result;
            playPromise.then(() => setPaused(false)).catch((err: any) => {
              if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') setPaused(true);
              else { setVideoError(true); setPaused(true); }
            });
          } else setPaused(false);
        } catch { setPaused(true); }
      }, 50);
      return () => { clearTimeout(timeoutId); playPromise?.catch(() => {}); };
    }
    try { v.pause(); } catch {}
    return;
  }, [active, hasInteracted]);

  /* ---- media events ---- */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTU = () => {
      if (v.paused) return;
      setIsBuffering(false);
      const now = performance.now();
      if (lastTickRef.current != null) watchedRef.current += (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      if (v.duration) setProgressPct((v.currentTime / v.duration) * 100);
    };
    const onPlay = () => { lastTickRef.current = performance.now(); setIsBuffering(false); };
    const onPause = () => { lastTickRef.current = null; setIsBuffering(false); };
    const onEnded = () => { flushWatch(); setIsBuffering(false); };
    const onWaiting = () => setIsBuffering(true);
    const onCanPlay = () => setIsBuffering(false);
    const onError = () => { setVideoError(true); setIsBuffering(false); };

    v.addEventListener('timeupdate', onTU);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('ended', onEnded);
    v.addEventListener('waiting', onWaiting);
    v.addEventListener('stalled', onWaiting);
    v.addEventListener('canplay', onCanPlay);
    v.addEventListener('error', onError);
    return () => {
      v.removeEventListener('timeupdate', onTU);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('ended', onEnded);
      v.removeEventListener('waiting', onWaiting);
      v.removeEventListener('stalled', onWaiting);
      v.removeEventListener('canplay', onCanPlay);
      v.removeEventListener('error', onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [short.id]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    setShowControls(true);
    if (v.paused) {
      try {
        const r = v.play();
        if (r instanceof Promise) r.then(() => setPaused(false)).catch(() => setPaused(true));
        else setPaused(false);
      } catch { setPaused(true); }
    } else {
      try { v.pause(); } catch {}
      setPaused(true);
    }
  };

  const lastTapRef = useRef(0);
  const handleVideoTap = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const heartId = Date.now();
      setFloatingHearts((prev) => [...prev.slice(-5), { id: heartId, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
      setTimeout(() => setFloatingHearts((prev) => prev.filter((h) => h.id !== heartId)), 900);
      if (!liked) toggleLike();
    } else togglePlay();
    lastTapRef.current = now;
  };

  const handle = short.channel.replace(/^@/, '');
  const totalComments = comments.length;

  return (
    /* ---------- 9:16 STAGE: mobile = full bleed, tablet/desktop = centered frame ---------- */
    <div className="relative h-full w-full bg-black flex items-center justify-center touch-pan-y">
      <div
        className="relative w-full h-full overflow-hidden bg-black sm:h-full sm:w-auto sm:rounded-2xl sm:ring-1 sm:ring-white/10"
        style={{ 
          aspectRatio: '9 / 16',
          paddingBottom: 'env(safe-area-inset-bottom, 20px)'
        }}
      >
        {/* video */}
        <video
          ref={videoRef}
          src={short.src}
          poster={undefined}
          muted={muted}
          loop
          playsInline
          preload="metadata"
          onClick={handleVideoTap}
          onLoadStart={() => setIsBuffering(true)}
          onCanPlay={() => setIsBuffering(false)}
          onLoadedData={() => setIsBuffering(false)}
          onPlaying={() => setIsBuffering(false)}
          onError={() => { setVideoError(true); setIsBuffering(false); }}
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* buffering */}
        {isBuffering && active && !videoError && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="size-10 animate-spin rounded-full border-2 border-white/20 border-t-primary" />
          </div>
        )}

        {/* error */}
        {videoError && (
          <div className="absolute inset-0 grid place-items-center bg-black/70">
            <div className="flex flex-col items-center gap-2 text-white/80">
              <VideoIcon className="size-7" />
              <p className="text-xs font-semibold">Video unavailable</p>
            </div>
          </div>
        )}

        {/* double-tap hearts */}
        <AnimatePresence>
          {floatingHearts.map((h) => (
            <motion.div
              key={h.id}
              initial={{ opacity: 1, scale: 0.4, x: h.x - 24, y: h.y - 24 }}
              animate={{ opacity: 0, scale: 1.6, y: h.y - 140 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className="pointer-events-none absolute left-0 top-0 z-30"
            >
              <Heart className="size-12 fill-primary text-primary drop-shadow-lg" />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* gradients */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/80 to-transparent" />

        {/* live watching badge — top-left, below tabs */}
        {active && watchingCount > 0 && (
          <div className="absolute left-3 top-14 z-20 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md">
            <Radio className="size-3 animate-pulse text-primary" />
            {formatCount(watchingCount)} watching
          </div>
        )}

        {/* play indicator */}
        <AnimatePresence>
          {paused && !videoError && (
            <motion.button
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={togglePlay}
              aria-label="Play"
              className="absolute left-1/2 top-1/2 z-20 grid size-[68px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/15 backdrop-blur-md"
            >
              <Play className="size-8 fill-white text-white" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* ---------- RIGHT ACTION RAIL ---------- */}
        <div
          className="absolute right-4 bottom-5 z-30 flex flex-col items-center gap-1.5"
        >
          {/* avatar + follow */}
          <div className="relative mb-1">
            <Link
              to="/channel/$handle"
              params={{ handle }}
              onClick={(e) => e.stopPropagation()}
              className="block size-11 overflow-hidden rounded-full border-2 border-white/70 bg-black"
            >
              {short.avatar ? (
                <img src={short.avatar} alt={handle} className="size-full object-cover" loading="lazy" />
              ) : (
                <span className="grid size-full place-items-center bg-primary text-sm font-bold text-primary-foreground">
                  {handle[0]?.toUpperCase()}
                </span>
              )}
            </Link>
            {creatorId && currentUserId !== creatorId && !followed && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (creatorId) toggleFollow(); }}
                aria-label="Follow"
                className="absolute -bottom-2 left-1/2 grid size-5 -translate-x-1/2 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-90"
              >
                <Plus className="size-3.5" />
              </button>
            )}
            {followed && (
              <span className="absolute -bottom-2 left-1/2 grid size-5 -translate-x-1/2 place-items-center rounded-full bg-white text-black shadow-lg">
                <Check className="size-3" />
              </span>
            )}
          </div>

          {/* like */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleLike(); }}
            className="flex flex-col items-center gap-1 transition-transform active:scale-90"
            aria-label="Like"
          >
            <Heart className={`size-8 drop-shadow-lg ${liked ? 'fill-primary text-primary' : 'text-white'}`} />
            <span className="text-[11px] font-bold text-white drop-shadow">{formatCount(likeCount)}</span>
          </button>

          {/* comment */}
          <button
            onClick={(e) => { e.stopPropagation(); onOpenComments(); }}
            className="flex flex-col items-center gap-1 transition-transform active:scale-90"
            aria-label="Comments"
          >
            <MessageCircle className="size-8 text-white drop-shadow-lg" />
            <span className="text-[11px] font-bold text-white drop-shadow">{formatCount(totalComments)}</span>
          </button>

          {/* save */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleBookmark(); }}
            className="flex flex-col items-center gap-1 transition-transform active:scale-90"
            aria-label="Save"
          >
            <Bookmark className={`size-8 drop-shadow-lg ${bookmarked ? 'fill-amber-300 text-amber-300' : 'text-white'}`} />
            <span className="text-[11px] font-bold text-white drop-shadow">{formatCount(bookmarkCount)}</span>
          </button>

          {/* share */}
          <ShareButton
            url={typeof window !== 'undefined' ? `${window.location.origin}/shorts/${short.id}` : ''}
            title={short.title}
            shareCount={short.shares}
            onShareClick={() => recordShare(short.id, 'link').catch(() => {})}
            formatCount={formatCount}
            variant="pronax"
          />

          {/* spinning audio disc / mute toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
            aria-label={muted ? 'Unmute' : 'Mute'}
            className="relative mt-1 size-10 overflow-hidden rounded-full border-2 border-white/40 animate-spin-slow"
          >
            {short.avatar ? (
              <img src={short.avatar} alt="" className="size-full object-cover" loading="lazy" />
            ) : (
              <span className="grid size-full place-items-center bg-black/60 text-white">
                <Music2 className="size-4" />
              </span>
            )}
            {muted && (
              <span className="absolute inset-0 grid place-items-center bg-black/55">
                <VolumeX className="size-4 text-white" />
              </span>
            )}
          </button>
        </div>

        {/* ---------- BOTTOM LEFT CREATOR INFO ---------- */}
        <div
          className="absolute bottom-14 left-3 z-30 max-w-[calc(100%-5.5rem)] space-y-2"
        >
          <div className="flex items-center gap-2">
            <Link
              to="/channel/$handle"
              params={{ handle }}
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-extrabold text-white drop-shadow"
            >
              @{handle}
            </Link>
            <CheckCircle2 className="size-4 text-primary" />
            {creatorId && currentUserId !== creatorId && !followed ? (
              <button
                onClick={(e) => { e.stopPropagation(); if (creatorId) toggleFollow(); }}
                className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground active:scale-95"
              >
                Follow
              </button>
            ) : followed ? (
              <span className="rounded-full border border-white/40 px-2.5 py-0.5 text-[10px] font-bold text-white/80">
                Following
              </span>
            ) : null}
          </div>

          {short.title && (
            <p className="line-clamp-1 text-sm font-semibold text-white drop-shadow">{short.title}</p>
          )}

          {short.description && (
            <p className="line-clamp-2 text-xs text-white/85 drop-shadow">
              {short.description.split(' ').map((w, i) =>
                w.startsWith('#') ? (
                  <span key={i} className="font-semibold text-primary">{w} </span>
                ) : (
                  <span key={i}>{w} </span>
                )
              )}
            </p>
          )}

        </div>

        {/* ---------- MUSIC TICKER ---------- */}
        <button
          onClick={(e) => { e.stopPropagation(); onOpenSound(); }}
          className="absolute bottom-5 left-3 z-30 flex max-w-[calc(100%-5.5rem)] items-center gap-2 overflow-hidden rounded-full border border-white/20 bg-black/35 px-2.5 py-1 backdrop-blur-md"
        >
          <Music2 className="size-3.5 shrink-0 text-white" />
          <span className="relative block w-40 overflow-hidden sm:w-56">
            <span className="flex w-[200%] animate-marquee whitespace-nowrap text-[11px] font-semibold text-white/90">
              <span className="pr-8">🎵 {short.music}</span>
              <span className="pr-8">🎵 {short.music}</span>
            </span>
          </span>
        </button>

        {/* ---------- PROGRESS BAR (above bottom nav) ---------- */}
        <div
          className="absolute inset-x-0 bottom-1.5 h-1 z-30 bg-white/20"
        >
          <div className="h-full bg-white transition-[width] duration-150" style={{ width: `${progressPct}%` }} />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   COMMENTS SHEET
   ========================================================= */
function CommentsSheet({ short, onClose }: { short: Short | null; onClose: () => void }) {
  const [text, setText] = useState('');
  const { comments, post } = useComments(short?.id ?? 'none', null);
  if (!short) return null;
  return (
    <Sheet open={!!short} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[72dvh] border-white/10 bg-zinc-950 p-4 text-white">
        <SheetHeader>
          <SheetTitle className="text-white">{comments.length} Comments</SheetTitle>
          <SheetDescription className="line-clamp-1 text-white/60">{short.title}</SheetDescription>
        </SheetHeader>

        <div className="mt-4 h-[calc(72dvh-11rem)] space-y-3 overflow-y-auto pr-1">
          {comments.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-white/50">
              <Sparkles className="size-6" />
              <p className="text-xs">No comments yet. Be the first!</p>
            </div>
          )}
          {comments.map((c: any) => (
            <div key={c.id} className="flex gap-3 rounded-2xl bg-white/5 p-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {(c.author?.display_name || c.author?.email || '?')[0]?.toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-white/70">
                  {c.author?.display_name || c.author?.email || 'user'} ·{' '}
                  {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-sm text-white/90">{c.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && text.trim()) { post(text); setText(''); }
            }}
            placeholder="Add comment..."
            maxLength={1000}
            className="flex-1 rounded-full border border-white/10 bg-zinc-900 px-4 py-2 text-xs text-white placeholder-zinc-500 focus:border-primary focus:outline-none"
          />
          <Button
            onClick={() => { if (text.trim()) { post(text); setText(''); } }}
            className="rounded-full bg-primary px-4 font-bold text-primary-foreground"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* =========================================================
   FEED
   ========================================================= */
export default function Shorts() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const [activeTab, setActiveTab] = useState<'following' | 'fyp'>('fyp');
  const [commentsFor, setCommentsFor] = useState<Short | null>(null);
  const [liveShorts, setLiveShorts] = useState<Short[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    const handler = () => setHasInteracted(true);
    const events = ['click', 'touchstart', 'keydown', 'scroll'];
    events.forEach((e) => document.addEventListener(e, handler, { once: true }));
    return () => events.forEach((e) => document.removeEventListener(e, handler));
  }, []);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        let rows: any[] | null = null;
        const { data: ranked, error: rankedErr } = await supabase.rpc('get_shorts_feed', { p_limit: 30, p_offset: 0 });
        if (!rankedErr && ranked?.length) rows = ranked;

        if (!rows) {
          const { data } = await supabase
            .from('videos')
            .select('id,title,description,video_url,thumb_url,owner_id,tags,views_count')
            .eq('is_short', true)
            .eq('is_removed', false)
            .eq('is_shadow_banned', false)
            .eq('visibility', 'public')
            .order('created_at', { ascending: false })
            .limit(20);
          rows = data ?? [];
        }
        if (!rows.length) { setIsLoading(false); return; }

        const ownerIds = Array.from(new Set(rows.map((v: any) => v.owner_id).filter(Boolean)));
        const videoIds = rows.map((v: any) => v.id);
        const profileMap = new Map<string, any>();
        const likesMap = new Map<string, number>();

        if (ownerIds.length) {
          const { data: profs } = await supabase.from('profiles').select('id,display_name,avatar_url,handle').in('id', ownerIds);
          (profs ?? []).forEach((p: any) => profileMap.set(p.id, p));
        }
        if (videoIds.length) {
          const { data: likes } = await supabase.from('video_likes').select('video_id').in('video_id', videoIds);
          (likes ?? []).forEach((r: any) => likesMap.set(r.video_id, (likesMap.get(r.video_id) ?? 0) + 1));
        }

        const mapped: Short[] = rows
          .filter((v: any) => typeof v.video_url === 'string' && v.video_url.startsWith('http'))
          .map((v: any) => {
            const prof = profileMap.get(v.owner_id) || {};
            const channelHandle = prof.handle || prof.display_name || 'creator';
            const parts = String(v.video_url).split('/');
            const encodedVideoUrl = parts.map((p, i) => (i === parts.length - 1 ? p.replace(/#/g, '%23') : p)).join('/');
            return {
              id: v.id,
              src: encodedVideoUrl,
              title: v.title,
              channel: '@' + channelHandle,
              avatar: prof.avatar_url,
              description: v.description || '',
              likes: likesMap.get(v.id) ?? 0,
              comments: 0,
              shares: 0,
              music: 'Original Sound — ' + (prof.display_name || 'creator'),
              owner_id: v.owner_id,
              tags: Array.isArray(v.tags) ? v.tags : [],
              views_count: v.views_count || 0,
            } as Short;
          });

        setLiveShorts(rankShortsByProNaxFYP(mapped));
      } catch { /* silent */ }
      setIsLoading(false);
    })();
  }, []);

  const allShorts = useMemo(() => liveShorts, [liveShorts]);

  const feedItems: FeedItem[] = useMemo(() => {
    const out: FeedItem[] = [];
    allShorts.forEach((s, i) => {
      out.push({ kind: 'short', short: s });
      if ((i + 1) % AD_EVERY_N_SHORTS === 0) out.push({ kind: 'ad', attributeShortId: s.id, key: `ad-${i}-${s.id}` });
    });
    return out;
  }, [allShorts]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll('[data-short-item]'));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
            setActiveIdx(Number(entry.target.getAttribute('data-idx')));
          }
        });
      },
      { root: el, threshold: [0.7] }
    );
    items.forEach((it) => observer.observe(it));
    return () => observer.disconnect();
  }, [feedItems.length]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-white">
      {/* top tabs */}
      <div
        className="absolute inset-x-0 top-0 z-30 flex items-center justify-center gap-6 text-sm"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}
      >
        {(['following', 'fyp'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`relative py-1 transition-colors ${activeTab === t ? 'font-bold text-white' : 'text-white/70'}`}
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
          >
            {t === 'following' ? 'Following' : 'For You'}
            {activeTab === t && (
              <span className="absolute -bottom-1 left-1/2 h-[3px] w-6 -translate-x-1/2 rounded-full bg-white" />
            )}
          </button>
        ))}
      </div>

      {/* snap scroller — har slide poori height, 9:16 stage andar center */}
      <div
        ref={containerRef}
        className="h-[100dvh] w-full snap-y snap-mandatory overflow-y-scroll overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-y"
        style={{ 
          touchAction: 'pan-y',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {isLoading && (
          <div className="grid h-[100dvh] place-items-center">
            <div className="flex flex-col items-center gap-3">
              <div className="size-10 animate-spin rounded-full border-2 border-white/20 border-t-primary" />
              <p className="text-xs text-white/60">Loading...</p>
            </div>
          </div>
        )}

        {!isLoading && allShorts.length === 0 && (
          <div className="grid h-[100dvh] place-items-center px-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <span className="grid size-14 place-items-center rounded-2xl bg-white/10">
                <VideoIcon className="size-6" />
              </span>
              <p className="text-base font-bold">No Shorts on FYP</p>
              <p className="max-w-xs text-xs text-white/60">
                Upload a vertical short video to start the ProNax Viral Cohort.
              </p>
              <Button onClick={() => navigate({ to: '/upload' })} className="rounded-full bg-primary font-bold text-primary-foreground">
                Upload First Short
              </Button>
            </div>
          </div>
        )}

        {feedItems.map((item, i) => (
          <div
            key={item.kind === 'short' ? item.short.id : item.key}
            data-short-item
            data-idx={i}
            className="h-[100dvh] w-full snap-start snap-always touch-pan-y"
            style={{ 
              touchAction: 'pan-y',
              paddingBottom: 'env(safe-area-inset-bottom, 20px)'
            }}
          >
            {item.kind === 'short' ? (
              <ShortItem
                short={item.short}
                active={i === activeIdx}
                muted={muted}
                hasInteracted={hasInteracted}
                onOpenSound={() => navigate({ to: '/sound/$id', params: { id: item.short.id } })}
                onOpenComments={() => setCommentsFor(item.short)}
                onToggleMute={() => setMuted((m) => !m)}
              />
            ) : (
              <ShortsAdSlide
                active={i === activeIdx}
                attributeToVideoId={item.attributeShortId}
                onAdFinished={() => {
                  const el = containerRef.current;
                  el?.querySelector(`[data-idx="${i + 1}"]`)?.scrollIntoView({ behavior: 'smooth' });
                }}
              />
            )}
          </div>
        ))}
      </div>

      <CommentsSheet short={commentsFor} onClose={() => setCommentsFor(null)} />
    </div>
  );
}
