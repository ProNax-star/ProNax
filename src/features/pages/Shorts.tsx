import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  Music2,
  Play,
  VolumeX,
  Volume2,
  Plus,
  Send,
  Search,
  X,
  Bookmark,
  Share2,
  Repeat2,
  Link2,
  MessageSquare,
  Facebook,
  Flag,
  HeartCrack,
  Download,
  Columns2,
  Users,
  VideoIcon,
  Sparkles,
  Loader2,
  Maximize2,
  Minimize2,
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
import { rankShortsByProNaxFYP, recordProNaxViewerSignal, type FYPRankingResult } from '@/lib/pronaxShortsAlgorithm';

const NAV_H = 52;
const TOP_BAR_H = 50;
const AD_EVERY_N_SHORTS = 4;

type FeedItem =
  | { kind: 'short'; short: Short }
  | { kind: 'ad'; attributeShortId: string | null; key: string };

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

interface FloatingHeart {
  id: number;
  x: number;
  y: number;
}

interface MediaFrame {
  top: number;
  bottom: number;
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return n >= 10_000 ? `${Math.round(n / 1000)}K` : `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

async function copyText(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Use the textarea fallback below.
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);
  return copied;
}

function SendToSheet({
  open,
  onOpenChange,
  url,
  title,
  videoSrc,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
  videoSrc: string;
}) {
  const [friends, setFriends] = useState<any[]>([]);

  useEffect(() => {
    if (!open || friends.length) return;

    void (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id,display_name,handle,avatar_url')
        .limit(12);
      setFriends(data ?? []);
    })();
  }, [open, friends.length]);

  const shareText = `${title} ${url}`;
  const openExternal = (target: string) => window.open(target, '_blank', 'noopener,noreferrer');

  const coloredActions = [
    { key: 'repost', label: 'Repost', icon: Repeat2, bg: 'bg-[#f5c518]', fg: 'text-white', onClick: () => toast.success('Reposted') },
    { key: 'copy', label: 'Copy link', icon: Link2, bg: 'bg-[#2f6bff]', fg: 'text-white', onClick: async () => (await copyText(url)) ? toast.success('Link copied') : toast.error('Copy failed') },
    { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, bg: 'bg-[#25d366]', fg: 'text-white', onClick: () => openExternal(`https://wa.me/?text=${encodeURIComponent(shareText)}`) },
    { key: 'sms', label: 'SMS', icon: MessageSquare, bg: 'bg-[#e9f0ff]', fg: 'text-[#2f6bff]', onClick: () => { window.location.href = `sms:?body=${encodeURIComponent(shareText)}`; } },
    { key: 'facebook', label: 'Facebook', icon: Facebook, bg: 'bg-[#1877f2]', fg: 'text-white', onClick: () => openExternal(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`) },
  ];

  const utilityActions = [
    { key: 'report', label: 'Report', icon: Flag, onClick: () => toast.success('Report submitted') },
    { key: 'not-interested', label: 'Not interested', icon: HeartCrack, onClick: () => toast.success('We will show fewer of these') },
    { key: 'download', label: 'Download', icon: Download, onClick: () => openExternal(videoSrc) },
    { key: 'stitch', label: 'Stitch', icon: Columns2, onClick: () => toast.info('Stitch coming soon') },
    { key: 'group', label: 'Create group', icon: Users, onClick: () => toast.info('Groups coming soon') },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[28px] border-none bg-white p-0 text-neutral-950 [&>button]:hidden">
        <SheetHeader className="relative flex-row items-center justify-between px-4 pb-3 pt-4">
          <button onClick={() => toast.info('Search friends')} aria-label="Search friends" className="grid size-11 place-items-center rounded-full active:scale-90">
            <Search className="size-7 text-neutral-950" />
          </button>
          <SheetTitle className="text-[20px] font-bold text-neutral-950">Send to</SheetTitle>
          <button onClick={() => onOpenChange(false)} aria-label="Close" className="grid size-11 place-items-center rounded-full active:scale-90">
            <X className="size-7 text-neutral-950" />
          </button>
          <SheetDescription className="sr-only">Share this short</SheetDescription>
        </SheetHeader>

        <div className="flex gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {friends.map((friend) => {
            const name = friend.display_name || friend.handle || 'user';
            return (
              <button key={friend.id} onClick={async () => (await copyText(url)) ? toast.success(`Link copied for ${name}`) : toast.error('Copy failed')} className="flex w-[68px] shrink-0 flex-col items-center gap-1.5">
                <span className="size-[62px] overflow-hidden rounded-full bg-neutral-200">
                  {friend.avatar_url ? <img src={friend.avatar_url} alt={name} className="size-full object-cover" loading="lazy" /> : <span className="grid size-full place-items-center text-lg font-bold text-neutral-500">{name[0]?.toUpperCase()}</span>}
                </span>
                <span className="line-clamp-2 text-center text-[11px] leading-tight text-neutral-700">{name}</span>
              </button>
            );
          })}
          {!friends.length && <p className="py-6 text-xs text-neutral-500">No friends to show yet.</p>}
        </div>

        <div className="h-px bg-neutral-200" />

        <div className="flex gap-4 overflow-x-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {coloredActions.map(({ key, label, icon: Icon, bg, fg, onClick }) => (
            <button key={key} onClick={onClick} className="flex w-[68px] shrink-0 flex-col items-center gap-1.5 active:scale-95">
              <span className={`grid size-[58px] place-items-center rounded-full ${bg}`}><Icon className={`size-7 ${fg}`} /></span>
              <span className="text-center text-[11px] leading-tight text-neutral-800">{label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-4 overflow-x-auto px-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}>
          {utilityActions.map(({ key, label, icon: Icon, onClick }) => (
            <button key={key} onClick={onClick} className="flex w-[68px] shrink-0 flex-col items-center gap-1.5 active:scale-95">
              <span className="grid size-[58px] place-items-center rounded-full bg-neutral-100"><Icon className="size-6 text-neutral-900" /></span>
              <span className="text-center text-[11px] leading-tight text-neutral-800">{label}</span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ShortItem({
  short,
  active,
  muted,
  onOpenSound,
  onOpenComments,
  hasInteracted,
  onToggleMute,
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
  const stageRef = useRef<HTMLDivElement | null>(null);
  const mediaCardRef = useRef<HTMLDivElement | null>(null);
  const [paused, setPaused] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(short.owner_id ?? null);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [progressPct, setProgressPct] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [sendToOpen, setSendToOpen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mediaFrame, setMediaFrame] = useState<MediaFrame | null>(null);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }: any) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => setCreatorId(short.owner_id ?? null), [short.owner_id]);

  const { liked, count: likeCount, toggle: toggleLike } = useLike(short.id, creatorId);
  const { following: followed, toggle: toggleFollow } = useFollow(creatorId);
  const { comments } = useComments(short.id, creatorId);
  const { saved: bookmarked, count: bookmarkCount, toggle: toggleBookmark } = useSave(short.id);

  const watchedRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);

  const flushWatch = () => {
    const seconds = Math.round(watchedRef.current);
    if (seconds > 0) {
      analyticsBus.rpc('record_watch_history', { p_video: short.id, p_watch_seconds: seconds });
      recordProNaxViewerSignal({
        videoId: short.id,
        watchTimeSeconds: seconds,
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
    if (active) void recordView(short.id, 0).catch(() => {});
    else flushWatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, short.id]);

  useEffect(() => () => flushWatch(), []); // eslint-disable-line react-hooks/exhaustive-deps

  useWatchHeartbeat({ videoId: active ? short.id : null, isPlaying: active && !paused });

  const updateMediaFrame = () => {
    const video = videoRef.current;
    const card = mediaCardRef.current;
    const stage = stageRef.current;
    if (!video || !card || !stage || !video.videoWidth || !video.videoHeight) return;

    const cardRect = card.getBoundingClientRect();
    const scale = Math.min(card.clientWidth / video.videoWidth, card.clientHeight / video.videoHeight);
    const frameHeight = video.videoHeight * scale;
    const top = cardRect.top + Math.max(0, (card.clientHeight - frameHeight) / 2);
    setMediaFrame({ top, bottom: top + frameHeight });
  };

  useEffect(() => {
    const stage = stageRef.current;
    const card = mediaCardRef.current;
    if (!stage || !card) return;

    const updateViewport = () => {
      setViewportHeight(window.innerHeight);
      window.requestAnimationFrame(updateMediaFrame);
    };

    const resizeObserver = new ResizeObserver(updateViewport);
    resizeObserver.observe(stage);
    resizeObserver.observe(card);
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateViewport);
    };
  }, [isLandscape]);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(document.fullscreenElement === videoRef.current);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (active) {
      setVideoError(false);
      if (Math.abs(video.currentTime) > 0.5) video.currentTime = 0;
      const timer = window.setTimeout(() => {
        try {
          const playPromise = video.play();
          if (playPromise instanceof Promise) {
            playPromise.then(() => setPaused(false)).catch((error: any) => {
              if (error?.name === 'NotAllowedError' || error?.name === 'AbortError') setPaused(true);
              else {
                setVideoError(true);
                setPaused(true);
              }
            });
          } else setPaused(false);
        } catch {
          setPaused(true);
        }
      }, 50);
      return () => window.clearTimeout(timer);
    }

    try {
      video.pause();
    } catch {
      // The element may already be detached during a feed change.
    }
    setProgressPct(0);
  }, [active, hasInteracted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      if (video.paused) return;
      setIsBuffering(false);
      const now = performance.now();
      if (lastTickRef.current != null) watchedRef.current += (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      if (video.duration) setProgressPct((video.currentTime / video.duration) * 100);
    };
    const onPlay = () => {
      lastTickRef.current = performance.now();
      setIsBuffering(false);
      setPaused(false);
    };
    const onPause = () => {
      lastTickRef.current = null;
      setIsBuffering(false);
    };
    const onEnded = () => {
      flushWatch();
      setIsBuffering(false);
    };
    const onWaiting = () => setIsBuffering(true);
    const onCanPlay = () => setIsBuffering(false);
    const onError = () => {
      setVideoError(true);
      setIsBuffering(false);
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('stalled', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('stalled', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('error', onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [short.id]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      try {
        const playPromise = video.play();
        if (playPromise instanceof Promise) playPromise.then(() => setPaused(false)).catch(() => setPaused(true));
        else setPaused(false);
      } catch {
        setPaused(true);
      }
    } else {
      try {
        video.pause();
      } catch {
        // Ignore an already detached media element.
      }
      setPaused(true);
    }
  };

  const lastTapRef = useRef(0);
  const handleVideoTap = (event: MouseEvent<HTMLVideoElement>) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      const rect = event.currentTarget.getBoundingClientRect();
      const heartId = now;
      setFloatingHearts((previous) => [...previous.slice(-5), { id: heartId, x: event.clientX - rect.left, y: event.clientY - rect.top }]);
      window.setTimeout(() => setFloatingHearts((previous) => previous.filter((heart) => heart.id !== heartId)), 900);
      if (!liked) toggleLike();
    } else {
      togglePlay();
    }
    lastTapRef.current = now;
  };

  const toggleFullscreen = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      if (video.requestFullscreen) {
        await video.requestFullscreen();
        return;
      }
      const legacyVideo = video as HTMLVideoElement & { webkitEnterFullscreen?: () => void };
      legacyVideo.webkitEnterFullscreen?.();
    } catch {
      toast.info('Full screen is not available in this browser');
    }
  };

  const handle = short.channel.replace(/^@/, '');
  const name = short.displayName || handle;
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/shorts/${short.id}` : '';
  const caption = short.description || short.title;
  return (
    <div ref={stageRef} className="relative isolate h-full w-full overflow-hidden bg-black text-white select-none">
      {/* Responsive 9:16 TikTok-style media card. The source video is never stretched. */}
      <div
        ref={mediaCardRef}
        className="absolute left-1/2 top-1/2 z-0 h-screen w-full -translate-x-1/2 -translate-y-1/2 overflow-hidden bg-black"
      >
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
          onLoadedMetadata={() => {
            const video = videoRef.current;
            setIsLandscape(Boolean(video && video.videoWidth > video.videoHeight));
            window.requestAnimationFrame(updateMediaFrame);
          }}
          onPlaying={() => setIsBuffering(false)}
          onError={() => {
            setVideoError(true);
            setIsBuffering(false);
          }}
          className="absolute inset-0 z-0 h-full w-full object-contain"
        />

        {isBuffering && active && !videoError && (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
            <Loader2 className="size-9 animate-spin text-white/70" />
          </div>
        )}

        {videoError && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-black/70">
            <div className="flex flex-col items-center gap-2 text-white/80">
              <VideoIcon className="size-7" />
              <p className="text-xs font-semibold">Video unavailable</p>
            </div>
          </div>
        )}

        <AnimatePresence>
          {floatingHearts.map((heart) => (
            <motion.div
              key={heart.id}
              initial={{ opacity: 1, scale: 0.4, x: heart.x - 40, y: heart.y - 40 }}
              animate={{ opacity: 0, scale: 1.8, y: heart.y - 160 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className="pointer-events-none absolute left-0 top-0 z-50"
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
              <span className="grid size-16 place-items-center rounded-full bg-black/45">
                <Play className="ml-1 size-9 fill-white text-white" />
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Top navigation remains above the media card. */}
      <button
        onClick={(event) => { event.stopPropagation(); onToggleMute(); }}
        aria-label={muted ? 'Unmute' : 'Mute'}
        className="absolute right-3 z-30 grid size-10 place-items-center rounded-full bg-black/55 text-white shadow-lg active:scale-90"
        style={{ top: `calc(env(safe-area-inset-top, 0px) + ${TOP_BAR_H + 8}px)` }}
      >
        {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
      </button>

      {active && isLandscape && mediaFrame && viewportHeight > 0 && (
        <button
          onClick={(event) => { event.stopPropagation(); void toggleFullscreen(); }}
          aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
          className="absolute left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/80 px-5 py-3 text-[16px] font-semibold text-white shadow-lg active:scale-95"
          style={{ top: `${Math.min(mediaFrame.bottom + 16, viewportHeight - NAV_H - 64)}px` }}
        >
          {isFullscreen ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          {isFullscreen ? 'Exit full screen' : 'Full screen'}
        </button>
      )}

      {/* One, and only one, creator avatar in the action rail. */}
      <div
        className="absolute right-3 z-30 flex flex-col items-center space-y-4"
        style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + ${NAV_H + 60}px)` }}
      >
        <div className="relative mb-1">
          <Link
            to="/channel/$handle"
            params={{ handle }}
            onClick={(event) => event.stopPropagation()}
            className="block size-11 overflow-hidden rounded-full border-2 border-white bg-black shadow-lg"
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
              onClick={(event) => { event.preventDefault(); event.stopPropagation(); toggleFollow(); }}
              aria-label="Follow"
              className="absolute -bottom-2 left-1/2 grid size-6 -translate-x-1/2 place-items-center rounded-full bg-[#fe2c55] text-white shadow-md active:scale-90"
            >
              <Plus className="size-4" strokeWidth={3.5} />
            </button>
          )}
        </div>

        <button onClick={(event) => { event.stopPropagation(); toggleLike(); }} className="flex min-w-12 flex-col items-center active:scale-90" aria-label="Like">
          <Heart className={`size-9 drop-shadow-md ${liked ? 'fill-[#fe2c55] text-[#fe2c55]' : 'fill-white text-white'}`} />
          <span className="mt-0.5 text-[11px] font-semibold text-white drop-shadow">{formatCount(likeCount)}</span>
        </button>
        <button onClick={(event) => { event.stopPropagation(); onOpenComments(); }} className="flex min-w-12 flex-col items-center active:scale-90" aria-label="Comments">
          <MessageCircle className="size-9 fill-white text-white drop-shadow-md" />
          <span className="mt-0.5 text-[11px] font-semibold text-white drop-shadow">{formatCount(comments.length)}</span>
        </button>
        <button onClick={(event) => { event.stopPropagation(); toggleBookmark(); }} className="flex min-w-12 flex-col items-center active:scale-90" aria-label="Save">
          <Bookmark className={`size-8 drop-shadow-md ${bookmarked ? 'fill-[#ffcb0b] text-[#ffcb0b]' : 'fill-white text-white'}`} />
          <span className="mt-0.5 text-[11px] font-semibold text-white drop-shadow">{formatCount(bookmarkCount)}</span>
        </button>
        <button onClick={(event) => { event.stopPropagation(); void recordShare(short.id, 'link').catch(() => {}); setSendToOpen(true); }} className="flex min-w-12 flex-col items-center active:scale-90" aria-label="Share">
          <Share2 className="size-8 fill-white text-white drop-shadow-md" />
          <span className="mt-0.5 text-[11px] font-semibold text-white drop-shadow">{formatCount(short.shares)}</span>
        </button>
      </div>

      {/* Bottom metadata is kept inside the visible safe area and never clipped by the 9:16 card. */}
      <div
        className="absolute bottom-0 left-0 z-30 w-full pb-1 pl-3 pr-[82px]"
        style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + ${NAV_H + 30}px)` }}
      >
        <div className="pointer-events-none absolute inset-x-0 -top-32 bottom-0 -z-10 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
        <Link
          to="/channel/$handle"
          params={{ handle }}
          onClick={(event) => event.stopPropagation()}
          className="block text-[17px] font-bold leading-tight text-white drop-shadow"
        >
          {name}
        </Link>
        {caption && (
          <button
            onClick={() => setExpanded((value) => !value)}
            className={`mt-1 block w-full text-left text-[15px] leading-snug text-white drop-shadow ${expanded ? '' : 'line-clamp-2'}`}
          >
            {caption.split(' ').map((word, index) =>
              word.startsWith('#')
                ? <span key={`${word}-${index}`} className="font-semibold">{word} </span>
                : <span key={`${word}-${index}`}>{word} </span>
            )}
            {!expanded && <span className="font-semibold text-white/70">more</span>}
          </button>
        )}
        <button onClick={(event) => { event.stopPropagation(); toast.info('Translation is not configured yet'); }} className="mt-1 text-[13px] font-medium text-white/80">
          See translation
        </button>
        <button
          onClick={(event) => { event.stopPropagation(); onOpenSound(); }}
          className="mt-2 flex max-w-full items-center gap-1.5 overflow-hidden rounded-full border border-white/10 bg-black/40 px-2.5 py-1 backdrop-blur-md"
        >
          <Music2 className="size-3.5 shrink-0 text-white" />
          <span className="relative block w-40 overflow-hidden text-left sm:w-56">
            <span className="flex w-[200%] animate-[marquee_8s_linear_infinite] whitespace-nowrap text-[13px] text-white/90">
              <span className="pr-8">{short.music}</span>
              <span className="pr-8">{short.music}</span>
            </span>
          </span>
        </button>
      </div>

      <div className="absolute inset-x-0 z-30 h-[2px] bg-white/20" style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + ${NAV_H + 20}px)` }}>
        <div className="h-full bg-rose-500 transition-[width] duration-100" style={{ width: `${progressPct}%` }} />
      </div>

      <SendToSheet open={sendToOpen} onOpenChange={setSendToOpen} url={shareUrl} title={short.title} videoSrc={short.src} />
    </div>
  );
}

function CommentsSheet({ short, onClose }: { short: Short | null; onClose: () => void }) {
  const [text, setText] = useState('');
  const { comments, post } = useComments(short?.id ?? 'none', null);
  if (!short) return null;

  const submitComment = () => {
    if (!text.trim()) return;
    post(text.trim());
    setText('');
  };

  return (
    <Sheet open={!!short} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="flex h-[72dvh] flex-col rounded-t-2xl border-none bg-zinc-950 p-0 text-white">
        <SheetHeader className="border-b border-white/10 px-4 py-3"><SheetTitle className="text-center text-sm font-bold text-white">{formatCount(comments.length)} comments</SheetTitle><SheetDescription className="sr-only">{short.title}</SheetDescription></SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {comments.length === 0 && <div className="flex flex-col items-center gap-2 py-10 text-white/50"><Sparkles className="size-6" /><p className="text-xs">No comments yet. Be the first!</p></div>}
          {comments.map((comment: any) => <div key={comment.id} className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-zinc-800 text-xs font-bold text-white">{(comment.author?.display_name || comment.author?.email || '?')[0]?.toUpperCase()}</span><div className="min-w-0 flex-1"><p className="text-[11px] font-semibold text-zinc-400">{comment.author?.display_name || comment.author?.email || 'user'}</p><p className="text-[13px] leading-normal text-white/90">{comment.text}</p><p className="mt-1 text-[10px] text-zinc-500">{new Date(comment.created_at).toLocaleDateString()}</p></div><Heart className="size-4 text-zinc-500" /></div>)}
        </div>
        <div className="flex items-center gap-2 border-t border-white/10 bg-zinc-900 p-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}><input value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !(event.nativeEvent as any).isComposing && event.keyCode !== 229) submitComment(); }} placeholder="Add comment..." maxLength={1000} className="min-w-0 flex-1 rounded-full bg-zinc-800 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#fe2c55]" /><Button size="icon" disabled={!text.trim()} onClick={submitComment} className="rounded-full bg-[#fe2c55] text-white hover:bg-[#fe2c55]/90"><Send className="size-4" /></Button></div>
      </SheetContent>
    </Sheet>
  );
}


export default function Shorts() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const [activeTab, setActiveTab] = useState<'stem' | 'community' | 'following' | 'fyp'>('fyp');
  const [commentsFor, setCommentsFor] = useState<Short | null>(null);
  const [liveShorts, setLiveShorts] = useState<Short[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    const handler = () => setHasInteracted(true);
    const events = ['click', 'touchstart', 'keydown', 'scroll'];
    events.forEach((event) => document.addEventListener(event, handler, { once: true }));
    return () => events.forEach((event) => document.removeEventListener(event, handler));
  }, []);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      try {
        let rows: any[] | null = null;
        const { data: ranked, error: rankedError } = await supabase.rpc('get_shorts_feed', { p_limit: 30, p_offset: 0 });
        if (!rankedError && ranked?.length) rows = ranked;

        if (!rows) {
          const { data } = await supabase.from('videos').select('id,title,description,video_url,thumb_url,owner_id,tags,views_count').eq('is_short', true).eq('is_removed', false).eq('is_shadow_banned', false).eq('visibility', 'public').order('created_at', { ascending: false }).limit(20);
          rows = data ?? [];
        }

        if (!rows.length) return;

        const ownerIds = Array.from(new Set(rows.map((video: any) => video.owner_id).filter(Boolean)));
        const videoIds = rows.map((video: any) => video.id);
        const profileMap = new Map<string, any>();
        const likesMap = new Map<string, number>();

        if (ownerIds.length) {
          const { data: profiles } = await supabase.from('profiles').select('id,display_name,avatar_url,handle').in('id', ownerIds);
          (profiles ?? []).forEach((profile: any) => profileMap.set(profile.id, profile));
        }

        if (videoIds.length) {
          const { data: likes } = await supabase.from('video_likes').select('video_id').in('video_id', videoIds);
          (likes ?? []).forEach((row: any) => likesMap.set(row.video_id, (likesMap.get(row.video_id) ?? 0) + 1));
        }

        const mapped: Short[] = rows.filter((video: any) => typeof video.video_url === 'string' && video.video_url.startsWith('http')).map((video: any) => {
          const profile = profileMap.get(video.owner_id) || {};
          const channelHandle = profile.handle || profile.display_name || 'creator';
          const parts = String(video.video_url).split('/');
          const encodedVideoUrl = parts.map((part, index) => index === parts.length - 1 ? part.replace(/#/g, '%23') : part).join('/');
          return {
            id: video.id,
            src: encodedVideoUrl,
            title: video.title || '',
            channel: `@${channelHandle}`,
            displayName: profile.display_name || channelHandle,
            avatar: profile.avatar_url,
            description: video.description || '',
            likes: likesMap.get(video.id) ?? 0,
            comments: 0,
            shares: 0,
            music: `original sound - ${profile.display_name || channelHandle}`,
            owner_id: video.owner_id,
            tags: Array.isArray(video.tags) ? video.tags : [],
            views_count: video.views_count || 0,
          } as Short;
        });

        setLiveShorts(rankShortsByProNaxFYP(mapped));
      } catch {
        // Keep the feed empty state quiet if the request fails.
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const feedItems: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = [];
    liveShorts.forEach((short, index) => {
      items.push({ kind: 'short', short });
      if ((index + 1) % AD_EVERY_N_SHORTS === 0) items.push({ kind: 'ad', attributeShortId: short.id, key: `ad-${index}-${short.id}` });
    });
    return items;
  }, [liveShorts]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = Array.from(container.querySelectorAll('[data-feed-item]'));
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.7) setActiveIdx(Number((entry.target as HTMLElement).dataset.idx));
    }), { root: container, threshold: [0.7] });

    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [feedItems.length]);

  const tabs = [
    { key: 'following', label: 'Following' },
    { key: 'fyp', label: 'For You' },
  ] as const;

  return (
    <div className="flex-1 h-full flex flex-col items-center justify-center overflow-y-auto overflow-x-hidden snap-y snap-mandatory bg-black text-white pb-20">
      {/* Tab Header - Centered */}
      <header className="mx-auto max-w-md w-full flex justify-center items-center gap-4 px-4 py-3 border-b border-white/10 flex-shrink-0">
        {tabs.map((tab) => <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`relative px-4 py-2 text-[15px] transition-colors ${activeTab === tab.key ? 'font-bold text-white' : 'font-medium text-white/60'}`}>{tab.label}{activeTab === tab.key && <span className="absolute bottom-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-full bg-white" />}</button>)}
      </header>

      {/* Single Centered Vertical Feed - Responsive */}
      <div 
        ref={containerRef} 
        className="flex-1 h-full w-full snap-y snap-mandatory overflow-y-scroll overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
      >
        {isLoading && (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="size-9 animate-spin text-[#fe2c55]" />
              <p className="text-xs text-white/60">Finding shorts for you...</p>
            </div>
          </div>
        )}

        {!isLoading && liveShorts.length === 0 && (
          <div className="h-full flex items-center justify-center px-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <span className="grid size-14 place-items-center rounded-2xl bg-white/10">
                <VideoIcon className="size-6" />
              </span>
              <p className="text-base font-bold">No Shorts on FYP</p>
              <p className="max-w-xs text-xs text-white/60">Upload a vertical short video to start the ProNax Viral Cohort.</p>
              <Button onClick={() => navigate({ to: '/upload' })} className="rounded-full bg-[#fe2c55] font-bold text-white">Upload First Short</Button>
            </div>
          </div>
        )}

        {feedItems.map((item, index) => (
          <div 
            key={item.kind === 'short' ? item.short.id : item.key} 
            data-feed-item 
            data-idx={index} 
            className="w-full max-w-[420px] md:max-w-[380px] lg:max-w-[420px] h-screen flex-shrink-0 snap-start flex items-center justify-center relative mx-auto my-2"
            style={{ touchAction: 'pan-y' }}
          >
            {item.kind === 'short' ? (
              <div className="w-full h-full aspect-[9/16] rounded-2xl overflow-hidden relative">
                <ShortItem 
                  short={item.short} 
                  active={index === activeIdx} 
                  muted={muted} 
                  hasInteracted={hasInteracted} 
                  onOpenSound={() => navigate({ to: '/sound/$id', params: { id: item.short.id } })} 
                  onOpenComments={() => setCommentsFor(item.short)} 
                  onToggleMute={() => setMuted((value) => !value)} 
                />
              </div>
            ) : (
              <div className="w-full h-full aspect-[9/16] rounded-2xl overflow-hidden relative">
                <ShortsAdSlide 
                  active={index === activeIdx} 
                  attributeToVideoId={item.attributeShortId} 
                  onAdFinished={() => containerRef.current?.querySelector(`[data-idx="${index + 1}"]`)?.scrollIntoView({ behavior: 'smooth' })} 
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <CommentsSheet short={commentsFor} onClose={() => setCommentsFor(null)} />
    </div>
  );
}