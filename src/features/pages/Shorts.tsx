// src/features/pages/Shorts.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, MessageCircle, Music2, Play, VolumeX, Volume2, Plus, Send, Search, X,
  Bookmark, Share2, Repeat2, Link2, MessageSquare, Facebook, Flag, HeartCrack,
  Download, Columns2, Users, Home, UserRound, Inbox, VideoIcon, Sparkles, Loader2,
} from 'lucide-react';
import { Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/loose';
import { useLike, useComments, useFollow, useSave, recordView, recordShare } from '@/hooks/useInteractions';
import { useWatchHeartbeat } from '@/hooks/useWatchHeartbeat';
import { analyticsBus } from '@/lib/analyticsBus';
import { ShortsAdSlide } from '@/components/ShortsAdSlide';
import { rankShortsByProNaxFYP, recordProNaxViewerSignal, FYPRankingResult } from '@/lib/pronaxShortsAlgorithm';

/* ---------- layout constants (TikTok-like) ---------- */
const NAV_H = 52;          // bottom tab bar height
const TOP_BAR_H = 48;      // top tabs height

const AD_EVERY_N_SHORTS = 4;
type FeedItem = { kind: 'short'; short: Short } | { kind: 'ad'; attributeShortId: string | null; key: string };

interface Short {
  id: string;
  src: string;
  title: string;
  channel: string;
  displayName?: string;
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
  if (n >= 1_000) return n >= 10_000 ? Math.round(n / 1000) + 'K' : (n / 1000).toFixed(1) + 'K';
  return String(n);
}

async function copyText(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fallthrough */ }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(ta);
  return ok;
}

/* =========================================================
   SEND TO SHEET  (TikTok share sheet)
   ========================================================= */
function SendToSheet({
  open, onOpenChange, url, title, videoSrc,
}: { open: boolean; onOpenChange: (o: boolean) => void; url: string; title: string; videoSrc: string }) {
  const [friends, setFriends] = useState<any[]>([]);

  useEffect(() => {
    if (!open || friends.length) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id,display_name,handle,avatar_url')
        .limit(12);
      setFriends(data ?? []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const shareText = `${title} ${url}`;

  const row1 = [
    { key: 'repost', label: 'Repost', icon: Repeat2, bg: 'bg-[#f5c518]', fg: 'text-white', onClick: () => toast.success('Reposted') },
    { key: 'copy', label: 'Copy link', icon: Link2, bg: 'bg-[#2f6bff]', fg: 'text-white', onClick: async () => { (await copyText(url)) ? toast.success('Link copied') : toast.error('Copy failed'); } },
    { key: 'wa', label: 'WhatsApp', icon: MessageCircle, bg: 'bg-[#25d366]', fg: 'text-white', onClick: () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank') },
    { key: 'sms', label: 'SMS', icon: MessageSquare, bg: 'bg-[#e9f0ff]', fg: 'text-[#2f6bff]', onClick: () => { window.location.href = `sms:?body=${encodeURIComponent(shareText)}`; } },
    { key: 'fb', label: 'Facebook', icon: Facebook, bg: 'bg-[#1877f2]', fg: 'text-white', onClick: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank') },
  ];

  const row2 = [
    { key: 'report', label: 'Report', icon: Flag, onClick: () => toast.success('Report submitted') },
    { key: 'nope', label: 'Not interested', icon: HeartCrack, onClick: () => toast.success('We will show fewer of these') },
    { key: 'dl', label: 'Download', icon: Download, onClick: () => window.open(videoSrc, '_blank') },
    { key: 'stitch', label: 'Stitch', icon: Columns2, onClick: () => toast.info('Stitch coming soon') },
    { key: 'group', label: 'Create group', icon: Users, onClick: () => toast.info('Groups coming soon') },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl border-none bg-white p-0 text-neutral-900 [&>button]:hidden"
      >
        <SheetHeader className="relative flex-row items-center justify-between px-4 pb-3 pt-4">
          <Search className="size-6 shrink-0 text-neutral-900" />
          <SheetTitle className="text-lg font-bold text-neutral-900">Send to</SheetTitle>
          <button onClick={() => onOpenChange(false)} aria-label="Close" className="shrink-0">
            <X className="size-6 text-neutral-900" />
          </button>
          <SheetDescription className="sr-only">Share this short</SheetDescription>
        </SheetHeader>

        {/* friends strip */}
        <div className="flex gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {friends.map((f) => {
            const name = f.display_name || f.handle || 'user';
            return (
              <button
                key={f.id}
                onClick={async () => { (await copyText(url)) ? toast.success(`Link copied for ${name}`) : toast.error('Copy failed'); }}
                className="flex w-[68px] shrink-0 flex-col items-center gap-1.5"
              >
                <span className="size-[62px] overflow-hidden rounded-full bg-neutral-200">
                  {f.avatar_url ? (
                    <img src={f.avatar_url} alt={name} className="size-full object-cover" loading="lazy" />
                  ) : (
                    <span className="grid size-full place-items-center text-lg font-bold text-neutral-500">
                      {name[0]?.toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="line-clamp-2 text-center text-[11px] leading-tight text-neutral-700">{name}</span>
              </button>
            );
          })}
          {!friends.length && (
            <p className="py-6 text-xs text-neutral-500">No friends to show yet.</p>
          )}
        </div>

        <div className="h-px bg-neutral-200" />

        {/* colored actions */}
        <div className="flex gap-4 overflow-x-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {row1.map(({ key, label, icon: Icon, bg, fg, onClick }) => (
            <button key={key} onClick={onClick} className="flex w-[68px] shrink-0 flex-col items-center gap-1.5">
              <span className={`grid size-[58px] place-items-center rounded-full ${bg}`}>
                <Icon className={`size-7 ${fg}`} />
              </span>
              <span className="text-center text-[11px] leading-tight text-neutral-800">{label}</span>
            </button>
          ))}
        </div>

        {/* grey actions */}
        <div
          className="flex gap-4 overflow-x-auto px-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}
        >
          {row2.map(({ key, label, icon: Icon, onClick }) => (
            <button key={key} onClick={onClick} className="flex w-[68px] shrink-0 flex-col items-center gap-1.5">
              <span className="grid size-[58px] place-items-center rounded-full bg-neutral-100">
                <Icon className="size-6 text-neutral-900" />
              </span>
              <span className="text-center text-[11px] leading-tight text-neutral-800">{label}</span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [progressPct, setProgressPct] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [sendToOpen, setSendToOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: any) => setCurrentUserId(data.user?.id ?? null));
  }, []);

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
    if (active) {
      setVideoError(false);
      if (Math.abs(v.currentTime) > 0.5) v.currentTime = 0;
      const t = setTimeout(() => {
        try {
          const r = v.play();
          if (r instanceof Promise) {
            r.then(() => setPaused(false)).catch((err: any) => {
              if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') setPaused(true);
              else { setVideoError(true); setPaused(true); }
            });
          } else setPaused(false);
        } catch { setPaused(true); }
      }, 50);
      return () => clearTimeout(t);
    }
    try { v.pause(); } catch {}
    setProgressPct(0);
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
    const onPlay = () => { lastTickRef.current = performance.now(); setIsBuffering(false); setPaused(false); };
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
      const heartId = now;
      setFloatingHearts((prev) => [...prev.slice(-5), { id: heartId, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
      setTimeout(() => setFloatingHearts((prev) => prev.filter((h) => h.id !== heartId)), 900);
      if (!liked) toggleLike();
    } else togglePlay();
    lastTapRef.current = now;
  };

  const handle = short.channel.replace(/^@/, '');
  const name = short.displayName || handle;
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/shorts/${short.id}` : '';

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {/* ---------- VIDEO (letterboxed, TikTok style) ---------- */}
      <video
        ref={videoRef}
        src={short.src}
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
        className="absolute inset-0 h-full w-full object-contain"
      />

      {isBuffering && active && !videoError && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <Loader2 className="size-9 animate-spin text-white/70" />
        </div>
      )}

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
            initial={{ opacity: 1, scale: 0.4, x: h.x - 40, y: h.y - 40 }}
            animate={{ opacity: 0, scale: 1.8, y: h.y - 160 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="pointer-events-none absolute left-0 top-0 z-40"
          >
            <Heart className="size-20 fill-rose-500 text-rose-500 drop-shadow-2xl" />
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {paused && !videoError && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={togglePlay}
            aria-label="Play"
            className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
          >
            <Play className="size-16 fill-white/50 text-white/50" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* mute pill */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
        aria-label={muted ? 'Unmute' : 'Mute'}
        className="absolute right-3 z-30 grid size-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur-md active:scale-90"
        style={{ top: `calc(env(safe-area-inset-top, 0px) + ${TOP_BAR_H + 8}px)` }}
      >
        {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
      </button>

      {/* ---------- RIGHT ACTION RAIL ---------- */}
      <div
        className="absolute right-2.5 z-30 flex flex-col items-center gap-4"
        style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + ${NAV_H + 14}px)` }}
      >
        {/* avatar + follow */}
        <div className="relative mb-3">
          <Link
            to="/channel/$handle"
            params={{ handle }}
            onClick={(e) => e.stopPropagation()}
            className="block size-12 overflow-hidden rounded-full border-2 border-white bg-black"
          >
            {short.avatar ? (
              <img src={short.avatar} alt={name} className="size-full object-cover" loading="lazy" />
            ) : (
              <span className="grid size-full place-items-center bg-neutral-800 text-sm font-bold text-white">
                {name[0]?.toUpperCase()}
              </span>
            )}
          </Link>
          {creatorId && currentUserId !== creatorId && !followed && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFollow(); }}
              aria-label="Follow"
              className="absolute -bottom-2.5 left-1/2 grid size-6 -translate-x-1/2 place-items-center rounded-full bg-[#fe2c55] text-white active:scale-90"
            >
              <Plus className="size-4" strokeWidth={3.5} />
            </button>
          )}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); toggleLike(); }}
          className="flex flex-col items-center active:scale-90"
          aria-label="Like"
        >
          <Heart className={`size-9 drop-shadow-md ${liked ? 'fill-[#fe2c55] text-[#fe2c55]' : 'fill-white text-white'}`} />
          <span className="mt-0.5 text-[12px] font-semibold text-white drop-shadow">{formatCount(likeCount)}</span>
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onOpenComments(); }}
          className="flex flex-col items-center active:scale-90"
          aria-label="Comments"
        >
          <MessageCircle className="size-9 fill-white text-white drop-shadow-md" />
          <span className="mt-0.5 text-[12px] font-semibold text-white drop-shadow">{formatCount(comments.length)}</span>
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); toggleBookmark(); }}
          className="flex flex-col items-center active:scale-90"
          aria-label="Save"
        >
          <Bookmark className={`size-8 drop-shadow-md ${bookmarked ? 'fill-[#ffcb0b] text-[#ffcb0b]' : 'fill-white text-white'}`} />
          <span className="mt-0.5 text-[12px] font-semibold text-white drop-shadow">{formatCount(bookmarkCount)}</span>
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); recordShare(short.id, 'link').catch(() => {}); setSendToOpen(true); }}
          className="flex flex-col items-center active:scale-90"
          aria-label="Share"
        >
          <Share2 className="size-8 fill-white text-white drop-shadow-md" />
          <span className="mt-0.5 text-[12px] font-semibold text-white drop-shadow">{formatCount(short.shares)}</span>
        </button>

        {/* spinning sound disc */}
        <button
          onClick={(e) => { e.stopPropagation(); onOpenSound(); }}
          aria-label="Sound"
          className="mt-1 size-9 overflow-hidden rounded-full border-2 border-black/40 bg-neutral-800 animate-spin-slow"
        >
          {short.avatar ? (
            <img src={short.avatar} alt="" className="size-full object-cover" loading="lazy" />
          ) : (
            <span className="grid size-full place-items-center text-white"><Music2 className="size-4" /></span>
          )}
        </button>
      </div>

      {/* ---------- BOTTOM CAPTION BLOCK ---------- */}
      <div
        className="absolute left-0 z-30 w-full pl-3 pr-[76px]"
        style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + ${NAV_H + 10}px)` }}
      >
        <div className="pointer-events-none absolute inset-x-0 -top-24 bottom-0 -z-10 bg-gradient-to-t from-black/70 to-transparent" />

        <Link
          to="/channel/$handle"
          params={{ handle }}
          onClick={(e) => e.stopPropagation()}
          className="block text-[17px] font-bold leading-tight text-white drop-shadow"
        >
          {name}
        </Link>

        {(short.description || short.title) && (
          <p
            onClick={() => setExpanded((v) => !v)}
            className={`mt-1 cursor-pointer text-[15px] leading-snug text-white drop-shadow ${expanded ? '' : 'line-clamp-2'}`}
          >
            {(short.description || short.title).split(' ').map((w, i) =>
              w.startsWith('#') ? (
                <span key={i} className="font-semibold">{w} </span>
              ) : (
                <span key={i}>{w} </span>
              )
            )}
            {!expanded && <span className="font-semibold text-white/70">more</span>}
          </p>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); onOpenSound(); }}
          className="mt-2 flex max-w-full items-center gap-1.5 overflow-hidden"
        >
          <Music2 className="size-3.5 shrink-0 text-white" />
          <span className="relative block w-40 overflow-hidden text-left sm:w-56">
            <span className="flex w-[200%] animate-marquee whitespace-nowrap text-[13px] text-white/90">
              <span className="pr-8">{short.music}</span>
              <span className="pr-8">{short.music}</span>
            </span>
          </span>
        </button>
      </div>

      {/* ---------- PROGRESS BAR ---------- */}
      <div
        className="absolute inset-x-0 z-30 h-[2px] bg-white/25"
        style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + ${NAV_H}px)` }}
      >
        <div className="h-full bg-white" style={{ width: `${progressPct}%` }} />
      </div>

      <SendToSheet
        open={sendToOpen}
        onOpenChange={setSendToOpen}
        url={shareUrl}
        title={short.title}
        videoSrc={short.src}
      />
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
      <SheetContent side="bottom" className="flex h-[72dvh] flex-col rounded-t-2xl border-none bg-zinc-950 p-0 text-white">
        <SheetHeader className="border-b border-white/10 px-4 py-3">
          <SheetTitle className="text-center text-sm font-bold text-white">{formatCount(comments.length)} comments</SheetTitle>
          <SheetDescription className="sr-only">{short.title}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {comments.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-white/50">
              <Sparkles className="size-6" />
              <p className="text-xs">No comments yet. Be the first!</p>
            </div>
          )}
          {comments.map((c: any) => (
            <div key={c.id} className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-zinc-800 text-xs font-bold text-white">
                {(c.author?.display_name || c.author?.email || '?')[0]?.toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-zinc-400">{c.author?.display_name || c.author?.email || 'user'}</p>
                <p className="text-[13px] leading-normal text-white/90">{c.text}</p>
                <p className="mt-1 text-[10px] text-zinc-500">{new Date(c.created_at).toLocaleDateString()}</p>
              </div>
              <Heart className="size-4 text-zinc-500" />
            </div>
          ))}
        </div>

        <div
          className="flex items-center gap-2 border-t border-white/10 bg-zinc-900 p-3"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !(e.nativeEvent as any).isComposing && e.keyCode !== 229 && text.trim()) {
                post(text); setText('');
              }
            }}
            placeholder="Add comment..."
            maxLength={1000}
            className="flex-1 rounded-full bg-zinc-800 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none"
          />
          <Button
            size="icon"
            disabled={!text.trim()}
            onClick={() => { if (text.trim()) { post(text); setText(''); } }}
            className="rounded-full bg-[#fe2c55] text-white hover:bg-[#fe2c55]/90"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* =========================================================
   BOTTOM TAB BAR (TikTok style)
   ========================================================= */
function ShortsTabBar() {
  return (
    <nav
      aria-label="Primary"
      className="absolute inset-x-0 bottom-0 z-40 flex items-end justify-around border-t border-white/10 bg-black"
      style={{ height: NAV_H, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <Link to="/" className="flex flex-1 flex-col items-center gap-0.5 pb-1.5 pt-1.5 text-white">
        <Home className="size-6 fill-white" />
        <span className="text-[10px] font-semibold">Home</span>
      </Link>
      <Link to="/subscriptions" className="flex flex-1 flex-col items-center gap-0.5 pb-1.5 pt-1.5 text-white/60">
        <Users className="size-6" />
        <span className="text-[10px]">Friends</span>
      </Link>
      <Link to="/upload" aria-label="Upload" className="flex flex-1 items-center justify-center pb-2 pt-1.5">
        <span className="relative grid h-7 w-11 place-items-center rounded-lg bg-white">
          <span className="absolute -left-1 h-7 w-11 rounded-lg bg-[#25f4ee]" />
          <span className="absolute -right-1 h-7 w-11 rounded-lg bg-[#fe2c55]" />
          <span className="absolute inset-0 grid place-items-center rounded-lg bg-white">
            <Plus className="size-5 text-black" strokeWidth={3} />
          </span>
        </span>
      </Link>
      <Link to="/history" className="relative flex flex-1 flex-col items-center gap-0.5 pb-1.5 pt-1.5 text-white/60">
        <Inbox className="size-6" />
        <span className="text-[10px]">Inbox</span>
      </Link>
      <Link to="/profile" className="flex flex-1 flex-col items-center gap-0.5 pb-1.5 pt-1.5 text-white/60">
        <UserRound className="size-6" />
        <span className="text-[10px]">Profile</span>
      </Link>
    </nav>
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
  const [activeTab, setActiveTab] = useState<'explore' | 'following' | 'fyp'>('fyp');
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
              displayName: prof.display_name || channelHandle,
              avatar: prof.avatar_url,
              description: v.description || '',
              likes: likesMap.get(v.id) ?? 0,
              comments: 0,
              shares: 0,
              music: 'original sound - ' + (prof.display_name || channelHandle),
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

  const tabs = [
    { key: 'explore', label: 'Explore' },
    { key: 'following', label: 'Following' },
    { key: 'fyp', label: 'For You' },
  ] as const;

  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-white">
      {/* ---------- TOP TABS ---------- */}
      <header
        className="absolute inset-x-0 top-0 z-40 flex items-center gap-5 px-4"
        style={{ height: TOP_BAR_H, marginTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex flex-1 items-center justify-center gap-5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`relative shrink-0 py-2 text-[16px] transition-colors ${
                activeTab === t.key ? 'font-bold text-white' : 'text-white/60'
              }`}
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
            >
              {t.label}
              {activeTab === t.key && (
                <span className="absolute bottom-0 left-1/2 h-[3px] w-7 -translate-x-1/2 rounded-full bg-white" />
              )}
            </button>
          ))}
        </div>
        <button onClick={() => navigate({ to: '/explore' })} aria-label="Search" className="shrink-0 active:scale-90">
          <Search className="size-6 text-white drop-shadow" />
        </button>
      </header>

      {/* ---------- SNAP FEED (fits exactly above the tab bar) ---------- */}
      <div
        ref={containerRef}
        className="w-full snap-y snap-mandatory overflow-y-scroll overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ height: '100dvh', touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
      >
        {isLoading && (
          <div className="grid h-[100dvh] place-items-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="size-9 animate-spin text-[#fe2c55]" />
              <p className="text-xs text-white/60">Finding shorts for you...</p>
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
              <Button onClick={() => navigate({ to: '/upload' })} className="rounded-full bg-[#fe2c55] font-bold text-white">
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
            className="w-full snap-start snap-always"
            style={{ height: '100dvh', touchAction: 'pan-y' }}
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

      <ShortsTabBar />

      <CommentsSheet short={commentsFor} onClose={() => setCommentsFor(null)} />
    </div>
  );
}
